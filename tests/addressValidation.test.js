import test from 'node:test'
import assert from 'node:assert/strict'
import { getAddressError } from '../src/lib/addressValidation.js'

function selected(extra = {}) {
  return {
    address: 'Gedimino pr. 12, Vilnius, Lietuva',
    resultType: 'building', countryCode: 'lt',
    street: 'Gedimino pr.', housenumber: '12', locality: 'Vilnius',
    placeName: '', lat: 54.68, lon: 25.27,
    ...extra,
  }
}

test('API result type prevents city, district and postcode-only orders even with digits', () => {
  for (const resultType of ['city', 'state', 'county', 'country', 'postcode', 'district', 'suburb', 'locality']) {
    const place = selected({ resultType, housenumber: '12' })
    assert.notEqual(getAddressError(place.address, place), '', resultType)
  }
})

test('street names containing numbers cannot substitute for the missing house number', () => {
  const place = selected({ address: 'Vasario 16-osios g., Vilnius', resultType: 'street', street: 'Vasario 16-osios g.', housenumber: '' })
  assert.match(getAddressError(place.address, place), /namo numerio/)
  assert.notEqual(getAddressError('Vasario 16-osios g., Vilnius'), '')
})

test('structured buildings require a valid house number and locality', () => {
  const house = selected()
  assert.equal(getAddressError(house.address, house), '')
  for (const extra of [{ housenumber: '' }, { housenumber: 'LT-01103' }, { locality: '' }, { countryCode: 'lv' }, { resultType: 'unknown' }]) {
    const place = selected(extra)
    assert.notEqual(getAddressError(place.address, place), '')
  }
  const village = selected({ street: '', locality: 'Zervynos' })
  assert.equal(getAddressError(village.address, village), '')
})

test('a named amenity can be selected without a house number only with a locality and coordinates', () => {
  const station = selected({ address: 'Vilniaus autobusu stotis, Vilnius', resultType: 'amenity', placeName: 'Vilniaus autobusu stotis', street: '', housenumber: '' })
  assert.equal(getAddressError(station.address, station), '')
  for (const extra of [{ placeName: '' }, { locality: '' }, { lat: undefined }, { lon: undefined }]) {
    const place = { ...station, ...extra }
    assert.notEqual(getAddressError(place.address, place), '')
  }
})

test('manual street and rural addresses support letters, slashes and apartment suffixes', () => {
  for (const address of [
    'Gedimino pr. 12, Vilnius',
    'Vilnius, Gedimino prospektas 12A',
    'Laisves al. 10/2, Kaunas',
    'Vilniaus g. 12-5, Anyksciai',
    'Zervynu k. 12, Varenos r.',
    'Zervynos kaimas 12A, Varenos rajonas',
  ]) assert.equal(getAddressError(address), '', address)
})

test('manual city, arbitrary digits, missing houses and missing localities are rejected', () => {
  for (const address of [
    '', ' ', 'Vilnius', 'Kaunas', 'Zervynos', 'Vilnius 12',
    'Vilnius, Kaunas', 'Vilnius 123, Lietuva', '12, Vilnius',
    'Gedimino pr., Vilnius', 'Gedimino pr. 12', 'Gedimino pr. 12, Lietuva',
    'Vasario 16-osios g., Vilnius', 'Zervynu k., Varenos r.',
    'Autobusu stotis', 'Centrine autobusu stotis',
  ]) assert.notEqual(getAddressError(address), '', address)
})

test('manual named transport hubs and named landmarks with a locality are accepted', () => {
  for (const address of [
    'Vilniaus autobus\u0173 stotis',
    'Kauno gele\u017einkelio stotis',
    'Vilniaus oro uostas',
    'Vilniaus autobusų stotis, Sodų g., Vilnius, Lietuva',
    'Autobusų stotis, Vilnius',
    'Prekybos centras Akropolis, Vilnius',
    'Vie\u0161butis Lietuva, Vilnius',
  ]) assert.equal(getAddressError(address), '', address)
  for (const address of ['autobus\u0173 stotis', 'Centrin\u0117 autobus\u0173 stotis', 'Parduotuv\u0117, Vilnius', 'Akropolis']) {
    assert.notEqual(getAddressError(address), '', address)
  }
})

test('editing selected text invalidates metadata and uses the manual rules', () => {
  const house = selected()
  assert.notEqual(getAddressError('Vilnius', house), '')
  assert.equal(getAddressError('Laisves al. 10, Kaunas', house), '')
})
