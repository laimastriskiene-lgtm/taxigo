import { useEffect, useState } from 'react'
import { getAddressError } from '../lib/addressValidation'
import { calculateRideEstimate } from '../lib/geoapify'
import { emptyEstimate, normalizeRideEstimate, calculatePrice } from '../lib/rideEstimate'

export function useRideEstimate({ pickupAddress, destinationAddress, pickupSelection, destinationSelection, enabled, carType = 'standard' }) {
  const [state, setState] = useState({ key: null, status: 'idle', estimate: emptyEstimate(), error: '' })
  const [revision, setRevision] = useState(0)
  const request = JSON.stringify({ pickupAddress, destinationAddress, pickupSelection, destinationSelection })
  const key = request + ':' + revision
  const canCalculate = enabled && !getAddressError(pickupAddress, pickupSelection)
    && !getAddressError(destinationAddress, destinationSelection)

  useEffect(() => {
    if (!canCalculate) return
    let active = true
    const controller = new AbortController()
    let timeout
    const debounce = setTimeout(async () => {
      timeout = setTimeout(() => controller.abort(), 20000)
      try {
        const estimate = await calculateRideEstimate(JSON.parse(request), { signal: controller.signal })
        if (active && !controller.signal.aborted) setState({ key, status: 'ready', estimate, error: '' })
      } catch (failure) {
        if (active) setState({
          key, status: 'error', estimate: emptyEstimate(),
          error: controller.signal.aborted ? 'Skaičiavimas užtruko per ilgai. Bandykite dar kartą.'
            : failure?.message || 'Maršruto apskaičiuoti nepavyko.',
        })
      } finally {
        clearTimeout(timeout)
      }
    }, 650)
    return () => {
      active = false
      clearTimeout(debounce)
      clearTimeout(timeout)
      controller.abort()
    }
  }, [request, key, canCalculate])

  const retry = () => setRevision(previous => previous + 1)
  if (!canCalculate) return { status: 'idle', estimate: emptyEstimate(), error: '', retry }
  if (state.key !== key) return { status: 'loading', estimate: emptyEstimate(), error: '', retry }
  // Car type changes only the derived price, never the route request or its key.
  const estimate = state.status === 'ready' ? normalizeRideEstimate({
    ...state.estimate, estimated_price: calculatePrice(state.estimate.distanceMeters, carType),
  }) : emptyEstimate()
  return { ...state, estimate, retry }
}
