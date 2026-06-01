'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import personas from '@/config/personas.json';
import { api } from '@/lib/api';

interface Curso {
  _nivel: string;
  _programa: string;
  Asignatura: string;
  Estado?: string;
  Semestre?: string;
  Link?: string;
  'Link DI'?: string;
  'Gestor responsable '?: string;
  'Gestor responsable'?: string;
  'DI responsable'?: string;
  'DI Responsable'?: string;
  'DI responsable '?: string;
}

type TabId = 'por_asignar' | 'asignados' | 'devueltos' | 'aprobados';

const ESTADO_BADGE: Record<string, string> = {
  'En revisión': 'bg-orange-100 text-orange-700',
  'Corrección':  'bg-red-100 text-red-700',
  'Aprobado DI': 'bg-green-100 text-green-700',
  'Aprobado':    'bg-green-100 text-green-700',
};

function diActual(c: Curso): string {
  return String(c['DI responsable'] ?? c['DI Responsable'] ?? c['DI responsable '] ?? '').trim();
}
function gestorActual(c: Curso): string {
  return String(c['Gestor responsable '] ?? c['Gestor responsable'] ?? '').trim();
}
function linkDI(c: Curso): string {
  return String(c['Link DI'] ?? '').trim();
}

export default function CoordinadorDIPage() {
  const { data: session } = useSession();
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('por_asignar');
  const [search, setSearch] = useState('');
  const [nivelFilter, setNivelFilter] = useState('');
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [links, setLinks] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [messages, setMessages] = useState<{ id: string; type: 'success' | 'error'; text: string }[]>([]);

  useEffect(() => {
    fetch(api('/api/admin'))
      .then(r => r.json())
      .then(d => { setCursos(d.data || []); setLoading(false); });
  }, []);

  const key = (c: Curso) => `${c._nivel}::${c._programa}::${c.Asignatura}`;

  const applyFilters = (list: Curso[]) => list.filter(c => {
    if (nivelFilter && c._nivel !== nivelFilter) return false;
    const q = search.toLowerCase();
    if (q && !c.Asignatura?.toLowerCase().includes(q) && !c._programa?.toLowerCase().includes(q)) return false;
    return true;
  });

  const enRevision = cursos.filter(c => String(c.Estado ?? '').trim() === 'En revisión');
  const porAsignar = applyFilters(enRevision.filter(c => !diActual(c)));
  const asignados = applyFilters(enRevision.filter(c => !!diActual(c)));
  const devueltos = applyFilters(cursos.filter(c => String(c.Estado ?? '').trim() === 'Corrección'));
  const aprobados = applyFilters(cursos.filter(c => {
    const e = String(c.Estado ?? '').trim();
    return e === 'Aprobado DI' || e === 'Aprobado';
  }));

  const porAsignarTotal = enRevision.filter(c => !diActual(c)).length;
  const asignadosTotal = enRevision.filter(c => !!diActual(c)).length;
  const devueltosTotal = cursos.filter(c => String(c.Estado ?? '').trim() === 'Corrección').length;
  const aprobadosTotal = cursos.filter(c => { const e = String(c.Estado ?? '').trim(); return e === 'Aprobado DI' || e === 'Aprobado'; }).length;

  const handleAsignar = async (curso: Curso) => {
    const k = key(curso);
    const di = assignments[k] || diActual(curso);
    if (!di) return;
    setSaving(k);
    try {
      const res = await fetch(api('/api/assign-di'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nivel: curso._nivel,
          programa: curso._programa,
          curso: curso.Asignatura,
          di,
          link: links[k] || '',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCursos(prev => prev.map(c =>
        key(c) === k ? { ...c, 'DI responsable': di, 'Link DI': links[k] || c['Link DI'] } : c
      ));
      setAssignments(a => { const n = { ...a }; delete n[k]; return n; });
      setLinks(l => { const n = { ...l }; delete n[k]; return n; });
      const action = diActual(curso) ? 'Reasignado' : 'Asignado';
      setMessages(m => [...m, { id: Date.now().toString(), type: 'success', text: `${action} "${curso.Asignatura}" → ${di}` }]);
    } catch (err) {
      setMessages(m => [...m, { id: Date.now().toString(), type: 'error', text: err instanceof Error ? err.message : 'Error' }]);
    } finally {
      setSaving(null);
    }
  };

  const niveles = ['Pregrado', 'Especializaciones', 'Maestrías', 'Doctorado'];
  const dis = personas.dis.map((d: { nombre: string }) => d.nombre);

  const tabs: { id: TabId; label: string; count: number; color: string; activeColor: string }[] = [
    { id: 'por_asignar', label: 'Por asignar', count: porAsignarTotal, color: 'bg-orange-100 text-orange-700', activeColor: 'border-orange-500 text-orange-600' },
    { id: 'asignados', label: 'Asignados', count: asignadosTotal, color: 'bg-blue-100 text-blue-700', activeColor: 'border-blue-500 text-blue-600' },
    { id: 'devueltos', label: 'Devueltos', count: devueltosTotal, color: 'bg-red-100 text-red-700', activeColor: 'border-red-500 text-red-600' },
    { id: 'aprobados', label: 'Aprobados', count: aprobadosTotal, color: 'bg-green-100 text-green-700', activeColor: 'border-green-500 text-green-600' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-violet-600 rounded-xl flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900">Coordinación DI</h1>
              <p className="text-xs text-gray-500">{session?.user?.name} · Coordinador de Diseño Instruccional</p>
            </div>
          </div>
          <button onClick={() => signOut({ callbackUrl: '/login' })} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Cerrar sesión
          </button>
        </div>

        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-0 -mb-px overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? tab.activeColor
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                  activeTab === tab.id ? tab.color : 'bg-gray-100 text-gray-500'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Toasts */}
        <div className="space-y-2 mb-4">
          {messages.slice(-3).map(m => (
            <div key={m.id} className={`p-3 rounded-xl border text-sm flex items-center gap-2 ${m.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
              {m.text}
              <button onClick={() => setMessages(msgs => msgs.filter(x => x.id !== m.id))} className="ml-auto opacity-60 hover:opacity-100">&times;</button>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4 flex flex-wrap gap-3 items-center">
          <input
            type="text"
            placeholder="Buscar curso o programa..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <select
            value={nivelFilter}
            onChange={e => setNivelFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
          >
            <option value="">Todos los niveles</option>
            {niveles.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400 text-sm">Cargando cursos...</div>
        ) : (
          <>
            {/* TAB: POR ASIGNAR */}
            {activeTab === 'por_asignar' && (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <div className="min-w-[1000px]">
                    <div className="grid grid-cols-[65px_150px_1fr_130px_200px_200px] text-xs font-semibold text-gray-500 uppercase px-5 py-3 border-b border-gray-100 bg-gray-50 gap-3">
                      <span>Nivel</span>
                      <span>Programa</span>
                      <span>Asignatura</span>
                      <span>Gestor</span>
                      <span>Link para el DI</span>
                      <span>Asignar DI</span>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {porAsignar.length === 0 ? (
                        <div className="text-center py-12 text-gray-400 text-sm">
                          No hay cursos en revisión pendientes de asignar DI.
                        </div>
                      ) : porAsignar.map((c, i) => {
                        const k = key(c);
                        const hasSelection = Boolean(assignments[k]);
                        return (
                          <div key={i} className="grid grid-cols-[65px_150px_1fr_130px_200px_200px] items-center gap-3 px-5 py-3 hover:bg-gray-50/50">
                            <span className="text-xs text-gray-400 truncate">{c._nivel}</span>
                            <span className="text-xs text-gray-500 truncate">{c._programa}</span>
                            <span className="text-sm font-medium text-gray-900 truncate">{c.Asignatura}</span>
                            <span className="text-xs text-gray-500 truncate">{gestorActual(c) || '—'}</span>
                            <input
                              type="url"
                              placeholder="https://..."
                              value={links[k] ?? ''}
                              onChange={e => setLinks(l => ({ ...l, [k]: e.target.value }))}
                              className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-400"
                            />
                            <div className="flex gap-1.5">
                              <select
                                value={assignments[k] || ''}
                                onChange={e => setAssignments(a => ({ ...a, [k]: e.target.value }))}
                                className="flex-1 min-w-0 px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-violet-400"
                              >
                                <option value="">Seleccionar DI...</option>
                                {dis.map(d => <option key={d} value={d}>{d}</option>)}
                              </select>
                              <button
                                onClick={() => handleAsignar(c)}
                                disabled={!hasSelection || saving === k}
                                className="px-2.5 py-1.5 text-xs font-semibold bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                              >
                                {saving === k ? '...' : 'Asignar'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: ASIGNADOS (en revisión con DI asignado) */}
            {activeTab === 'asignados' && (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <div className="min-w-[1100px]">
                    <div className="grid grid-cols-[65px_140px_1fr_130px_185px_150px_185px] text-xs font-semibold text-gray-500 uppercase px-5 py-3 border-b border-gray-100 bg-gray-50 gap-3">
                      <span>Nivel</span>
                      <span>Programa</span>
                      <span>Asignatura</span>
                      <span>Gestor</span>
                      <span>Link para el DI</span>
                      <span>DI asignado</span>
                      <span>Reasignar</span>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {asignados.length === 0 ? (
                        <div className="text-center py-12 text-gray-400 text-sm">
                          No hay cursos en revisión con DI asignado.
                        </div>
                      ) : asignados.map((c, i) => {
                        const k = key(c);
                        const existingLink = linkDI(c);
                        const hasSelection = Boolean(assignments[k]);
                        const hasLinkChange = k in links && links[k] !== existingLink;
                        return (
                          <div key={i} className="grid grid-cols-[65px_140px_1fr_130px_185px_150px_185px] items-center gap-3 px-5 py-3 hover:bg-gray-50/50">
                            <span className="text-xs text-gray-400 truncate">{c._nivel}</span>
                            <span className="text-xs text-gray-500 truncate">{c._programa}</span>
                            <span className="text-sm font-medium text-gray-900 truncate">{c.Asignatura}</span>
                            <span className="text-xs text-gray-500 truncate">{gestorActual(c) || '—'}</span>
                            <div className="flex items-center gap-1">
                              <input
                                type="url"
                                placeholder="https://..."
                                value={links[k] ?? existingLink}
                                onChange={e => setLinks(l => ({ ...l, [k]: e.target.value }))}
                                className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-400"
                              />
                              {existingLink && !(k in links) && (
                                <a href={existingLink} target="_blank" rel="noreferrer" className="text-violet-500 hover:text-violet-700 shrink-0">
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                </a>
                              )}
                            </div>
                            <span className="text-xs font-medium text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full truncate border border-violet-200" title={diActual(c)}>
                              {diActual(c)}
                            </span>
                            <div className="flex gap-1.5">
                              <select
                                value={assignments[k] || ''}
                                onChange={e => setAssignments(a => ({ ...a, [k]: e.target.value }))}
                                className="flex-1 min-w-0 px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                              >
                                <option value="">Cambiar...</option>
                                {dis.map(d => <option key={d} value={d}>{d}</option>)}
                              </select>
                              <button
                                onClick={() => handleAsignar(c)}
                                disabled={(!hasSelection && !hasLinkChange) || saving === k}
                                className="px-2.5 py-1.5 text-xs font-semibold bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                              >
                                {saving === k ? '...' : hasSelection ? 'Reasignar' : 'Guardar'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: DEVUELTOS */}
            {activeTab === 'devueltos' && (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <div className="min-w-[800px]">
                    <div className="grid grid-cols-[65px_150px_1fr_130px_150px_100px] text-xs font-semibold text-gray-500 uppercase px-5 py-3 border-b border-gray-100 bg-gray-50 gap-3">
                      <span>Nivel</span>
                      <span>Programa</span>
                      <span>Asignatura</span>
                      <span>Gestor</span>
                      <span>DI que devolvió</span>
                      <span>Estado</span>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {devueltos.length === 0 ? (
                        <div className="text-center py-12 text-gray-400 text-sm">
                          No hay cursos devueltos para corrección.
                        </div>
                      ) : devueltos.map((c, i) => (
                        <div key={i} className="grid grid-cols-[65px_150px_1fr_130px_150px_100px] items-center gap-3 px-5 py-3 hover:bg-gray-50/50">
                          <span className="text-xs text-gray-400 truncate">{c._nivel}</span>
                          <span className="text-xs text-gray-500 truncate">{c._programa}</span>
                          <span className="text-sm font-medium text-gray-900 truncate">{c.Asignatura}</span>
                          <span className="text-xs text-gray-500 truncate">{gestorActual(c) || '—'}</span>
                          <span className="text-xs text-gray-500 truncate">{diActual(c) || '—'}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700">Corrección</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: APROBADOS */}
            {activeTab === 'aprobados' && (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <div className="min-w-[800px]">
                    <div className="grid grid-cols-[65px_150px_1fr_130px_150px_100px] text-xs font-semibold text-gray-500 uppercase px-5 py-3 border-b border-gray-100 bg-gray-50 gap-3">
                      <span>Nivel</span>
                      <span>Programa</span>
                      <span>Asignatura</span>
                      <span>Gestor</span>
                      <span>DI que aprobó</span>
                      <span>Estado</span>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {aprobados.length === 0 ? (
                        <div className="text-center py-12 text-gray-400 text-sm">
                          No hay cursos aprobados.
                        </div>
                      ) : aprobados.map((c, i) => (
                        <div key={i} className="grid grid-cols-[65px_150px_1fr_130px_150px_100px] items-center gap-3 px-5 py-3 hover:bg-gray-50/50">
                          <span className="text-xs text-gray-400 truncate">{c._nivel}</span>
                          <span className="text-xs text-gray-500 truncate">{c._programa}</span>
                          <span className="text-sm font-medium text-gray-900 truncate">{c.Asignatura}</span>
                          <span className="text-xs text-gray-500 truncate">{gestorActual(c) || '—'}</span>
                          <span className="text-xs text-gray-500 truncate">{diActual(c) || '—'}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">Aprobado</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
