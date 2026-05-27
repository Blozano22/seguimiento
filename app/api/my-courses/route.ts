import { NextRequest, NextResponse } from 'next/server';
import { readAllCourses } from '@/lib/sheets';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
  void req;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  const name = session.user.name;

  try {
    const all = await readAllCourses();

    if (role === 'Gestor') {
      const mine = all.filter(r => {
        const g = String(r['Gestor responsable '] ?? r['Gestor responsable'] ?? '').trim();
        return g === name;
      });
      return NextResponse.json({ data: mine });
    }

    if (role === 'Diseñador Instruccional') {
      const pending = all.filter(r => String(r['Estado'] ?? '').trim() === 'En revisión');
      return NextResponse.json({ data: pending });
    }

    return NextResponse.json({ data: [] });
  } catch (err) {
    console.error('[api/my-courses]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
