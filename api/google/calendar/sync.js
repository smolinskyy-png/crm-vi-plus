const { requireUser, setCors, json, readJson } = require('../../_lib/auth');
const { adminClient } = require('../../_lib/supabase');
const {
  ensureFreshAccessToken,
  listEvents,
  insertEvent,
  patchEvent,
  crmEventToGoogleBody,
  googleEventToCrm
} = require('../../_lib/google-calendar');

// POST /api/google/calendar/sync
// Body: { events: [ { id, title, date, start, end, type, notiz, ort, kunde, googleId? } ] }
// - Pushes the given CRM events to Google Calendar (insert if no googleId yet,
//   otherwise patch). Google event ids are returned so the frontend can store
//   them on the CRM event.
// - Pulls Google Calendar events from (now - 30d) to (now + 180d) so the CRM
//   sees external bookings (Meetings scheduled in Google directly, etc.).
module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { json(res, 405, { error: 'Method not allowed' }); return; }

  try {
    const user = await requireUser(req);
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

    const body = await readJson(req);
    const crmEvents = Array.isArray(body.events) ? body.events : [];

    // --- PUSH: CRM → Google ---
    const pushResults = [];
    for (const e of crmEvents) {
      try {
        const payload = crmEventToGoogleBody(e);
        let gEvent;
        if (e.googleId) {
          gEvent = await patchEvent(accessToken, calendarId, e.googleId, payload);
        } else {
          gEvent = await insertEvent(accessToken, calendarId, payload);
        }
        pushResults.push({ id: e.id, googleId: gEvent.id, ok: true });
      } catch (err) {
        // 404 on patch → event was deleted in Google, recreate it as insert
        if (e.googleId && err.status === 404) {
          try {
            const gEvent = await insertEvent(accessToken, calendarId, crmEventToGoogleBody(e));
            pushResults.push({ id: e.id, googleId: gEvent.id, ok: true, recreated: true });
            continue;
          } catch (err2) {
            pushResults.push({ id: e.id, ok: false, error: err2.message });
            continue;
          }
        }
        pushResults.push({ id: e.id, ok: false, error: err.message });
      }
    }

    // --- PULL: Google → CRM ---
    const now = new Date();
    const timeMin = new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString();
    const timeMax = new Date(now.getTime() + 180 * 24 * 3600 * 1000).toISOString();
    const gList = await listEvents(accessToken, calendarId, { timeMin, timeMax });
    const pulled = [];
    if (gList && Array.isArray(gList.items)) {
      for (const ge of gList.items) {
        if (ge.status === 'cancelled') continue;
        const crm = googleEventToCrm(ge);
        if (crm) {
          // Preserve the original crm id if this event originated from the CRM
          const extCrmId = ge.extendedProperties && ge.extendedProperties.private && ge.extendedProperties.private.crm_id;
          if (extCrmId) crm.crmId = extCrmId;
          pulled.push(crm);
        }
      }
    }

    // Update last_sync_at
    await sb.from('google_calendar_tokens').update({
      last_sync_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).eq('user_id', user.id);

    json(res, 200, {
      ok: true,
      pushed: pushResults,
      pulled,
      pulledCount: pulled.length,
      pushedCount: pushResults.filter(r => r.ok).length,
      lastSyncAt: new Date().toISOString()
    });
  } catch (e) {
    json(res, e.status || 500, { error: e.message });
  }
};
