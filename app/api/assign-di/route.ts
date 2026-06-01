import { NextRequest, NextResponse } from 'next/server';
import { updateCourse } from '@/lib/sheets';
import { setLinkDI } from '@/lib/course-links';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendEmail, buildEmailHtml } from '@/lib/email';
import { NOTIF_BASE } from '@/config/notificaciones';
import personas from '@/config/personas.json';
import { USERS } from '@/config/users';

function todayString(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: string; name?: string; email?: string } | undefined;
  if (user?.role !== 'Coordinador') return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  try {
    const body = await req.json();
    const { nivel, programa, curso, di, link } = body as {
      nivel: string; programa: string; curso: string; di: string; link?: string;
    };
    if (!nivel || !curso || !di) return NextResponse.json({ error: 'Faltan campos' }, { status: 400 });

    const updates: Record<string, unknown> = { 'DI responsable': di };

    const ok = await updateCourse(nivel, curso, updates, programa);
    if (!ok) return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 });

    if (link && link.trim()) {
      setLinkDI(nivel, programa, curso, link.trim());
    }

    const coordUser = USERS.find(u => u.nombre === user?.name);
    const fromEmail = coordUser?.email || user?.email;

    const diEmail = personas.dis.find(d => d.nombre === di)?.email;
    const recipients = [...(NOTIF_BASE.asignacion_di || []), ...(diEmail ? [diEmail] : [])]
      .filter(email => email !== fromEmail);

    if (recipients.length > 0) {
      sendEmail({
        to: recipients,
        subject: `Asignación de DI — ${curso}`,
        html: buildEmailHtml({
          accion: 'Asignación de Diseñador Instruccional',
          gestor: '',
          di,
          nivel,
          programa,
          curso,
          fecha: todayString(),
        }),
        fromEmail: fromEmail || undefined,
        fromName: user?.name || 'Coordinador DI',
      }).catch(err => console.error('[api/assign-di] email error:', err));
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[api/assign-di]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
