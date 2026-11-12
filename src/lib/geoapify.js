import { getAddressError } from './addressValidation'
import { calculateEstimate } from './rideEstimate'

const apiKey = import.meta.env.VITE_GEOAPIFY_API_KEY
const cache = new Map()
const cacheLifetime = 2 * 60 * 1000
const unavailable = 'Adresų paieška laikinai neveikia. Adresą galite įvesti rankiniu būdu.'

function text(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function unique(parts) {
  return [...new Set(parts.map(text).filter(Boolean))]
}

function suggestion(result) {
  const street = unique([result.street, result.housenumber]).join(' ')
  const locality = text(result.city) || text(result.town) || text(result.village) || text(result.municipality)
  const namedPlace = result.result_type === 'amenity' && text(result.name)
  const title = namedPlace || street || text(result.name) || locality || text(result.formatted)
  const details = unique([namedPlace ? street : '', locality, result.county, result.state]).filter(part => part !== title).join(', ')
  const address = text(result.formatted) || unique([title, details, 'Lietuva']).join(', ')
  return {
    address, title, details,
    resultType: text(result.result_type), countryCode: text(result.country_code).toLowerCase(),
    street: text(result.street), housenumber: text(result.housenumber),
    placeName: text(result.name), locality, lat: result.lat, lon: result.lon,
  }
}

export async function searchLithuanianAddresses(value, { signal } = {}) {
  const query = value.trim()
  if (query.length < 3) return []
  if (!apiKey) throw new Error(unavailable)
  if (signal?.aborted) throw new Error(unavailable)
  const cacheKey = query.toLocaleLowerCase('lt-LT')
  const cached = cache.get(cacheKey)
  if (cached && cached.expires > Date.now()) return cached.results
  const url = new URL('https://api.geoapify.com/v1/geocode/autocomplete')
  url.search = new URLSearchParams({
    text: query, filter: 'countrycode:lt', lang: 'lt',
    limit: '5', format: 'json', apiKey,
  }).toString()
  try {
    const response = await fetch(url, { signal, credentials: 'omit', referrerPolicy: 'strict-origin-when-cross-origin' })
    if (!response.ok) throw new Error(unavailable)
    const data = await response.json()
    if (!Array.isArray(data.results)) throw new Error(unavailable)
    const seen = new Set()
    const results = data.results
      .filter(result => result && text(result.country_code).toLowerCase() === 'lt')
      .map(suggestion)
      .filter(result => {
        const key = result.address.toLocaleLowerCase('lt-LT')
        if (!result.title || seen.has(key)) return false
        seen.add(key)
        return true
      })
      .sort((first, second) => {
        const priority = result => result.housenumber && ['building', 'amenity'].includes(result.resultType)
          ? 0 : result.resultType === 'amenity' && result.placeName ? 1 : result.resultType === 'street' ? 2 : 3
        return priority(first) - priority(second)
      }).slice(0, 5)
    if (!signal?.aborted) {
      if (cache.size >= 100) cache.delete(cache.keys().next().value)
      cache.set(cacheKey, { results, expires: Date.now() + cacheLifetime })
    }
    return results
  } catch {
    // Never expose a request URL or the API key through error details.
    throw new Error(unavailable)
  }
}


function hasCoordinates(point) {
  return Number.isFinite(point?.lat) && Math.abs(point.lat) <= 90
    && Number.isFinite(point?.lon) && Math.abs(point.lon) <= 180
}

async function routeRequest(path, parameters, signal) {
  if (!apiKey || signal?.aborted) throw new Error('Maršruto skaičiavimas nepasiekiamas. Bandykite dar kartą.')
  const url = new URL('https://api.geoapify.com/v1/' + path)
  url.search = new URLSearchParams({ ...parameters, apiKey }).toString()
  try {
    const response = await fetch(url, { signal, credentials: 'omit', referrerPolicy: 'strict-origin-when-cross-origin' })
    if (!response.ok) throw new Error('API unavailable')
    return await response.json()
  } catch {
    throw new Error('Nepavyko gauti maršruto duomenų. Patikrinkite ryšį ir bandykite dar kartą.')
  }
}

export async function resolveLithuanianAddress(address, selected, { signal } = {}) {
  if (getAddressError(address, selected)) throw new Error('Patikslinkite adresą iki pastato arba konkrečios vietos.')
  if (selected?.address?.trim() === address.trim() && selected.countryCode === 'lt' && hasCoordinates(selected)) return selected
  const data = await routeRequest('geocode/search', {
    text: address.trim(), filter: 'countrycode:lt', lang: 'lt', format: 'json', limit: '5',
  }, signal)
  const candidates = new Map()
  for (const result of Array.isArray(data.results) ? data.results : []) {
    if (result?.country_code !== 'lt' || !['full_match', 'match_by_building'].includes(result.rank?.match_type)
      || !Number.isFinite(result.rank?.confidence) || result.rank.confidence < 0.8) continue
    const point = suggestion(result)
    if (!hasCoordinates(point) || getAddressError(point.address, point)) continue
    // A building and businesses at that same address are one destination.
    const identity = point.street && point.housenumber
      ? [point.street, point.housenumber, point.locality].join('|').toLocaleLowerCase('lt-LT')
      : [point.placeName, point.locality, point.lat, point.lon].join('|').toLocaleLowerCase('lt-LT')
    candidates.set(identity, point)
  }
  if (candidates.size !== 1) {
    throw new Error(candidates.size > 1
      ? 'Rasti keli tinkami adresai. Pasirinkite tikslų paieškos pasiūlymą.'
      : 'Nepavyko tiksliai nustatyti adreso. Patikslinkite jį arba pasirinkite paieškos pasiūlymą.')
  }
  return candidates.values().next().value
}

export async function calculateRideEstimate(input, { signal } = {}) {
  const [from, to] = await Promise.all([
    resolveLithuanianAddress(input.pickupAddress, input.pickupSelection, { signal }),
    resolveLithuanianAddress(input.destinationAddress, input.destinationSelection, { signal }),
  ])
  if (signal?.aborted) throw new Error('Skaičiavimas atšauktas.')
  const data = await routeRequest('routing', {
    waypoints: from.lat + ',' + from.lon + '|' + to.lat + ',' + to.lon,
    mode: 'drive', units: 'metric',
  }, signal)
  const route = data.features?.[0]?.properties
  if (!route || route.distance_units?.toLowerCase() !== 'meters') {
    throw new Error('Automobilio maršrutas nerastas arba jo atstumas nepatvirtintas metrais.')
  }
  return { ...calculateEstimate(route.distance, route.time), distanceMeters: route.distance }
}
