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
        label, email, imap_host, imap_port, imap_secure,
        smtp_host, smtp_port, smtp_secure, username, password
      } = body;
      if (!label || !email || !imap_host || !smtp_host || !username || !password) {
        return json(res, 400, { error: 'Pflichtfelder fehlen' });
      }
      const row = {
        user_id: user.id,
        label,
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
