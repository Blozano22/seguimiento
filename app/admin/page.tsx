'use client';

import { useEffect, useState } from 'react';
import { signOut } from 'next-auth/react';
import { api } from '@/lib/api';

interface CourseRow {
  _nivel: string;
  _programa: string;
  Asignatura: string;
  Estado?: string;
  'Estado curso'?: string;
  'Gestor responsable '?: string;
  'Gestor responsable'?: string;
  'DI responsable'?: string;
  'Inicio Gestor'?: string;
  'Fin Gestor'?: string;
  'Fecha inicio revisión DI'?: string;
  'Fecha fin revisión DI'?: string;
  'Fecha fin corrección gestor'?: string;
}

const STATE_COLORS: Record<string, string> = {
  'En proceso': 'bg-blue-100 text-blue-700',
  'En revisión': 'bg-yellow-100 text-yellow-700',
  'Aprobado DI': 'bg-green-100 text-green-700',
  'Aprobado': 'bg-green-100 text-green-700',
  'Corrección': 'bg-red-100 text-red-700',
  'Cargado': 'bg-gray-100 text-gray-600',
  'Producido': 'bg-purple-100 text-purple-700',
  'No empezado': 'bg-gray-100 text-gray-500',
  'Enviado a revisión': 'bg-yellow-100 text-yellow-700',
};

const NIVELES = ['Pregrado', 'Especializaciones', 'Maestrías', 'Doctorado'];
const ESTADOS = ['En proceso', 'En revisión', 'Aprobado DI', 'Corrección', 'Cargado', 'Producido', 'No empezado'];

export default function AdminPage() {
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterNivel, setFilterNivel] = useState('');
  const [filterEstado, setFilterEstado] = useState('');

  useEffect(() => {
    fetch(api('/api/admin'))
      .then((r) => r.json())
      .then((d) => {
        setCourses(d.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = courses.filter((c) => {
    const asig = String(c.Asignatura || '').toLowerCase();
    const prog = String(c._programa || '').toLowerCase();
    const matchSearch = !search || asig.includes(search.toLowerCase()) || prog.includes(search.toLowerCase());
    const matchNivel = !filterNivel || c._nivel === filterNivel;
    const matchEstado = !filterEstado || c.Estado === filterEstado;
    return matchSearch && matchNivel && matchEstado;
  });

  const gestor = (c: CourseRow) => (c['Gestor responsable '] || c['Gestor responsable'] || '—').toString().trim();

  function fmtDate(val: unknown): string {
    if (!val) return '—';
    if (val instanceof Date) return val.toLocaleDateString('es-CO');
    const s = String(val);
    if (s === 'null' || s === 'undefined') return '—';
    // Excel serial
    const n = Number(s);
    if (!isNaN(n) && n > 40000) {
      const epoch = new Date(Date.UTC(1899, 11, 30));
      const d = new Date(epoch.getTime() + n * 86400000);
      return d.toLocaleDateString('es-CO');
    }
    return s;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M12 14l9-5-9-5-9 5 9 5z" />
                <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900">Panel Super Admin</h1>
              <p className="text-xs text-gray-500">Trayecto completo de virtualización de cursos</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <a href="/connect-gmail" className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 transition">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Conectar correos
            </a>
            <a href="/" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 9 9 0 01-18 0z" />
              </svg>
              Volver al formulario
            </a>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total cursos', value: courses.length, color: 'text-gray-900' },
            { label: 'En proceso', value: courses.filter((c) => c.Estado === 'En proceso').length, color: 'text-blue-600' },
            { label: 'En revisión', value: courses.filter((c) => c.Estado === 'En revisión').length, color: 'text-yellow-600' },
            { label: 'Aprobados', value: courses.filter((c) => c.Estado === 'Aprobado DI' || c['Estado curso'] === 'Aprobado').length, color: 'text-green-600' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 font-medium">{stat.label}</p>
              <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar curso o programa..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <select
            value={filterNivel}
            onChange={(e) => setFilterNivel(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Todos los niveles</option>
            {NIVELES.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Todos los estados</option>
            {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
          {(search || filterNivel || filterEstado) && (
            <button
              onClick={() => { setSearch(''); setFilterNivel(''); setFilterEstado(''); }}
              className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-400 text-sm">Cargando cursos...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {['Nivel', 'Programa', 'Curso / Asignatura', 'Estado', 'Est. Curso', 'Gestor', 'DI', 'Inicio Gestor', 'Fin Gestor', 'Inicio Rev. DI', 'Fin Rev. DI'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 200).map((c, i) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{c._nivel}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 max-w-[180px] truncate" title={c._programa}>{c._programa}</td>
                      <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate" title={String(c.Asignatura)}>{String(c.Asignatura)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {c.Estado ? (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATE_COLORS[c.Estado] || 'bg-gray-100 text-gray-600'}`}>
                            {c.Estado}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {c['Estado curso'] ? (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATE_COLORS[c['Estado curso']] || 'bg-gray-100 text-gray-600'}`}>
                            {c['Estado curso']}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{gestor(c)}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{String(c['DI responsable'] || '—')}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDate(c['Inicio Gestor'])}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDate(c['Fin Gestor'])}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDate(c['Fecha inicio revisión DI'])}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDate(c['Fecha fin revisión DI'])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length > 200 && (
                <p className="text-xs text-gray-400 text-center py-3">
                  Mostrando 200 de {filtered.length} resultados. Usa los filtros para reducir.
                </p>
              )}
              {filtered.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-10">No se encontraron cursos con esos filtros.</p>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
