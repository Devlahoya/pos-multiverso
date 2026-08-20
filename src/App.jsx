import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { supabase, supabaseConfigured } from './supabase'
import { SettingsProvider } from './context/SettingsContext'
import { CategoriesProvider } from './context/CategoriesContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Pedidos from './pages/Pedidos'
import Articulos from './pages/Articulos'
import Insumos from './pages/Insumos'
import Gastos from './pages/Gastos'
import Reportes from './pages/Reportes'
import Usuarios from './pages/Usuarios'
import Configuracion from './pages/Configuracion'

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = cargando
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    if (!supabaseConfigured) { setSession(null); return }
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session?.user) { setProfile(null); return }
    supabase.from('profiles').select('*').eq('id', session.user.id).single()
      .then(({ data }) => setProfile(data))
  }, [session?.user?.id])

  if (!supabaseConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow p-8 max-w-lg text-center">
          <h1 className="text-2xl font-black text-mv-navy mb-3">Falta configurar Supabase</h1>
          <p className="text-gray-600">
            Crea un archivo <code className="bg-gray-100 px-1 rounded">.env</code> con
            <code className="bg-gray-100 px-1 rounded mx-1">VITE_SUPABASE_URL</code> y
            <code className="bg-gray-100 px-1 rounded mx-1">VITE_SUPABASE_ANON_KEY</code>.
            Ver instrucciones en el README.
          </p>
        </div>
      </div>
    )
  }

  if (session === undefined) {
    return <div className="min-h-screen flex items-center justify-center text-mv-navy font-bold">Cargando…</div>
  }

  if (!session) return <Login />

  const isAdmin = profile?.role === 'admin'

  return (
    <SettingsProvider>
      <CategoriesProvider>
        <Routes>
          <Route element={<Layout profile={profile} session={session} />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/pedidos" element={<Pedidos isAdmin={isAdmin} />} />
            <Route path="/articulos" element={<Articulos isAdmin={isAdmin} />} />
            <Route path="/insumos" element={<Insumos isAdmin={isAdmin} />} />
            <Route path="/gastos" element={<Gastos isAdmin={isAdmin} />} />
            <Route path="/reportes" element={<Reportes />} />
            <Route path="/usuarios" element={isAdmin ? <Usuarios myId={session.user.id} /> : <Navigate to="/" />} />
            <Route path="/configuracion" element={isAdmin ? <Configuracion /> : <Navigate to="/" />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Route>
        </Routes>
      </CategoriesProvider>
    </SettingsProvider>
  )
}
