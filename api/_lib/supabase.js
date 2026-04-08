const { createClient } = require('@supabase/supabase-js');

function adminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing');
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

module.exports = { adminClient };
