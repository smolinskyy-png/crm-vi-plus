const { requireUser, setCors, json, readJson } = require('../_lib/auth');
const { adminClient } = require('../_lib/supabase');
const { syncAccount, markAccountError } = require('../_lib/imap-sync');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  try {
    const user = await requireUser(req);
    const body = await readJson(req);
    const { account_id, limit } = body;
    if (!account_id) return json(res, 400, { error: 'account_id required' });

    const sb = adminClient();
    const { data: account, error } = await sb
      .from('email_accounts')
      .select('*')
      .eq('id', account_id)
      .eq('user_id', user.id)
      .single();
    if (error || !account) return json(res, 404, { error: 'Account nicht gefunden' });

    try {
      const result = await syncAccount(account, { limit: Number(limit) || 20 });
      return json(res, 200, result);
    } catch (e) {
      await markAccountError(account.id, e.message || String(e));
      return json(res, 500, { error: e.message || String(e) });
    }
  } catch (e) {
    return json(res, e.status || 500, { error: e.message || String(e) });
  }
};
