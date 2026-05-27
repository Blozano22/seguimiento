import { NextResponse } from 'next/server';
import { readAllCourses } from '@/lib/sheets';

export async function GET() {
  try {
    const data = await readAllCourses();
    return NextResponse.json({ data });
  } catch (err) {
    console.error('[api/admin]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
