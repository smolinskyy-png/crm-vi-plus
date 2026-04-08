const { adminClient } = require('../_lib/supabase');
const { syncAccount, markAccountError } = require('../_lib/imap-sync');
const { json, setCors } = require('../_lib/auth');

// Vercel cron hits this endpoint. We protect it with CRON_SECRET header if set.
module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const expected = process.env.CRON_SECRET;
  if (expected) {
    const got = req.headers['x-cron-secret'] || req.headers['authorization'];
    const ok = got === expected || got === `Bearer ${expected}`;
    if (!ok) return json(res, 401, { error: 'unauthorized' });
  }

  try {
    const sb = adminClient();
    const { data: accounts, error } = await sb
      .from('email_accounts')
      .select('*')
      .eq('status', 'active')
      .order('last_sync_at', { ascending: true, nullsFirst: true })
      .limit(5); // cap per cron tick so we don't blow the timeout
    if (error) throw error;

    const results = [];
    // rough deadline: stay well under Vercel timeout
    const overallDeadline = Date.now() + 50000;
    for (const acc of accounts || []) {
      if (Date.now() > overallDeadline) break;
      try {
        const r = await syncAccount(acc, { limit: 15, deadlineMs: 8000 });
        results.push({ id: acc.id, ...r });
      } catch (e) {
        await markAccountError(acc.id, e.message || String(e));
        results.push({ id: acc.id, error: e.message || String(e) });
      }
    }
    return json(res, 200, { synced: results });
  } catch (e) {
    return json(res, 500, { error: e.message || String(e) });
  }
};
