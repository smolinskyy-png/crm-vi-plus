const { ImapFlow } = require('imapflow');
const nodemailer = require('nodemailer');
const { requireUser, setCors, json, readJson } = require('../_lib/auth');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  try {
    await requireUser(req);
    const body = await readJson(req);
    const {
      imap_host, imap_port = 993, imap_secure = true,
      smtp_host, smtp_port = 587, smtp_secure = false,
      username, password
    } = body;

    if (!imap_host || !smtp_host || !username || !password) {
      return json(res, 400, { error: 'Pflichtfelder fehlen' });
    }

    const result = { imap: null, smtp: null };

    // --- IMAP test ---
    try {
      const client = new ImapFlow({
        host: imap_host,
        port: Number(imap_port) || 993,
        secure: imap_secure !== false,
        auth: { user: username, pass: password },
        logger: false,
        tls: { rejectUnauthorized: false }
      });
      await client.connect();
      const lock = await client.getMailboxLock('INBOX');
      try {
        const mb = client.mailbox;
        result.imap = { ok: true, total: mb && mb.exists ? mb.exists : 0 };
      } finally { lock.release(); }
      await client.logout();
    } catch (e) {
      result.imap = { ok: false, error: e.message || String(e) };
    }

    // --- SMTP test ---
    try {
      const transporter = nodemailer.createTransport({
        host: smtp_host,
        port: Number(smtp_port) || 587,
        secure: !!smtp_secure,
        auth: { user: username, pass: password },
        tls: { rejectUnauthorized: false }
      });
      await transporter.verify();
      result.smtp = { ok: true };
    } catch (e) {
      result.smtp = { ok: false, error: e.message || String(e) };
    }

    const allOk = result.imap && result.imap.ok && result.smtp && result.smtp.ok;
    return json(res, allOk ? 200 : 400, result);
  } catch (e) {
    return json(res, e.status || 500, { error: e.message || String(e) });
  }
};
