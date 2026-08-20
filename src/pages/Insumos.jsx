import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { money, fmtDate, isoDay } from '../lib/format'

const empty = { name: '', quantity: '', unit: '', total_cost: '', supplier: '', date: isoDay(), notes: '' }

export default function Insumos({ isAdmin }) {
  const [items, setItems] = useState([])
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('supplies').select('*').order('date', { ascending: false }).limit(200)
    setItems(data ?? [])
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('supplies').insert({
      name: form.name.trim(),
      quantity: form.quantity === '' ? null : Number(form.quantity),
      unit: form.unit.trim() || null,
      total_cost: Number(form.total_cost) || 0,
      supplier: form.supplier.trim() || null,
      date: form.date,
      notes: form.notes.trim() || null,
    })
    if (error) alert('Error: ' + error.message)
    else { setForm({ ...empty, date: form.date }); load() }
    setSaving(false)
  }

  async function remove(id) {
    if (!confirm('¿Eliminar este insumo?')) return
    await supabase.from('supplies').delete().eq('id', id)
    load()
  }

  const totalMes = items
    .filter(i => i.date.slice(0, 7) === isoDay().slice(0, 7))
    .reduce((s, i) => s + Number(i.total_cost), 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <h1 className="text-2xl md:text-3xl font-display font-extrabold text-mv-navy tracking-tight">Insumos comprados</h1>
        <div className="bg-white rounded-lg shadow px-4 py-2 text-sm">
          Este mes: <b className="text-mv-red">{money(totalMes)}</b>
        </div>
      </div>

      {isAdmin && (
        <form onSubmit={save} className="card p-5 mb-8">
          <h2 className="font-bold text-mv-navy mb-4">Registrar compra de insumo</h2>
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 mb-3">
            <input value={form.name} onChange={e => set('name', e.target.value)} required placeholder="Insumo (ej. Pechuga de pollo)"
              className="border border-gray-300 rounded-lg px-3 py-2 col-span-2" />
            <input type="number" step="0.01" min="0" value={form.quantity} onChange={e => set('quantity', e.target.value)} placeholder="Cantidad"
              className="border border-gray-300 rounded-lg px-3 py-2" />
            <input value={form.unit} onChange={e => set('unit', e.target.value)} placeholder="Unidad (kg, pza…)"
              className="border border-gray-300 rounded-lg px-3 py-2" />
            <input type="number" step="0.01" min="0" value={form.total_cost} onChange={e => set('total_cost', e.target.value)} required placeholder="Costo total $"
              className="border border-gray-300 rounded-lg px-3 py-2" />
            <input type="date" value={form.date} onChange={e => set('date', e.target.value)} required
              className="border border-gray-300 rounded-lg px-3 py-2" />
          </div>
          <div className="grid sm:grid-cols-2 gap-3 mb-3">
            <input value={form.supplier} onChange={e => set('supplier', e.target.value)} placeholder="Proveedor (opcional)"
              className="border border-gray-300 rounded-lg px-3 py-2" />
            <input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Notas (opcional)"
              className="border border-gray-300 rounded-lg px-3 py-2" />
          </div>
          <button disabled={saving} className="btn-primary px-6 py-2.5 rounded-xl">
            Registrar
          </button>
        </form>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="text-left text-xs text-gray-500 uppercase border-b">
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Insumo</th>
              <th className="px-4 py-3">Cantidad</th>
              <th className="px-4 py-3">Proveedor</th>
              <th className="px-4 py-3 text-right">Costo</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {items.map(i => (
              <tr key={i.id} className="border-b last:border-0">
                <td className="px-4 py-3 text-gray-500">{fmtDate(i.date + 'T00:00:00')}</td>
                <td className="px-4 py-3">
                  <div className="font-bold text-mv-navy">{i.name}</div>
                  {i.notes && <div className="text-xs text-gray-400">{i.notes}</div>}
                </td>
                <td className="px-4 py-3 text-gray-600">{i.quantity != null ? `${i.quantity} ${i.unit ?? ''}` : '—'}</td>
                <td className="px-4 py-3 text-gray-600">{i.supplier ?? '—'}</td>
                <td className="px-4 py-3 text-right font-bold">{money(i.total_cost)}</td>
                <td className="px-4 py-3 text-right">
                  {isAdmin && <button onClick={() => remove(i.id)} className="text-mv-red font-bold text-xs hover:underline">Eliminar</button>}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Sin insumos registrados.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
