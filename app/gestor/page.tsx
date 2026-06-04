'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { ESTADOS_GESTOR } from '@/config/estados';
import { api } from '@/lib/api';
import type { EstadoOption } from '@/types';

interface Curso {
  _nivel: string;
  _programa: string;
  Asignatura: string;
  Estado?: string;
  Semestre?: string;
  Link?: string;
  'Link DI'?: string;
  Prioridad?: string;
  PRIORIDAD?: string;
  'Inicio Gestor'?: string;
  'Fin Gestor'?: string;
}

function isPriority(c: Curso): boolean {
  const val = String(c['Prioridad'] ?? c['PRIORIDAD'] ?? '').trim();
  return val !== '' && val !== '0' && val.toUpperCase() !== 'NO' && val !== 'null';
}

// ── Tab definitions ──────────────────────────────────────────
const TABS = [
  { id: 'todos',       label: 'Todos',       },
  { id: 'pendiente',   label: 'Sin iniciar', },
  { id: 'en_proceso',  label: 'En proceso',  },
  { id: 'en_revision', label: 'En revisión', },
  { id: 'correccion',  label: 'Corrección',  },
  { id: 'aprobado',    label: 'Aprobado',    },
  { id: 'producido',   label: 'Producido',   },
  { id: 'otros',       label: 'Otros',       },
] as const;

type TabId = typeof TABS[number]['id'];

// Tabs where the gestor CAN make changes
const EDITABLE_TABS: Set<TabId> = new Set(['pendiente', 'en_proceso', 'correccion']);

const TAB_ACCENT: Record<TabId, string> = {
  todos:       'border-indigo-600 text-indigo-600',
  pendiente:   'border-gray-500 text-gray-600',
  en_proceso:  'border-blue-500 text-blue-600',
  en_revision: 'border-orange-500 text-orange-600',
  correccion:  'border-red-500 text-red-600',
  aprobado:    'border-green-500 text-green-600',
  producido:   'border-purple-500 text-purple-600',
  otros:       'border-pink-500 text-pink-600',
};

const BADGE_COLOR: Record<string, string> = {
  'En proceso':  'bg-blue-100 text-blue-700',
  'En revisión': 'bg-orange-100 text-orange-700',
  'Aprobado DI': 'bg-green-100 text-green-700',
  'Aprobado':    'bg-green-100 text-green-700',
  'Corrección':  'bg-red-100 text-red-700',
  'Producido':   'bg-purple-100 text-purple-700',
  'Cargado':     'bg-gray-100 text-gray-600',
};

function estadoTab(estado: string | null | undefined): TabId {
  const e = (estado ?? '').trim();
  if (!e || e === 'No empezado' || e === 'Sin iniciar') return 'pendiente';
  if (e === 'En proceso') return 'en_proceso';
  if (e === 'En revisión') return 'en_revision';
  if (e === 'Corrección') return 'correccion';
  if (e === 'Aprobado DI' || e === 'Aprobado') return 'aprobado';
  if (e === 'Producido' || e === 'Cargado') return 'producido';
  return 'otros';
}

// Only show the relevant action for the current course state
function getOpcionesGestor(tab: TabId): EstadoOption[] {
  if (tab === 'pendiente')  return ESTADOS_GESTOR.filter(e => e.id === 'inicio_contenido');
  if (tab === 'en_proceso') return ESTADOS_GESTOR.filter(e => e.id === 'enviado');
  if (tab === 'correccion') return ESTADOS_GESTOR.filter(e => e.id === 'corregido');
  return [];
}

export default function GestorPage() {
  const { data: session } = useSession();
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('todos');
  const [selected, setSelected] = useState<Curso | null>(null);
  const [estadoId, setEstadoId] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    const res = await fetch(api('/api/my-courses')).then(r => r.json());
    setCursos(res.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleConfirm = async () => {
    if (!selected || !estadoId) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(api('/api/update'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rol: 'Gestor',
          responsable: session?.user?.name || '',
          nivel: selected._nivel,
          programa: selected._programa,
          curso: selected.Asignatura,
          estadoId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess(`Estado actualizado: "${selected.Asignatura}"`);
      setSelected(null);
      setEstadoId('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setSaving(false);
    }
  };

  // Count per tab
  const counts: Record<TabId, number> = {
    todos: cursos.length,
    pendiente: 0, en_proceso: 0, en_revision: 0,
    correccion: 0, aprobado: 0, producido: 0, otros: 0,
  };
  for (const c of cursos) counts[estadoTab(c.Estado)]++;

  // Filter by active tab, then sort priorities first (preserving original order within groups)
  const filtered = activeTab === 'todos'
    ? cursos
    : cursos.filter(c => estadoTab(c.Estado) === activeTab);

  const sortAZ = (list: Curso[]) => [...list].sort((a, b) =>
    String(a.Asignatura ?? '').localeCompare(String(b.Asignatura ?? ''), 'es')
  );
  const visible = [
    ...sortAZ(filtered.filter(isPriority)),
    ...sortAZ(filtered.filter(c => !isPriority(c))),
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M12 14l9-5-9-5-9 5 9 5z" />
                <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900">Mis cursos asignados</h1>
              <p className="text-xs text-gray-500">{session?.user?.name} · Gestor</p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: api('/login') })}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Cerrar sesión
          </button>
        </div>

        {/* Tabs */}
        {!loading && cursos.length > 0 && (
          <div className="max-w-4xl mx-auto px-4">
            <div className="flex gap-0 overflow-x-auto scrollbar-none -mb-px">
              {TABS.map(tab => {
                const active = activeTab === tab.id;
                const count = counts[tab.id];
                return (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id); setSelected(null); setEstadoId(''); }}
                    className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                      active
                        ? TAB_ACCENT[tab.id]
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab.label}
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                      active
                        ? 'bg-white/30 text-inherit'
                        : count > 0
                          ? 'bg-gray-100 text-gray-600'
                          : 'bg-gray-50 text-gray-300'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-3">
        {/* Notifications */}
        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {success}
            <button onClick={() => setSuccess('')} className="ml-auto text-green-600 hover:text-green-800">×</button>
          </div>
        )}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
        )}

        {/* Course list */}
        {loading ? (
          <div className="text-center py-16 text-gray-400 text-sm">Cargando cursos...</div>
        ) : cursos.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-gray-500 text-sm">No tienes cursos asignados.</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            No hay cursos en esta categoría.
          </div>
        ) : (
          visible.map((curso, i) => {
            const tab = estadoTab(curso.Estado);
            const editable = EDITABLE_TABS.has(tab);
            const isSelected = editable && selected?.Asignatura === curso.Asignatura && selected?._nivel === curso._nivel && selected?._programa === curso._programa;
            const estadoActual = String(curso.Estado ?? '').trim();
            const opciones = getOpcionesGestor(tab);
            const linkCurso = String(curso.Link ?? '').trim();
            const linkDI = String(curso['Link DI'] ?? '').trim();

            return (
              <div
                key={i}
                className={`bg-white rounded-2xl border transition-all ${
                  isSelected ? 'border-indigo-300 shadow-md' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {/* Course row */}
                <div className="px-6 py-4 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isPriority(curso) && (
                        <span className="shrink-0 text-xs font-bold px-1.5 py-0.5 rounded bg-red-500 text-white uppercase tracking-wide">
                          Prioridad
                        </span>
                      )}
                      <p className="font-semibold text-gray-900">{curso.Asignatura}</p>
                      {linkCurso && (
                        <a href={linkCurso} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium" onClick={e => e.stopPropagation()}>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                          Abrir curso
                        </a>
                      )}
                      {linkDI && (
                        <a href={linkDI} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800 font-medium" onClick={e => e.stopPropagation()}>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                          Enlace DI
                        </a>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {curso._nivel} · {curso._programa}
                      {curso.Semestre ? ` · Semestre ${curso.Semestre}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {/* Estado badge */}
                    {tab === 'pendiente' ? (
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-400">
                        Sin iniciar
                      </span>
                    ) : (
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${BADGE_COLOR[estadoActual] || 'bg-gray-100 text-gray-600'}`}>
                        {estadoActual}
                      </span>
                    )}

                    {/* Chevron — only for editable states */}
                    {editable ? (
                      <button
                        onClick={() => { setSelected(isSelected ? null : curso); setEstadoId(''); setError(''); }}
                        className="p-1 rounded-lg hover:bg-gray-100 transition"
                        aria-label="Registrar estado"
                      >
                        <svg
                          className={`w-4 h-4 text-gray-400 transition-transform ${isSelected ? 'rotate-180' : ''}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    ) : (
                      // Lock icon for read-only states
                      <span className="p-1 text-gray-300" title="Solo lectura">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </span>
                    )}
                  </div>
                </div>

                {/* Estado selection panel — only for editable courses */}
                {isSelected && opciones.length > 0 && (
                  <div className="border-t border-gray-100 px-6 py-5">
                    <p className="text-sm font-medium text-gray-700 mb-4">Registrar avance:</p>
                    <div className="space-y-2">
                      {opciones.map((opt: EstadoOption) => (
                        <label
                          key={opt.id}
                          className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
                            estadoId === opt.id
                              ? 'border-indigo-400 bg-indigo-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="estado"
                            value={opt.id}
                            checked={estadoId === opt.id}
                            onChange={() => setEstadoId(opt.id)}
                            className="mt-0.5 accent-indigo-600"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900">{opt.label}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{opt.description}</p>
                          </div>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
                            opt.badgeColor === 'blue'   ? 'bg-blue-100 text-blue-700' :
                            opt.badgeColor === 'orange' ? 'bg-orange-100 text-orange-700' :
                            opt.badgeColor === 'green'  ? 'bg-green-100 text-green-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {opt.badgeText}
                          </span>
                        </label>
                      ))}
                    </div>
                    <div className="flex justify-end mt-4 gap-2">
                      <button
                        onClick={() => { setSelected(null); setEstadoId(''); }}
                        className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleConfirm}
                        disabled={!estadoId || saving}
                        className="px-5 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {saving ? 'Guardando...' : 'Confirmar'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}
