import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { money, isoDay, addDays, dayStartISO, dayEndISO, fmtDate } from '../lib/format'
import { CHANNELS, channelLabel } from '../lib/channels'

export default function Reportes() {
  const hoy = isoDay()
  const [from, setFrom] = useState(hoy)
  const [to, setTo] = useState(hoy)
  const [preset, setPreset] = useState('hoy')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => { load() }, [from, to])

  function pick(p) {
    setPreset(p)
    const h = isoDay()
    if (p === 'hoy') { setFrom(h); setTo(h) }
    if (p === 'semana') { setFrom(addDays(h, -6)); setTo(h) }
    if (p === 'mes') { setFrom(h.slice(0, 8) + '01'); setTo(h) }
  }

  async function load() {
    setLoading(true)
    const [ordersRes, expRes, supRes] = await Promise.all([
      supabase.from('orders').select('*, order_items(*)')
        .gte('created_at', dayStartISO(from)).lte('created_at', dayEndISO(to)),
      supabase.from('expenses').select('*').gte('date', from).lte('date', to),
      supabase.from('supplies').select('*').gte('date', from).lte('date', to),
    ])
    const orders = ordersRes.data ?? []
    const expenses = expRes.data ?? []
    const supplies = supRes.data ?? []

    const netOf = (o) => Number(o.total) * (1 - Number(o.commission_rate || 0))

    const ventas = orders.reduce((s, o) => s + Number(o.total), 0)
    const comision = orders.reduce((s, o) => s + Number(o.total) * Number(o.commission_rate || 0), 0)
    const ingresoNeto = ventas - comision
    const costoProd = orders.reduce((s, o) => s + Number(o.cost_total), 0)
    const gastos = expenses.reduce((s, e) => s + Number(e.amount), 0)
    const insumos = supplies.reduce((s, e) => s + Number(e.total_cost), 0)

    // Por canal
    const porCanal = CHANNELS.map(c => {
      const chOrders = orders.filter(o => o.channel === c.id)
      const v = chOrders.reduce((s, o) => s + Number(o.total), 0)
      const com = chOrders.reduce((s, o) => s + Number(o.total) * Number(o.commission_rate || 0), 0)
      const cst = chOrders.reduce((s, o) => s + Number(o.cost_total), 0)
      return { canal: c.label, pedidos: chOrders.length, ventas: v, comision: com, costo: cst, utilidad: v - com - cst }
    })

    // Por artículo (con canal, aplicando comisión de la orden a la que pertenece)
    const map = {}
    for (const o of orders) {
      const com = Number(o.commission_rate || 0)
      for (const it of o.order_items ?? []) {
        const key = it.article_name + '|' + o.channel
        if (!map[key]) map[key] = { articulo: it.article_name, canal: channelLabel(o.channel), unidades: 0, ventas: 0, costo: 0, comision: 0 }
        const lineVentas = Number(it.unit_price) * it.qty
        map[key].unidades += it.qty
        map[key].ventas += lineVentas
        map[key].comision += lineVentas * com
        map[key].costo += Number(it.unit_cost) * it.qty
      }
    }
    const porArticulo = Object.values(map)
      .map(x => ({ ...x, utilidad: x.ventas - x.comision - x.costo }))
      .sort((a, b) => b.utilidad - a.utilidad)

    setData({ ventas, comision, ingresoNeto, costoProd, gastos, insumos, pedidos: orders.length, porCanal, porArticulo })
    setLoading(false)
  }

  function exportCSV() {
    if (!data) return
    const rows = [
      ['Reporte Multiverso', `${from} a ${to}`],
      [],
      ['Ventas brutas', data.ventas], ['Comision plataformas', data.comision], ['Ingreso neto', data.ingresoNeto],
      ['Costo produccion', data.costoProd],
      ['Utilidad bruta', utilBruta],
      ['Gastos/Egresos', data.gastos], ['Insumos', data.insumos],
      ['Utilidad neta', utilNeta],
      [],
      ['Canal', 'Pedidos', 'Ventas', 'Comision', 'Costo', 'Utilidad'],
      ...data.porCanal.map(c => [c.canal, c.pedidos, c.ventas, c.comision, c.costo, c.utilidad]),
      [],
      ['Articulo', 'Canal', 'Unidades', 'Ventas', 'Comision', 'Costo', 'Utilidad'],
      ...data.porArticulo.map(a => [a.articulo, a.canal, a.unidades, a.ventas, a.comision, a.costo, a.utilidad]),
    ]
    const csv = rows.map(r => r.map(x => `"${String(x ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `reporte_${from}_${to}.csv`
    a.click()
  }

  const utilBruta = data ? data.ingresoNeto - data.costoProd : 0
  const utilNeta = data ? utilBruta - data.gastos - data.insumos : 0

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-display font-extrabold text-mv-navy tracking-tight mb-6">Reportes</h1>

      <div className="flex flex-wrap items-end gap-3 mb-6">
        {[['hoy', 'Hoy'], ['semana', 'Últimos 7 días'], ['mes', 'Este mes']].map(([p, label]) => (
          <button key={p} onClick={() => pick(p)}
            className={`px-4 py-2 rounded-full font-bold text-sm border-2 ${preset === p ? 'bg-mv-navy text-white border-mv-navy' : 'bg-white text-gray-600 border-gray-200'}`}>
            {label}
          </button>
        ))}
        <label className="text-xs font-semibold text-gray-500">
          Desde
          <input type="date" value={from} onChange={e => { setFrom(e.target.value); setPreset(null) }}
            className="block border border-gray-300 rounded-lg px-3 py-2 mt-1 bg-white" />
        </label>
        <label className="text-xs font-semibold text-gray-500">
          Hasta
          <input type="date" value={to} onChange={e => { setTo(e.target.value); setPreset(null) }}
            className="block border border-gray-300 rounded-lg px-3 py-2 mt-1 bg-white" />
        </label>
        <button onClick={exportCSV} className="ml-auto bg-mv-blue text-white font-bold px-4 py-2 rounded-lg text-sm hover:opacity-90">
          ⬇ Exportar CSV
        </button>
      </div>

      {loading || !data ? <p className="text-gray-400">Cargando…</p> : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-7 gap-3 mb-8">
            <Kpi t="Pedidos" v={data.pedidos} />
            <Kpi t="Ventas brutas" v={money(data.ventas)} c="text-mv-blue" />
            <Kpi t="Comisión plataformas" v={money(data.comision)} c="text-orange-500" />
            <Kpi t="Ingreso neto" v={money(data.ingresoNeto)} />
            <Kpi t="Costo producción" v={money(data.costoProd)} />
            <Kpi t="Utilidad bruta" v={money(utilBruta)} c="text-green-600" />
            <Kpi t="Utilidad neta" v={money(utilNeta)} c={utilNeta >= 0 ? 'text-green-600' : 'text-mv-red'} />
          </div>

          <h2 className="font-bold text-mv-navy mb-3">Por canal</h2>
          <div className="card overflow-x-auto mb-8">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase border-b">
                  <th className="px-4 py-3">Canal</th><th className="px-4 py-3 text-right">Pedidos</th>
                  <th className="px-4 py-3 text-right">Ventas</th><th className="px-4 py-3 text-right">Comisión</th>
                  <th className="px-4 py-3 text-right">Costo</th>
                  <th className="px-4 py-3 text-right">Utilidad</th>
                </tr>
              </thead>
              <tbody>
                {data.porCanal.map(c => (
                  <tr key={c.canal} className="border-b last:border-0">
                    <td className="px-4 py-3 font-bold text-mv-navy">{c.canal}</td>
                    <td className="px-4 py-3 text-right">{c.pedidos}</td>
                    <td className="px-4 py-3 text-right">{money(c.ventas)}</td>
                    <td className="px-4 py-3 text-right text-orange-500">{c.comision > 0 ? `−${money(c.comision)}` : '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{money(c.costo)}</td>
                    <td className={`px-4 py-3 text-right font-bold ${c.utilidad >= 0 ? 'text-green-600' : 'text-mv-red'}`}>{money(c.utilidad)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className="font-bold text-mv-navy mb-3">Por artículo y canal</h2>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm min-w-[650px]">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase border-b">
                  <th className="px-4 py-3">Artículo</th><th className="px-4 py-3">Canal</th>
                  <th className="px-4 py-3 text-right">Unidades</th><th className="px-4 py-3 text-right">Ventas</th>
                  <th className="px-4 py-3 text-right">Comisión</th>
                  <th className="px-4 py-3 text-right">Costo</th><th className="px-4 py-3 text-right">Utilidad</th>
                </tr>
              </thead>
              <tbody>
                {data.porArticulo.map((a, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="px-4 py-3 font-bold text-mv-navy">{a.articulo}</td>
                    <td className="px-4 py-3 text-gray-600">{a.canal}</td>
                    <td className="px-4 py-3 text-right">{a.unidades}</td>
                    <td className="px-4 py-3 text-right">{money(a.ventas)}</td>
                    <td className="px-4 py-3 text-right text-orange-500">{a.comision > 0 ? `−${money(a.comision)}` : '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{money(a.costo)}</td>
                    <td className={`px-4 py-3 text-right font-bold ${a.utilidad >= 0 ? 'text-green-600' : 'text-mv-red'}`}>{money(a.utilidad)}</td>
                  </tr>
                ))}
                {data.porArticulo.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Sin ventas en este periodo.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

function Kpi({ t, v, c = 'text-mv-navy' }) {
  return (
    <div className="card p-4">
      <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{t}</div>
      <div className={`text-lg font-black mt-1 ${c}`}>{v}</div>
    </div>
  )
}
