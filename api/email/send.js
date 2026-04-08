const nodemailer = require('nodemailer');
const { requireUser, setCors, json, readJson } = require('../_lib/auth');
const { adminClient } = require('../_lib/supabase');
const { decrypt } = require('../_lib/crypto');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  try {
    const user = await requireUser(req);
    const body = await readJson(req);
    const { account_id, to, cc, bcc, subject, text, html, in_reply_to, references, attachments } = body;
    if (!account_id || !to || !subject) {
      return json(res, 400, { error: 'account_id, to, subject sind Pflicht' });
    }

    const sb = adminClient();
    const { data: account, error } = await sb
      .from('email_accounts')
      .select('*')
      .eq('id', account_id)
      .eq('user_id', user.id)
      .single();
    if (error || !account) return json(res, 404, { error: 'Account nicht gefunden' });

    const transporter = nodemailer.createTransport({
      host: account.smtp_host,
      port: account.smtp_port,
      secure: !!account.smtp_secure,
      auth: { user: account.username, pass: decrypt(account.password_encrypted) },
      tls: { rejectUnauthorized: false }
    });

    // Decode attachments once so we can both attach to SMTP and store them
    const decodedAtts = Array.isArray(attachments)
      ? attachments
          .filter(a => a && a.filename && a.content_b64)
          .map(a => ({
            filename: a.filename,
            content: Buffer.from(a.content_b64, 'base64'),
            contentType: a.content_type || 'application/octet-stream'
          }))
      : [];

    const displayName = account.from_name || account.label || '';
    const info = await transporter.sendMail({
      from: displayName ? `"${displayName.replace(/"/g, '\\"')}" <${account.email}>` : account.email,
      to,
      cc: cc || undefined,
      bcc: bcc || undefined,
      subject,
      text: text || undefined,
      html: html || undefined,
      inReplyTo: in_reply_to || undefined,
      references: references || undefined,
      attachments: decodedAtts.length ? decodedAtts.map(a => ({
        filename: a.filename, content: a.content, contentType: a.contentType
      })) : undefined
    });

    // Store in DB as "sent"
    const { data: insRow, error: insErr } = await sb.from('emails').insert({
      account_id: account.id,
      user_id: user.id,
      folder: 'SENT',
      uid: Math.floor(Date.now() / 1000), // synthetic uid for sent items
      message_id: info.messageId || null,
      in_reply_to: in_reply_to || null,
      references: Array.isArray(references) ? references : (references ? String(references).split(/\s+/).filter(Boolean) : null),
      subject,
      from_address: account.email,
      from_name: displayName,
      to_addresses: Array.isArray(to) ? to.map(a => ({ address: a })) : [{ address: to }],
      cc_addresses: cc ? (Array.isArray(cc) ? cc.map(a => ({ address: a })) : [{ address: cc }]) : null,
      bcc_addresses: bcc ? (Array.isArray(bcc) ? bcc.map(a => ({ address: a })) : [{ address: bcc }]) : null,
      body_text: text || null,
      body_html: html || null,
      date_sent: new Date().toISOString(),
      is_read: true,
      has_attachments: decodedAtts.length > 0
    }).select('id').single();
    if (insErr) throw insErr;

    // Upload + record attachments for the sent email so they show up later
    for (const a of decodedAtts) {
      try {
        const safeName = a.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `${user.id}/${insRow.id}/${safeName}`;
        const { error: upErr } = await sb.storage
          .from('email-attachments')
          .upload(path, a.content, { contentType: a.contentType, upsert: true });
        if (upErr) throw upErr;
        await sb.from('email_attachments').insert({
          email_id: insRow.id,
          user_id: user.id,
          filename: a.filename,
          mime_type: a.contentType,
          size_bytes: a.content.length,
          storage_path: path
        });
      } catch (e) {
        console.error('sent attachment store failed', e.message);
      }
    }

    return json(res, 200, { ok: true, messageId: info.messageId });
  } catch (e) {
    return json(res, e.status || 500, { error: e.message || String(e) });
  }
};
