const { requireUser, setCors, json, readJson } = require('../_lib/auth');
const { adminClient } = require('../_lib/supabase');

// POST /api/files/sign-upload  { path }
// Returns a one-time signed upload URL for the crm-files bucket. The client
// then uploads the file directly to Supabase, bypassing both storage RLS and
// the Vercel request-body size limit (4.5 MB on Hobby).
module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  try {
    const user = await requireUser(req);
    const body = await readJson(req);
    const rawPath = body && body.path;
    if (!rawPath) return json(res, 400, { error: 'path required' });

    // Force the file under the user's namespace.
    const safePath = String(rawPath).replace(/^\/+/, '');
    const finalPath = safePath.startsWith(user.id + '/') ? safePath : `${user.id}/${safePath}`;

    const sb = adminClient();
    const { data, error } = await sb.storage
      .from('crm-files')
      .createSignedUploadUrl(finalPath);
    if (error) throw error;

    return json(res, 200, {
      path: finalPath,
      token: data.token,
      signedUrl: data.signedUrl
    });
  } catch (e) {
    return json(res, e.status || 500, { error: e.message || String(e) });
  }
};
