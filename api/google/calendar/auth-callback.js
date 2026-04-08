const { adminClient } = require('../../_lib/supabase');
const { exchangeCodeForTokens, fetchGoogleUserEmail } = require('../../_lib/google-calendar');

// GET /api/google/calendar/auth-callback?code=...&state=<supabase_jwt>
// Google redirects here after the user approves the OAuth consent screen.
// We exchange the code for tokens, identify the Supabase user via the state
// token, and persist the refresh_token. Finally we return a small HTML page
// that posts a message to window.opener and auto-closes the popup.
module.exports = async function handler(req, res) {
  try {
    const url = new URL(req.url, 'http://x');
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const errParam = url.searchParams.get('error');
    if (errParam) return respondHtml(res, false, 'Google hat den Zugriff verweigert: ' + errParam);
    if (!code || !state) return respondHtml(res, false, 'Parameter code/state fehlen');

    // Identify the Supabase user from the state (which is their access token).
    const sb = adminClient();
    const { data: userData, error: userErr } = await sb.auth.getUser(state);
    if (userErr || !userData || !userData.user) {
      return respondHtml(res, false, 'Sitzung ungültig — bitte im CRM neu anmelden und erneut versuchen.');
    }
    const user = userData.user;

    // Exchange the one-shot code for tokens.
    const tokens = await exchangeCodeForTokens(code);
    if (!tokens.refresh_token) {
      // Happens if the user had previously authorised the app and Google
      // decided not to return a new refresh token. Ask them to revoke access
      // under myaccount.google.com and try again.
      return respondHtml(res, false, 'Google hat keinen Refresh-Token zurückgegeben. Bitte in deinem Google-Konto unter "Verknüpfte Apps" den Zugriff auf dieses CRM widerrufen und erneut verbinden.');
    }
    const googleEmail = await fetchGoogleUserEmail(tokens.access_token);
    const expiryTs = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    const row = {
      user_id: user.id,
      google_email: googleEmail,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_ts: expiryTs,
      scope: tokens.scope || null,
      calendar_id: 'primary',
      updated_at: new Date().toISOString()
    };
    const { error: upsertErr } = await sb.from('google_calendar_tokens').upsert(row, { onConflict: 'user_id' });
    if (upsertErr) throw upsertErr;

    respondHtml(res, true, 'Google Kalender erfolgreich verbunden', { email: googleEmail });
  } catch (e) {
    respondHtml(res, false, e.message || 'Fehler beim Verbinden mit Google Kalender');
  }
};

function respondHtml(res, success, message, extra) {
  const payload = JSON.stringify({ type: 'gcal-oauth', success, message, ...(extra || {}) });
  const title = success ? 'Google Kalender verbunden' : 'Google Kalender — Fehler';
  const color = success ? '#10b981' : '#ef4444';
  const icon = success ? '✓' : '✕';
  const html = `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif;background:#0f1117;color:#f4f4f5;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
    .card{background:#1a1d29;border:1px solid #2a2e3e;border-radius:16px;padding:40px 48px;max-width:460px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.5)}
    .icon{width:72px;height:72px;border-radius:50%;background:${color};color:white;font-size:42px;line-height:72px;margin:0 auto 20px}
    h1{margin:0 0 10px;font-size:20px}
    p{margin:0 0 20px;color:#a1a1aa;line-height:1.5;font-size:14px}
    .btn{display:inline-block;padding:10px 20px;background:#c9a84c;color:#0f1117;border:none;border-radius:8px;font-weight:600;text-decoration:none;cursor:pointer;font-size:14px}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h1>${title}</h1>
    <p>${escapeHtml(message)}</p>
    <button class="btn" onclick="window.close()">Fenster schließen</button>
  </div>
  <script>
    try {
      if (window.opener) window.opener.postMessage(${payload}, '*');
    } catch (e) {}
    setTimeout(function(){ try{ window.close(); }catch(e){} }, 1600);
  </script>
</body>
</html>`;
  res.status(200);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(html);
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
