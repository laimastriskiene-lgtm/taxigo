import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { randomUUID } from 'node:crypto'
import { getAddressError } from '../src/lib/addressValidation.js'
import { emptyEstimate, normalizeRideEstimate, formatDistance, formatDuration, formatPrice } from '../src/lib/rideEstimate.js'
import { loadFunctions, hookHarness } from './helpers/hookHarness.js'

const key = 'taxigo:ride-draft:v1:user'
const estimate = { distance_km: 3.26, duration_min: 6, estimated_price: 6.26 }
const values = { pickup_address: 'Gedimino pr. 12, Vilnius', destination: 'Sodų g. 22, Vilnius',
  phone: '+37060000000', pickup_time: null, priority: 'high', car_type: 'comfort' }
const draft = (metrics = {}) => ({ id: randomUUID(), ...values, ...metrics })
function setup({ savedDraft = null, savedRows = [], offline = false } = {}) {
  const storage = new Map(savedDraft ? [[key, JSON.stringify(savedDraft)]] : [])
  const rows = new Map(savedRows.map(row => [row.id, row]))
  const control = { offline, loseResponse: false, failLookups: 0, payloads: [], selections: [] }
  const window = {
    crypto: { randomUUID },
    localStorage: { getItem: name => storage.get(name) ?? null,
      setItem: (name, value) => storage.set(name, value), removeItem: name => storage.delete(name) },
  }
  const supabase = {
    from() {
      const filters = {}
      let payload
      async function execute() {
        await Promise.resolve()
        if (control.offline) return { data: null, error: { code: 'NETWORK' } }
        if (payload) {
          control.payloads.push(payload)
          if (rows.has(payload.id)) return { data: null, error: { code: '23505' } }
          const row = { ...payload, created_at: new Date().toISOString() }
          rows.set(row.id, row)
          if (control.loseResponse) {
            control.loseResponse = false; control.failLookups = 1
            return { data: null, error: { code: 'NETWORK' } }
          }
          return { data: row, error: null }
        }
        if (filters.id && control.failLookups) {
          control.failLookups--
          return { data: null, error: { code: 'NETWORK' } }
        }
        const result = [...rows.values()].filter(row => Object.entries(filters).every(([name, value]) => row[name] === value))
        return { data: filters.id ? result[0] || null : result, error: null }
      }
      const query = {
        select(columns) { control.selections.push(columns); return query },
        eq(name, value) { filters[name] = value; return query },
        order() { return query },
        insert(value) { payload = value; return query },
        single: execute, maybeSingle: execute,
        then(resolve, reject) { return execute().then(resolve, reject) },
      }
      return query
    },
  }
  const mount = () => hookHarness(context => {
    const useRides = loadFunctions('src/hooks/useRides.js', 'useRides', context)
    return () => useRides('user', 'passenger')
  }, { window, supabase, normalizeRideEstimate })
  return { storage, rows, control, mount }
}
const auth = { session: { user: { id: 'user' } }, profile: { id: 'passenger', user_id: 'user' },
  loading: false, busy: false, profileLoading: false }
const appSource = fs.readFileSync('src/App.jsx', 'utf8')
const appLogic = appSource.slice(appSource.indexOf('const demoTrips'), appSource.indexOf('  const navigation ='))
  + '\nreturn { book, restoreDraft, navigate, pickupAddress, destinationAddress, restoredEstimate, currentEstimate, formDraftId, notice, bookingError, setPickupAddress, setDestinationAddress, setPhoneDigits, savedTrips }; }\nTaxiGo'
function appHarness(rides, getRoute) {
  return hookHarness(context => {
    const TaxiGo = vm.runInNewContext(appLogic, context)
    return () => TaxiGo({ auth })
  }, {
    useRides: () => rides.value, useRideEstimate: getRoute,
    getAddressError, emptyEstimate, normalizeRideEstimate, formatDistance, formatDuration, formatPrice,
  })
}
const event = () => ({ preventDefault() {}, currentTarget: { elements: { namedItem: () => ({
  setCustomValidity() {}, reportValidity: () => true,
}) } } })
function fill(app) {
  app.value.setPickupAddress(values.pickup_address)
  app.value.setDestinationAddress(values.destination)
  app.value.setPhoneDigits('60000000')
  app.render()
}

test('Supabase payload and history query include all three metrics; double submit inserts once', async () => {
  const t = setup(), rides = t.mount()
  await rides.flush()
  const [first, second] = await Promise.all([
    rides.value.createRide({ ...values, ...estimate }),
    rides.value.createRide({ ...values, ...estimate }),
  ])
  assert(first.ride); assert(second.ignored)
  await rides.flush()
  assert.equal(t.control.payloads.length, 1)
  const payload = t.control.payloads[0]
  for (const field of Object.keys(estimate)) {
    assert.equal(payload[field], estimate[field])
    assert.equal(rides.value.rides[0][field], estimate[field])
    assert(t.control.selections.every(columns => columns.includes(field)))
  }
  assert.equal(t.storage.has(key), false)
})

test('failed save persists metrics and stable UUID; reload and explicit restoration preserve them', async () => {
  const t = setup({ offline: true }), first = t.mount()
  await first.flush()
  const failure = await first.value.createRide({ ...values, ...estimate })
  const persisted = JSON.parse(t.storage.get(key))
  assert.equal(failure.draftId, persisted.id)
  for (const field of Object.keys(estimate)) assert.equal(persisted[field], estimate[field])
  first.unmount()
  t.control.offline = false
  const reloaded = t.mount(); await reloaded.flush()
  const restored = await reloaded.value.getDraftForRestore()
  for (const field of Object.keys(estimate)) assert.equal(restored.draft[field], estimate[field])
  const saved = await reloaded.value.createRide(restored.draft, restored.draft.id)
  assert.equal(saved.ride.id, persisted.id)
  assert.equal(t.rows.size, 1)
  assert.equal(saved.ride.estimated_price, 6.26)
  assert.equal(t.storage.has(key), false)
})

test('legacy drafts without metrics restore and save with explicit nulls', async () => {
  const t = setup({ savedDraft: draft() }), rides = t.mount()
  await rides.flush()
  const restored = await rides.value.getDraftForRestore()
  for (const field of Object.keys(estimate)) assert.equal(restored.draft[field], null)
  const saved = await rides.value.createRide(restored.draft, restored.draft.id)
  for (const field of Object.keys(estimate)) assert.equal(saved.ride[field], null)
})

test('lost insert response retries the same UUID and keeps the originally saved estimate', async () => {
  const t = setup(), rides = t.mount()
  await rides.flush(); t.control.loseResponse = true
  const failure = await rides.value.createRide({ ...values, ...estimate })
  await rides.flush()
  assert(failure.draftId)
  const recovered = await rides.value.createRide({ ...values, ...estimate, estimated_price: 999 }, failure.draftId)
  assert.equal(recovered.ride.estimated_price, 6.26)
  assert.equal(t.control.payloads.length, 1)
  assert.equal(t.rows.size, 1)
  assert.equal(t.storage.has(key), false)
})

test('form saves displayed metrics and clears all fields only after success', async () => {
  const t = setup(), rides = t.mount(); await rides.flush()
  const app = appHarness(rides, () => ({ status: 'ready', estimate }))
  fill(app)
  await app.value.book(event()); await rides.flush(); await app.flush()
  assert.equal(t.control.payloads[0].estimated_price, 6.26)
  assert.equal(app.value.pickupAddress, '')
  assert.equal(app.value.destinationAddress, '')
  assert(app.value.notice.includes('išsaugotas'))
})

test('form waits for calculation; an API failure saves nulls instead of a made-up price', async () => {
  const t = setup(), rides = t.mount(); await rides.flush()
  let route = { status: 'loading', estimate: emptyEstimate() }
  const app = appHarness(rides, () => route)
  fill(app)
  await app.value.book(event()); await app.flush()
  assert.equal(t.control.payloads.length, 0)
  route = { status: 'error', estimate: emptyEstimate(), error: 'Maršrutas nerastas' }
  app.render()
  await app.value.book(event()); await rides.flush(); await app.flush()
  for (const field of Object.keys(estimate)) assert.equal(t.control.payloads[0][field], null)
})

test('form restores draft metrics as a labelled snapshot while recalculating; old history has no fake price', async () => {
  const legacy = { id: randomUUID(), ...values, user_id: 'user', passenger_id: 'passenger', status: 'done',
    created_at: new Date().toISOString(), ...emptyEstimate() }
  const t = setup({ savedDraft: draft(estimate), savedRows: [legacy] }), rides = t.mount()
  await rides.flush()
  const app = appHarness(rides, () => ({ status: 'loading', estimate: emptyEstimate() }))
  assert.equal(app.value.pickupAddress, '')
  await app.value.restoreDraft(); await app.flush()
  assert.equal(app.value.restoredEstimate.estimated_price, 6.26)
  assert.equal(app.value.currentEstimate.estimated_price, null)
  assert.equal(app.value.pickupAddress, values.pickup_address)
  app.render()
  assert.equal(app.value.savedTrips[0].price, 'Kaina nenustatyta')
})
