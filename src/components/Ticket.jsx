import { money, fmtDateTime } from '../lib/format'
import { channelLabel, channelLogo } from '../lib/channels'
import { useSettings } from '../context/SettingsContext'

const PAYMENT_LABELS = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia' }

export default function Ticket({ order, onClose }) {
  const { settings } = useSettings()

  const items = order.order_items ?? []
  const commission = Number(order.commission_rate || 0)
  const comisionMonto = Number(order.total) * commission
  const neto = Number(order.total) - comisionMonto

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 no-print-backdrop">
      <div id="ticket-print" className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto">
        <div className="p-6 font-mono text-sm">
          <div className="text-center mb-4">
            <div className="font-display font-extrabold text-lg text-mv-navy">
              {settings?.business_name || 'Multiverso — Boneless and Food'}
            </div>
            {settings?.business_address && <div className="text-gray-500 text-xs">{settings.business_address}</div>}
            {settings?.business_phone && <div className="text-gray-500 text-xs">{settings.business_phone}</div>}
          </div>

          <div className="border-t border-dashed border-gray-300 my-3" />

          <div className="flex justify-between"><span>Folio</span><span className="font-bold">#{String(order.folio).padStart(5, '0')}</span></div>
          <div className="flex justify-between"><span>Fecha</span><span>{fmtDateTime(order.created_at)}</span></div>
          <div className="flex justify-between items-center"><span>Canal</span>
            <span className="font-bold flex items-center gap-1.5">
              {channelLogo(order.channel) && <img src={channelLogo(order.channel)} alt="" className="w-4 h-4 rounded" />}
              {channelLabel(order.channel)}
            </span>
          </div>
          {order.payment_method && (
            <div className="flex justify-between"><span>Pago</span><span>{PAYMENT_LABELS[order.payment_method] ?? order.payment_method}</span></div>
          )}

          <div className="border-t border-dashed border-gray-300 my-3" />

          <div className="space-y-1.5">
            {items.map(it => (
              <div key={it.id} className="flex justify-between gap-2">
                <span>{it.qty}× {it.article_name}</span>
                <span className="shrink-0">{money(Number(it.unit_price) * it.qty)}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-dashed border-gray-300 my-3" />

          <div className="flex justify-between font-bold text-base">
            <span>Total</span><span>{money(order.total)}</span>
          </div>
          {commission > 0 && (
            <>
              <div className="flex justify-between text-xs text-gray-500">
                <span>Comisión plataforma ({Math.round(commission * 100)}%)</span><span>−{money(comisionMonto)}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>Ingreso neto</span><span>{money(neto)}</span>
              </div>
            </>
          )}
          {order.notes && (
            <div className="mt-3 text-xs text-gray-500 italic">Nota: {order.notes}</div>
          )}

          <div className="text-center text-gray-400 text-xs mt-5">¡Gracias por su compra!</div>
        </div>

        <div className="no-print flex gap-2 p-4 border-t border-gray-100">
          <button onClick={() => window.print()} className="btn-primary flex-1 py-2.5 rounded-xl text-sm">
            🖨 Imprimir
          </button>
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
