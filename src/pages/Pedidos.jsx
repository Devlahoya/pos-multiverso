import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { money, fmtDateTime, isoDay, dayStartISO, dayEndISO, combineDateWithNow, fmtDate } from '../lib/format'
import { CHANNELS, channelLabel, channelColor, channelCommission } from '../lib/channels'
import { useSettings } from '../context/SettingsContext'
import Ticket from '../components/Ticket'
import EditOrderModal from '../components/EditOrderModal'

export default function Pedidos({ isAdmin }) {
  const { settings } = useSettings()
  const [channel, setChannel] = useState('sitio')
  const [articles, setArticles] = useState([])
  const [cart, setCart] = useState([]) // {article, qty}
  const [orders, setOrders] = useState([])
  const [notes, setNotes] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('efectivo')
  const [orderDate, setOrderDate] = useState(isoDay())
  const [viewDate, setViewDate] = useState(isoDay())
  const [saving, setSaving] = useState(false)
  const [ticketOrder, setTicketOrder] = useState(null)
  const [editingOrder, setEditingOrder] = useState(null)

  useEffect(() => { loadArticles() }, [])
  useEffect(() => { loadOrders() }, [viewDate])

  async function loadArticles() {
    const { data } = await supabase.from('articles').select('*').eq('active', true).order('name')
    setArticles(data ?? [])
  }

  async function loadOrders() {
    const { data } = await supabase.from('orders')
      .select('*, order_items(*)')
      .gte('created_at', dayStartISO(viewDate)).lte('created_at', dayEndISO(viewDate))
      .order('created_at', { ascending: false })
    setOrders(data ?? [])
  }

  const priceField = CHANNELS.find(c => c.id === channel).priceField
  const available = articles.filter(a => a[priceField] != null && a[priceField] !== '')

  const add = (a) => {
    setCart(prev => {
      const found = prev.find(x => x.article.id === a.id)
      if (found) return prev.map(x => x.article.id === a.id ? { ...x, qty: x.qty + 1 } : x)
      return [...prev, { article: a, qty: 1 }]
    })
  }
  const setQty = (id, qty) => {
    if (qty <= 0) setCart(prev => prev.filter(x => x.article.id !== id))
    else setCart(prev => prev.map(x => x.article.id === id ? { ...x, qty } : x))
  }

  const commission = channelCommission(channel, settings)
  const total = cart.reduce((s, x) => s + Number(x.article[priceField]) * x.qty, 0)
  const costTotal = cart.reduce((s, x) => s + Number(x.article.cost || 0) * x.qty, 0)
  const comisionMonto = total * commission
  const ingresoNeto = total - comisionMonto
  const utilidad = ingresoNeto - costTotal

  async function save() {
    if (cart.length === 0) return
    setSaving(true)
    const { data: user } = await supabase.auth.getUser()
    const { data: order, error } = await supabase.from('orders').insert({
      channel, total, cost_total: costTotal, commission_rate: commission,
      payment_method: channel === 'sitio' ? paymentMethod : null,
      notes: notes || null,
      created_at: combineDateWithNow(orderDate),
      created_by: user?.user?.id,
    }).select().single()

    if (!error && order) {
      const { data: items } = await supabase.from('order_items').insert(cart.map(x => ({
        order_id: order.id,
        article_id: x.article.id,
        article_name: x.article.name,
        qty: x.qty,
        unit_price: Number(x.article[priceField]),
        unit_cost: Number(x.article.cost || 0),
      }))).select()
      setCart([]); setNotes('')
      setTicketOrder({ ...order, order_items: items ?? [] })
      if (orderDate !== viewDate) setViewDate(orderDate)
      else loadOrders()
    } else {
      alert('Error al guardar pedido: ' + (error?.message ?? ''))
    }
    setSaving(false)
  }

  async function removeOrder(id) {
    if (!confirm('¿Eliminar este pedido?')) return
    await supabase.from('orders').delete().eq('id', id)
    loadOrders()
  }

  const isToday = viewDate === isoDay()

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-display font-extrabold text-mv-navy tracking-tight mb-6">Pedidos</h1>

      {isAdmin ? (
        <>
          {/* Selector de canal */}
          <div className="flex flex-wrap gap-2 mb-6">
            {CHANNELS.map(c => (
              <button key={c.id} onClick={() => { setChannel(c.id); setCart([]) }}
                className={`px-4 py-2 rounded-full font-bold text-sm border-2 transition ${
                  channel === c.id ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-200'
                }`}
                style={channel === c.id ? { backgroundColor: c.color, color: c.id === 'sitio' ? '#151a3d' : 'white' } : {}}>
                {c.label}
              </button>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-6 mb-10">
            {/* Artículos disponibles */}
            <div className="lg:col-span-2">
              {available.length === 0 ? (
                <div className="card p-8 text-center text-gray-400">
                  No hay artículos con precio para <b>{channelLabel(channel)}</b>. Agrégalos en la sección Artículos.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {available.map(a => (
                    <button key={a.id} onClick={() => add(a)}
                      className="card p-4 text-left hover:ring-2 hover:ring-mv-blue transition active:scale-95">
                      <div className="font-bold text-mv-navy text-sm leading-tight">{a.name}</div>
                      {a.category && <div className="text-[11px] text-gray-400">{a.category}</div>}
                      <div className="text-mv-blue font-black mt-1">{money(a[priceField])}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Carrito */}
            <div className="card p-5 h-fit sticky top-4">
              <h2 className="font-bold text-mv-navy mb-3">
                Pedido — <span style={{ color: channelColor(channel) }}>{channelLabel(channel)}</span>
              </h2>
              {cart.length === 0 ? (
                <p className="text-gray-400 text-sm">Toca artículos para agregarlos.</p>
              ) : (
                <div className="space-y-2 mb-3">
                  {cart.map(x => (
                    <div key={x.article.id} className="flex items-center gap-2 text-sm">
                      <div className="flex-1 font-semibold text-gray-700 leading-tight">{x.article.name}</div>
                      <button onClick={() => setQty(x.article.id, x.qty - 1)} className="w-7 h-7 rounded bg-gray-100 font-bold">−</button>
                      <span className="w-6 text-center font-bold">{x.qty}</span>
                      <button onClick={() => setQty(x.article.id, x.qty + 1)} className="w-7 h-7 rounded bg-gray-100 font-bold">+</button>
                      <div className="w-20 text-right font-bold">{money(Number(x.article[priceField]) * x.qty)}</div>
                    </div>
                  ))}
                </div>
              )}
              <label className="block text-xs font-semibold text-gray-500 mb-3">
                Fecha del pedido
                <input type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)} max={isoDay()}
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full mt-1 text-base" />
                {orderDate !== isoDay() && (
                  <span className="block mt-1 text-mv-red font-semibold normal-case">
                    Se registrará con fecha {fmtDate(orderDate + 'T00:00:00')}, no hoy.
                  </span>
                )}
              </label>
              {channel === 'sitio' && (
                <div className="flex gap-2 mb-3">
                  {[['efectivo', 'Efectivo'], ['tarjeta', 'Tarjeta'], ['transferencia', 'Transf.']].map(([v, l]) => (
                    <button key={v} type="button" onClick={() => setPaymentMethod(v)}
                      className={`flex-1 text-xs font-bold py-2 rounded-lg border-2 transition ${
                        paymentMethod === v ? 'bg-mv-navy text-white border-mv-navy' : 'bg-white text-gray-500 border-gray-200'
                      }`}>
                      {l}
                    </button>
                  ))}
                </div>
              )}
              <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Nota (opcional)"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3" />
              <div className="flex justify-between font-black text-lg text-mv-navy border-t pt-3">
                <span>Total pedido</span><span>{money(total)}</span>
              </div>
              {commission > 0 && (
                <div className="flex justify-between text-xs text-mv-red">
                  <span>Comisión {channelLabel(channel)} ({Math.round(commission * 100)}%)</span><span>−{money(comisionMonto)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-gray-700">
                <span>Ingreso neto</span><span>{money(ingresoNeto)}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Costo producción</span><span>{money(costTotal)}</span>
              </div>
              <div className={`flex justify-between text-sm font-black mb-3 ${utilidad >= 0 ? 'text-green-600' : 'text-mv-red'}`}>
                <span>Utilidad real</span><span>{money(utilidad)}</span>
              </div>
              <button onClick={save} disabled={saving || cart.length === 0}
                className="btn-primary w-full py-3.5 rounded-xl">
                {saving ? 'Guardando…' : 'Registrar pedido'}
              </button>
            </div>
          </div>
        </>
      ) : (
        <p className="text-sm text-gray-400 mb-6">Modo solo lectura — puedes ver los pedidos pero no capturar nuevos.</p>
      )}

      {/* Lista de pedidos por día */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
        <h2 className="font-bold text-mv-navy">
          Pedidos del {fmtDate(viewDate + 'T00:00:00')} ({orders.length})
        </h2>
        <div className="flex items-center gap-2">
          <input type="date" value={viewDate} onChange={e => setViewDate(e.target.value)} max={isoDay()}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white" />
          {!isToday && (
            <button onClick={() => setViewDate(isoDay())} className="text-mv-blue text-xs font-bold hover:underline">Hoy</button>
          )}
        </div>
      </div>
      <div className="space-y-2">
        {orders.map(o => (
          <div key={o.id} className="card w-full px-4 py-3 flex items-center gap-3 flex-wrap">
            <button onClick={() => setTicketOrder(o)} className="flex items-center gap-3 flex-wrap flex-1 text-left min-w-0">
              <span className="text-xs font-mono text-gray-400 w-14 shrink-0">#{String(o.folio).padStart(5, '0')}</span>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold text-white shrink-0"
                style={{ backgroundColor: channelColor(o.channel), color: o.channel === 'sitio' ? '#151a3d' : 'white' }}>
                {channelLabel(o.channel)}
              </span>
              <span className="text-xs text-gray-400 shrink-0">{fmtDateTime(o.created_at)}</span>
              <span className="flex-1 text-sm text-gray-600 truncate min-w-[80px]">
                {(o.order_items ?? []).map(i => `${i.qty}× ${i.article_name}`).join(', ')}
              </span>
              <span className="font-black text-mv-navy shrink-0">{money(o.total)}</span>
              <span className="text-xs text-green-600 font-semibold shrink-0">
                +{money(o.total * (1 - Number(o.commission_rate || 0)) - o.cost_total)}
              </span>
            </button>
            {isAdmin && (
              <div className="flex items-center gap-3 shrink-0">
                <button onClick={() => setEditingOrder(o)} className="text-mv-blue text-xs font-bold hover:underline">Editar</button>
                <button onClick={() => removeOrder(o.id)} className="text-mv-red text-xs font-bold hover:underline">Eliminar</button>
              </div>
            )}
          </div>
        ))}
        {orders.length === 0 && <p className="text-gray-400 text-sm">Sin pedidos en esta fecha.</p>}
      </div>

      {ticketOrder && <Ticket order={ticketOrder} onClose={() => setTicketOrder(null)} />}
      {editingOrder && (
        <EditOrderModal
          order={editingOrder}
          articles={articles}
          onClose={() => setEditingOrder(null)}
          onSaved={() => { setEditingOrder(null); loadOrders() }}
        />
      )}
    </div>
  )
}
