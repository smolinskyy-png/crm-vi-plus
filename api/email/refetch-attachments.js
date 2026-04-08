const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const { requireUser, setCors, json, readJson } = require('../_lib/auth');
const { adminClient } = require('../_lib/supabase');
const { decrypt } = require('../_lib/crypto');

// POST /api/email/refetch-attachments  { email_id }
// Re-fetches a single message from IMAP and re-uploads its attachments.
// Used when the UI sees has_attachments=true but no attachment rows
// (e.g., a previous upload failed silently).
module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  try {
    const user = await requireUser(req);
    const body = await readJson(req);
    const emailId = body && body.email_id;
    if (!emailId) return json(res, 400, { error: 'email_id required' });

    const sb = adminClient();
    const { data: email, error: eErr } = await sb
      .from('emails')
      .select('id, account_id, folder, uid, user_id')
      .eq('id', emailId)
      .eq('user_id', user.id)
      .single();
    if (eErr || !email) return json(res, 404, { error: 'E-Mail nicht gefunden' });
    if (!email.uid || email.folder === 'SENT') {
      return json(res, 200, { uploaded: 0, note: 'Kein IMAP-Quellordner' });
    }

    const { data: account, error: aErr } = await sb
      .from('email_accounts')
      .select('*')
      .eq('id', email.account_id)
      .single();
    if (aErr || !account) return json(res, 404, { error: 'Konto nicht gefunden' });

    // Map our canonical folder key to the actual IMAP path via discovery
    const client = new ImapFlow({
      host: account.imap_host,
      port: account.imap_port || 993,
      secure: account.imap_secure !== false,
      auth: { user: account.username, pass: decrypt(account.password_encrypted) },
      logger: false,
      tls: { rejectUnauthorized: false }
    });

    const NAME_MAP = [
      { key: 'INBOX',   rx: /^inbox$/i },
      { key: 'DRAFTS',  rx: /(draft|entwurf|entwürfe)/i },
      { key: 'TRASH',   rx: /(trash|deleted|papierkorb|gelöscht|geloescht|bin)/i },
      { key: 'SPAM',    rx: /(junk|spam|werbung)/i },
      { key: 'ARCHIVE', rx: /(archive|archiv)/i }
    ];
    const SU_MAP = { '\\Drafts':'DRAFTS','\\Trash':'TRASH','\\Junk':'SPAM','\\Archive':'ARCHIVE' };

    let uploaded = 0;
    try {
      await client.connect();
      const list = await client.list();
      let target = null;
      for (const box of list) {
        const su = box.specialUse;
        if (su && SU_MAP[su] === email.folder) { target = box; break; }
        const nm = NAME_MAP.find(m => m.key === email.folder && m.rx.test(box.path || box.name || ''));
        if (nm) { target = box; if (su) break; }
      }
      if (!target && email.folder === 'INBOX') target = { path: 'INBOX' };
      if (!target) return json(res, 404, { error: 'IMAP-Ordner nicht gefunden' });

      const lock = await client.getMailboxLock(target.path);
      try {
        const msg = await client.fetchOne(email.uid, { source: true }, { uid: true });
        if (!msg || !msg.source) return json(res, 404, { error: 'Nachricht nicht gefunden' });
        const parsed = await simpleParser(msg.source);
        const atts = parsed.attachments || [];
        for (const att of atts) {
          try {
            const safeName = (att.filename || 'attachment').replace(/[^a-zA-Z0-9._-]/g, '_');
            const path = `${email.user_id}/${email.id}/${safeName}`;
            const { error: upErr } = await sb.storage
              .from('email-attachments')
              .upload(path, att.content, {
                contentType: att.contentType || 'application/octet-stream',
                upsert: true
              });
            if (upErr) throw upErr;
            const { data: existing } = await sb
              .from('email_attachments')
              .select('id')
              .eq('email_id', email.id)
              .eq('storage_path', path)
              .maybeSingle();
            if (!existing) {
              await sb.from('email_attachments').insert({
                email_id: email.id,
                user_id: email.user_id,
                filename: att.filename || 'attachment',
                mime_type: att.contentType || null,
                size_bytes: att.size || (att.content ? att.content.length : 0),
                storage_path: path
              });
            }
            uploaded += 1;
          } catch (e) {
            console.error('refetch upload failed', e.message);
          }
        }
        // Sync has_attachments flag with reality
        await sb.from('emails')
          .update({ has_attachments: atts.length > 0 })
          .eq('id', email.id);
      } finally {
        lock.release();
      }
    } finally {
      try { await client.logout(); } catch (_) {}
    }

    return json(res, 200, { uploaded });
  } catch (e) {
    return json(res, e.status || 500, { error: e.message || String(e) });
  }
};
