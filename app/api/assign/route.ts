import { NextRequest, NextResponse } from 'next/server';
import { updateCourse } from '@/lib/sheets';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  if (role !== 'Coordinador') return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  try {
    const body = await req.json();
    const { nivel, programa, curso, gestor, link } = body as {
      nivel: string; programa: string; curso: string; gestor: string; link?: string;
    };
    if (!nivel || !curso || !gestor) return NextResponse.json({ error: 'Faltan campos' }, { status: 400 });

    const updates: Record<string, unknown> = { 'Gestor responsable': gestor };
    if (link && link.trim()) updates['Link'] = link.trim();

    const ok = await updateCourse(nivel, curso, updates, programa);
    if (!ok) return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[api/assign]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
