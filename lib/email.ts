import nodemailer from 'nodemailer';
import { google } from 'googleapis';
import { sendViaOAuth, hasToken } from '@/lib/gmail-oauth';

interface EmailOptions {
  to: string[];
  subject: string;
  html: string;
  fromEmail?: string;
  fromName?: string;
}

// ── 1. Gmail API con Domain-Wide Delegation (método principal) ────────────────
// La cuenta de servicio impersona al usuario que tomó la acción.
// FROM es el correo REAL de esa persona — sin que configure nada.
async function sendViaDWD(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  const serviceEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.replace(/^"|"$/g, '');
  const privateKey   = process.env.GOOGLE_PRIVATE_KEY?.replace(/^"|"$/g, '').replace(/\\n/g, '\n');
  const fromEmail    = options.fromEmail;

  if (!serviceEmail || !privateKey || !fromEmail) {
    return { success: false, error: 'Credenciales DWD o fromEmail no configurados' };
  }

  try {
    const auth = new google.auth.JWT({
      email: serviceEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/gmail.send'],
      subject: fromEmail,
    });

    const gmail = google.gmail({ version: 'v1', auth });

    const encodedName = options.fromName
      ? `=?UTF-8?B?${Buffer.from(options.fromName).toString('base64')}?=`
      : null;
    const fromHeader = encodedName ? `${encodedName} <${fromEmail}>` : fromEmail;
    const raw = [
      `From: ${fromHeader}`,
      `To: ${options.to.join(', ')}`,
      `Subject: =?UTF-8?B?${Buffer.from(options.subject).toString('base64')}?=`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      '',
      options.html,
    ].join('\r\n');

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: Buffer.from(raw).toString('base64url') },
    });

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error DWD' };
  }
}

// ── 2. SMTP nodemailer (último recurso) ──────────────────────────────────────
async function sendViaSMTP(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) return { success: false, error: 'SMTP no configurado' };

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user, pass },
  });

  try {
    await transporter.sendMail({
      from: options.fromName
        ? `"${options.fromName} via Yule" <${user}>`
        : `"Seguimiento de Virtualización" <${user}>`,
      to: options.to.join(', '),
      subject: options.subject,
      html: options.html,
      replyTo: options.fromEmail,
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error SMTP' };
  }
}

// ── Principal: DWD → OAuth personal → SMTP ───────────────────────────────────
export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  // 1. DWD: FROM es el correo real de quien tomó la acción (no requiere configuración por usuario)
  if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY && options.fromEmail) {
    const r = await sendViaDWD(options);
    if (r.success) {
      console.log(`[email] ✅ DWD — FROM: ${options.fromEmail} → ${options.to.join(', ')}`);
      return r;
    }
    console.warn('[email] DWD falló:', r.error);
  }

  // 2. OAuth personal (si el usuario conectó su cuenta en /connect-gmail)
  if (options.fromEmail && hasToken(options.fromEmail)) {
    const r = await sendViaOAuth(options.fromEmail, options.to, options.subject, options.html, options.fromName);
    if (r.success) {
      console.log(`[email] ✅ OAuth — FROM: ${options.fromEmail} → ${options.to.join(', ')}`);
      return r;
    }
    console.warn('[email] OAuth falló:', r.error);
  }

  // 3. SMTP como último recurso
  const r = await sendViaSMTP(options);
  if (r.success) console.log(`[email] ✅ SMTP → ${options.to.join(', ')}`);
  else console.warn('[email] ❌ Todos los métodos fallaron:', r.error);
  return r;
}

export function buildEmailHtml(params: {
  accion: string;
  gestor: string;
  di?: string;
  nivel: string;
  programa: string;
  curso: string;
  fecha: string;
  mensaje?: string;
}): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;background:#f0f2f5;color:#1a1a2e}
  .wrap{max-width:560px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(19,0,253,.10)}
  .top-bar{height:5px;background:linear-gradient(90deg,#1300fd 0%,#ff0040 50%,#ffbb2c 100%)}
  .header{background:#1300fd;padding:32px 36px 28px}
  .header-logo{font-size:11px;font-weight:700;letter-spacing:3px;color:rgba(255,255,255,.6);text-transform:uppercase;margin-bottom:12px}
  .header h1{font-size:22px;font-weight:700;color:#fff;line-height:1.3;margin-bottom:6px}
  .header p{font-size:13px;color:rgba(255,255,255,.75)}
  .badge-wrap{padding:20px 36px 0}
  .badge{display:inline-flex;align-items:center;gap:7px;background:#fff0f3;border:1.5px solid #ff0040;color:#ff0040;font-size:12px;font-weight:700;padding:6px 14px;border-radius:999px;letter-spacing:.3px}
  .badge-dot{width:7px;height:7px;border-radius:50%;background:#ff0040;display:inline-block}
  .body{padding:24px 36px 28px}
  .section-title{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#1300fd;margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid #1300fd}
  .row{display:flex;justify-content:space-between;align-items:flex-start;padding:10px 0;border-bottom:1px solid #f0f2f5;gap:16px}
  .row:last-of-type{border-bottom:none}
  .label{font-size:13px;color:#6b7280;font-weight:500;white-space:nowrap}
  .value{font-size:13px;color:#111827;font-weight:600;text-align:right;max-width:60%}
  .highlight{background:#f5f3ff;border-left:3px solid #1300fd;border-radius:0 8px 8px 0;padding:14px 16px;margin-top:20px;font-size:13px;color:#1a1a2e;line-height:1.6}
  .divider{height:1px;background:linear-gradient(90deg,#1300fd22,#ff004022,#ffbb2c22);margin:20px 0}
  .footer{background:#f8f9ff;padding:18px 36px;display:flex;align-items:center;justify-content:space-between;border-top:1px solid #e8eaf0}
  .footer-brand{font-size:11px;font-weight:700;color:#1300fd;letter-spacing:.5px}
  .footer-sub{font-size:10px;color:#9ca3af;margin-top:2px}
  .footer-date{font-size:11px;color:#9ca3af;text-align:right}
</style>
</head>
<body>
<div class="wrap">
  <div class="top-bar"></div>
  <div class="header">
    <div class="header-logo">Corporación Universitaria Americana</div>
    <h1>Sistema de Seguimiento<br>de Virtualización</h1>
    <p>Notificación automática de actualización de estado</p>
  </div>

  <div class="badge-wrap">
    <span class="badge"><span class="badge-dot"></span>${params.accion}</span>
  </div>

  <div class="body">
    <div class="section-title">Información del curso</div>

    <div class="row">
      <span class="label">Nivel académico</span>
      <span class="value">${params.nivel}</span>
    </div>
    <div class="row">
      <span class="label">Programa</span>
      <span class="value">${params.programa}</span>
    </div>
    <div class="row">
      <span class="label">Curso / Asignatura</span>
      <span class="value">${params.curso}</span>
    </div>

    <div class="divider"></div>
    <div class="section-title">Responsables</div>

    <div class="row">
      <span class="label">Gestor de contenido</span>
      <span class="value">${params.gestor}</span>
    </div>
    ${params.di ? `
    <div class="row">
      <span class="label">Diseñador Instruccional</span>
      <span class="value">${params.di}</span>
    </div>` : ''}

    <div class="divider"></div>

    <div class="row" style="border-bottom:none">
      <span class="label">Fecha de registro</span>
      <span class="value">${params.fecha}</span>
    </div>

    ${params.mensaje ? `<div class="highlight">${params.mensaje}</div>` : ''}
  </div>

  <div class="footer">
    <div>
      <div class="footer-brand">Yule · Virtualización</div>
      <div class="footer-sub">Corporación Universitaria Americana</div>
    </div>
    <div class="footer-date">Notificación automática<br>No responder a este correo</div>
  </div>
</div>
</body>
</html>`;
}
