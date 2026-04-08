const { requireUser, setCors, json, readJson } = require('../_lib/auth');
const { adminClient } = require('../_lib/supabase');
const { encrypt } = require('../_lib/crypto');

// Never return encrypted password to client
function sanitize(row) {
  if (!row) return row;
  const { password_encrypted, ...rest } = row;
  return rest;
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const user = await requireUser(req);
    const sb = adminClient();

    if (req.method === 'GET') {
      const { data, error } = await sb
        .from('email_accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return json(res, 200, { accounts: (data || []).map(sanitize) });
    }

    if (req.method === 'POST') {
      const body = await readJson(req);
      const {
        label, from_name, email, imap_host, imap_port, imap_secure,
        smtp_host, smtp_port, smtp_secure, username, password
      } = body;
      if (!label || !email || !imap_host || !smtp_host || !username || !password) {
        return json(res, 400, { error: 'Pflichtfelder fehlen' });
      }
      const row = {
        user_id: user.id,
        label,
        from_name: from_name || label,
        email,
        imap_host,
        imap_port: Number(imap_port) || 993,
        imap_secure: imap_secure !== false,
        smtp_host,
        smtp_port: Number(smtp_port) || 587,
        smtp_secure: !!smtp_secure,
        username,
        password_encrypted: encrypt(password),
        status: 'active'
      };
      const { data, error } = await sb.from('email_accounts').insert(row).select('*').single();
      if (error) throw error;
      return json(res, 200, { account: sanitize(data) });
    }

    if (req.method === 'PATCH' || req.method === 'PUT') {
      const url = new URL(req.url, 'http://x');
      const id = url.searchParams.get('id');
      if (!id) return json(res, 400, { error: 'id required' });
      const body = await readJson(req);
      const allowed = ['label','from_name','email','imap_host','imap_port','imap_secure','smtp_host','smtp_port','smtp_secure','username'];
      const patch = {};
      for (const k of allowed) {
        if (body[k] !== undefined) patch[k] = body[k];
      }
      if (patch.imap_port !== undefined) patch.imap_port = Number(patch.imap_port) || 993;
      if (patch.smtp_port !== undefined) patch.smtp_port = Number(patch.smtp_port) || 587;
      if (patch.imap_secure !== undefined) patch.imap_secure = patch.imap_secure !== false;
      if (patch.smtp_secure !== undefined) patch.smtp_secure = !!patch.smtp_secure;
      if (body.password) patch.password_encrypted = encrypt(body.password);
      if (!Object.keys(patch).length) return json(res, 400, { error: 'no fields to update' });
      const { data, error } = await sb
        .from('email_accounts')
        .update(patch)
        .eq('id', id)
        .eq('user_id', user.id)
        .select('*')
        .single();
      if (error) throw error;
      return json(res, 200, { account: sanitize(data) });
    }

    if (req.method === 'DELETE') {
      // Expect ?id=...
      const url = new URL(req.url, 'http://x');
      const id = url.searchParams.get('id');
      if (!id) return json(res, 400, { error: 'id required' });
      // attachments cascade via FK; also remove storage files for this user/account
      const { data: emails } = await sb
        .from('emails')
        .select('id')
        .eq('account_id', id)
        .eq('user_id', user.id);
      if (emails && emails.length) {
        const ids = emails.map(e => e.id);
        const { data: atts } = await sb
          .from('email_attachments')
          .select('storage_path')
          .in('email_id', ids);
        if (atts && atts.length) {
          const paths = atts.map(a => a.storage_path);
          try { await sb.storage.from('email-attachments').remove(paths); } catch (_) {}
        }
      }
      const { error } = await sb
        .from('email_accounts')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;
      return json(res, 200, { ok: true });
    }

    return json(res, 405, { error: 'Method not allowed' });
  } catch (e) {
    return json(res, e.status || 500, { error: e.message || String(e) });
  }
};
