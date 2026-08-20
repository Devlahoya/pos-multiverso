import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { useSettings } from '../context/SettingsContext'
import { useCategories } from '../context/CategoriesContext'

const round1 = (n) => Math.round(n * 10) / 10

export default function Configuracion() {
  const { settings, loading, error, refresh } = useSettings()
  const { categories, refresh: refreshCategories } = useCategories()

  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [newCategory, setNewCategory] = useState('')

  useEffect(() => {
    if (!settings) return
    setForm({
      ...settings,
      commission_uber: round1(Number(settings.commission_uber) * 100),
      commission_didi: round1(Number(settings.commission_didi) * 100),
      commission_rappi: round1(Number(settings.commission_rappi) * 100),
    })
  }, [settings])

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setSaved(false) }

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('app_settings').update({
      business_name: form.business_name?.trim() || 'Multiverso — Boneless and Food',
      business_phone: form.business_phone?.trim() || null,
      business_address: form.business_address?.trim() || null,
      commission_uber: Number(form.commission_uber) / 100,
      commission_didi: Number(form.commission_didi) / 100,
      commission_rappi: Number(form.commission_rappi) / 100,
    }).eq('id', true)
    if (error) alert('Error: ' + error.message)
    else { await refresh(); setSaved(true) }
    setSaving(false)
  }

  async function addCategory(e) {
    e.preventDefault()
    const name = newCategory.trim()
    if (!name) return
    const { error } = await supabase.from('categories').insert({ name })
    if (error) alert('Error: ' + error.message)
    else { setNewCategory(''); refreshCategories() }
  }

  async function removeCategory(id) {
    if (!confirm('¿Eliminar esta categoría? Los artículos que ya la usan conservan el texto.')) return
    await supabase.from('categories').delete().eq('id', id)
    refreshCategories()
  }

  if (loading) return <p className="text-gray-400">Cargando…</p>

  if (error || !form) {
    return (
      <div className="card p-6 max-w-xl">
        <h1 className="text-2xl font-display font-extrabold text-mv-navy tracking-tight mb-3">Configuración</h1>
        <p className="text-sm text-gray-600 mb-3">
          No se pudo cargar la configuración. Es probable que tu base de datos aún no tenga la tabla
          <code className="bg-gray-100 px-1 rounded mx-1">app_settings</code> — corre
          <code className="bg-gray-100 px-1 rounded mx-1">supabase/migration_v2.sql</code> en el SQL Editor
          de Supabase (después de <code className="bg-gray-100 px-1 rounded">migration_commission.sql</code> si aún no lo hiciste).
        </p>
        {error?.message && <p className="text-xs text-mv-red font-mono mb-3">{error.message}</p>}
        <button onClick={refresh} className="btn-primary px-5 py-2 rounded-xl text-sm">Reintentar</button>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-display font-extrabold text-mv-navy tracking-tight mb-6">Configuración</h1>

      <div className="grid lg:grid-cols-2 gap-6">
        <form onSubmit={save} className="card p-6 space-y-5">
          <div>
            <h2 className="font-bold text-mv-navy mb-1">Datos del negocio</h2>
            <p className="text-xs text-gray-400 mb-3">Aparecen en el ticket de cada pedido.</p>
            <div className="space-y-3">
              <input value={form.business_name ?? ''} onChange={e => set('business_name', e.target.value)}
                placeholder="Nombre del negocio" className="border border-gray-300 rounded-lg px-3 py-2 w-full" />
              <input value={form.business_phone ?? ''} onChange={e => set('business_phone', e.target.value)}
                placeholder="Teléfono (opcional)" className="border border-gray-300 rounded-lg px-3 py-2 w-full" />
              <input value={form.business_address ?? ''} onChange={e => set('business_address', e.target.value)}
                placeholder="Dirección (opcional)" className="border border-gray-300 rounded-lg px-3 py-2 w-full" />
            </div>
          </div>

          <div>
            <h2 className="font-bold text-mv-navy mb-1">Comisión de plataformas</h2>
            <p className="text-xs text-gray-400 mb-3">
              % que se descuenta del total al calcular ingreso y utilidad real. Sitio no tiene comisión.
            </p>
            <div className="grid grid-cols-3 gap-3">
              <label className="text-xs font-semibold text-gray-500">
                Uber Eats
                <div className="relative mt-1">
                  <input type="number" step="0.1" min="0" max="100" value={form.commission_uber ?? ''}
                    onChange={e => set('commission_uber', e.target.value)}
                    className="border border-gray-300 rounded-lg pl-3 pr-7 py-2 w-full text-base" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                </div>
              </label>
              <label className="text-xs font-semibold text-gray-500">
                Didi Food
                <div className="relative mt-1">
                  <input type="number" step="0.1" min="0" max="100" value={form.commission_didi ?? ''}
                    onChange={e => set('commission_didi', e.target.value)}
                    className="border border-gray-300 rounded-lg pl-3 pr-7 py-2 w-full text-base" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                </div>
              </label>
              <label className="text-xs font-semibold text-gray-500">
                Rappi
                <div className="relative mt-1">
                  <input type="number" step="0.1" min="0" max="100" value={form.commission_rappi ?? ''}
                    onChange={e => set('commission_rappi', e.target.value)}
                    className="border border-gray-300 rounded-lg pl-3 pr-7 py-2 w-full text-base" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                </div>
              </label>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button disabled={saving} className="btn-primary px-6 py-2.5 rounded-xl">
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
            {saved && <span className="text-green-600 text-sm font-semibold">Guardado ✓</span>}
          </div>
        </form>

        <div className="card p-6">
          <h2 className="font-bold text-mv-navy mb-1">Categorías de artículos</h2>
          <p className="text-xs text-gray-400 mb-3">Se sugieren al crear o editar un artículo.</p>

          <form onSubmit={addCategory} className="flex gap-2 mb-4">
            <input value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="Nueva categoría (ej. Boneless)"
              className="border border-gray-300 rounded-lg px-3 py-2 flex-1" />
            <button className="btn-primary px-4 py-2 rounded-lg">Agregar</button>
          </form>

          <div className="flex flex-wrap gap-2">
            {categories.map(c => (
              <span key={c.id} className="inline-flex items-center gap-2 bg-gray-100 text-mv-navy text-sm font-semibold px-3 py-1.5 rounded-full">
                {c.name}
                <button onClick={() => removeCategory(c.id)} className="text-gray-400 hover:text-mv-red font-bold">×</button>
              </span>
            ))}
            {categories.length === 0 && <p className="text-gray-400 text-sm">Sin categorías todavía.</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
