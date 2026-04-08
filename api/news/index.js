const { requireUser, setCors, json, readJson } = require('../_lib/auth');
const { adminClient } = require('../_lib/supabase');

// /api/news
//   GET                       → list all articles (any signed-in user)
//   POST   { ...fields }      → create (admin only)
//   PATCH  ?id=  { ...fields }→ update (admin only)
//   DELETE ?id=               → delete (admin only)
//
// Articles live in a single shared table so every signed-in user sees the
// same feed. Only ADMIN users may write.
module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const caller = await requireUser(req);
    const sb = adminClient();

    if (req.method === 'GET') {
      const { data, error } = await sb
        .from('news_articles')
        .select('*')
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return json(res, 200, { articles: data || [] });
    }

    // All write operations require ADMIN
    const callerRole = await resolveRole(sb, caller);
    if (callerRole !== 'ADMIN') {
      return json(res, 403, { error: 'Nur Administratoren dürfen Beiträge verwalten' });
    }

    if (req.method === 'POST') {
      const body = await readJson(req);
      const row = sanitize(body);
      if (!row.title) return json(res, 400, { error: 'Titel fehlt' });
      row.author = body.author || caller.email || 'Admin';
      row.author_id = caller.id;
      const { data, error } = await sb
        .from('news_articles')
        .insert(row)
        .select('*')
        .single();
      if (error) throw error;
      return json(res, 200, { article: data });
    }

    if (req.method === 'PATCH' || req.method === 'PUT') {
      const url = new URL(req.url, 'http://x');
      const id = url.searchParams.get('id');
      if (!id) return json(res, 400, { error: 'id required' });
      const body = await readJson(req);
      const patch = sanitize(body, true);
      if (!Object.keys(patch).length) return json(res, 400, { error: 'no fields' });
      patch.updated_at = new Date().toISOString();
      const { data, error } = await sb
        .from('news_articles')
        .update(patch)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return json(res, 200, { article: data });
    }

    if (req.method === 'DELETE') {
      const url = new URL(req.url, 'http://x');
      const id = url.searchParams.get('id');
      if (!id) return json(res, 400, { error: 'id required' });
      const { error } = await sb.from('news_articles').delete().eq('id', id);
      if (error) throw error;
      return json(res, 200, { ok: true });
    }

    return json(res, 405, { error: 'Method not allowed' });
  } catch (e) {
    return json(res, e.status || 500, { error: e.message || String(e) });
  }
};

function sanitize(body, partial = false) {
  const out = {};
  const fields = ['title', 'category', 'excerpt', 'content', 'image', 'important', 'pinned'];
  for (const f of fields) {
    if (body[f] !== undefined) {
      if (f === 'important' || f === 'pinned') out[f] = !!body[f];
      else out[f] = body[f] === null ? null : String(body[f]);
    } else if (!partial) {
      if (f === 'important' || f === 'pinned') out[f] = false;
      else if (f === 'category') out[f] = 'intern';
      else out[f] = null;
    }
  }
  return out;
}

async function resolveRole(sb, caller) {
  const meta = caller.user_metadata || {};
  if (meta.role) return meta.role;
  try {
    const { data } = await sb
      .from('user_profiles')
      .select('role')
      .eq('user_id', caller.id)
      .maybeSingle();
    return (data && data.role) || '';
  } catch (_) { return ''; }
}
