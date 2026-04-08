const { requireUser, setCors, json } = require('../../_lib/auth');
const { buildAuthUrl } = require('../../_lib/google-calendar');

// GET /api/google/calendar/auth-start
// Returns a one-shot Google OAuth consent URL. The caller's Supabase access
// token is echoed back as the `state` parameter so the callback can verify it.
module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'GET') { json(res, 405, { error: 'Method not allowed' }); return; }
  try {
    await requireUser(req); // ensures the caller is signed in
    // The browser passes its Supabase access token in the Authorization header.
    // We reuse it as OAuth "state" so the callback can identify the user.
    const header = req.headers.authorization || req.headers.Authorization || '';
    const token = (header.match(/^Bearer\s+(.+)$/i) || [])[1];
    const url = buildAuthUrl(token);
    json(res, 200, { url });
  } catch (e) {
    json(res, e.status || 500, { error: e.message });
  }
};
