const { requireUser, setCors, json } = require('../../_lib/auth');
const { adminClient } = require('../../_lib/supabase');

// POST /api/google/calendar/disconnect
// Removes the stored Google tokens for the current user. We intentionally do
// NOT revoke upstream — the user can do that in their Google account settings.
module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST' && req.method !== 'DELETE') { json(res, 405, { error: 'Method not allowed' }); return; }
  try {
    const user = await requireUser(req);
    const sb = adminClient();
    const { error } = await sb.from('google_calendar_tokens').delete().eq('user_id', user.id);
    if (error) throw error;
    json(res, 200, { ok: true });
  } catch (e) {
    json(res, e.status || 500, { error: e.message });
  }
};
