const { requireUser, setCors, json, readJson } = require('../_lib/auth');
const { adminClient } = require('../_lib/supabase');

// POST /api/users/admin  { action, user_id }
// action: 'lock' | 'unlock' | 'delete'
// Only callable by admin users. Locks via Supabase auth.admin (banned_until),
// deletes via auth.admin.deleteUser. Profile rows are kept in sync.
module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  try {
    const caller = await requireUser(req);
    const sb = adminClient();

    // Verify caller is an admin
    const callerMeta = (caller.user_metadata || {});
    let callerRole = callerMeta.role || '';
    if (!callerRole) {
      try {
        const { data: prof } = await sb
          .from('user_profiles')
          .select('role')
          .eq('user_id', caller.id)
          .maybeSingle();
        callerRole = (prof && prof.role) || '';
      } catch (_) {}
    }
    if (callerRole !== 'ADMIN') {
      return json(res, 403, { error: 'Nur Administratoren dürfen diese Aktion ausführen' });
    }

    const body = await readJson(req);
    const { action, user_id } = body || {};
    if (!action || !user_id) return json(res, 400, { error: 'action und user_id erforderlich' });
    if (user_id === caller.id) return json(res, 400, { error: 'Du kannst dich nicht selbst bearbeiten' });

    // Look up the target so we know their email (and don't touch the master admin)
    let targetEmail = '';
    try {
      const { data: tu } = await sb.auth.admin.getUserById(user_id);
      targetEmail = (tu && tu.user && tu.user.email) || '';
    } catch (_) {}
    if (targetEmail.toLowerCase() === 'smolinskyy@vertriebsimmo.de') {
      return json(res, 403, { error: 'Master-Admin kann nicht bearbeitet werden' });
    }

    if (action === 'lock') {
      // 100 years ban = effectively locked. Use a very large duration string.
      const { error } = await sb.auth.admin.updateUserById(user_id, { ban_duration: '876000h' });
      if (error) throw error;
      try { await sb.from('user_profiles').update({ status: 'locked' }).eq('user_id', user_id); } catch (_) {}
      return json(res, 200, { ok: true, status: 'locked' });
    }

    if (action === 'unlock') {
      const { error } = await sb.auth.admin.updateUserById(user_id, { ban_duration: 'none' });
      if (error) throw error;
      try { await sb.from('user_profiles').update({ status: 'active' }).eq('user_id', user_id); } catch (_) {}
      return json(res, 200, { ok: true, status: 'active' });
    }

    if (action === 'delete') {
      // Best effort: clean up dependent rows first; FK cascades will catch the rest.
      try { await sb.from('user_profiles').delete().eq('user_id', user_id); } catch (_) {}
      try { await sb.from('crm_data').delete().eq('user_id', user_id); } catch (_) {}
      const { error } = await sb.auth.admin.deleteUser(user_id);
      if (error) throw error;
      return json(res, 200, { ok: true, deleted: true });
    }

    return json(res, 400, { error: 'unknown action' });
  } catch (e) {
    return json(res, e.status || 500, { error: e.message || String(e) });
  }
};
