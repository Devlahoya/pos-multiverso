import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { supabase } from '../supabase'
import { money, isoDay, addDays, dayStartISO, dayEndISO } from '../lib/format'
import { CHANNELS, channelColor } from '../lib/channels'

const MONTH_DAYS = 180

export default function Dashboard() {
  const [today, setToday] = useState({ sales: 0, cost: 0, orders: 0, expenses: 0, commission: 0, net: 0 })
  const [periodDays, setPeriodDays] = useState(7)
  const [rawOrders, setRawOrders] = useState([])
  const [monthly, setMonthly] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    const hoy = isoDay()
    const desde = addDays(hoy, -(MONTH_DAYS - 1))

    const [ordersRes, expRes, supRes] = await Promise.all([
      supabase.from('orders').select('total, cost_total, commission_rate, channel, created_at')
        .gte('created_at', dayStartISO(desde)).lte('created_at', dayEndISO(hoy)),
      supabase.from('expenses').select('amount, date').gte('date', desde).lte('date', hoy),
      supabase.from('supplies').select('total_cost, date').gte('date', desde).lte('date', hoy),
    ])

    const orders = ordersRes.data ?? []
    const expenses = expRes.data ?? []
    const supplies = supRes.data ?? []
    setRawOrders(orders)

    const todayOrders = orders.filter(o => o.created_at >= dayStartISO(hoy))
    const gastosHoy = expenses.filter(e => e.date === hoy).reduce((s, e) => s + Number(e.amount), 0)
      + supplies.filter(e => e.date === hoy).reduce((s, e) => s + Number(e.total_cost), 0)

    const netOf = (o) => Number(o.total) * (1 - Number(o.commission_rate || 0))

    setToday({
      sales: todayOrders.reduce((s, o) => s + Number(o.total), 0),
      cost: todayOrders.reduce((s, o) => s + Number(o.cost_total), 0),
      orders: todayOrders.length,
      expenses: gastosHoy,
      commission: todayOrders.reduce((s, o) => s + Number(o.total) * Number(o.commission_rate || 0), 0),
      net: todayOrders.reduce((s, o) => s + netOf(o), 0),
    })

    // Utilidad neta por mes, últimos 6 meses
    const months = []
    const base = new Date(hoy + 'T00:00:00')
    for (let i = 5; i >= 0; i--) {
      const d = new Date(base.getFullYear(), base.getMonth() - i, 1)
      months.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: d.toLocaleDateString('es-MX', { month: 'short' }) })
    }
    setMonthly(months.map(m => {
      const mOrders = orders.filter(o => o.created_at.slice(0, 7) === m.key)
      const mExpenses = expenses.filter(e => e.date.slice(0, 7) === m.key)
      const mSupplies = supplies.filter(e => e.date.slice(0, 7) === m.key)
      const ventas = mOrders.reduce((s, o) => s + Number(o.total), 0)
      const comision = mOrders.reduce((s, o) => s + Number(o.total) * Number(o.commission_rate || 0), 0)
      const costo = mOrders.reduce((s, o) => s + Number(o.cost_total), 0)
      const gastos = mExpenses.reduce((s, e) => s + Number(e.amount), 0) + mSupplies.reduce((s, e) => s + Number(e.total_cost), 0)
      return { mes: m.label, utilidad: ventas - comision - costo - gastos, ventas }
    }))

    setLoading(false)
  }

  const utilidad = today.net - today.cost

  // Ventas por día para el periodo elegido (7 o 30 días)
  const hoy = isoDay()
  const desdePeriodo = addDays(hoy, -(periodDays - 1))
  const days = []
  for (let i = 0; i < periodDays; i++) {
    const d = addDays(desdePeriodo, i)
    const dayOrders = rawOrders.filter(o => o.created_at >= dayStartISO(d) && o.created_at <= dayEndISO(d))
    days.push({
      dia: periodDays === 7
        ? new Date(d + 'T00:00:00').toLocaleDateString('es-MX', { weekday: 'short' })
        : new Date(d + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }),
      ventas: dayOrders.reduce((s, o) => s + Number(o.total), 0),
    })
  }

  const periodOrders = rawOrders.filter(o => o.created_at >= dayStartISO(desdePeriodo))
  const byChannel = CHANNELS.map(c => ({
    name: c.label,
    value: periodOrders.filter(o => o.channel === c.id).reduce((s, o) => s + Number(o.total), 0),
  })).filter(x => x.value > 0)

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-display font-extrabold text-mv-navy tracking-tight mb-6">Dashboard — Hoy</h1>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <Card title="Ventas de hoy" value={money(today.sales)} accent="border-mv-blue" sub="bruto, todos los canales" />
        <Card title="Pedidos de hoy" value={today.orders} accent="border-mv-yellow" />
        <Card title="Comisión plataformas" value={money(today.commission)} accent="border-orange-400" sub="Uber / Didi / Rappi" />
        <Card title="Utilidad real hoy" value={money(utilidad)} accent="border-green-500" sub="neto tras comisión − costo producción" />
        <Card title="Gastos + insumos hoy" value={money(today.expenses)} accent="border-mv-red" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-mv-navy">Ventas por día</h2>
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              {[7, 30].map(n => (
                <button key={n} onClick={() => setPeriodDays(n)}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition ${periodDays === n ? 'bg-white text-mv-navy shadow' : 'text-gray-500'}`}>
                  {n} días
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={days}>
              <XAxis dataKey="dia" fontSize={11} interval={periodDays === 30 ? 3 : 0} />
              <YAxis fontSize={12} tickFormatter={v => `$${v}`} width={55} />
              <Tooltip formatter={v => money(v)} />
              <Bar dataKey="ventas" fill="#29abe2" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h2 className="font-bold text-mv-navy mb-4">Ventas por canal ({periodDays} días)</h2>
          {byChannel.length === 0 ? (
            <p className="text-gray-400 text-sm py-16 text-center">{loading ? 'Cargando…' : 'Sin ventas en este periodo'}</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={byChannel} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                  {byChannel.map((e, i) => (
                    <Cell key={i} fill={channelColor(CHANNELS.find(c => c.label === e.name)?.id)} />
                  ))}
                </Pie>
                <Tooltip formatter={v => money(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-bold text-mv-navy mb-1">Utilidad neta mensual</h2>
        <p className="text-xs text-gray-400 mb-4">Ventas − comisión de plataformas − costo de producción − gastos e insumos, últimos 6 meses.</p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={monthly}>
            <XAxis dataKey="mes" fontSize={12} />
            <YAxis fontSize={12} tickFormatter={v => `$${v}`} width={55} />
            <Tooltip formatter={v => money(v)} />
            <Bar dataKey="utilidad" radius={[6, 6, 0, 0]}>
              {monthly.map((m, i) => <Cell key={i} fill={m.utilidad >= 0 ? '#22c55e' : '#e62e2d'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function Card({ title, value, accent, sub }) {
  return (
    <div className={`card p-5 border-t-4 ${accent}`}>
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</div>
      <div className="text-2xl md:text-3xl font-display font-extrabold text-mv-navy tracking-tight mt-1">{value}</div>
      {sub && <div className="text-[11px] text-gray-400 mt-1">{sub}</div>}
    </div>
  )
}
