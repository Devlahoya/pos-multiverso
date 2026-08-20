import { CHANNELS } from '../lib/channels'

// Selector de canal (Sitio / Uber Eats / Didi Food / Rappi) con logo cuando aplica.
export default function ChannelTabs({ value, onChange, className = '' }) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {CHANNELS.map(c => {
        const active = value === c.id
        return (
          <button key={c.id} type="button" onClick={() => onChange(c.id)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-full font-bold text-sm border-2 transition ${
              active ? 'text-white border-transparent shadow-sm' : 'bg-white text-gray-600 border-gray-200'
            }`}
            style={active ? { backgroundColor: c.color, color: c.id === 'sitio' ? '#151a3d' : 'white' } : {}}>
            {c.logo && <img src={c.logo} alt="" className="w-5 h-5 rounded object-cover" />}
            {c.label}
          </button>
        )
      })}
    </div>
  )
}
