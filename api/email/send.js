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
    const { account_id, to, cc, bcc, subject, text, html, in_reply_to, references } = body;
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

    const info = await transporter.sendMail({
      from: account.email,
      to,
      cc: cc || undefined,
      bcc: bcc || undefined,
      subject,
      text: text || undefined,
      html: html || undefined,
      inReplyTo: in_reply_to || undefined,
      references: references || undefined
    });

    // Store in DB as "sent"
    await sb.from('emails').insert({
      account_id: account.id,
      user_id: user.id,
      folder: 'SENT',
      uid: Math.floor(Date.now() / 1000), // synthetic uid for sent items
      message_id: info.messageId || null,
      subject,
      from_address: account.email,
      from_name: account.label || '',
      to_addresses: Array.isArray(to) ? to.map(a => ({ address: a })) : [{ address: to }],
      cc_addresses: cc ? (Array.isArray(cc) ? cc.map(a => ({ address: a })) : [{ address: cc }]) : null,
      bcc_addresses: bcc ? (Array.isArray(bcc) ? bcc.map(a => ({ address: a })) : [{ address: bcc }]) : null,
      body_text: text || null,
      body_html: html || null,
      date_sent: new Date().toISOString(),
      is_read: true,
      has_attachments: false
    });

    return json(res, 200, { ok: true, messageId: info.messageId });
  } catch (e) {
    return json(res, e.status || 500, { error: e.message || String(e) });
  }
};
