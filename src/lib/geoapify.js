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
