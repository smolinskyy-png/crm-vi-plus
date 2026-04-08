const { requireUser, setCors, json } = require('../../_lib/auth');
const { adminClient } = require('../../_lib/supabase');

// GET /api/google/calendar/status
// Returns whether the current user has a Google Calendar connected.
module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'GET') { json(res, 405, { error: 'Method not allowed' }); return; }
  try {
    const user = await requireUser(req);
    const sb = adminClient();
    const { data, error } = await sb
      .from('google_calendar_tokens')
      .select('google_email, calendar_id, last_sync_at, updated_at')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) { json(res, 200, { connected: false }); return; }
    json(res, 200, {
      connected: true,
      email: data.google_email,
      calendarId: data.calendar_id,
      lastSyncAt: data.last_sync_at,
      updatedAt: data.updated_at
    });
  } catch (e) {
    json(res, e.status || 500, { error: e.message });
  }
};
