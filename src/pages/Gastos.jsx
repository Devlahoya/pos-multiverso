import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { money, fmtDate, isoDay } from '../lib/format'

const empty = { concept: '', type: 'gasto', category: '', amount: '', date: isoDay(), notes: '' }

export default function Gastos({ isAdmin }) {
  const [items, setItems] = useState([])
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('expenses').select('*').order('date', { ascending: false }).limit(200)
    setItems(data ?? [])
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('expenses').insert({
      concept: form.concept.trim(),
      type: form.type,
      category: form.category.trim() || null,
      amount: Number(form.amount) || 0,
      date: form.date,
      notes: form.notes.trim() || null,
    })
    if (error) alert('Error: ' + error.message)
    else { setForm({ ...empty, date: form.date, type: form.type }); load() }
    setSaving(false)
  }

  async function remove(id) {
    if (!confirm('¿Eliminar este registro?')) return
    await supabase.from('expenses').delete().eq('id', id)
    load()
  }

  const mes = isoDay().slice(0, 7)
  const totalMes = items.filter(i => i.date.slice(0, 7) === mes).reduce((s, i) => s + Number(i.amount), 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <h1 className="text-2xl md:text-3xl font-display font-extrabold text-mv-navy tracking-tight">Gastos y egresos</h1>
        <div className="bg-white rounded-lg shadow px-4 py-2 text-sm">
          Este mes: <b className="text-mv-red">{money(totalMes)}</b>
        </div>
      </div>

      {isAdmin && (
        <form onSubmit={save} className="card p-5 mb-8">
          <h2 className="font-bold text-mv-navy mb-4">Registrar gasto / egreso</h2>
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 mb-3">
            <input value={form.concept} onChange={e => set('concept', e.target.value)} required placeholder="Concepto (ej. Renta, Gas)"
              className="border border-gray-300 rounded-lg px-3 py-2 col-span-2" />
            <select value={form.type} onChange={e => set('type', e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2">
              <option value="gasto">Gasto</option>
              <option value="egreso">Egreso</option>
            </select>
            <input value={form.category} onChange={e => set('category', e.target.value)} placeholder="Categoría (opcional)"
              className="border border-gray-300 rounded-lg px-3 py-2" />
            <input type="number" step="0.01" min="0" value={form.amount} onChange={e => set('amount', e.target.value)} required placeholder="Monto $"
              className="border border-gray-300 rounded-lg px-3 py-2" />
            <input type="date" value={form.date} onChange={e => set('date', e.target.value)} required
              className="border border-gray-300 rounded-lg px-3 py-2" />
          </div>
          <input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Notas (opcional)"
            className="border border-gray-300 rounded-lg px-3 py-2 w-full mb-3" />
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
              <th className="px-4 py-3">Concepto</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Categoría</th>
              <th className="px-4 py-3 text-right">Monto</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {items.map(i => (
              <tr key={i.id} className="border-b last:border-0">
                <td className="px-4 py-3 text-gray-500">{fmtDate(i.date + 'T00:00:00')}</td>
                <td className="px-4 py-3">
                  <div className="font-bold text-mv-navy">{i.concept}</div>
                  {i.notes && <div className="text-xs text-gray-400">{i.notes}</div>}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${i.type === 'gasto' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-mv-red'}`}>
                    {i.type}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">{i.category ?? '—'}</td>
                <td className="px-4 py-3 text-right font-bold text-mv-red">{money(i.amount)}</td>
                <td className="px-4 py-3 text-right">
                  {isAdmin && <button onClick={() => remove(i.id)} className="text-mv-red font-bold text-xs hover:underline">Eliminar</button>}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Sin gastos registrados.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
