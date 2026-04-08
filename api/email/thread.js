const { requireUser, setCors, json } = require('../_lib/auth');
const { adminClient } = require('../_lib/supabase');

// GET /api/email/thread?email_id=...
// Returns all emails in the same conversation as `email_id`, sorted oldest→newest.
// Walks the message_id / in_reply_to / references graph plus a subject fallback.
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
    const { data: seed, error } = await sb
      .from('emails')
      .select('id, message_id, in_reply_to, references, subject')
      .eq('id', emailId)
      .eq('user_id', user.id)
      .single();
    if (error || !seed) return json(res, 404, { error: 'Mail nicht gefunden' });

    // Collect message_ids in the thread by BFS over message_id / in_reply_to / references
    const known = new Map(); // id -> row
    const msgIds = new Set();
    if (seed.message_id) msgIds.add(seed.message_id);
    if (seed.in_reply_to) msgIds.add(seed.in_reply_to);
    if (Array.isArray(seed.references)) seed.references.forEach(r => r && msgIds.add(r));

    // Iterate up to 4 expansion rounds (covers most threads)
    for (let round = 0; round < 4; round++) {
      const ids = Array.from(msgIds);
      if (!ids.length) break;
      const { data: rows } = await sb
        .from('emails')
        .select('id, account_id, folder, subject, from_address, from_name, to_addresses, cc_addresses, body_text, body_html, date_sent, is_read, has_attachments, message_id, in_reply_to, references')
        .eq('user_id', user.id)
        .or(
          'message_id.in.(' + ids.map(i => '"' + i.replace(/"/g, '\\"') + '"').join(',') + '),' +
          'in_reply_to.in.(' + ids.map(i => '"' + i.replace(/"/g, '\\"') + '"').join(',') + ')'
        );
      let added = false;
      for (const r of (rows || [])) {
        if (known.has(r.id)) continue;
        known.set(r.id, r);
        added = true;
        if (r.message_id && !msgIds.has(r.message_id)) msgIds.add(r.message_id);
        if (r.in_reply_to && !msgIds.has(r.in_reply_to)) msgIds.add(r.in_reply_to);
        if (Array.isArray(r.references)) r.references.forEach(x => x && msgIds.add(x));
      }
      if (!added) break;
    }

    // Subject fallback: include emails with same normalized subject from the same correspondents.
    if (known.size <= 1 && seed.subject) {
      const norm = seed.subject.replace(/^(re|aw|fwd|wg|fw):\s*/gi, '').trim();
      if (norm) {
        const { data: byTitle } = await sb
          .from('emails')
          .select('id, account_id, folder, subject, from_address, from_name, to_addresses, cc_addresses, body_text, body_html, date_sent, is_read, has_attachments, message_id, in_reply_to, references')
          .eq('user_id', user.id)
          .ilike('subject', '%' + norm + '%')
          .limit(50);
        for (const r of (byTitle || [])) known.set(r.id, r);
      }
    }

    // Always include the seed itself (full row)
    if (!known.has(seed.id)) {
      const { data: full } = await sb.from('emails').select('*').eq('id', seed.id).single();
      if (full) known.set(full.id, full);
    }

    const list = Array.from(known.values()).sort((a, b) => {
      const da = a.date_sent ? new Date(a.date_sent).getTime() : 0;
      const db = b.date_sent ? new Date(b.date_sent).getTime() : 0;
      return da - db;
    });

    return json(res, 200, { thread: list });
  } catch (e) {
    return json(res, e.status || 500, { error: e.message || String(e) });
  }
};
