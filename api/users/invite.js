const nodemailer = require('nodemailer');
const { requireUser, setCors, json, readJson } = require('../_lib/auth');
const { adminClient } = require('../_lib/supabase');
const { decrypt } = require('../_lib/crypto');

// POST /api/users/invite  { firstName, lastName, email, phone, role, redirect_to? }
// Creates the user via the admin API (no anon signUp), generates a recovery
// link, and sends a custom branded welcome email through one of the inviting
// admin's existing email_accounts (or env-based SMTP fallback).
module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  try {
    const caller = await requireUser(req);
    const body = await readJson(req);
    const { firstName, lastName, email, phone, role, redirect_to } = body || {};
    if (!firstName || !lastName || !email) {
      return json(res, 400, { error: 'firstName, lastName und email sind Pflicht' });
    }
    if (String(email).toLowerCase() === 'smolinskyy@vertriebsimmo.de') {
      return json(res, 400, { error: 'Dieser Account ist der Admin und darf nicht eingeladen werden.' });
    }

    const sb = adminClient();
    const roleMap = { admin: 'ADMIN', partner: 'AGENT', kunde: 'VIEWER' };
    const dbRole = roleMap[role] || 'AGENT';
    const fullName = (firstName + ' ' + lastName).trim();
    const tempPassword = randomTempPassword();

    // 1) Create the auth user via admin API. email_confirm: true so they can
    // log in immediately with the recovery link without a separate confirm step.
    let userId;
    try {
      const { data: created, error: cErr } = await sb.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
          name: fullName,
          phone: phone || '',
          role: dbRole,
          force_password_change: true,
          profile_complete: false,
          invited_by: caller.email || null,
          invited_at: new Date().toISOString()
        }
      });
      if (cErr) throw cErr;
      userId = created.user && created.user.id;
    } catch (e) {
      // If the user already exists, look them up so we can re-send the invite.
      const msg = (e && e.message) || String(e);
      if (/already.*registered|already exists|duplicate/i.test(msg)) {
        const { data: list } = await sb.auth.admin.listUsers({ page: 1, perPage: 200 });
        const existing = list && list.users && list.users.find(u => (u.email || '').toLowerCase() === email.toLowerCase());
        if (existing) userId = existing.id;
        else return json(res, 400, { error: msg });
      } else {
        return json(res, 400, { error: msg });
      }
    }

    // 2) Upsert user_profiles row (the trigger may have already created it).
    try {
      await sb.from('user_profiles').upsert({
        user_id: userId,
        email,
        first_name: firstName,
        last_name: lastName,
        phone: phone || '',
        role: dbRole,
        status: 'invited',
        invited_by: caller.email || null,
        invited_at: new Date().toISOString()
      }, { onConflict: 'user_id' });
    } catch (e) { console.warn('user_profiles upsert', e.message); }

    // 3) Generate a recovery link the invitee can click to set their own password.
    const redirectTo = redirect_to || (req.headers.origin || '') + '/';
    let actionLink = '';
    try {
      const { data: linkData, error: linkErr } = await sb.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: { redirectTo }
      });
      if (linkErr) throw linkErr;
      actionLink = (linkData && (linkData.properties && linkData.properties.action_link)) || '';
    } catch (e) {
      return json(res, 500, { error: 'Konnte Einladungslink nicht erzeugen: ' + (e.message || e) });
    }

    // 4) Send a branded HTML welcome email via one of the caller's email accounts.
    const transport = await buildTransportForUser(sb, caller.id);
    if (!transport) {
      return json(res, 200, {
        ok: true,
        user_id: userId,
        action_link: actionLink,
        temp_password: tempPassword,
        email_sent: false,
        warning: 'Kein E-Mail-Account konfiguriert — bitte den Link manuell senden.'
      });
    }

    const subject = `Willkommen bei VertriebsImmo, ${firstName}!`;
    const html = renderWelcomeHtml({ firstName, fullName, actionLink, fromName: transport.fromName });
    const text = renderWelcomeText({ firstName, fullName, actionLink });

    try {
      await transport.sendMail({
        from: transport.from,
        to: email,
        subject,
        text,
        html
      });
    } catch (e) {
      return json(res, 200, {
        ok: true,
        user_id: userId,
        action_link: actionLink,
        temp_password: tempPassword,
        email_sent: false,
        warning: 'Account angelegt, aber E-Mail konnte nicht gesendet werden: ' + (e.message || e)
      });
    }

    return json(res, 200, {
      ok: true,
      user_id: userId,
      email_sent: true,
      temp_password: tempPassword
    });
  } catch (e) {
    return json(res, e.status || 500, { error: e.message || String(e) });
  }
};

function randomTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let p = '';
  for (let i = 0; i < 14; i++) p += chars[Math.floor(Math.random() * chars.length)];
  return p + '!9';
}

async function buildTransportForUser(sb, userId) {
  // 1) env fallback (preferred for system invites)
  if (process.env.INVITE_SMTP_HOST && process.env.INVITE_SMTP_USER && process.env.INVITE_SMTP_PASS) {
    const tx = nodemailer.createTransport({
      host: process.env.INVITE_SMTP_HOST,
      port: Number(process.env.INVITE_SMTP_PORT) || 587,
      secure: String(process.env.INVITE_SMTP_SECURE || '') === 'true',
      auth: { user: process.env.INVITE_SMTP_USER, pass: process.env.INVITE_SMTP_PASS },
      tls: { rejectUnauthorized: false }
    });
    return {
      from: process.env.INVITE_FROM || process.env.INVITE_SMTP_USER,
      fromName: process.env.INVITE_FROM_NAME || 'VertriebsImmo',
      sendMail: tx.sendMail.bind(tx)
    };
  }
  // 2) use one of the caller's saved email_accounts
  try {
    const { data: accounts } = await sb
      .from('email_accounts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(1);
    const acc = accounts && accounts[0];
    if (!acc) return null;
    const tx = nodemailer.createTransport({
      host: acc.smtp_host,
      port: acc.smtp_port || 587,
      secure: !!acc.smtp_secure,
      auth: { user: acc.username, pass: decrypt(acc.password_encrypted) },
      tls: { rejectUnauthorized: false }
    });
    return {
      from: `${acc.label || 'VertriebsImmo'} <${acc.email}>`,
      fromName: acc.label || 'VertriebsImmo',
      sendMail: tx.sendMail.bind(tx)
    };
  } catch (_) { return null; }
}

function renderWelcomeText({ firstName, fullName, actionLink }) {
  return [
    `Herzlich willkommen, ${firstName}!`,
    '',
    'Wir freuen uns auf die Zusammenarbeit mit dir.',
    '',
    'Bitte klicke auf den folgenden Link, um dein persönliches Passwort zu erstellen.',
    'Sobald du das gemacht hast, hast du vollen Zugriff auf das System.',
    '',
    actionLink,
    '',
    'Falls du diese E-Mail nicht erwartet hast, kannst du sie einfach ignorieren.',
    '',
    'Beste Grüße',
    'Dein VertriebsImmo Team'
  ].join('\n');
}

function renderWelcomeHtml({ firstName, actionLink, fromName }) {
  const safeFirst = String(firstName).replace(/[<>]/g, '');
  const safeFrom = String(fromName || 'VertriebsImmo').replace(/[<>]/g, '');
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<title>Willkommen bei VertriebsImmo</title>
</head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1a1a1a">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:40px 16px">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 8px 24px rgba(15,23,42,0.06)">
          <tr>
            <td style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);padding:36px 40px;text-align:center">
              <div style="font-size:28px;font-weight:800;color:#ffffff;letter-spacing:0.5px">VertriebsImmo</div>
              <div style="font-size:13px;color:#cbd5e1;margin-top:6px;letter-spacing:1.5px;text-transform:uppercase">Premium CRM</div>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 16px 40px">
              <div style="font-size:22px;font-weight:700;color:#0f172a;margin-bottom:16px">Herzlich willkommen, ${safeFirst}! 🎉</div>
              <div style="font-size:15px;line-height:1.7;color:#475569">
                Wir freuen uns sehr auf die Zusammenarbeit mit dir und heißen dich herzlich in unserem System willkommen.
                <br><br>
                Damit du sofort loslegen kannst, klicke einfach auf den Button unten und erstelle dein persönliches Passwort. Danach hast du vollen Zugriff auf alle Funktionen.
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 40px 32px 40px;text-align:center">
              <a href="${actionLink}" style="display:inline-block;background:#d4af37;color:#0f172a;text-decoration:none;font-weight:700;font-size:15px;padding:14px 36px;border-radius:10px;box-shadow:0 4px 12px rgba(212,175,55,0.35)">Passwort jetzt erstellen →</a>
              <div style="font-size:12px;color:#94a3b8;margin-top:14px">Der Link ist aus Sicherheitsgründen zeitlich begrenzt gültig.</div>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 32px 40px">
              <div style="border-top:1px solid #e2e8f0;padding-top:20px;font-size:13px;color:#64748b;line-height:1.6">
                Falls der Button nicht funktioniert, kopiere bitte folgenden Link in deinen Browser:<br>
                <span style="word-break:break-all;color:#475569">${actionLink}</span>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background:#f8fafc;padding:24px 40px;text-align:center;font-size:12px;color:#94a3b8">
              Diese E-Mail wurde von <strong style="color:#475569">${safeFrom}</strong> gesendet.<br>
              Falls du diese Einladung nicht erwartet hast, kannst du sie einfach ignorieren.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
