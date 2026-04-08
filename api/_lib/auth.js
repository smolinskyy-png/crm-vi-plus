const { adminClient } = require('./supabase');

// Extracts bearer token from Authorization header and verifies it with Supabase.
// Returns { user } or throws.
async function requireUser(req) {
  const header = req.headers.authorization || req.headers.Authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    const err = new Error('Missing Authorization header');
    err.status = 401;
    throw err;
  }
  const token = match[1];
  const sb = adminClient();
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data || !data.user) {
    const err = new Error('Invalid or expired token');
    err.status = 401;
    throw err;
  }
  return data.user;
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function json(res, status, data) {
  res.status(status);
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  return new Promise((resolve, reject) => {
    let buf = '';
    req.on('data', c => { buf += c; });
    req.on('end', () => {
      if (!buf) return resolve({});
      try { resolve(JSON.parse(buf)); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

module.exports = { requireUser, setCors, json, readJson };
