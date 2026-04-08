const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const { decrypt } = require('./crypto');
const { adminClient } = require('./supabase');

// Soft deadline so we stay within Vercel timeout (default 9s for Hobby with a buffer).
// Pass a higher value if running on Pro.
const DEFAULT_DEADLINE_MS = 9000;

// Max mails fetched per sync call (safety cap).
const DEFAULT_BATCH_LIMIT = 20;

// Map IMAP special-use flags + common mailbox names to canonical folder strings
// stored in `emails.folder`. Order matters — special-use takes precedence.
const SPECIAL_USE_MAP = {
  '\\Sent': 'SENT',
  '\\Drafts': 'DRAFTS',
  '\\Trash': 'TRASH',
  '\\Junk': 'SPAM',
  '\\Archive': 'ARCHIVE'
};

const NAME_FALLBACK_MAP = [
  { rx: /^inbox$/i, key: 'INBOX' },
  { rx: /(sent|gesendet|gesendete)/i, key: 'SENT' },
  { rx: /(draft|entwurf|entwürfe)/i, key: 'DRAFTS' },
  { rx: /(trash|deleted|papierkorb|gelöscht|geloescht|bin)/i, key: 'TRASH' },
  { rx: /(junk|spam|werbung)/i, key: 'SPAM' },
  { rx: /(archive|archiv)/i, key: 'ARCHIVE' }
];

function buildImapConfig(account) {
  return {
    host: account.imap_host,
    port: account.imap_port || 993,
    secure: account.imap_secure !== false,
    auth: {
      user: account.username,
      pass: decrypt(account.password_encrypted)
    },
    logger: false,
    tls: { rejectUnauthorized: false }
  };
}

// Extracts a display-friendly from address
function parseFromAddress(parsed) {
  const from = parsed.from && parsed.from.value && parsed.from.value[0];
  if (!from) return { address: '', name: '' };
  return { address: from.address || '', name: from.name || '' };
}

function parseAddressList(list) {
  if (!list || !list.value) return [];
  return list.value.map(a => ({ address: a.address, name: a.name }));
}

// Find an existing CRM contact id by email address from crm_data JSONB.
async function findContactIdByEmail(sb, userId, email) {
  if (!email) return null;
  try {
    const { data, error } = await sb
      .from('crm_data')
      .select('data')
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !data || !data.data) return null;
    const contacts = data.data.contacts || data.data.kontakte || [];
    if (!Array.isArray(contacts)) return null;
    const needle = email.toLowerCase();
    const hit = contacts.find(c => (c.email || '').toLowerCase() === needle);
    return hit ? (hit.id || null) : null;
  } catch (e) {
    return null;
  }
}

async function uploadAttachment(sb, userId, emailId, att) {
  const safeName = (att.filename || 'attachment').replace(/[^a-zA-Z0-9._-]/g, '_');
  // Stable path so retries don't create duplicate storage objects
  const path = `${userId}/${emailId}/${safeName}`;
  const { error: upErr } = await sb.storage
    .from('email-attachments')
    .upload(path, att.content, {
      contentType: att.contentType || 'application/octet-stream',
      upsert: true
    });
  if (upErr) throw upErr;

  // Skip if a row for this file already exists (retry case)
  const { data: existing } = await sb
    .from('email_attachments')
    .select('id')
    .eq('email_id', emailId)
    .eq('storage_path', path)
    .maybeSingle();
  if (existing) return;

  const { error: insErr } = await sb.from('email_attachments').insert({
    email_id: emailId,
    user_id: userId,
    filename: att.filename || 'attachment',
    mime_type: att.contentType || null,
    size_bytes: att.size || (att.content ? att.content.length : 0),
    storage_path: path
  });
  if (insErr) throw insErr;
}

// Resolve a mailbox to one of the canonical folder keys, or null if it's not
// one we care about.
function resolveFolderKey(box) {
  if (!box) return null;
  const su = box.specialUse;
  if (su && SPECIAL_USE_MAP[su]) return SPECIAL_USE_MAP[su];
  const name = box.path || box.name || '';
  for (const m of NAME_FALLBACK_MAP) {
    if (m.rx.test(name)) return m.key;
  }
  return null;
}

// Pick the *first* mailbox that matches each canonical key. Some accounts have
// multiple "Trash"-ish folders (e.g., [Gmail]/Bin + Trash) — we prefer
// special-use over name match, then the shortest path.
async function discoverFolders(client) {
  const list = await client.list();
  const byKey = {};
  for (const box of list) {
    if (!box || box.path === undefined) continue;
    const key = resolveFolderKey(box);
    if (!key) continue;
    if (!byKey[key]) {
      byKey[key] = box;
    } else {
      // Prefer special-use over name match
      const existingHasSU = !!byKey[key].specialUse;
      const newHasSU = !!box.specialUse;
      if (newHasSU && !existingHasSU) byKey[key] = box;
      else if (newHasSU === existingHasSU && (box.path.length < byKey[key].path.length)) byKey[key] = box;
    }
  }
  return byKey;
}

// Window of most recent messages we always re-check per folder. We dedupe
// against the DB so already-synced messages are skipped, but new mail is
// always picked up reliably even if a UID watermark is stale.
const RECENT_WINDOW = 50;

async function syncOneFolder(client, sb, account, folderKey, mailboxPath, watermark, deadline, remainingLimit) {
  let fetched = 0;
  let highestUid = watermark || 0;

  const lock = await client.getMailboxLock(mailboxPath);
  try {
    const status = client.mailbox;
    const total = (status && status.exists) || 0;
    if (total === 0) return { fetched: 0, highestUid };

    // Sequence range for the last RECENT_WINDOW messages (newest end of mbox)
    const startSeq = Math.max(1, total - RECENT_WINDOW + 1);
    const seqRange = `${startSeq}:${total}`;

    // Collect candidate UIDs (newest first)
    const candidates = [];
    for await (const msg of client.fetch(seqRange, { uid: true })) {
      if (msg && typeof msg.uid === 'number') candidates.push(msg.uid);
    }
    candidates.sort((a, b) => b - a); // newest UID first

    // Dedupe: skip UIDs we already have for (account, folder)
    let alreadyHave = new Set();
    if (candidates.length) {
      const { data: existing } = await sb
        .from('emails')
        .select('uid')
        .eq('account_id', account.id)
        .eq('folder', folderKey)
        .in('uid', candidates);
      alreadyHave = new Set((existing || []).map(r => Number(r.uid)));
    }
    const uids = candidates.filter(u => !alreadyHave.has(u));

    for (const uid of uids) {
      if (fetched >= remainingLimit) break;
      if (Date.now() > deadline) break;

      try {
        const msg = await client.fetchOne(uid, { source: true, flags: true, envelope: true }, { uid: true });
        if (!msg || !msg.source) continue;

        const parsed = await simpleParser(msg.source);
        const from = parseFromAddress(parsed);
        const contactId = await findContactIdByEmail(sb, account.user_id, from.address);

        const row = {
          account_id: account.id,
          user_id: account.user_id,
          folder: folderKey,
          uid: uid,
          message_id: parsed.messageId || null,
          subject: parsed.subject || '(ohne Betreff)',
          from_address: from.address,
          from_name: from.name,
          to_addresses: parseAddressList(parsed.to),
          cc_addresses: parseAddressList(parsed.cc),
          bcc_addresses: parseAddressList(parsed.bcc),
          reply_to: parsed.replyTo && parsed.replyTo.text ? parsed.replyTo.text : null,
          body_text: parsed.text || null,
          body_html: parsed.html || null,
          date_sent: parsed.date ? parsed.date.toISOString() : null,
          is_read: msg.flags && msg.flags.has && msg.flags.has('\\Seen') ? true : (Array.isArray(msg.flags) && msg.flags.includes('\\Seen')),
          has_attachments: !!(parsed.attachments && parsed.attachments.length),
          contact_id: contactId
        };

        const { data: inserted, error: insErr } = await sb
          .from('emails')
          .upsert(row, { onConflict: 'account_id,folder,uid' })
          .select('id')
          .single();

        if (insErr) { console.error('insert email failed', insErr); continue; }

        if (parsed.attachments && parsed.attachments.length && inserted && inserted.id) {
          for (const att of parsed.attachments) {
            try { await uploadAttachment(sb, account.user_id, inserted.id, att); }
            catch (e) { console.error('attachment upload failed', e.message); }
          }
        }

        fetched += 1;
        if (uid > highestUid) highestUid = uid;
      } catch (e) {
        console.error('message fetch failed uid=' + uid, e.message);
      }
    }
  } finally {
    lock.release();
  }

  return { fetched, highestUid };
}

/**
 * Sync one account across multiple folders (Inbox, Sent, Drafts, Archive,
 * Spam, Trash). Per-folder UID watermarks live in `email_accounts.folder_uids`
 * (JSONB). Falls back to legacy `last_uid` for INBOX on first run.
 *
 * Returns { fetched, folder_uids, done, error? }
 */
async function syncAccount(account, opts = {}) {
  const deadline = Date.now() + (opts.deadlineMs || DEFAULT_DEADLINE_MS);
  const limit = opts.limit || DEFAULT_BATCH_LIMIT;
  const sb = adminClient();

  const client = new ImapFlow(buildImapConfig(account));
  let fetched = 0;
  const folderUids = Object.assign({}, account.folder_uids || {});
  // Backfill INBOX watermark from legacy column on first run
  if (folderUids.INBOX == null && account.last_uid) folderUids.INBOX = account.last_uid;

  // Iterate folders in priority order so the inbox stays fresh
  const FOLDER_ORDER = ['INBOX', 'SENT', 'DRAFTS', 'ARCHIVE', 'SPAM', 'TRASH'];

  try {
    await client.connect();
    let discovered = {};
    try { discovered = await discoverFolders(client); }
    catch (e) { console.error('folder discovery failed', e.message); }

    // Always try INBOX even if not in list (some servers omit it)
    if (!discovered.INBOX) discovered.INBOX = { path: 'INBOX' };

    for (const key of FOLDER_ORDER) {
      if (fetched >= limit) break;
      if (Date.now() > deadline) break;
      const box = discovered[key];
      if (!box) continue;
      try {
        const res = await syncOneFolder(
          client, sb, account, key, box.path,
          folderUids[key] || 0, deadline, limit - fetched
        );
        fetched += res.fetched;
        if (res.highestUid > (folderUids[key] || 0)) folderUids[key] = res.highestUid;
      } catch (e) {
        console.error('sync folder ' + key + ' failed', e.message);
      }
    }
  } finally {
    try { await client.logout(); } catch (_) {}
  }

  await sb.from('email_accounts').update({
    last_sync_at: new Date().toISOString(),
    last_uid: folderUids.INBOX || account.last_uid || 0,
    folder_uids: folderUids,
    status: 'active',
    error_message: null
  }).eq('id', account.id);

  return { fetched, folder_uids: folderUids, done: fetched < limit };
}

async function markAccountError(accountId, message) {
  try {
    const sb = adminClient();
    await sb.from('email_accounts').update({
      status: 'error',
      error_message: String(message).slice(0, 500)
    }).eq('id', accountId);
  } catch (_) {}
}

module.exports = { syncAccount, markAccountError, buildImapConfig, discoverFolders, resolveFolderKey };
