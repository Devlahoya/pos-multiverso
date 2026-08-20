import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { fmtDate } from '../lib/format'

export default function Usuarios({ myId }) {
  const [users, setUsers] = useState([])

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('profiles').select('*').order('created_at')
    setUsers(data ?? [])
  }

  async function setRole(id, role) {
    const { error } = await supabase.from('profiles').update({ role }).eq('id', id)
    if (error) alert('Error: ' + error.message)
    load()
  }

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-display font-extrabold text-mv-navy tracking-tight mb-2">Usuarios</h1>
      <p className="text-sm text-gray-500 mb-6 max-w-2xl">
        Cada persona crea su cuenta desde la pantalla de inicio de sesión («Regístrate»). Entra como
        <b> solo lectura</b>; aquí le asignas el rol de <b>administrador</b> si debe capturar pedidos,
        artículos o gastos.
      </p>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[500px]">
          <thead>
            <tr className="text-left text-xs text-gray-500 uppercase border-b">
              <th className="px-4 py-3">Usuario</th>
              <th className="px-4 py-3">Correo</th>
              <th className="px-4 py-3">Desde</th>
              <th className="px-4 py-3">Rol</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b last:border-0">
                <td className="px-4 py-3 font-bold text-mv-navy">{u.name || '—'} {u.id === myId && <span className="text-xs text-gray-400">(tú)</span>}</td>
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
