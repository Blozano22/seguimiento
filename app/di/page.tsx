'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';

interface Curso {
  _nivel: string;
  _programa: string;
  Asignatura: string;
  Estado?: string;
  'Gestor responsable '?: string;
  'Gestor responsable'?: string;
  'Fecha fin corrección gestor'?: string;
  'Fin Gestor'?: string;
}

type ActionId = 'aprobado' | 'devuelto';

export default function DIPage() {
  const { data: session } = useSession();
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<{ curso: Curso; actionId: ActionId } | null>(null);
  const [saving, setSaving] = useState(false);
  const [messages, setMessages] = useState<{ id: string; type: 'success' | 'error'; text: string }[]>([]);

  const load = async () => {
    const res = await fetch('/api/my-courses').then(r => r.json());
    setCursos(res.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAction = async () => {
    if (!pendingAction) return;
    const { curso, actionId } = pendingAction;
    setSaving(true);
    try {
      const res = await fetch('/api/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rol: 'Diseñador Instruccional',
          responsable: session?.user?.name || '',
          nivel: curso._nivel,
          programa: curso._programa,
          curso: curso.Asignatura,
          estadoId: actionId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const label = actionId === 'aprobado' ? 'Aprobado' : 'Devuelto';
      setMessages(m => [...m, { id: Date.now().toString(), type: 'success', text: `${label}: "${curso.Asignatura}"` }]);
      setPendingAction(null);
      await load();
    } catch (err) {
      setMessages(m => [...m, { id: Date.now().toString(), type: 'error', text: err instanceof Error ? err.message : 'Error' }]);
    } finally {
      setSaving(false);
    }
  };

  const gestor = (c: Curso) => String(c['Gestor responsable '] ?? c['Gestor responsable'] ?? '—').trim();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-violet-600 rounded-xl flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900">Cursos en revisión</h1>
              <p className="text-xs text-gray-500">{session?.user?.name} · Diseñador Instruccional</p>
            </div>
          </div>
          <button onClick={() => signOut({ callbackUrl: '/login' })} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Toasts */}
        <div className="space-y-2 mb-4">
          {messages.map(m => (
            <div key={m.id} className={`p-3 rounded-xl border text-sm flex items-center gap-2 ${m.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
              {m.text}
              <button onClick={() => setMessages(msgs => msgs.filter(x => x.id !== m.id))} className="ml-auto opacity-60 hover:opacity-100">×</button>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400 text-sm">Cargando cursos...</div>
        ) : cursos.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <p className="text-gray-500 text-sm">No hay cursos pendientes de revisión.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="grid grid-cols-[1fr_1fr_2fr_auto] gap-0 text-xs font-semibold text-gray-500 uppercase px-5 py-3 border-b border-gray-100 bg-gray-50">
              <span>Nivel</span>
              <span>Programa</span>
              <span>Asignatura</span>
              <span>Acciones</span>
            </div>
            {cursos.map((c, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_2fr_auto] gap-0 items-center px-5 py-3.5 border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                <span className="text-sm text-gray-500">{c._nivel}</span>
                <span className="text-sm text-gray-600 truncate pr-4">{c._programa}</span>
                <div>
                  <p className="text-sm font-medium text-gray-900">{c.Asignatura}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Gestor: {gestor(c)}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => setPendingAction({ curso: c, actionId: 'aprobado' })}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    Aprobar
                  </button>
                  <button
                    onClick={() => setPendingAction({ curso: c, actionId: 'devuelto' })}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                    Devolver
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Confirm modal */}
      {pendingAction && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-gray-900 text-base mb-2">
              {pendingAction.actionId === 'aprobado' ? 'Aprobar curso' : 'Devolver para corrección'}
            </h3>
            <p className="text-sm text-gray-600 mb-1">
              <span className="font-medium">{pendingAction.curso.Asignatura}</span>
            </p>
            <p className="text-xs text-gray-400 mb-6">{pendingAction.curso._nivel} · {pendingAction.curso._programa}</p>
            <div className="flex gap-2">
              <button onClick={() => setPendingAction(null)} className="flex-1 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button
                onClick={handleAction}
                disabled={saving}
                className={`flex-1 py-2 text-sm font-semibold rounded-xl text-white transition disabled:opacity-60 ${pendingAction.actionId === 'aprobado' ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-500 hover:bg-orange-600'}`}
              >
                {saving ? 'Guardando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
