const money = new Intl.NumberFormat('lt-LT', { style: 'currency', currency: 'EUR' })
const distance = new Intl.NumberFormat('lt-LT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function emptyEstimate() {
  return { distance_km: null, duration_min: null, estimated_price: null }
}

function number(value) {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

export function normalizeRideEstimate(value = {}) {
  const km = number(value?.distance_km)
  const minutes = number(value?.duration_min)
  const price = number(value?.estimated_price)
  if (km === null || minutes === null || price === null
    || km > 99999999.99 || price > 99999999.99
    || !Number.isInteger(minutes) || minutes > 2147483647) return emptyEstimate()
  return { distance_km: km, duration_min: minutes, estimated_price: price }
}

export function calculateEstimate(distanceMeters, durationSeconds) {
  if (typeof distanceMeters !== 'number' || !Number.isFinite(distanceMeters) || distanceMeters < 0
    || typeof durationSeconds !== 'number' || !Number.isFinite(durationSeconds) || durationSeconds < 0) {
    throw new Error('Maršruto atsakyme nėra tinkamo atstumo arba trukmės.')
  }
  // Price uses the original meters, not the rounded distance shown to the user.
  const result = normalizeRideEstimate({
    distance_km: Math.round((distanceMeters / 1000 + Number.EPSILON) * 100) / 100,
    duration_min: Math.ceil(durationSeconds / 60),
    estimated_price: Math.round(300 + distanceMeters / 10 + Number.EPSILON) / 100,
  })
  if (result.estimated_price === null) throw new Error('Maršruto reikšmės per didelės.')
  return result
}

export function formatDistance(value) {
  const parsed = number(value)
  return parsed === null ? 'Neskaičiuota' : distance.format(parsed) + ' km'
}

export function formatDuration(value) {
  const parsed = number(value)
  return parsed === null ? 'Neskaičiuota' : 'Apie ' + parsed + ' min.'
}

export function formatPrice(value) {
  const parsed = number(value)
  return parsed === null ? 'Kaina nenustatyta' : money.format(parsed)
}
