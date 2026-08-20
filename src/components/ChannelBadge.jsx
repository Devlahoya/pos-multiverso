import { channelLabel, channelColor, channelLogo } from '../lib/channels'

// Insignia de solo lectura: logo de la plataforma si existe (Uber/Didi/Rappi),
// o una píldora de color para Sitio (que no tiene logo de delivery).
export default function ChannelBadge({ id, className = '' }) {
  const logo = channelLogo(id)
  if (logo) {
    return (
      <span className={`inline-flex items-center gap-1.5 shrink-0 ${className}`}>
        <img src={logo} alt={channelLabel(id)} className="w-5 h-5 rounded-md object-cover shrink-0" />
        <span className="font-bold text-xs text-gray-700">{channelLabel(id)}</span>
      </span>
    )
  }
  return (
    <span
      className={`px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ${className}`}
      style={{ backgroundColor: channelColor(id), color: '#151a3d' }}
    >
      {channelLabel(id)}
    </span>
  )
}
