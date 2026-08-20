import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { supabase } from '../supabase'

const sections = [
  {
    label: 'Operación',
    links: [
      { to: '/', label: 'Dashboard', icon: '📊' },
      { to: '/pedidos', label: 'Pedidos', icon: '🧾' },
      { to: '/reportes', label: 'Reportes', icon: '📈' },
    ],
  },
  {
    label: 'Catálogo',
    links: [
      { to: '/articulos', label: 'Artículos', icon: '🍗' },
      { to: '/insumos', label: 'Insumos', icon: '📦' },
      { to: '/gastos', label: 'Gastos / Egresos', icon: '💸' },
    ],
  },
  {
    label: 'Administración',
    adminOnly: true,
    links: [
      { to: '/usuarios', label: 'Usuarios', icon: '👥', adminOnly: true },
      { to: '/configuracion', label: 'Configuración', icon: '⚙️', adminOnly: true },
    ],
  },
]

export default function Layout({ profile, session }) {
  const [open, setOpen] = useState(false)
  const isAdmin = profile?.role === 'admin'

  const nav = (
    <nav className="flex-1 px-3 space-y-5 overflow-y-auto">
      {sections.filter(s => !s.adminOnly || isAdmin).map(s => (
        <div key={s.label}>
          <div className="px-4 mb-1.5 text-[10px] font-bold tracking-[0.15em] text-gray-500 uppercase">{s.label}</div>
          <div className="space-y-1">
            {s.links.filter(l => !l.adminOnly || isAdmin).map(l => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === '/'}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 rounded-xl font-semibold text-sm transition ${
                    isActive
                      ? 'bg-mv-yellow text-mv-navy shadow-lg shadow-black/20'
                      : 'text-gray-300 hover:bg-white/5 hover:text-white'
                  }`
                }
              >
                <span className="text-base">{l.icon}</span> {l.label}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  )

  const brand = (
    <div className="px-4 pt-6 pb-4 flex items-center justify-center border-b border-white/5">
      <img src="/logo.png" alt="Multiverso" className="h-24 w-auto drop-shadow-lg" />
    </div>
  )

  return (
    <div className="min-h-screen md:flex">
      {/* Sidebar escritorio */}
      <aside className="hidden md:flex md:flex-col w-72 bg-gradient-to-b from-mv-navy to-[#080a20] shrink-0 sticky top-0 h-screen border-r border-white/5">
        {brand}
        {nav}
        <UserBox profile={profile} session={session} />
      </aside>

      {/* Barra móvil */}
      <div className="md:hidden bg-mv-navy flex items-center justify-between px-4 py-2 sticky top-0 z-20 border-b border-white/5">
        <img src="/logo.png" alt="Multiverso" className="h-14 w-auto" />
        <button onClick={() => setOpen(!open)} className="text-white text-2xl px-2">☰</button>
      </div>
      {open && (
        <div className="md:hidden bg-mv-navy pb-4 sticky top-12 z-20 shadow-lg">
          {nav}
          <UserBox profile={profile} session={session} />
        </div>
      )}

      <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
        <Outlet />
      </main>
    </div>
  )
}

function UserBox({ profile, session }) {
  const isAdmin = profile?.role === 'admin'
  return (
    <div className="px-5 py-4 border-t border-white/5 mt-2 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${isAdmin ? 'bg-mv-yellow text-mv-navy' : 'bg-white/10 text-white'}`}>
        {(profile?.name || session.user.email)[0]?.toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-white text-sm font-semibold truncate">{profile?.name || session.user.email}</div>
        <div className="text-gray-500 text-[11px] mb-1">{isAdmin ? 'Administrador' : 'Solo lectura'}</div>
        <button
          onClick={() => supabase.auth.signOut()}
          className="text-mv-red text-[11px] font-bold hover:underline"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
