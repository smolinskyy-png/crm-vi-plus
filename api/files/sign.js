const { requireUser, setCors, json } = require('../_lib/auth');
const { adminClient } = require('../_lib/supabase');

// GET /api/files/sign?path=<storage path>
// Returns a 1-hour signed URL for the file. Verifies the path is inside the
// caller's namespace so users can't fetch each other's files.
module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });

  try {
    const user = await requireUser(req);
    const url = new URL(req.url, 'http://x');
    const path = url.searchParams.get('path');
    if (!path) return json(res, 400, { error: 'path required' });
    if (!path.startsWith(user.id + '/')) return json(res, 403, { error: 'forbidden' });

    const sb = adminClient();
    const { data, error } = await sb.storage
      .from('crm-files')
      .createSignedUrl(path, 3600);
    if (error) throw error;
    return json(res, 200, { url: data.signedUrl });
  } catch (e) {
    return json(res, e.status || 500, { error: e.message || String(e) });
  }
};
