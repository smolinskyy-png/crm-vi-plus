const { ImapFlow } = require('imapflow');
const { requireUser, setCors, json, readJson } = require('../_lib/auth');
const { adminClient } = require('../_lib/supabase');
const { buildImapConfig, discoverFolders } = require('../_lib/imap-sync');

// POST /api/email/move  { email_id, target_folder }
// target_folder: 'TRASH' | 'INBOX' | 'ARCHIVE' | 'SPAM'
// Moves a single message between folders on IMAP and updates the local row.
module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  try {
    const user = await requireUser(req);
    const body = await readJson(req);
    const { email_id, target_folder } = body || {};
    if (!email_id || !target_folder) {
      return json(res, 400, { error: 'email_id und target_folder erforderlich' });
    }
    const targetKey = String(target_folder).toUpperCase();
    if (!['INBOX', 'TRASH', 'ARCHIVE', 'SPAM'].includes(targetKey)) {
      return json(res, 400, { error: 'invalid target_folder' });
    }

    const sb = adminClient();
    const { data: mail, error } = await sb
      .from('emails')
      .select('*, email_accounts!inner(*)')
      .eq('id', email_id)
      .eq('user_id', user.id)
      .single();
    if (error || !mail) return json(res, 404, { error: 'Mail nicht gefunden' });

    const account = mail.email_accounts;
    const srcKey = mail.folder || 'INBOX';

    const client = new ImapFlow(buildImapConfig(account));
    let movedUid = null;
    try {
      await client.connect();
      const discovered = await discoverFolders(client);
      if (!discovered.INBOX) discovered.INBOX = { path: 'INBOX' };

      const srcBox = discovered[srcKey];
      const tgtBox = discovered[targetKey];
      if (!srcBox) throw new Error('Quellordner nicht gefunden: ' + srcKey);
      if (!tgtBox) throw new Error('Zielordner nicht auf dem Server gefunden: ' + targetKey);

      const lock = await client.getMailboxLock(srcBox.path);
      try {
        const result = await client.messageMove({ uid: mail.uid }, tgtBox.path, { uid: true });
        // result.uidMap is a Map of source UID -> target UID (when UIDPLUS is supported)
        if (result && result.uidMap) {
          const v = result.uidMap.get ? result.uidMap.get(Number(mail.uid)) : result.uidMap[mail.uid];
          if (v) movedUid = Number(v);
        }
      } finally { lock.release(); }
    } catch (e) {
      try { await client.logout(); } catch (_) {}
      return json(res, 500, { error: 'IMAP move failed: ' + (e.message || String(e)) });
    }
    try { await client.logout(); } catch (_) {}

    // Update local row to reflect new location. If we know the new UID, use it;
    // otherwise the next sync of the target folder will reconcile.
    const update = { folder: targetKey };
    if (movedUid != null) update.uid = movedUid;
    await sb.from('emails').update(update).eq('id', email_id);

    return json(res, 200, { ok: true, target_folder: targetKey, new_uid: movedUid });
  } catch (e) {
    return json(res, e.status || 500, { error: e.message || String(e) });
  }
};
