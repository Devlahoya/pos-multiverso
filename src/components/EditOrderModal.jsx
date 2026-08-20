import { useState } from 'react'
import { supabase } from '../supabase'
import { money, isoDay, combineDateWithNow } from '../lib/format'
import { CHANNELS, channelLabel, channelCommission } from '../lib/channels'
import { useSettings } from '../context/SettingsContext'
import ChannelTabs from './ChannelTabs'
import ArticleImage from './ArticleImage'

let tempKey = 0

export default function EditOrderModal({ order, articles, onClose, onSaved }) {
  const { settings } = useSettings()
  const [channel, setChannel] = useState(order.channel)
  const [date, setDate] = useState(isoDay(new Date(order.created_at)))
  const [paymentMethod, setPaymentMethod] = useState(order.payment_method || 'efectivo')
  const [notes, setNotes] = useState(order.notes || '')
  const [cart, setCart] = useState(() => (order.order_items ?? []).map(it => ({
    key: `orig-${it.id}`,
    article_id: it.article_id,
    name: it.article_name,
    image_url: articles.find(a => a.id === it.article_id)?.image_url ?? null,
    qty: it.qty,
    unit_price: Number(it.unit_price),
    unit_cost: Number(it.unit_cost),
  })))
  const [saving, setSaving] = useState(false)

  const priceField = CHANNELS.find(c => c.id === channel).priceField
  const available = articles.filter(a => a[priceField] != null && a[priceField] !== '')

  function switchChannel(newChannel) {
    const newField = CHANNELS.find(c => c.id === newChannel).priceField
    setChannel(newChannel)
    setCart(prev => prev.map(x => {
      const live = articles.find(a => a.id === x.article_id)
      if (live && live[newField] != null) {
        return { ...x, unit_price: Number(live[newField]), unit_cost: Number(live.cost || 0) }
      }
      return x // artículo ya no existe o no tiene precio en el canal nuevo: se conserva el precio anterior
    }))
  }

  const addArticle = (a) => {
    setCart(prev => {
      const found = prev.find(x => x.article_id === a.id)
      if (found) return prev.map(x => x.article_id === a.id ? { ...x, qty: x.qty + 1 } : x)
      return [...prev, {
        key: `new-${tempKey++}`, article_id: a.id, name: a.name, image_url: a.image_url ?? null, qty: 1,
        unit_price: Number(a[priceField]), unit_cost: Number(a.cost || 0),
      }]
    })
  }
  const setQty = (key, qty) => {
    if (qty <= 0) setCart(prev => prev.filter(x => x.key !== key))
    else setCart(prev => prev.map(x => x.key === key ? { ...x, qty } : x))
  }

  const commission = channelCommission(channel, settings)
  const total = cart.reduce((s, x) => s + x.unit_price * x.qty, 0)
  const costTotal = cart.reduce((s, x) => s + x.unit_cost * x.qty, 0)
  const comisionMonto = total * commission
  const utilidad = total - comisionMonto - costTotal

  async function save() {
    if (cart.length === 0) return
    setSaving(true)
    const created_at = combineDateWithNow(date, new Date(order.created_at))

    const { error: orderErr } = await supabase.from('orders').update({
      channel, total, cost_total: costTotal, commission_rate: commission,
      payment_method: channel === 'sitio' ? paymentMethod : null,
      notes: notes || null,
      created_at,
    }).eq('id', order.id)

    if (orderErr) { alert('Error: ' + orderErr.message); setSaving(false); return }

    await supabase.from('order_items').delete().eq('order_id', order.id)
    const { error: itemsErr } = await supabase.from('order_items').insert(cart.map(x => ({
      order_id: order.id,
      article_id: x.article_id,
      article_name: x.name,
      qty: x.qty,
      unit_price: x.unit_price,
      unit_cost: x.unit_cost,
    })))
    if (itemsErr) { alert('Error: ' + itemsErr.message); setSaving(false); return }

    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-display font-extrabold text-lg text-mv-navy">
            Editar pedido #{String(order.folio).padStart(5, '0')}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-mv-navy text-2xl leading-none">×</button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-xs font-semibold text-gray-500">
              Fecha del pedido
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 w-full mt-1 text-base" />
            </label>
            {channel === 'sitio' && (
              <label className="text-xs font-semibold text-gray-500">
                Método de pago
                <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full mt-1 text-base bg-white">
                  <option value="efectivo">Efectivo</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="transferencia">Transferencia</option>
                </select>
              </label>
            )}
          </div>

          <ChannelTabs value={channel} onChange={switchChannel} />

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-bold text-gray-500 uppercase mb-2">Agregar artículo</div>
              <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                {available.map(a => (
                  <button key={a.id} onClick={() => addArticle(a)}
                    className="border border-gray-200 rounded-lg overflow-hidden text-left hover:ring-2 hover:ring-mv-blue transition">
                    <ArticleImage src={a.image_url} alt="" className="w-full h-14" />
                    <div className="p-2">
                      <div className="font-semibold text-mv-navy text-xs leading-tight">{a.name}</div>
                      <div className="text-mv-blue font-bold text-xs">{money(a[priceField])}</div>
                    </div>
                  </button>
                ))}
                {available.length === 0 && <p className="text-gray-400 text-xs col-span-2">Sin artículos con precio para este canal.</p>}
              </div>
            </div>

            <div>
              <div className="text-xs font-bold text-gray-500 uppercase mb-2">Artículos del pedido</div>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {cart.map(x => (
                  <div key={x.key} className="flex items-center gap-2 text-sm">
                    <ArticleImage src={x.image_url} alt="" className="w-7 h-7 rounded shrink-0" />
                    <div className="flex-1 font-semibold text-gray-700 leading-tight truncate">{x.name}</div>
                    <button onClick={() => setQty(x.key, x.qty - 1)} className="w-6 h-6 rounded bg-gray-100 font-bold text-xs">−</button>
                    <span className="w-5 text-center font-bold text-xs">{x.qty}</span>
                    <button onClick={() => setQty(x.key, x.qty + 1)} className="w-6 h-6 rounded bg-gray-100 font-bold text-xs">+</button>
                    <div className="w-16 text-right font-bold text-xs">{money(x.unit_price * x.qty)}</div>
                  </div>
                ))}
                {cart.length === 0 && <p className="text-gray-400 text-xs">Sin artículos — agrega al menos uno.</p>}
              </div>
            </div>
          </div>

          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Nota (opcional)"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />

          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex justify-between font-black text-mv-navy">
              <span>Total</span><span>{money(total)}</span>
            </div>
            {commission > 0 && (
              <div className="flex justify-between text-xs text-mv-red">
                <span>Comisión {channelLabel(channel)} ({Math.round(commission * 100)}%)</span><span>−{money(comisionMonto)}</span>
              </div>
            )}
            <div className="flex justify-between text-xs text-gray-400">
              <span>Costo producción</span><span>{money(costTotal)}</span>
            </div>
            <div className={`flex justify-between text-sm font-bold ${utilidad >= 0 ? 'text-green-600' : 'text-mv-red'}`}>
              <span>Utilidad real</span><span>{money(utilidad)}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={save} disabled={saving || cart.length === 0} className="btn-primary flex-1 py-3 rounded-xl">
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
            <button onClick={onClose} className="flex-1 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
