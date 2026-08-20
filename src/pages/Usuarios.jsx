import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { fmtDate } from '../lib/format'

export default function Usuarios({ myId }) {
  const [users, setUsers] = useState([])
  const [names, setNames] = useState({}) // borrador de edición { id: valor }
  const [savingId, setSavingId] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('profiles').select('*').order('created_at')
    setUsers(data ?? [])
    setNames(Object.fromEntries((data ?? []).map(u => [u.id, u.name ?? ''])))
  }

  async function setRole(id, role) {
    const { error } = await supabase.from('profiles').update({ role }).eq('id', id)
    if (error) alert('Error: ' + error.message)
    load()
  }

  async function saveName(id) {
    const name = names[id].trim()
    setSavingId(id)
    const { error } = await supabase.from('profiles').update({ name }).eq('id', id)
    if (error) alert('Error: ' + error.message)
    setSavingId(null)
    load()
  }

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-display font-extrabold text-mv-navy tracking-tight mb-2">Usuarios</h1>
      <p className="text-sm text-gray-500 mb-6 max-w-2xl">
        El registro público está cerrado. Para dar de alta a alguien nuevo: Supabase →
        Authentication → Users → Add user. Aquí le pones su nombre y le asignas el rol de
        <b> administrador</b> si debe capturar pedidos, artículos o gastos.
      </p>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr className="text-left text-xs text-gray-500 uppercase border-b">
              <th className="px-4 py-3">Usuario</th>
              <th className="px-4 py-3">Correo</th>
              <th className="px-4 py-3">Desde</th>
              <th className="px-4 py-3">Rol</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => {
              const dirty = (names[u.id] ?? '') !== (u.name ?? '')
              return (
                <tr key={u.id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <input
                        value={names[u.id] ?? ''}
                        onChange={e => setNames(n => ({ ...n, [u.id]: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter' && dirty) saveName(u.id) }}
                        placeholder="Nombre"
                        className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm font-bold text-mv-navy w-36"
                      />
                      {u.id === myId && <span className="text-xs text-gray-400 shrink-0">(tú)</span>}
                      {dirty && (
                        <button onClick={() => saveName(u.id)} disabled={savingId === u.id}
                          className="text-mv-blue text-xs font-bold hover:underline shrink-0 disabled:opacity-50">
                          {savingId === u.id ? 'Guardando…' : 'Guardar'}
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3 text-gray-500">{fmtDate(u.created_at)}</td>
                  <td className="px-4 py-3">
                    <select value={u.role} disabled={u.id === myId}
                      onChange={e => setRole(u.id, e.target.value)}
                      className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white disabled:opacity-50">
                      <option value="admin">Administrador</option>
                      <option value="viewer">Solo lectura</option>
                    </select>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
