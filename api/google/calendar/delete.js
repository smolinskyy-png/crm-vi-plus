const { requireUser, setCors, json, readJson } = require('../../_lib/auth');
const { adminClient } = require('../../_lib/supabase');
const { ensureFreshAccessToken, deleteEvent } = require('../../_lib/google-calendar');

// POST /api/google/calendar/delete
// Body: { googleId }
// Removes a single event from the connected Google calendar.
module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST' && req.method !== 'DELETE') { json(res, 405, { error: 'Method not allowed' }); return; }
  try {
    const user = await requireUser(req);
    const body = await readJson(req);
    const googleId = body && body.googleId;
    if (!googleId) { json(res, 400, { error: 'googleId fehlt' }); return; }

    const sb = adminClient();
    const { data: tokenRow, error: tokenErr } = await sb
      .from('google_calendar_tokens')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    if (tokenErr) throw tokenErr;
    if (!tokenRow) { json(res, 400, { error: 'Google Kalender ist nicht verbunden' }); return; }

    const accessToken = await ensureFreshAccessToken(sb, tokenRow);
    const calendarId = tokenRow.calendar_id || 'primary';

    try {
      await deleteEvent(accessToken, calendarId, googleId);
    } catch (err) {
      // 404/410 = bereits weg → als Erfolg werten
      if (err.status !== 404 && err.status !== 410) throw err;
    }
    json(res, 200, { ok: true });
  } catch (e) {
    json(res, e.status || 500, { error: e.message });
  }
};
