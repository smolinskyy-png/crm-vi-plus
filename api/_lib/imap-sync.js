const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const { decrypt } = require('./crypto');
const { adminClient } = require('./supabase');

// Soft deadline so we stay within Vercel timeout (default 9s for Hobby with a buffer).
// Pass a higher value if running on Pro.
const DEFAULT_DEADLINE_MS = 9000;

// Max mails fetched per sync call (safety cap).
const DEFAULT_BATCH_LIMIT = 20;

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
  const path = `${userId}/${emailId}/${Date.now()}_${safeName}`;
  const { error: upErr } = await sb.storage
    .from('email-attachments')
    .upload(path, att.content, {
      contentType: att.contentType || 'application/octet-stream',
      upsert: false
    });
  if (upErr) throw upErr;
  await sb.from('email_attachments').insert({
    email_id: emailId,
    user_id: userId,
    filename: att.filename || 'attachment',
    mime_type: att.contentType || null,
    size_bytes: att.size || (att.content ? att.content.length : 0),
    storage_path: path
  });
}

/**
 * Sync one account. Fetches new UIDs above last_uid in INBOX, parses each,
 * uploads attachments to storage, matches contacts, and stops when either the
 * batch limit or the soft deadline is reached.
 * Returns { fetched, highestUid, done, error? }
 */
async function syncAccount(account, opts = {}) {
  const deadline = Date.now() + (opts.deadlineMs || DEFAULT_DEADLINE_MS);
  const limit = opts.limit || DEFAULT_BATCH_LIMIT;
  const sb = adminClient();

  const client = new ImapFlow(buildImapConfig(account));
  let fetched = 0;
  let highestUid = account.last_uid || 0;
  let done = false;

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    try {
      const mailbox = client.mailbox;
      const startUid = (account.last_uid || 0) + 1;
      // Use sequence UID: fetch messages with UID >= startUid
      const searchRange = `${startUid}:*`;

      // Quickly compute list of UIDs to pull
      const uids = [];
      for await (const msg of client.fetch(searchRange, { uid: true }, { uid: true })) {
        if (msg.uid >= startUid) uids.push(msg.uid);
        if (uids.length >= limit * 3) break; // rough cap
      }
      uids.sort((a, b) => a - b);

      for (const uid of uids) {
        if (fetched >= limit) { done = false; break; }
        if (Date.now() > deadline) { done = false; break; }

        try {
          const msg = await client.fetchOne(uid, { source: true, flags: true, envelope: true }, { uid: true });
          if (!msg || !msg.source) continue;

          const parsed = await simpleParser(msg.source);
          const from = parseFromAddress(parsed);
          const contactId = await findContactIdByEmail(sb, account.user_id, from.address);

          const row = {
            account_id: account.id,
            user_id: account.user_id,
            folder: 'INBOX',
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

          // Upsert to avoid dupes on retries
          const { data: inserted, error: insErr } = await sb
            .from('emails')
            .upsert(row, { onConflict: 'account_id,folder,uid' })
            .select('id')
            .single();

          if (insErr) {
            console.error('insert email failed', insErr);
            continue;
          }

          // Attachments
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

      // Determine "done" — nothing left > highestUid
      if (uids.length === 0) done = true;
      else if (fetched >= uids.length) done = true;
    } finally {
      lock.release();
    }
  } finally {
    try { await client.logout(); } catch (_) {}
  }

  // Update last_sync + last_uid in DB
  await sb.from('email_accounts').update({
    last_sync_at: new Date().toISOString(),
    last_uid: highestUid,
    status: 'active',
    error_message: null
  }).eq('id', account.id);

  return { fetched, highestUid, done };
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

module.exports = { syncAccount, markAccountError, buildImapConfig };
