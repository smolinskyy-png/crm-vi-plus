// Google OAuth 2.0 + Calendar API helpers.
//
// Env vars required on the server:
//   GOOGLE_CLIENT_ID
//   GOOGLE_CLIENT_SECRET
//   GOOGLE_OAUTH_REDIRECT_URI  (e.g. https://your-app.vercel.app/api/google/calendar/auth-callback)
//
// Scopes requested:
//   https://www.googleapis.com/auth/calendar        (read/write calendars + events)
//   https://www.googleapis.com/auth/userinfo.email  (know which Google account the user connected)

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/userinfo.email',
  'openid'
].join(' ');

function getConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Google OAuth env vars missing (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_OAUTH_REDIRECT_URI)');
  }
  return { clientId, clientSecret, redirectUri };
}

function buildAuthUrl(state) {
  const { clientId, redirectUri } = getConfig();
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',            // force refresh_token every time
    include_granted_scopes: 'true',
    state: state
  });
  return 'https://accounts.google.com/o/oauth2/v2/auth?' + params.toString();
}

async function exchangeCodeForTokens(code) {
  const { clientId, clientSecret, redirectUri } = getConfig();
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code'
  });
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error('Google token exchange failed: ' + res.status + ' ' + text);
  }
  return res.json(); // { access_token, expires_in, refresh_token, scope, token_type, id_token }
}

async function refreshAccessToken(refreshToken) {
  const { clientId, clientSecret } = getConfig();
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token'
  });
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error('Google token refresh failed: ' + res.status + ' ' + text);
  }
  return res.json(); // { access_token, expires_in, scope, token_type }
}

async function fetchGoogleUserEmail(accessToken) {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: 'Bearer ' + accessToken }
  });
  if (!res.ok) return null;
  const j = await res.json();
  return j.email || null;
}

// Ensures the cached access_token is still valid (>60s left), refreshes it
// automatically and persists the new expiry to the DB.
async function ensureFreshAccessToken(sb, row) {
  const now = Date.now();
  const exp = new Date(row.expiry_ts).getTime();
  if (exp - now > 60 * 1000) return row.access_token;
  const refreshed = await refreshAccessToken(row.refresh_token);
  const newExpiry = new Date(now + refreshed.expires_in * 1000).toISOString();
  await sb.from('google_calendar_tokens').update({
    access_token: refreshed.access_token,
    expiry_ts: newExpiry,
    updated_at: new Date().toISOString()
  }).eq('user_id', row.user_id);
  return refreshed.access_token;
}

// --- Calendar API wrappers ---

async function gcalRequest(accessToken, path, opts = {}) {
  const url = 'https://www.googleapis.com/calendar/v3' + path;
  const res = await fetch(url, {
    method: opts.method || 'GET',
    headers: {
      Authorization: 'Bearer ' + accessToken,
      'Content-Type': 'application/json'
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  if (res.status === 204) return null;
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch (e) { /* non-json */ }
  if (!res.ok) {
    const err = new Error('Google Calendar API ' + res.status + ': ' + (json && json.error && json.error.message || text));
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json;
}

function listEvents(accessToken, calendarId, params = {}) {
  const sp = new URLSearchParams({
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250',
    ...params
  });
  return gcalRequest(accessToken, '/calendars/' + encodeURIComponent(calendarId) + '/events?' + sp.toString());
}

// Liste aller dem User zugänglichen Kalender (eigene + Abos wie iCloud-ICS)
function listCalendars(accessToken) {
  return gcalRequest(accessToken, '/users/me/calendarList?minAccessRole=reader&maxResults=250');
}

function insertEvent(accessToken, calendarId, body) {
  return gcalRequest(accessToken, '/calendars/' + encodeURIComponent(calendarId) + '/events', {
    method: 'POST', body
  });
}

function patchEvent(accessToken, calendarId, eventId, body) {
  return gcalRequest(accessToken, '/calendars/' + encodeURIComponent(calendarId) + '/events/' + encodeURIComponent(eventId), {
    method: 'PATCH', body
  });
}

function deleteEvent(accessToken, calendarId, eventId) {
  return gcalRequest(accessToken, '/calendars/' + encodeURIComponent(calendarId) + '/events/' + encodeURIComponent(eventId), {
    method: 'DELETE'
  });
}

// Converts a CRM event {date, start, end, title, notiz, ort, kunde, type, id}
// into a Google Calendar event body. Uses extendedProperties.private.crm_id
// so we can match it again later.
function crmEventToGoogleBody(e, tz = 'Europe/Berlin') {
  const startDT = (e.date || '') + 'T' + ((e.start || '09:00') + ':00');
  const endDT = (e.date || '') + 'T' + ((e.end || e.start || '10:00') + ':00');
  return {
    summary: e.title || '(Ohne Titel)',
    description: [e.notiz, e.kunde ? ('Kunde: ' + e.kunde) : ''].filter(Boolean).join('\n\n'),
    location: e.ort || '',
    start: { dateTime: startDT, timeZone: tz },
    end:   { dateTime: endDT,   timeZone: tz },
    extendedProperties: {
      private: {
        crm_id: String(e.id),
        crm_type: e.type || 'intern',
        ...(e.customType ? { crm_custom_type: String(e.customType) } : {})
      }
    }
  };
}

// Formats a JS Date as YYYY-MM-DD / HH:MM in a fixed IANA timezone.
// Vercel-Lambdas laufen in UTC, deshalb dürfen wir nicht Date.getHours()
// nutzen — sonst landen Berlin-Termine 2h früher im CRM.
function formatInTz(date, tz) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false
  }).formatToParts(date).reduce((acc, p) => { acc[p.type] = p.value; return acc; }, {});
  // Intl liefert "24" statt "00" für Mitternacht
  if (parts.hour === '24') parts.hour = '00';
  return {
    date: parts.year + '-' + parts.month + '-' + parts.day,
    time: parts.hour + ':' + parts.minute
  };
}

// Turns a Google Calendar event into a CRM calendar event
function googleEventToCrm(ge, tz = 'Europe/Berlin') {
  const startRaw = (ge.start && (ge.start.dateTime || ge.start.date)) || null;
  const endRaw   = (ge.end && (ge.end.dateTime || ge.end.date)) || null;
  if (!startRaw) return null;
  const isAllDay = !!(ge.start && ge.start.date && !ge.start.dateTime);
  const startDate = new Date(startRaw);
  const endDate = endRaw ? new Date(endRaw) : new Date(startDate.getTime() + 60 * 60 * 1000);
  let dateStr, startStr, endStr;
  if (isAllDay) {
    // Ganztägige Events: Date kommt als YYYY-MM-DD ohne Uhrzeit
    dateStr = startRaw;
    startStr = '00:00';
    endStr = '23:59';
  } else {
    const s = formatInTz(startDate, tz);
    const e = formatInTz(endDate, tz);
    dateStr = s.date;
    startStr = s.time;
    endStr = e.time;
  }
  return {
    googleId: ge.id,
    title: ge.summary || '(Ohne Titel)',
    notiz: ge.description || '',
    ort: ge.location || '',
    date: dateStr,
    start: startStr,
    end: endStr,
    type: (ge.extendedProperties && ge.extendedProperties.private && ge.extendedProperties.private.crm_type) || 'google',
    customType: (ge.extendedProperties && ge.extendedProperties.private && ge.extendedProperties.private.crm_custom_type) || undefined,
    source: 'google'
  };
}

module.exports = {
  SCOPES,
  getConfig,
  buildAuthUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  fetchGoogleUserEmail,
  ensureFreshAccessToken,
  gcalRequest,
  listEvents,
  listCalendars,
  insertEvent,
  patchEvent,
  deleteEvent,
  crmEventToGoogleBody,
  googleEventToCrm
};
