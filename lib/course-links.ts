import fs from 'fs';
import path from 'path';

const LINKS_PATH = path.join(process.cwd(), 'data', 'course-links.json');

type LinksMap = Record<string, { linkDI?: string }>;

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

export function getLinkDI(nivel: string, programa: string, asignatura: string): string {
  const data = readLinks();
  return data[courseKey(nivel, programa, asignatura)]?.linkDI || '';
}

export function mergeLinksDI(courses: Record<string, unknown>[]): Record<string, unknown>[] {
  const data = readLinks();
  return courses.map(c => {
    const nivel = String(c._nivel ?? '').trim();
    const programa = String(c._programa ?? '').trim();
    const asignatura = String(c['Asignatura'] ?? '').trim();
    const k = courseKey(nivel, programa, asignatura);
    const links = data[k];
    if (links?.linkDI) return { ...c, 'Link DI': links.linkDI };
    return c;
  });
}
