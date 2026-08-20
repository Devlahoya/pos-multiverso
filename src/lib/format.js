export const money = (n) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(n) || 0)

export const fmtDate = (d) =>
  new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })

export const fmtDateTime = (d) =>
  new Date(d).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

// Local date -> 'YYYY-MM-DD'
export const isoDay = (d = new Date()) => {
  const x = new Date(d)
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset())
  return x.toISOString().slice(0, 10)
}

// Start of local day as ISO timestamp (for timestamptz filters)
export const dayStartISO = (dayStr) => new Date(dayStr + 'T00:00:00').toISOString()
export const dayEndISO = (dayStr) => new Date(dayStr + 'T23:59:59.999').toISOString()

export const addDays = (dayStr, n) => {
  const d = new Date(dayStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return isoDay(d)
}

// Combina una fecha (YYYY-MM-DD) elegida con la hora actual, para pedidos
// registrados hoy pero de una fecha distinta (o al editar uno viejo).
export const combineDateWithNow = (dayStr, base = new Date()) => {
  const d = new Date(dayStr + 'T00:00:00')
  d.setHours(base.getHours(), base.getMinutes(), base.getSeconds(), base.getMilliseconds())
  return d.toISOString()
}
