import { google } from 'googleapis';
import * as excel from '@/lib/excel';

function hasGoogleCredentials(): boolean {
  return !!(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY);
}

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID || '1AlzuwCaOWCPs-NLPqd85Nng9ZwDvesdC-j85Ly5jras';

const SHEET_MAP: Record<string, string> = {
  Pregrado: 'Pregrado',
  Especializaciones: 'Especializaciones',
  'Maestrías': 'Maestrías',
  Doctorado: 'Doctorado',
};

const NIVELES = ['Pregrado', 'Especializaciones', 'Maestrías', 'Doctorado'];

const GESTORES = [
  'Claudia Navarro', 'Aimar Mendoza', 'Nayerlis Salas', 'Caroll Avendaño',
  'Karina Muñoz Sierra', 'Samir Palencia Gerónimo', 'María Jose Ortega',
  'Andrea Nuñez', 'Yelitza Romero', 'Hillary Ojeda Durango',
];

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!email || !key) throw new Error('Google Sheets credentials not configured.');
  return new google.auth.JWT({ email, key, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
}

function getSheetsClient() {
  return google.sheets({ version: 'v4', auth: getAuth() });
}

function normalizeColName(name: string): string {
  return name.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function colToLetter(col: number): string {
  let letter = '';
  let c = col;
  while (c >= 0) {
    letter = String.fromCharCode(65 + (c % 26)) + letter;
    c = Math.floor(c / 26) - 1;
  }
  return letter;
}

function formatDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// Comprehensive column aliases for variations across sheets
const COL_ALIASES: Record<string, string[]> = {
  'Estado':                      ['Estado', 'Estado '],
  'Estado curso':                ['Estado curso', 'Estado Curso', 'Estado curso '],
  'Inicio Gestor':               ['Inicio Gestor', 'Inicio gestor', 'Inicio Gestor '],
  'Fin Gestor':                  ['Fin Gestor', 'Fin gestor', 'Fin Gestor '],
  'Gestor responsable':          ['Gestor responsable ', 'Gestor responsable', 'Gestor Responsable'],
  'Fecha fin corrección gestor': ['Fecha fin corrección gestor', 'Fecha fin corrección docente', 'Fecha fin correccion gestor'],
  'Fecha inicio revisión DI':    ['Fecha inicio revisión DI', 'Fecha inicio revision DI', 'Fecha inicio revisión DI '],
  'Fecha fin revisión DI':       ['Fecha fin revisión DI', 'Fecha fin revision DI', 'Fecha fin revisión DI '],
  'DI responsable':              ['DI responsable', 'DI Responsable', 'DI responsable '],
  'Link':                        ['Link', 'Link ', 'Enlace', 'Enlace curso', 'link'],
};

function findColIdx(headers: string[], colName: string): number {
  const normTarget = normalizeColName(colName);
  const aliasList = COL_ALIASES[colName] || [];
  for (const name of [colName, ...aliasList]) {
    const idx = headers.findIndex(h =>
      h === name || h.trim() === name.trim() || normalizeColName(h) === normalizeColName(name)
    );
    if (idx !== -1) return idx;
  }
  return headers.findIndex(h => normalizeColName(h) === normTarget);
}

// ── READ: Google Sheets when available, else local Excel ─────
export async function readSheet(nivel: string): Promise<Record<string, unknown>[]> {
  if (!hasGoogleCredentials()) return excel.readSheet(nivel);
  const sheetName = SHEET_MAP[nivel] || nivel;
  const sheets = getSheetsClient();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: sheetName,
    valueRenderOption: 'FORMATTED_VALUE',
  });

  const rows = res.data.values;
  if (!rows || rows.length < 2) return [];

  const headers = rows[0] as string[];
  let lastPrograma = '';
  let lastModalidad = '';

  return rows.slice(1).map(row => {
    const obj: Record<string, unknown> = {};
    headers.forEach((h, i) => { obj[h] = row[i] ?? null; });
    if (obj['Programa'] != null && String(obj['Programa']).trim()) lastPrograma = String(obj['Programa']).trim();
    if (obj['Modalidad'] != null && String(obj['Modalidad']).trim()) lastModalidad = String(obj['Modalidad']).trim();
    obj._programa = lastPrograma;
    obj._modalidad = lastModalidad;
    return obj;
  });
}

export async function getProgramas(nivel: string): Promise<string[]> {
  if (!hasGoogleCredentials()) return excel.getProgramas(nivel);
  const data = await readSheet(nivel);
  const seen = new Set<string>();
  const result: string[] = [];
  for (const row of data) {
    const p = (row._programa as string)?.trim();
    if (p && !seen.has(p)) { seen.add(p); result.push(p); }
  }
  return result.sort();
}

export async function getCursos(nivel: string, programa: string): Promise<string[]> {
  if (!hasGoogleCredentials()) return excel.getCursos(nivel, programa);
  const data = await readSheet(nivel);
  const seen = new Set<string>();
  const result: string[] = [];
  for (const row of data) {
    const p = (row._programa as string)?.trim();
    const a = row['Asignatura'];
    if (p === programa.trim() && a != null) {
      const name = String(a).trim();
      if (!seen.has(name)) { seen.add(name); result.push(name); }
    }
  }
  return result.sort();
}

export async function getGestores(): Promise<string[]> {
  return GESTORES.sort();
}

export async function getCourseInfo(nivel: string, programa: string, asignatura: string): Promise<Record<string, unknown> | null> {
  if (!hasGoogleCredentials()) return excel.getCourseInfo(nivel, programa, asignatura);
  const data = await readSheet(nivel);
  return data.find(r =>
    (r._programa as string)?.trim() === programa.trim() &&
    String(r['Asignatura'] ?? '').trim() === asignatura.trim()
  ) ?? null;
}

// ── WRITE: always update local Excel + Google Sheets when available ──
export async function updateCourse(
  nivel: string,
  asignatura: string,
  updates: Record<string, unknown>,
  programa?: string
): Promise<boolean> {
  // 1. Always update the local Excel as backup
  const excelOk = excel.updateCourse(nivel, asignatura, updates, programa);

  // 2. Update Google Sheets (the primary database)
  if (hasGoogleCredentials()) {
    try {
      await updateGoogleSheet(nivel, asignatura, updates, programa);
      console.log(`[sheets] ✅ Google Sheets actualizado: "${asignatura}" — campos: ${Object.keys(updates).join(', ')}`);
    } catch (err) {
      console.error('[sheets] ❌ Google Sheets falló:', err);
    }
  } else {
    console.log('[sheets] ℹ️ Sin credenciales de Google — solo Excel local actualizado');
  }

  return excelOk;
}

async function updateGoogleSheet(
  nivel: string,
  asignatura: string,
  updatesIn: Record<string, unknown>,
  programa?: string
): Promise<void> {
  // 'Link' is a local-only field — never write it to the Google Sheet
  const updates = Object.fromEntries(
    Object.entries(updatesIn).filter(([k]) => k !== 'Link')
  );
  if (Object.keys(updates).length === 0) return;
  const sheetName = SHEET_MAP[nivel] || nivel;
  const sheets = getSheetsClient();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: sheetName,
    valueRenderOption: 'FORMATTED_VALUE',
  });

  const rows = res.data.values;
  if (!rows || rows.length < 2) throw new Error(`Hoja "${sheetName}" vacía o no encontrada`);

  const headers = rows[0] as string[];
  const asignaturaColIdx = findColIdx(headers, 'Asignatura');
  const programaColIdx = findColIdx(headers, 'Programa');

  if (asignaturaColIdx === -1) throw new Error('Columna "Asignatura" no encontrada en la hoja');

  const normAsig = normalizeColName(asignatura);
  const normProg = programa ? normalizeColName(programa) : null;
  let currentPrograma = '';
  let targetRowIdx = -1;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (programaColIdx >= 0 && row[programaColIdx]?.trim()) {
      currentPrograma = row[programaColIdx].trim();
    }
    if (normalizeColName(row[asignaturaColIdx] ?? '') === normAsig) {
      if (!normProg || normalizeColName(currentPrograma) === normProg) {
        targetRowIdx = i;
        break;
      }
    }
  }

  if (targetRowIdx === -1) throw new Error(`Curso "${asignatura}" no encontrado en hoja "${sheetName}"`);

  const sheetRow = targetRowIdx + 1;
  const batchData: { range: string; values: unknown[][] }[] = [];

  for (const [colName, value] of Object.entries(updates)) {
    const colIdx = findColIdx(headers, colName);
    if (colIdx === -1) {
      console.warn(`[sheets] Columna no encontrada en Google Sheet: "${colName}" — headers disponibles: ${headers.slice(0, 20).join(', ')}`);
      continue;
    }
    const colLetter = colToLetter(colIdx);
    const displayVal = value instanceof Date ? formatDate(value) : (value === null ? '' : String(value));
    batchData.push({ range: `${sheetName}!${colLetter}${sheetRow}`, values: [[displayVal]] });
  }

  if (batchData.length === 0) throw new Error('Ninguna columna encontrada para actualizar');

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: { valueInputOption: 'USER_ENTERED', data: batchData },
  });
}

export async function readAllCourses(): Promise<Record<string, unknown>[]> {
  if (!hasGoogleCredentials()) return excel.readAllCourses();
  const all: Record<string, unknown>[] = [];
  for (const nivel of NIVELES) {
    try {
      const data = await readSheet(nivel);
      for (const row of data) {
        if (row['Asignatura']) all.push({ ...row, _nivel: nivel });
      }
    } catch { /* skip missing sheets */ }
  }
  return all;
}

export async function getSheetNames(): Promise<string[]> {
  return NIVELES;
}
