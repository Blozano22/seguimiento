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
  Prioridad?: string;
  PRIORIDAD?: string;
  'Gestor responsable '?: string;
  'Gestor responsable'?: string;
}

type TabId = 'todos' | 'asignar';

function isPriority(c: Curso): boolean {
  const val = String(c['Prioridad'] ?? c['PRIORIDAD'] ?? '').trim();
  return val !== '' && val !== '0' && val.toUpperCase() !== 'NO' && val !== 'null';
}

function isSinIniciar(c: Curso): boolean {
  const e = String(c.Estado ?? '').trim();
  return !e || e === 'No empezado' || e === 'Sin iniciar';
}

const ESTADO_BADGE: Record<string, string> = {
  'En proceso':  'bg-blue-100 text-blue-700',
  'En revisión': 'bg-orange-100 text-orange-700',
  'Aprobado DI': 'bg-green-100 text-green-700',
  'Aprobado':    'bg-green-100 text-green-700',
  'Corrección':  'bg-red-100 text-red-700',
  'Producido':   'bg-purple-100 text-purple-700',
  'Cargado':     'bg-gray-100 text-gray-600',
};

export default function CoordinadorPage() {
  const { data: session } = useSession();
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('todos');
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

  const gestorActual = (c: Curso) =>
    String(c['Gestor responsable '] ?? c['Gestor responsable'] ?? '').trim();
  const linkActual = (c: Curso) => String(c['Link'] ?? '').trim();
  const key = (c: Curso) => `${c._nivel}::${c._programa}::${c.Asignatura}`;

  const applyFilters = (list: Curso[]) => list.filter(c => {
    if (nivelFilter && c._nivel !== nivelFilter) return false;
    const q = search.toLowerCase();
    if (q && !c.Asignatura?.toLowerCase().includes(q) && !c._programa?.toLowerCase().includes(q)) return false;
    return true;
  });

  const withPriorityFirst = (list: Curso[]) => [
    ...list.filter(isPriority),
    ...list.filter(c => !isPriority(c)),
  ];

  // Tab "Todos": all courses filtered + priority first
  const todosFiltered = withPriorityFirst(applyFilters(cursos));

  // Tab "Por asignar": only sin iniciar, not yet assigned, priority first
  const sinIniciar = withPriorityFirst(applyFilters(cursos.filter(isSinIniciar)));
  const sinAsignarCount = cursos.filter(isSinIniciar).length;

  const handleAsignar = async (curso: Curso) => {
    const k = key(curso);
    const gestor = assignments[k];
    if (!gestor) return;
    setSaving(k);
    try {
      const res = await fetch(api('/api/assign'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nivel: curso._nivel,
          programa: curso._programa,
          curso: curso.Asignatura,
          gestor,
          link: links[k] || '',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCursos(prev => prev.map(c =>
        key(c) === k ? { ...c, 'Gestor responsable': gestor, Link: links[k] || c.Link } : c
      ));
      setAssignments(a => { const n = { ...a }; delete n[k]; return n; });
      const action = gestorActual(curso) ? 'Reasignado' : 'Asignado';
      setMessages(m => [...m, { id: Date.now().toString(), type: 'success', text: `${action} "${curso.Asignatura}" → ${gestor}` }]);
    } catch (err) {
      setMessages(m => [...m, { id: Date.now().toString(), type: 'error', text: err instanceof Error ? err.message : 'Error' }]);
    } finally {
      setSaving(null);
    }
  };

  const niveles = ['Pregrado', 'Especializaciones', 'Maestrías', 'Doctorado'];
  const gestores = personas.gestores.map((g: { nombre: string }) => g.nombre);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900">Coordinación de cursos</h1>
              <p className="text-xs text-gray-500">{session?.user?.name} · Coordinador</p>
            </div>
          </div>
          <button onClick={() => signOut({ callbackUrl: api('/login') })} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Cerrar sesión
          </button>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-0 -mb-px">
            <button
              onClick={() => setActiveTab('todos')}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === 'todos'
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
              Todos los cursos
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${activeTab === 'todos' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                {cursos.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('asignar')}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === 'asignar'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Por asignar
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${activeTab === 'asignar' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'}`}>
                {sinAsignarCount}
              </span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Toasts */}
        <div className="space-y-2 mb-4">
          {messages.slice(-3).map(m => (
            <div key={m.id} className={`p-3 rounded-xl border text-sm flex items-center gap-2 ${m.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
              {m.text}
              <button onClick={() => setMessages(msgs => msgs.filter(x => x.id !== m.id))} className="ml-auto opacity-60 hover:opacity-100">×</button>
            </div>
          ))}
        </div>

        {/* Filters (shared between tabs) */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4 flex flex-wrap gap-3 items-center">
          <input
            type="text"
            placeholder="Buscar curso o programa..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <select
            value={nivelFilter}
            onChange={e => setNivelFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            <option value="">Todos los niveles</option>
            {niveles.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <span className="text-xs text-gray-400 ml-auto">
            {activeTab === 'todos' ? `${todosFiltered.length} cursos` : `${sinIniciar.length} sin iniciar`}
          </span>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400 text-sm">Cargando cursos...</div>
        ) : (
          <>
            {/* ── TAB: TODOS LOS CURSOS ── */}
            {activeTab === 'todos' && (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <div className="min-w-[900px]">
                    <div className="grid grid-cols-[65px_155px_1fr_38px_115px_145px_150px] text-xs font-semibold text-gray-500 uppercase px-5 py-3 border-b border-gray-100 bg-gray-50 gap-3">
                      <span>Nivel</span>
                      <span>Programa</span>
                      <span>Asignatura</span>
                      <span>Sem.</span>
                      <span>Estado</span>
                      <span>Gestor asignado</span>
                      <span>Acción</span>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {todosFiltered.map((c, i) => {
                        const actual = gestorActual(c);
                        const isAssigned = Boolean(actual);
                        const k = key(c);
                        const hasNewSelection = Boolean(assignments[k]);
                        const priority = isPriority(c);
                        const estado = String(c.Estado ?? '').trim();
                        const isNoEmpezado = isSinIniciar(c);

                        return (
                          <div
                            key={i}
                            className={`grid grid-cols-[65px_155px_1fr_38px_115px_145px_150px] items-center gap-3 px-5 py-3 hover:bg-gray-50/50 ${priority ? 'bg-red-50/30' : ''}`}
                          >
                            <span className="text-xs text-gray-400 truncate">{c._nivel}</span>
                            <span className="text-xs text-gray-500 truncate">{c._programa}</span>
                            <div className="flex items-center gap-1.5 min-w-0">
                              {priority && (
                                <span className="shrink-0 text-xs font-bold px-1.5 py-0.5 rounded bg-red-500 text-white uppercase tracking-wide">
                                  Prioridad
                                </span>
                              )}
                              <span className="text-sm font-medium text-gray-900 truncate">{c.Asignatura}</span>
                            </div>
                            <span className="text-xs text-gray-400 text-center">{c.Semestre || '—'}</span>
                            {/* Estado */}
                            {isNoEmpezado ? (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-400 font-medium whitespace-nowrap">Sin iniciar</span>
                            ) : (
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${ESTADO_BADGE[estado] || 'bg-gray-100 text-gray-600'}`}>
                                {estado}
                              </span>
                            )}
                            {/* Gestor */}
                            {isAssigned ? (
                              <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full truncate border border-emerald-200" title={actual}>
                                {actual}
                              </span>
                            ) : (
                              <span className="text-xs italic text-gray-300">Sin asignar</span>
                            )}
                            {/* Reasignar (solo si ya está asignado) */}
                            {isAssigned ? (
                              <div className="flex gap-1.5">
                                <select
                                  value={assignments[k] || ''}
                                  onChange={e => setAssignments(a => ({ ...a, [k]: e.target.value }))}
                                  className="flex-1 min-w-0 px-2 py-1 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                                >
                                  <option value="">Cambiar...</option>
                                  {gestores.map((g: string) => <option key={g} value={g}>{g}</option>)}
                                </select>
                                <button
                                  onClick={() => handleAsignar(c)}
                                  disabled={!hasNewSelection || saving === k}
                                  className="px-2.5 py-1 text-xs font-semibold bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                                >
                                  {saving === k ? '...' : 'Reasignar'}
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-300 italic">—</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB: POR ASIGNAR ── */}
            {activeTab === 'asignar' && (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <div className="min-w-[960px]">
                    <div className="grid grid-cols-[65px_150px_1fr_38px_140px_185px_170px] text-xs font-semibold text-gray-500 uppercase px-5 py-3 border-b border-gray-100 bg-gray-50 gap-3">
                      <span>Nivel</span>
                      <span>Programa</span>
                      <span>Asignatura</span>
                      <span>Sem.</span>
                      <span>Gestor actual</span>
                      <span>Link del curso</span>
                      <span>Asignar a</span>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {sinIniciar.length === 0 ? (
                        <div className="text-center py-12 text-gray-400 text-sm">
                          No hay cursos sin iniciar con los filtros actuales.
                        </div>
                      ) : sinIniciar.map((c, i) => {
                        const actual = gestorActual(c);
                        const existingLink = linkActual(c);
                        const k = key(c);
                        const isAssigned = Boolean(actual);
                        const hasNewSelection = Boolean(assignments[k]);
                        const priority = isPriority(c);

                        return (
                          <div
                            key={i}
                            className={`grid grid-cols-[65px_150px_1fr_38px_140px_185px_170px] items-center gap-3 px-5 py-3 hover:bg-gray-50/50 ${priority ? 'bg-red-50/40' : ''}`}
                          >
                            <span className="text-xs text-gray-400 truncate">{c._nivel}</span>
                            <span className="text-xs text-gray-500 truncate">{c._programa}</span>
                            <div className="flex items-center gap-1.5 min-w-0">
                              {priority && (
                                <span className="shrink-0 text-xs font-bold px-1.5 py-0.5 rounded bg-red-500 text-white uppercase tracking-wide">
                                  Prioridad
                                </span>
                              )}
                              <span className="text-sm font-medium text-gray-900 truncate">{c.Asignatura}</span>
                            </div>
                            <span className="text-xs text-gray-400 text-center">{c.Semestre || '—'}</span>
                            {/* Gestor actual */}
                            {isAssigned ? (
                              <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full truncate border border-emerald-200" title={actual}>
                                {actual}
                              </span>
                            ) : (
                              <span className="text-xs italic text-gray-300">Sin asignar</span>
                            )}
                            {/* Link */}
                            <div className="flex items-center gap-1">
                              <input
                                type="url"
                                placeholder="https://..."
                                value={links[k] ?? existingLink}
                                onChange={e => setLinks(l => ({ ...l, [k]: e.target.value }))}
                                className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400"
                              />
                              {existingLink && !links[k] && (
                                <a href={existingLink} target="_blank" rel="noreferrer" className="text-indigo-500 hover:text-indigo-700 shrink-0">
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                </a>
                              )}
                            </div>
                            {/* Asignar / Reasignar */}
                            <div className="flex gap-1.5">
                              <select
                                value={assignments[k] || ''}
                                onChange={e => setAssignments(a => ({ ...a, [k]: e.target.value }))}
                                className="flex-1 min-w-0 px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
                              >
                                <option value="">{isAssigned ? 'Cambiar...' : 'Seleccionar...'}</option>
                                {gestores.map((g: string) => <option key={g} value={g}>{g}</option>)}
                              </select>
                              {isAssigned ? (
                                <button
                                  onClick={() => handleAsignar(c)}
                                  disabled={!hasNewSelection || saving === k}
                                  className="px-2.5 py-1.5 text-xs font-semibold bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                                >
                                  {saving === k ? '...' : 'Reasignar'}
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleAsignar(c)}
                                  disabled={!hasNewSelection || saving === k}
                                  className="px-2.5 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                                >
                                  {saving === k ? '...' : 'Asignar'}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
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
