import { useState } from 'react'
import { supabase } from '../supabase'

export default function Login() {
  const [mode, setMode] = useState('login') // login | signup
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [msg, setMsg] = useState(null)
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true); setMsg(null)
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMsg({ type: 'error', text: 'Correo o contraseña incorrectos.' })
    } else {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { data: { name } },
      })
      if (error) setMsg({ type: 'error', text: error.message })
      else setMsg({ type: 'ok', text: 'Cuenta creada. Si no entra automáticamente, revisa tu correo para confirmar y luego inicia sesión.' })
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-mv-navy">
      {/* Fondo decorativo */}
      <div className="absolute inset-0 dotted-bg opacity-40" />
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-mv-blue/20 blur-3xl" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-mv-red/20 blur-3xl" />
      <div className="absolute top-1/3 right-1/4 w-72 h-72 rounded-full bg-mv-yellow/10 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="bg-white/95 backdrop-blur rounded-3xl shadow-2xl ring-1 ring-white/10 w-full overflow-hidden">
          <div className="px-8 pt-12 pb-6 text-center bg-gradient-to-b from-mv-navy-light/5 to-transparent">
            <img src="/logo.png" alt="Multiverso Boneless and Food" className="h-40 mx-auto drop-shadow-sm" />
            <div className="text-gray-400 text-xs font-semibold tracking-widest uppercase mt-5">Punto de venta</div>
          </div>

          <form onSubmit={submit} className="px-8 pb-8 space-y-4">
            {mode === 'signup' && (
              <input value={name} onChange={e => setName(e.target.value)} required placeholder="Tu nombre"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-mv-blue focus:border-transparent transition" />
            )}
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="Correo"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-mv-blue focus:border-transparent transition" />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} placeholder="Contraseña"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-mv-blue focus:border-transparent transition" />

            {msg && (
              <div className={`text-sm rounded-xl px-3 py-2.5 ${msg.type === 'error' ? 'bg-red-50 text-mv-red' : 'bg-green-50 text-green-700'}`}>
                {msg.text}
              </div>
            )}

            <button disabled={loading} className="btn-primary w-full py-3.5 rounded-xl">
              {loading ? '…' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
            </button>

            <button type="button" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMsg(null) }}
              className="w-full text-sm text-mv-blue font-semibold hover:underline">
              {mode === 'login' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
            </button>

            {mode === 'signup' && (
              <p className="text-xs text-gray-400 text-center">
                Las cuentas nuevas entran como <b>solo lectura</b>. Un administrador debe darte permisos.
              </p>
            )}
          </form>
        </div>
        <p className="text-center text-white/30 text-xs mt-6 tracking-wide">Multiverso — Boneless and Food</p>
      </div>
    </div>
  )
}
