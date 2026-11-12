import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateEstimate, emptyEstimate, normalizeRideEstimate, formatPrice, formatDistance, formatDuration } from '../src/lib/rideEstimate.js'

test('route uses meters for price, rounds kilometers/cents, rounds duration upwards', () => {
  assert.deepEqual(calculateEstimate(3255, 321.31), { distance_km: 3.26, duration_min: 6, estimated_price: 6.26 })
  assert.deepEqual(calculateEstimate(1004.9, 60), { distance_km: 1, duration_min: 1, estimated_price: 4 })
  assert.deepEqual(calculateEstimate(0, 0), { distance_km: 0, duration_min: 0, estimated_price: 3 })
  assert.equal(calculateEstimate(1005, 60.01).estimated_price, 4.01)
})

test('invalid or overflowing route metrics do not create an estimate', () => {
  for (const value of [-1, NaN, Infinity, null, undefined, '3255']) {
    assert.throws(() => calculateEstimate(value, 10))
    assert.throws(() => calculateEstimate(10, value))
  }
  assert.throws(() => calculateEstimate(1e15, 5))
})

test('old or incomplete rows/drafts become three nulls; numeric database strings are supported', () => {
  for (const value of [{}, null, { distance_km: 2 }, { distance_km: -1, duration_min: 1, estimated_price: 2 },
    { distance_km: 2, duration_min: 1.5, estimated_price: 5 }, { distance_km: true, duration_min: 1, estimated_price: 4 }]) {
    assert.deepEqual(normalizeRideEstimate(value), emptyEstimate())
  }
  assert.deepEqual(normalizeRideEstimate({ distance_km: '3.26', duration_min: 6, estimated_price: '6.26' }),
    { distance_km: 3.26, duration_min: 6, estimated_price: 6.26 })
})

test('history and missing values never turn null into a zero price', () => {
  assert.equal(formatPrice(null), 'Kaina nenustatyta')
  assert.equal(formatDistance(undefined), 'Neskaičiuota')
  assert.equal(formatDuration(null), 'Neskaičiuota')
  assert.match(formatPrice(6.26), /6,26/)
  assert.equal(formatDistance(3.26), '3,26 km')
  assert.equal(formatDuration(6), 'Apie 6 min.')
})
