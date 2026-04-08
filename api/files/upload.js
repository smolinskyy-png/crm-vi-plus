const { requireUser, setCors, json, readJson } = require('../_lib/auth');
const { adminClient } = require('../_lib/supabase');

// POST /api/files/upload  { path, content_b64, content_type }
// Uploads a file to the private `crm-files` bucket on the user's behalf
// using the service-role key, so it works regardless of storage RLS.
// The final storage path is forced under `<user_id>/...` so users can
// never write into someone else's namespace.
module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  try {
    const user = await requireUser(req);
    const body = await readJson(req);
    const { path, content_b64, content_type } = body || {};
    if (!path || !content_b64) return json(res, 400, { error: 'path und content_b64 sind Pflicht' });

    // Force user namespace prefix
    const safePath = String(path).replace(/^\/+/, '');
    const finalPath = safePath.startsWith(user.id + '/') ? safePath : `${user.id}/${safePath}`;

    const buffer = Buffer.from(content_b64, 'base64');
    const sb = adminClient();
    const { error: upErr } = await sb.storage
      .from('crm-files')
      .upload(finalPath, buffer, {
        contentType: content_type || 'application/octet-stream',
        upsert: true
      });
    if (upErr) throw upErr;

    return json(res, 200, { ok: true, path: finalPath });
  } catch (e) {
    return json(res, e.status || 500, { error: e.message || String(e) });
  }
};
