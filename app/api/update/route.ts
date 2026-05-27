import { NextRequest, NextResponse } from 'next/server';
import { updateCourse } from '@/lib/sheets';
import { ESTADOS_GESTOR, ESTADOS_DI } from '@/config/estados';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { rol, responsable, nivel, programa, curso, estadoId } = body as {
      rol: string; responsable: string; nivel: string;
      programa: string; curso: string; estadoId: string;
    };

    if (!nivel || !curso || !estadoId) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    const opciones = rol === 'Gestor' ? ESTADOS_GESTOR : ESTADOS_DI;
    const opcion = opciones.find(o => o.id === estadoId);
    if (!opcion) return NextResponse.json({ error: 'Estado no válido' }, { status: 400 });

    const today = new Date();
    const updates: Record<string, unknown> = {};
    for (const [col, val] of Object.entries(opcion.updates)) {
      updates[col] = val === '__TODAY__' ? today : val;
    }
    if (rol === 'Diseñador Instruccional' && responsable) {
      updates['DI responsable'] = responsable;
    }

    const ok = await updateCourse(nivel, curso, updates, programa);
    if (!ok) {
      return NextResponse.json({ error: `No se encontró el curso "${curso}" en la hoja ${nivel}` }, { status: 404 });
    }
    return NextResponse.json({ success: true, updatedFields: Object.keys(updates) });
  } catch (err) {
    console.error('[api/update]', err);
    return NextResponse.json({ error: 'Error interno al actualizar' }, { status: 500 });
  }
}
