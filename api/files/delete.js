const { requireUser, setCors, json, readJson } = require('../_lib/auth');
const { adminClient } = require('../_lib/supabase');

// POST /api/files/delete  { path }
// Removes a file from `crm-files`. Verifies the path is inside the caller's
// namespace so users can't delete each other's files.
module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  try {
    const user = await requireUser(req);
    const body = await readJson(req);
    const path = body && body.path;
    if (!path) return json(res, 400, { error: 'path required' });
    if (!path.startsWith(user.id + '/')) return json(res, 403, { error: 'forbidden' });

    const sb = adminClient();
    const { error } = await sb.storage.from('crm-files').remove([path]);
    if (error) throw error;
    return json(res, 200, { ok: true });
  } catch (e) {
    return json(res, e.status || 500, { error: e.message || String(e) });
  }
};
