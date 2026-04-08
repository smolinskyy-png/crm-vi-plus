const { ImapFlow } = require('imapflow');
const { requireUser, setCors, json, readJson } = require('../_lib/auth');
const { adminClient } = require('../_lib/supabase');
const { buildImapConfig } = require('../_lib/imap-sync');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  try {
    const user = await requireUser(req);
    const body = await readJson(req);
    const { email_id, is_read } = body;
    if (!email_id) return json(res, 400, { error: 'email_id required' });

    const sb = adminClient();
    const { data: mail, error } = await sb
      .from('emails')
      .select('*, email_accounts!inner(*)')
      .eq('id', email_id)
      .eq('user_id', user.id)
      .single();
    if (error || !mail) return json(res, 404, { error: 'Mail nicht gefunden' });

    // Update flag on server
    try {
      const client = new ImapFlow(buildImapConfig(mail.email_accounts));
      await client.connect();
      const lock = await client.getMailboxLock(mail.folder || 'INBOX');
      try {
        if (is_read) {
          await client.messageFlagsAdd({ uid: mail.uid }, ['\\Seen'], { uid: true });
        } else {
          await client.messageFlagsRemove({ uid: mail.uid }, ['\\Seen'], { uid: true });
        }
      } finally { lock.release(); }
      await client.logout();
    } catch (e) {
      // Continue - we still want to update DB locally even if IMAP fails
      console.error('IMAP flag update failed:', e.message);
    }

    await sb.from('emails').update({ is_read: !!is_read }).eq('id', email_id);
    return json(res, 200, { ok: true });
  } catch (e) {
    return json(res, e.status || 500, { error: e.message || String(e) });
  }
};
