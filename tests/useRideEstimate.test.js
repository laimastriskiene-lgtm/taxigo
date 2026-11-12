import test from 'node:test'
import assert from 'node:assert/strict'
import { getAddressError } from '../src/lib/addressValidation.js'
import { emptyEstimate } from '../src/lib/rideEstimate.js'
import { loadFunctions, hookHarness } from './helpers/hookHarness.js'

function setup() {
  let now = 0, next = 0
  const timers = new Map(), requests = []
  let input = { pickupAddress: 'Gedimino pr. 12, Vilnius', destinationAddress: 'Sodų g. 22, Vilnius', pickupSelection: null, destinationSelection: null, enabled: true }
  const runner = hookHarness(context => {
    const useRideEstimate = loadFunctions('src/hooks/useRideEstimate.js', 'useRideEstimate', context)
    return () => useRideEstimate(input)
  }, {
    getAddressError, emptyEstimate, AbortController,
    setTimeout: (fn, delay) => { const id = ++next; timers.set(id, { at: now + delay, fn }); return id },
    clearTimeout: id => timers.delete(id),
    calculateRideEstimate: (value, { signal }) => new Promise((resolve, reject) => requests.push({ value, signal, resolve, reject })),
  })
  return {
    runner, requests,
    change(values) { input = { ...input, ...values }; runner.render() },
    async advance(ms) {
      now += ms
      for (const [id, timer] of [...timers]) if (timer.at <= now) { timers.delete(id); timer.fn() }
      await runner.flush()
    },
  }
}
const estimate = { distance_km: 3.26, duration_min: 6, estimated_price: 6.26 }

test('debounce and changing the address immediately remove the previous estimate', async () => {
  const t = setup()
  assert.equal(t.runner.value.status, 'loading')
  await t.advance(649); assert.equal(t.requests.length, 0)
  await t.advance(1); assert.equal(t.requests.length, 1)
  t.requests[0].resolve(estimate); await t.runner.flush()
  assert.equal(t.runner.value.estimate.estimated_price, 6.26)
  t.change({ destinationAddress: 'Laisvės al. 10, Kaunas' })
  assert.equal(t.runner.value.status, 'loading')
  assert.equal(t.runner.value.estimate.estimated_price, null)
  assert.equal(t.requests[0].signal.aborted, true)
})

test('a late old response cannot replace the latest route', async () => {
  const t = setup()
  await t.advance(650)
  t.change({ destinationAddress: 'Laisvės al. 10, Kaunas' }); await t.advance(650)
  t.requests[1].resolve({ ...estimate, estimated_price: 100 }); await t.runner.flush()
  t.requests[0].resolve(estimate); await t.runner.flush()
  assert.equal(t.runner.value.estimate.estimated_price, 100)
})

test('API failure clears all metrics; retry has no stale price', async () => {
  const t = setup()
  await t.advance(650)
  t.requests[0].reject(Error('Maršrutas nerastas')); await t.runner.flush()
  assert.equal(t.runner.value.status, 'error')
  assert.equal(t.runner.value.estimate.estimated_price, null)
  t.runner.value.retry(); await t.runner.flush()
  assert.equal(t.runner.value.status, 'loading')
  assert.equal(t.runner.value.estimate.distance_km, null)
})

test('invalid addresses, leaving the screen, and unmounting cancel outstanding work', async () => {
  const t = setup()
  await t.advance(650)
  t.change({ pickupAddress: 'Vilnius' })
  assert.equal(t.runner.value.status, 'idle')
  assert.equal(t.requests[0].signal.aborted, true)
  t.change({ pickupAddress: 'Gedimino pr. 12, Vilnius', enabled: false })
  assert.equal(t.runner.value.estimate.estimated_price, null)
  t.runner.unmount()
})

test('a timed-out request produces an error and null metrics', async () => {
  const t = setup()
  await t.advance(650)
  t.requests[0].signal.addEventListener('abort', () => t.requests[0].reject(Error('aborted')))
  await t.advance(20000)
  assert.equal(t.runner.value.status, 'error')
  assert.equal(t.runner.value.estimate.estimated_price, null)
})
