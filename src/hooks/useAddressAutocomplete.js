import { useEffect, useState } from 'react'
import { searchLithuanianAddresses } from '../lib/geoapify'

export function useAddressAutocomplete(query, enabled) {
  const [state, setState] = useState({ query: null, status: 'idle', results: [], message: '' })
  const canSearch = enabled && typeof query === 'string' && query.trim().length >= 3

  useEffect(() => {
    if (!canSearch) return
    let active = true
    const controller = new AbortController()
    let timeout
    const debounce = setTimeout(async () => {
      timeout = setTimeout(() => controller.abort(), 8000)
      try {
        const results = await searchLithuanianAddresses(query, { signal: controller.signal })
        if (active) setState({ query, status: 'ready', results, message: results.length ? '' : 'Pasiūlymų nerasta. Patikslinkite gyvenvietę arba įveskite adresą rankiniu būdu.' })
      } catch {
        if (active) setState({ query, status: 'error', results: [], message: 'Adresų paieška laikinai neveikia. Adresą galite įvesti rankiniu būdu.' })
      } finally {
        clearTimeout(timeout)
      }
    }, 350)
    return () => {
      active = false
      clearTimeout(debounce)
      clearTimeout(timeout)
      controller.abort()
    }
  }, [query, canSearch])

  if (!canSearch) return { status: 'idle', results: [], message: '' }
  if (state.query !== query) return { status: 'loading', results: [], message: 'Ieškoma adresų…' }
  return state
}
