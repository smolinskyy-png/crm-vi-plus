const { requireUser, setCors, json } = require('../_lib/auth');
const { adminClient } = require('../_lib/supabase');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });

  try {
    const user = await requireUser(req);
    const url = new URL(req.url, 'http://x');
    const id = url.searchParams.get('id');
    if (!id) return json(res, 400, { error: 'id required' });

    const sb = adminClient();
    const { data: att, error } = await sb
      .from('email_attachments')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();
    if (error || !att) return json(res, 404, { error: 'Anhang nicht gefunden' });

    const { data: signed, error: sErr } = await sb.storage
      .from('email-attachments')
      .createSignedUrl(att.storage_path, 300); // 5 min
    if (sErr) throw sErr;

    return json(res, 200, { url: signed.signedUrl, filename: att.filename, mime: att.mime_type });
  } catch (e) {
    return json(res, e.status || 500, { error: e.message || String(e) });
  }
};
