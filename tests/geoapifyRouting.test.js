import test from 'node:test'
import assert from 'node:assert/strict'
import { getAddressError } from '../src/lib/addressValidation.js'
import { calculateEstimate } from '../src/lib/rideEstimate.js'
import { loadFunctions } from './helpers/hookHarness.js'

const from = { address: 'Gedimino pr. 12, Vilnius', countryCode: 'lt', resultType: 'building', street: 'Gedimino pr.', housenumber: '12', locality: 'Vilnius', lat: 54.687, lon: 25.28 }
const to = { ...from, address: 'Sodų g. 22, Vilnius', street: 'Sodų g.', housenumber: '22', lat: 54.67, lon: 25.284 }
const input = { pickupAddress: from.address, destinationAddress: to.address, pickupSelection: from, destinationSelection: to }
function geo(point, extra = {}) {
  return { formatted: point.address, country_code: 'lt', result_type: 'building', street: point.street,
    housenumber: point.housenumber, city: point.locality, lat: point.lat, lon: point.lon,
    rank: { match_type: 'full_match', confidence: 1 }, ...extra }
}
function setup(handler, key = 'test-placeholder') {
  const calls = []
  const api = loadFunctions('src/lib/geoapify.js', '({ calculateRideEstimate, resolveLithuanianAddress })', {
    testKey: key, URL, URLSearchParams, getAddressError, calculateEstimate,
    fetch: async (url, options) => {
      calls.push({ url, options })
      return { ok: true, json: async () => handler(url, options) }
    },
  })
  return { api, calls }
}
const route = () => ({ features: [{ properties: { distance: 3255, distance_units: 'meters', time: 321.31 } }] })

test('selected precise addresses use one drive/metric request with latitude-longitude waypoints', async () => {
  const { api, calls } = setup(route)
  const estimate = await api.calculateRideEstimate(input)
  assert.deepEqual({ ...estimate }, { distance_km: 3.26, duration_min: 6, estimated_price: 6.26, distanceMeters: 3255 })
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url.searchParams.get('mode'), 'drive')
  assert.equal(calls[0].url.searchParams.get('units'), 'metric')
  assert.equal(calls[0].url.searchParams.get('waypoints'), '54.687,25.28|54.67,25.284')
})

test('manual addresses are geocoded with Lithuania filter before routing', async () => {
  const { api, calls } = setup(url => url.pathname.endsWith('/routing') ? route()
    : { results: [geo(url.searchParams.get('text') === from.address ? from : to)] })
  const estimate = await api.calculateRideEstimate({ ...input, pickupSelection: null, destinationSelection: null })
  assert.equal(estimate.estimated_price, 6.26)
  assert.equal(calls.length, 3)
  for (const { url } of calls.filter(call => call.url.pathname.endsWith('/search'))) assert.equal(url.searchParams.get('filter'), 'countrycode:lt')
})

test('only-city, missing-house and foreign manual geocoding results cannot be routed', async () => {
  for (const bad of [
    geo(from, { result_type: 'city', housenumber: '' }),
    geo(from, { result_type: 'street', housenumber: '' }),
    geo(from, { country_code: 'lv' }),
    geo(from, { rank: { confidence: 1, match_type: 'match_by_street' } }),
    geo(from, { rank: { confidence: 0.4, match_type: 'full_match' } }),
  ]) {
    const { api, calls } = setup(() => ({ results: [bad] }))
    await assert.rejects(api.calculateRideEstimate({ ...input, pickupSelection: null }))
    assert.equal(calls.some(call => call.url.pathname.endsWith('/routing')), false)
  }
})

test('ambiguous precise addresses require explicit selection, duplicate building results are collapsed', async () => {
  const ambiguous = setup(() => ({ results: [geo(from), geo(to)] }))
  await assert.rejects(ambiguous.api.resolveLithuanianAddress(from.address, null), /keli/)
  const duplicate = setup(() => ({ results: [geo(from), geo(from)] }))
  assert.equal((await duplicate.api.resolveLithuanianAddress(from.address, null)).lat, from.lat)
})

test('missing routes, invalid metrics, and unexpected units never produce a price', async () => {
  for (const response of [
    { features: [] },
    { features: [{ properties: { distance: 3, distance_units: 'miles', time: 20 } }] },
    { features: [{ properties: { distance: null, distance_units: 'meters', time: 20 } }] },
  ]) {
    const { api } = setup(() => response)
    await assert.rejects(api.calculateRideEstimate(input))
  }
})

test('API errors are sanitized and missing keys do not send requests', async () => {
  const broken = setup(() => { throw Error('request URL and credential must stay hidden') })
  await assert.rejects(broken.api.calculateRideEstimate(input), error => !error.message.includes('credential') && !error.message.includes('http'))
  const missing = setup(route, '')
  await assert.rejects(missing.api.calculateRideEstimate(input))
  assert.equal(missing.calls.length, 0)
})

test('edited selected text must be geocoded again instead of reusing old coordinates', async () => {
  const { api, calls } = setup(url => url.pathname.endsWith('/routing') ? route() : { results: [geo(to)] })
  await api.calculateRideEstimate({ ...input, pickupAddress: to.address })
  assert.equal(calls[0].url.pathname, '/v1/geocode/search')
})
