import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string[];
  subject: string;
  html: string;
  replyTo?: string;
}

export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    console.warn('SMTP credentials not configured — email skipped');
    return { success: false, error: 'SMTP no configurado' };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user, pass },
  });

  try {
    await transporter.sendMail({
      from: `"Seguimiento de Virtualización" <${user}>`,
      to: options.to.join(', '),
      subject: options.subject,
      html: options.html,
      replyTo: options.replyTo,
    });
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    console.error('Error enviando correo:', msg);
    return { success: false, error: msg };
  }
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
  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><style>
  body { font-family: Arial, sans-serif; color: #333; background: #f9fafb; margin: 0; padding: 0; }
  .card { max-width: 520px; margin: 40px auto; background: white; border-radius: 12px; box-shadow: 0 1px 6px rgba(0,0,0,0.08); overflow: hidden; }
  .header { background: #4F46E5; padding: 24px 28px; color: white; }
  .header h1 { margin: 0; font-size: 18px; font-weight: 700; }
  .header p { margin: 4px 0 0; font-size: 13px; opacity: 0.85; }
  .body { padding: 28px; }
  .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
  .row:last-of-type { border-bottom: none; }
  .label { color: #6b7280; font-weight: 500; }
  .value { color: #111827; text-align: right; max-width: 55%; }
  .badge { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; background: #EEF2FF; color: #4F46E5; }
  .msg { margin-top: 20px; padding: 14px; background: #f8fafc; border-left: 3px solid #4F46E5; border-radius: 4px; font-size: 13px; color: #374151; }
  .footer { padding: 16px 28px; background: #f9fafb; font-size: 12px; color: #9ca3af; text-align: center; border-top: 1px solid #f1f5f9; }
</style></head>
<body>
<div class="card">
  <div class="header">
    <h1>Seguimiento de Virtualización</h1>
    <p>Actualización de estado de curso</p>
  </div>
  <div class="body">
    <div class="row"><span class="label">Estado registrado</span><span class="value"><span class="badge">${params.accion}</span></span></div>
    <div class="row"><span class="label">Nivel</span><span class="value">${params.nivel}</span></div>
    <div class="row"><span class="label">Programa</span><span class="value">${params.programa}</span></div>
    <div class="row"><span class="label">Curso</span><span class="value">${params.curso}</span></div>
    <div class="row"><span class="label">Gestor</span><span class="value">${params.gestor}</span></div>
    ${params.di ? `<div class="row"><span class="label">Diseñador Instruccional</span><span class="value">${params.di}</span></div>` : ''}
    <div class="row"><span class="label">Fecha</span><span class="value">${params.fecha}</span></div>
    ${params.mensaje ? `<div class="msg">${params.mensaje}</div>` : ''}
  </div>
  <div class="footer">Sistema de Seguimiento de Virtualización — Corporación Universitaria Americana</div>
</div>
</body>
</html>`;
}
