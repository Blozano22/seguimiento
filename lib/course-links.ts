import fs from 'fs';
import path from 'path';

const LINKS_PATH = path.join(process.cwd(), 'data', 'course-links.json');

type LinksMap = Record<string, { linkDI?: string; linkGC?: string }>;

function readLinks(): LinksMap {
  try {
    if (fs.existsSync(LINKS_PATH)) {
      return JSON.parse(fs.readFileSync(LINKS_PATH, 'utf-8'));
    }
  } catch { /* ignore parse errors */ }
  return {};
}

function writeLinks(data: LinksMap): void {
  fs.writeFileSync(LINKS_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

function courseKey(nivel: string, programa: string, asignatura: string): string {
  return `${nivel}::${programa}::${asignatura}`;
}

export function setLinkDI(nivel: string, programa: string, asignatura: string, link: string): void {
  const data = readLinks();
  const k = courseKey(nivel, programa, asignatura);
  data[k] = { ...data[k], linkDI: link };
  writeLinks(data);
}

export function setLinkGC(nivel: string, programa: string, asignatura: string, link: string): void {
  const data = readLinks();
  const k = courseKey(nivel, programa, asignatura);
  data[k] = { ...data[k], linkGC: link };
  writeLinks(data);
}

export function mergeLinks(courses: Record<string, unknown>[]): Record<string, unknown>[] {
  const data = readLinks();
  return courses.map(c => {
    const nivel = String(c._nivel ?? '').trim();
    const programa = String(c._programa ?? '').trim();
    const asignatura = String(c['Asignatura'] ?? '').trim();
    const k = courseKey(nivel, programa, asignatura);
    const links = data[k];
    const patched = { ...c };
    if (links?.linkDI) patched['Link DI'] = links.linkDI;
    if (links?.linkGC) patched['Link'] = links.linkGC;
    return patched;
  });
}

// Keep backward compat alias
export const mergeLinksDI = mergeLinks;
