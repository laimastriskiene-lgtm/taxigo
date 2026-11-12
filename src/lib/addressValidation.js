const broadTypes = new Set(['country', 'state', 'county', 'city', 'postcode', 'district', 'suburb', 'locality'])
const houseNumber = /^\d{1,4}[\p{L}]?(?:[/-]\d{1,4}[\p{L}]?)?$/u
const streetName = /^.+\s+(?:g\.?|gatvė|pr\.?|prospektas|al\.?|alėja|pl\.?|plentas|kel\.?|kelias|skg\.?|skersgatvis|a\.?|aikštė)(?=\s|\d|$)\s*(.*)$/iu
const villageName = /^.+\s+(?:k\.?|kaimas|mstl\.?|miestelis|vs\.?|viensėdis)(?=\s|\d|$)\s*(.*)$/iu
const landmarkType = /(?:autobusų\s+stotis|geležinkelio\s+stotis|oro\s+uostas|stotis|ligoninė|klinikos|poliklinika|biblioteka|universitetas|mokykla|gimnazija|bažnyčia|muziejus|viešbutis|prekybos\s+centras|degalinė|parduotuvė|terminalas|arena)/iu
const transportType = /(?:autobusų\s+stotis|geležinkelio\s+stotis|oro\s+uostas)/iu
const genericPlaceWords = /^(?:centrinė|centrinis|pagrindinė|pagrindinis|nauja|naujoji|sena|senoji|miesto|rajono|keleivių|tarptautinis|tarptautinė|lietuvos)$/iu

function normalized(value) {
  return typeof value === 'string' ? value.normalize('NFC').replace(/\s+/g, ' ').trim() : ''
}

function context(value) {
  return /\p{L}{2}/u.test(value)
    && !/^(?:Lietuva|Lithuania|LT|LT[- ]?\d{5}|\d{5})$/iu.test(value)
}

function settlement(value) {
  return context(value) && !/(?:apskritis|apskr\.|savivaldybė|sav\.|rajonas|raj\.|(?:^|\s)r\.)/iu.test(value)
}

function namedLandmark(value) {
  const match = value.match(landmarkType)
  if (!match) return false
  const name = value.replace(match[0], '').match(/\p{L}+/gu) || []
  return name.some(word => word.length >= 2 && !genericPlaceWords.test(word))
}

function selectionError(selected) {
  if (selected.countryCode !== 'lt') return 'Pasirinkite Lietuvoje esantį adresą.'
  if (broadTypes.has(selected.resultType)) return 'Pasirinkta tik vietovė. Nurodykite gatvę, namo numerį ir gyvenvietę arba konkrečią vietą, pavyzdžiui, autobusų stotį.'
  const number = normalized(selected.housenumber)
  const place = normalized(selected.locality)
  const street = normalized(selected.street)
  if (selected.resultType === 'street' && !number) return 'Pasirinkta gatvė be namo numerio. Įrašykite namo numerį ir pasirinkite patikslintą pasiūlymą arba įveskite visą adresą rankiniu būdu.'
  if (['building', 'amenity'].includes(selected.resultType) && houseNumber.test(number) && place) return ''
  const hasCoordinates = Number.isFinite(selected.lat) && Number.isFinite(selected.lon)
  const name = normalized(selected.placeName)
  if (place && name && hasCoordinates && (selected.resultType === 'amenity'
    || (selected.resultType === 'building' && landmarkType.test(name)))) return ''
  if (street && !number) return 'Šiame pasiūlyme nėra namo numerio. Patikslinkite adresą arba pasirinkite konkrečią vietą.'
  return 'Pasiūlymas nepakankamai tikslus. Pasirinkite pastatą su namo numeriu arba aiškiai įvardytą vietą.'
}

export function getAddressError(value, selected = null) {
  const address = normalized(value)
  if (!address) return 'Įveskite gatvę, namo numerį ir gyvenvietę arba konkrečios vietos pavadinimą.'
  // Once the text changes, the old suggestion must no longer validate it.
  if (selected && normalized(selected.address) === address) return selectionError(selected)
  const parts = address.split(/[,;]/).map(normalized).filter(Boolean)
  // A specific landmark remains sufficient even if its formatted address also
  // includes a street without a house number (including after draft restoration).
  if (parts.some((part, index) => (namedLandmark(part) || transportType.test(part))
    && parts.some((other, otherIndex) => otherIndex !== index && settlement(other)))) return ''
  if (parts.length === 1 && transportType.test(address) && namedLandmark(address)) return ''
  for (let i = 0; i < parts.length; i++) {
    const street = parts[i].match(streetName)
    if (street) {
      if (!houseNumber.test(street[1])) return 'Patikslinkite gatvę ir namo numerį. Pavyzdys: Gedimino pr. 12, Vilnius.'
      if (!parts.some((part, index) => index !== i && settlement(part))) return 'Prie gatvės ir namo numerio nurodykite gyvenvietę, atskirtą kableliu. Pavyzdys: Gedimino pr. 12, Vilnius.'
      return ''
    }
    const village = parts[i].match(villageName)
    if (village && houseNumber.test(village[1]) && parts.some((part, index) => index !== i && context(part))) return ''
  }
  return 'Vien miesto pavadinimo ar skaičiaus nepakanka. Įveskite, pvz., Gedimino pr. 12, Vilnius arba Vilniaus autobusų stotis. Kaimo adresas: Zervynų k. 12, Varėnos r.'
}
