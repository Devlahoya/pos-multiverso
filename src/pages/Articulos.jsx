import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { money } from '../lib/format'
import { CHANNELS, channelCommission } from '../lib/channels'
import { useSettings } from '../context/SettingsContext'
import { useCategories } from '../context/CategoriesContext'
import { uploadArticleImage } from '../lib/uploadImage'
import ArticleImage from '../components/ArticleImage'

const empty = { name: '', category: '', image_url: null, cost: '', price_sitio: '', price_uber: '', price_didi: '', price_rappi: '', active: true }

export default function Articulos({ isAdmin }) {
  const { settings } = useSettings()
  const { categories } = useCategories()
  const [items, setItems] = useState([])
  const [form, setForm] = useState(empty)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('articles').select('*').order('name')
    setItems(data ?? [])
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleImageChange(e) {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadArticleImage(file)
      set('image_url', url)
    } catch (err) {
      alert('Error al subir imagen: ' + err.message)
    }
    setUploading(false)
  }

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      name: form.name.trim(),
      category: form.category.trim() || null,
      image_url: form.image_url || null,
      cost: Number(form.cost) || 0,
      price_sitio: form.price_sitio === '' ? null : Number(form.price_sitio),
      price_uber: form.price_uber === '' ? null : Number(form.price_uber),
      price_didi: form.price_didi === '' ? null : Number(form.price_didi),
      price_rappi: form.price_rappi === '' ? null : Number(form.price_rappi),
      active: form.active,
    }
    const q = editingId
      ? supabase.from('articles').update(payload).eq('id', editingId)
      : supabase.from('articles').insert(payload)
    const { error } = await q
    if (error) alert('Error: ' + error.message)
    else { setForm(empty); setEditingId(null); load() }
    setSaving(false)
  }

  function edit(a) {
    setEditingId(a.id)
    setForm({
      name: a.name, category: a.category ?? '', image_url: a.image_url ?? null, cost: a.cost ?? '',
      price_sitio: a.price_sitio ?? '', price_uber: a.price_uber ?? '',
      price_didi: a.price_didi ?? '', price_rappi: a.price_rappi ?? '',
      active: a.active,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function remove(id) {
    if (!confirm('¿Eliminar artículo? Los pedidos anteriores conservan su historial.')) return
    const { error } = await supabase.from('articles').delete().eq('id', id)
    if (error) alert('No se pudo eliminar (tiene pedidos). Mejor desactívalo.\n' + error.message)
    load()
  }

  const commissionByChannel = Object.fromEntries(CHANNELS.map(c => [c.id, channelCommission(c.id, settings)]))

  const util = (price, channelId) => {
    if (price == null || price === '') return null
    const neto = Number(price) * (1 - commissionByChannel[channelId])
    return neto - (Number(form.cost) || 0)
  }

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-display font-extrabold text-mv-navy tracking-tight mb-6">Artículos</h1>

      {isAdmin && (
        <form onSubmit={save} className="card p-5 mb-8">
          <h2 className="font-bold text-mv-navy mb-4">{editingId ? 'Editar artículo' : 'Nuevo artículo'}</h2>
          <div className="flex gap-4 mb-3">
            <div className="relative shrink-0">
              <ArticleImage src={form.image_url} alt="" className="w-20 h-20 rounded-xl" />
              {uploading && (
                <div className="absolute inset-0 rounded-xl bg-black/40 flex items-center justify-center text-white text-xs">…</div>
              )}
              {form.image_url && !uploading && (
                <button type="button" onClick={() => set('image_url', null)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-mv-red text-white text-xs font-bold leading-none">×</button>
              )}
            </div>
            <div className="flex-1">
              <label className="inline-block cursor-pointer text-xs font-bold text-mv-blue hover:underline mb-1">
                {form.image_url ? 'Cambiar foto' : 'Subir foto'}
                <input type="file" accept="image/*" onChange={handleImageChange} disabled={uploading} className="hidden" />
              </label>
              <div className="grid sm:grid-cols-3 gap-3">
                <input value={form.name} onChange={e => set('name', e.target.value)} required placeholder="Nombre (ej. Boneless 500g)"
                  className="border border-gray-300 rounded-lg px-3 py-2 sm:col-span-2" />
                <input value={form.category} onChange={e => set('category', e.target.value)} placeholder="Categoría (ej. Boneless, Bebidas)"
                  list="categorias-list" className="border border-gray-300 rounded-lg px-3 py-2" />
                <datalist id="categorias-list">
                  {categories.map(c => <option key={c.id} value={c.name} />)}
                </datalist>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-3">
            <label className="text-xs font-semibold text-gray-500">
              Costo de producción
              <input type="number" step="0.01" min="0" value={form.cost} onChange={e => set('cost', e.target.value)} required placeholder="$"
                className="border border-gray-300 rounded-lg px-3 py-2 w-full mt-1 text-base" />
            </label>
            {CHANNELS.map(c => (
              <label key={c.id} className="text-xs font-semibold text-gray-500">
                Precio {c.label}
                {commissionByChannel[c.id] > 0 && <span className="text-mv-red"> (−{Math.round(commissionByChannel[c.id] * 100)}%)</span>}
                <input type="number" step="0.01" min="0" value={form[c.priceField]} onChange={e => set(c.priceField, e.target.value)}
                  placeholder="No se vende" className="border border-gray-300 rounded-lg px-3 py-2 w-full mt-1 text-base" />
                {util(form[c.priceField], c.id) != null && (
                  <span className={`block mt-0.5 ${util(form[c.priceField], c.id) < 0 ? 'text-mv-red' : 'text-green-600'}`}>
                    Utilidad real: {money(util(form[c.priceField], c.id))}
                  </span>
                )}
              </label>
            ))}
          </div>
          <p className="text-xs text-gray-400 mb-3">Deja vacío el precio de un canal si el artículo no se vende ahí.</p>
          <div className="flex gap-3 items-center">
            <button disabled={saving} className="btn-primary px-6 py-2.5 rounded-xl">
              {editingId ? 'Guardar cambios' : 'Agregar artículo'}
            </button>
            {editingId && (
              <button type="button" onClick={() => { setEditingId(null); setForm(empty) }} className="text-gray-500 text-sm font-semibold">
                Cancelar
              </button>
            )}
            <label className="ml-auto flex items-center gap-2 text-sm font-semibold text-gray-600">
              <input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)} /> Activo
            </label>
          </div>
        </form>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="text-left text-xs text-gray-500 uppercase border-b">
              <th className="px-4 py-3"></th>
              <th className="px-4 py-3">Artículo</th>
              <th className="px-4 py-3">Costo</th>
              {CHANNELS.map(c => <th key={c.id} className="px-4 py-3">{c.label}</th>)}
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {items.map(a => (
              <tr key={a.id} className={`border-b last:border-0 ${!a.active ? 'opacity-40' : ''}`}>
                <td className="px-4 py-3">
                  <ArticleImage src={a.image_url} alt={a.name} className="w-10 h-10 rounded-lg" />
                </td>
                <td className="px-4 py-3">
                  <div className="font-bold text-mv-navy">{a.name}</div>
                  {a.category && <div className="text-xs text-gray-400">{a.category}</div>}
                </td>
                <td className="px-4 py-3 text-gray-600">{money(a.cost)}</td>
                {CHANNELS.map(c => {
                  const u = a[c.priceField] != null ? Number(a[c.priceField]) * (1 - commissionByChannel[c.id]) - a.cost : null
                  return (
                    <td key={c.id} className="px-4 py-3">
                      {a[c.priceField] != null ? (
                        <div>
                          <div className="font-semibold">{money(a[c.priceField])}</div>
                          <div className={`text-xs ${u < 0 ? 'text-mv-red' : 'text-green-600'}`}>
                            {u >= 0 ? '+' : ''}{money(u)}
                          </div>
                        </div>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                  )
                })}
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  {isAdmin && (
                    <>
                      <button onClick={() => edit(a)} className="text-mv-blue font-bold text-xs mr-3 hover:underline">Editar</button>
                      <button onClick={() => remove(a.id)} className="text-mv-red font-bold text-xs hover:underline">Eliminar</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Sin artículos todavía.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
