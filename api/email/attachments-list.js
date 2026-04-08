const { requireUser, setCors, json } = require('../_lib/auth');
const { adminClient } = require('../_lib/supabase');

// GET /api/email/attachments-list?email_id=...
// Returns attachments for one email, scoped to the authenticated user.
// Uses the admin client so it works regardless of RLS on email_attachments.
module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });

  try {
    const user = await requireUser(req);
    const url = new URL(req.url, 'http://x');
    const emailId = url.searchParams.get('email_id');
    if (!emailId) return json(res, 400, { error: 'email_id required' });

    const sb = adminClient();
    const { data, error } = await sb
      .from('email_attachments')
      .select('id, filename, mime_type, size_bytes')
      .eq('email_id', emailId)
      .eq('user_id', user.id)
      .order('filename', { ascending: true });
    if (error) throw error;

    return json(res, 200, { attachments: data || [] });
  } catch (e) {
    return json(res, e.status || 500, { error: e.message || String(e) });
  }
};
