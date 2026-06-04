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
  Prioridad?: string;
  PRIORIDAD?: string;
}

function isPriority(c: CourseRow): boolean {
  const val = String(c['Prioridad'] ?? c['PRIORIDAD'] ?? '').trim();
  return val !== '' && val !== '0' && val.toUpperCase() !== 'NO' && val !== 'null';
}

function sortPriorityAZ(list: CourseRow[]): CourseRow[] {
  return [...list].sort((a, b) => {
    const pa = isPriority(a) ? 0 : 1;
    const pb = isPriority(b) ? 0 : 1;
    if (pa !== pb) return pa - pb;
    return String(a.Asignatura ?? '').localeCompare(String(b.Asignatura ?? ''), 'es');
  });
}

interface UserInfo {
  username: string;
  nombre: string;
  role: string;
  hasCustomPassword: boolean;
}

type TabId = 'dashboard' | 'passwords';

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

const ROLE_COLORS: Record<string, string> = {
  'Super Admin': 'bg-amber-100 text-amber-700',
  'Coordinador': 'bg-emerald-100 text-emerald-700',
  'Diseñador Instruccional': 'bg-violet-100 text-violet-700',
  'Gestor': 'bg-blue-100 text-blue-700',
};

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');

  // Dashboard
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [search, setSearch] = useState('');
  const [filterNivel, setFilterNivel] = useState('');
  const [filterEstado, setFilterEstado] = useState('');

  // Passwords
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [passwordInputs, setPasswordInputs] = useState<Record<string, string>>({});
  const [savingPassword, setSavingPassword] = useState<string | null>(null);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmAdmin, setConfirmAdmin] = useState<string | null>(null);
  const [searchUser, setSearchUser] = useState('');

  useEffect(() => {
    fetch(api('/api/admin'))
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(d => { setCourses(d.data || []); setLoading(false); })
      .catch(err => { setFetchError(err.message || 'Error'); setLoading(false); });
  }, []);

  const loadUsers = () => {
    if (usersLoaded) return;
    setLoadingUsers(true);
    fetch(api('/api/admin/passwords'))
      .then(r => r.json())
      .then(d => { setUsers(d.users || []); setLoadingUsers(false); setUsersLoaded(true); })
      .catch(() => setLoadingUsers(false));
  };

  async function handleChangePassword(username: string, newPassword: string) {
    setSavingPassword(username);
    setPasswordMsg(null);
    try {
      const res = await fetch(api('/api/admin/passwords'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const user = users.find(u => u.username === username);
      setPasswordMsg({ type: 'success', text: `Contraseña de "${user?.nombre || username}" cambiada exitosamente` });
      setPasswordInputs(p => { const n = { ...p }; delete n[username]; return n; });
      setUsers(prev => prev.map(u => u.username === username ? { ...u, hasCustomPassword: true } : u));
    } catch (err) {
      setPasswordMsg({ type: 'error', text: err instanceof Error ? err.message : 'Error al cambiar contraseña' });
    } finally {
      setSavingPassword(null);
    }
  }

  const filtered = sortPriorityAZ(courses.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !search || String(c.Asignatura || '').toLowerCase().includes(q) || String(c._programa || '').toLowerCase().includes(q);
    return matchSearch && (!filterNivel || c._nivel === filterNivel) && (!filterEstado || c.Estado === filterEstado);
  }));

  const gestor = (c: CourseRow) => (c['Gestor responsable '] || c['Gestor responsable'] || '—').toString().trim();

  function fmtDate(val: unknown): string {
    if (!val) return '—';
    const s = String(val);
    if (s === 'null' || s === 'undefined') return '—';
    const n = Number(s);
    if (!isNaN(n) && n > 40000) {
      const epoch = new Date(Date.UTC(1899, 11, 30));
      return new Date(epoch.getTime() + n * 86400000).toLocaleDateString('es-CO');
    }
    return s;
  }

  const filteredUsers = users.filter(u => {
    if (!searchUser) return true;
    const q = searchUser.toLowerCase();
    return u.username.toLowerCase().includes(q) || u.nombre.toLowerCase().includes(q) || u.role.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-gray-50">
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
            <a href={api('/connect-gmail')} className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 transition">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              Conectar correos
            </a>
            <button onClick={() => signOut({ callbackUrl: api('/login') })} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              Cerrar sesión
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-0 -mb-px">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === 'dashboard' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" /></svg>
              Dashboard
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${activeTab === 'dashboard' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'}`}>
                {courses.length}
              </span>
            </button>
            <button
              onClick={() => { setActiveTab('passwords'); loadUsers(); }}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === 'passwords' ? 'border-amber-500 text-amber-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              Contraseñas
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">

        {/* ── TAB: DASHBOARD ── */}
        {activeTab === 'dashboard' && (
          <>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
              {[
                { label: 'Total cursos', value: courses.length, color: 'text-gray-900' },
                { label: 'Cargados', value: courses.filter(c => String(c.Estado ?? '').trim() === 'Cargado').length, color: 'text-purple-600' },
                { label: 'En proceso', value: courses.filter(c => c.Estado === 'En proceso').length, color: 'text-blue-600' },
                { label: 'En revisión', value: courses.filter(c => c.Estado === 'En revisión').length, color: 'text-yellow-600' },
                { label: 'Corrección', value: courses.filter(c => c.Estado === 'Corrección').length, color: 'text-red-600' },
                { label: 'Aprobados', value: courses.filter(c => c.Estado === 'Aprobado DI' || c['Estado curso'] === 'Aprobado').length, color: 'text-green-600' },
              ].map(stat => (
                <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-xs text-gray-500 font-medium">{stat.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar curso o programa..." className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <select value={filterNivel} onChange={e => setFilterNivel(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Todos los niveles</option>
                {NIVELES.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Todos los estados</option>
                {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {loading ? (
                <div className="p-12 text-center text-gray-400 text-sm">Cargando cursos...</div>
              ) : fetchError ? (
                <div className="p-12 text-center text-red-500 text-sm">Error al cargar: {fetchError}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        {['Nivel','Programa','Curso / Asignatura','Estado','Est. Curso','Gestor','DI','Inicio Gestor','Fin Gestor','Inicio Rev. DI','Fin Rev. DI'].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.slice(0, 200).map((c, i) => (
                        <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{c._nivel}</td>
                          <td className="px-4 py-3 text-xs text-gray-600 max-w-[180px] truncate">{c._programa}</td>
                          <td className="px-4 py-3 max-w-[250px]">
                            <div className="flex items-center gap-1.5">
                              {isPriority(c) && <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500 text-white uppercase tracking-wide">Prioridad</span>}
                              <span className="font-medium text-gray-900 truncate">{String(c.Asignatura)}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">{c.Estado ? <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATE_COLORS[c.Estado] || 'bg-gray-100 text-gray-600'}`}>{c.Estado}</span> : '—'}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{c['Estado curso'] ? <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATE_COLORS[c['Estado curso']] || 'bg-gray-100 text-gray-600'}`}>{c['Estado curso']}</span> : '—'}</td>
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
                  {filtered.length > 200 && <p className="text-xs text-gray-400 text-center py-3">Mostrando 200 de {filtered.length} resultados.</p>}
                  {filtered.length === 0 && <p className="text-sm text-gray-400 text-center py-10">No se encontraron cursos con esos filtros.</p>}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── TAB: CONTRASEÑAS ── */}
        {activeTab === 'passwords' && (
          <>
            {passwordMsg && (
              <div className={`mb-4 p-3 rounded-xl border text-sm flex items-center gap-2 ${passwordMsg.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                {passwordMsg.type === 'success' && (
                  <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                )}
                {passwordMsg.text}
                <button onClick={() => setPasswordMsg(null)} className="ml-auto opacity-60 hover:opacity-100">&times;</button>
              </div>
            )}

            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
              <input
                type="text"
                placeholder="Buscar usuario por nombre, usuario o rol..."
                value={searchUser}
                onChange={e => setSearchUser(e.target.value)}
                className="w-full max-w-md px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {loadingUsers ? (
                <div className="p-12 text-center text-gray-400 text-sm">Cargando usuarios...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Usuario</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Nombre</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Rol</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Estado</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase min-w-[300px]">Nueva contraseña</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map(u => {
                        const isAdmin = u.role === 'Super Admin';
                        const inputVal = passwordInputs[u.username] || '';
                        return (
                          <tr key={u.username} className={`border-b border-gray-50 hover:bg-gray-50 ${isAdmin ? 'bg-amber-50/50' : ''}`}>
                            <td className="px-4 py-3.5 font-mono text-xs text-gray-700">{u.username}</td>
                            <td className="px-4 py-3.5 text-gray-900 font-medium">{u.nombre}</td>
                            <td className="px-4 py-3.5">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[u.role] || 'bg-gray-100 text-gray-600'}`}>{u.role}</span>
                            </td>
                            <td className="px-4 py-3.5">
                              {u.hasCustomPassword
                                ? <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>Personalizada</span>
                                : <span className="text-xs text-gray-400">Por defecto</span>
                              }
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  placeholder="Min. 6 caracteres..."
                                  value={inputVal}
                                  onChange={e => setPasswordInputs(p => ({ ...p, [u.username]: e.target.value }))}
                                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                                />
                                <button
                                  onClick={() => {
                                    if (!inputVal || inputVal.length < 6) { setPasswordMsg({ type: 'error', text: 'La contraseña debe tener al menos 6 caracteres' }); return; }
                                    if (isAdmin) { setConfirmAdmin(u.username); } else { handleChangePassword(u.username, inputVal); }
                                  }}
                                  disabled={!inputVal || savingPassword === u.username}
                                  className={`px-4 py-2 text-xs font-semibold rounded-lg text-white disabled:opacity-40 disabled:cursor-not-allowed shrink-0 transition ${
                                    isAdmin ? 'bg-amber-500 hover:bg-amber-600' : 'bg-indigo-600 hover:bg-indigo-700'
                                  }`}
                                >
                                  {savingPassword === u.username ? 'Guardando...' : 'Cambiar'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Admin confirm modal */}
      {confirmAdmin && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Cambiar contraseña de Admin</h3>
                <p className="text-xs text-gray-500">Esta acción cambiará tu propia contraseña</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Estás a punto de cambiar la contraseña del <strong>Super Admin</strong>. Asegúrate de recordar la nueva contraseña, de lo contrario no podrás acceder al panel.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmAdmin(null)} className="flex-1 py-2.5 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button
                onClick={() => { const pwd = passwordInputs[confirmAdmin] || ''; setConfirmAdmin(null); handleChangePassword(confirmAdmin, pwd); }}
                className="flex-1 py-2.5 text-sm font-semibold rounded-xl text-white bg-amber-500 hover:bg-amber-600"
              >
                Sí, cambiar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
