export const CHANNELS = [
  { id: 'sitio', label: 'Sitio', color: '#ffc20e', priceField: 'price_sitio', settingsKey: null, defaultCommission: 0 },
  { id: 'uber', label: 'Uber Eats', color: '#06c167', priceField: 'price_uber', settingsKey: 'commission_uber', defaultCommission: 0.43 },
  { id: 'didi', label: 'Didi Food', color: '#ff7d41', priceField: 'price_didi', settingsKey: 'commission_didi', defaultCommission: 0.43 },
  { id: 'rappi', label: 'Rappi', color: '#e62e2d', priceField: 'price_rappi', settingsKey: 'commission_rappi', defaultCommission: 0.43 },
]

export const channelLabel = (id) => CHANNELS.find(c => c.id === id)?.label ?? id
export const channelColor = (id) => CHANNELS.find(c => c.id === id)?.color ?? '#29abe2'

// Comisión vigente para un canal: toma el valor editable en Configuración
// (settings) o cae al valor por defecto si aún no ha cargado.
export const channelCommission = (id, settings) => {
  const ch = CHANNELS.find(c => c.id === id)
  if (!ch || !ch.settingsKey) return 0
  const v = settings?.[ch.settingsKey]
  return v != null ? Number(v) : ch.defaultCommission
}

// Ingreso neto tras comisión de la plataforma
export const netRevenue = (gross, channelId, settings) =>
  Number(gross) * (1 - channelCommission(channelId, settings))
