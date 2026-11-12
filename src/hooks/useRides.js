import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

const columns = 'id,passenger_id,user_id,pickup_address,destination,phone,pickup_time,priority,status,car_type,created_at'
const fallbackMessage = 'Užsakymo išsiųsti nepavyko. Duomenys išsaugoti. Bandykite dar kartą.'
const storageKey = userId => 'taxigo:ride-draft:v1:' + userId

function rideFields(values) {
  return {
    pickup_address: values.pickup_address,
    destination: values.destination,
    phone: values.phone,
    pickup_time: values.pickup_time,
    priority: values.priority,
    car_type: values.car_type,
  }
}

function readDraft(userId) {
  if (!userId) return { draft: null, warning: '' }
  try {
    const raw = window.localStorage.getItem(storageKey(userId))
    if (!raw) return { draft: null, warning: '' }
    const value = JSON.parse(raw)
    if (!value || !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value.id)
      || typeof value.pickup_address !== 'string' || !value.pickup_address.trim()
      || typeof value.destination !== 'string' || !value.destination.trim()
      || typeof value.phone !== 'string' || !/^\+370[0-9]{8}$/.test(value.phone)
      || !['normal', 'high'].includes(value.priority)
      || !['standard', 'comfort'].includes(value.car_type)
      || !(value.pickup_time === null || (typeof value.pickup_time === 'string'
        && Number.isFinite(Date.parse(value.pickup_time))))) {
      throw new Error('Invalid draft')
    }
    return { draft: { id: value.id, ...rideFields(value) }, warning: '' }
  } catch {
    return { draft: null, warning: 'Naršyklėje išsaugoto juodraščio perskaityti nepavyko. Įvesti duomenys šiame puslapyje išliks, tačiau atkūrimas perkrovus puslapį gali neveikti.' }
  }
}

function clearStoredDraft(userId, id) {
  try {
    const raw = window.localStorage.getItem(storageKey(userId))
    if (raw && JSON.parse(raw).id === id) window.localStorage.removeItem(storageKey(userId))
    return ''
  } catch {
    return 'Užsakymas patvirtintas, tačiau naršyklės juodraščio pašalinti nepavyko. Prieš atkūrimą jis bus dar kartą patikrintas Supabase.'
  }
}

async function findRide(id, userId, passengerId) {
  const { data, error } = await supabase.from('rides').select(columns)
    .eq('id', id).eq('user_id', userId).eq('passenger_id', passengerId)
    .maybeSingle()
  if (error) throw error
  return data
}

export function useRides(userId, passengerId) {
  const owner = userId && passengerId ? userId + ':' + passengerId : null
  const [history, setHistory] = useState({ owner: null, version: -1, rides: [], error: '' })
  const [draftState, setDraftState] = useState(() => readDraft(userId))
  const pending = useRef(draftState.draft)
  const confirmed = useRef(new Map())
  const [version, setVersion] = useState(0)
  const [saving, setSaving] = useState(false)
  const [checkingDraft, setCheckingDraft] = useState(false)
  const lock = useRef(false)
  const activeOwner = useRef(null)

  useEffect(() => {
    activeOwner.current = owner
    return () => { activeOwner.current = null }
  }, [owner])

  useEffect(() => {
    let active = true
    async function load() {
      if (!owner) return
      try {
        const { data, error } = await supabase.from('rides').select(columns)
          .eq('user_id', userId).eq('passenger_id', passengerId)
          .order('created_at', { ascending: false })
        if (error) throw error
        if (!active) return
        setHistory({ owner, version, rides: data, error: '' })
        const draft = pending.current
        const saved = draft && data.find(ride => ride.id === draft.id)
        if (saved && !lock.current) {
          confirmed.current.set(saved.id, saved)
          pending.current = null
          setDraftState({ draft: null, warning: clearStoredDraft(userId, saved.id) })
        }
      } catch {
        if (active) setHistory({ owner, version, rides: [], error: 'Nepavyko įkelti kelionių. Patikrink ryšį ir bandyk dar kartą.' })
      }
    }
    load()
    return () => { active = false }
  }, [owner, userId, passengerId, version])

  function complete(ride, recovered = false) {
    confirmed.current.set(ride.id, ride)
    if (pending.current?.id === ride.id) pending.current = null
    const warning = clearStoredDraft(userId, ride.id)
    if (activeOwner.current !== owner) return { ignored: true }
    setDraftState(previous => previous.draft && previous.draft.id !== ride.id
      ? previous : { draft: null, warning })
    setVersion(previous => previous + 1)
    return { ride, recovered }
  }

  async function getDraftForRestore() {
    if (lock.current) return { ignored: true }
    if (!owner || activeOwner.current !== owner) return { error: 'Prisijunk ir užbaik keleivio profilį.' }
    const draft = pending.current || readDraft(userId).draft
    if (!draft) return { error: 'Neišsiųsto užsakymo juodraščio nėra.' }
    lock.current = true
    setCheckingDraft(true)
    try {
      // A stored request may already have succeeded before its response was lost.
      const existing = confirmed.current.get(draft.id) || await findRide(draft.id, userId, passengerId)
      if (activeOwner.current !== owner) return { ignored: true }
      if (existing) return complete(existing, true)
      pending.current = draft
      setDraftState({ draft, warning: '' })
      return { draft }
    } catch {
      if (activeOwner.current !== owner) return { ignored: true }
      return { error: 'Nepavyko patikrinti, ar šis užsakymas jau išsaugotas. Juodraštis paliktas. Atkurkite ryšį ir bandykite dar kartą.' }
    } finally {
      lock.current = false
      if (activeOwner.current === owner) setCheckingDraft(false)
    }
  }

  async function createRide(values, draftId = null) {
    if (lock.current) return { ignored: true }
    if (!owner || activeOwner.current !== owner) return { error: 'Prisijunk ir užbaik keleivio profilį.' }
    lock.current = true
    setSaving(true)
    let draft = null
    let persisted = false

    function persist() {
      try {
        window.localStorage.setItem(storageKey(userId), JSON.stringify(draft))
        return true
      } catch {
        return false
      }
    }

    try {
      let previous = pending.current || readDraft(userId).draft
      if (previous && confirmed.current.has(previous.id)) {
        clearStoredDraft(userId, previous.id)
        if (pending.current?.id === previous.id) pending.current = null
        previous = null
      }
      if (draftId) {
        const known = confirmed.current.get(draftId)
        if (known) return complete(known, true)
        if (!previous || previous.id !== draftId) {
          return { error: 'Juodraštis pasikeitė. Prieš siųsdami dar kartą paspauskite „Atkurti juodraštį“.' }
        }
        draft = { id: draftId, ...rideFields(values) }
        const existing = await findRide(draftId, userId, passengerId)
        if (existing) return complete(existing, true)
      } else {
        // A blank new form must never inherit an unresolved request's ID or
        // overwrite its fallback. Resolve the previous draft first.
        if (previous) {
          const existing = await findRide(previous.id, userId, passengerId)
          if (existing) complete(existing, true)
          else return { error: 'Yra neišsiųsto užsakymo juodraštis. Pirmiausia paspauskite „Atkurti juodraštį“ ir užbaikite ankstesnį bandymą. Naujos formos duomenys liko šiame puslapyje.' }
        }
        draft = { id: window.crypto.randomUUID(), ...rideFields(values) }
      }
      if (activeOwner.current !== owner) return { ignored: true }
      pending.current = draft
      // Persist the ID before sending, so a reload cannot create a second order.
      persisted = persist()
      const { data, error } = await supabase.from('rides').insert({
        ...draft, user_id: userId, passenger_id: passengerId, status: 'requested',
      }).select(columns).single()
      if (error) throw error
      return complete(data)
    } catch {
      if (!draft) return { error: 'Nepavyko paruošti naujo užsakymo arba patikrinti ankstesnio bandymo. Formos duomenys nepakeisti. Patikrinkite ryšį ir bandykite dar kartą.' }
      try {
        const existing = await findRide(draft.id, userId, passengerId)
        if (existing) return complete(existing, true)
      } catch {
        // Keep the same request ID when the server result remains unknown.
      }
      persisted = persist() || persisted
      pending.current = draft
      if (activeOwner.current !== owner) return { ignored: true }
      setDraftState({
        draft,
        warning: persisted ? '' : 'Juodraščio išsaugoti naršyklėje nepavyko. Duomenys liko tik šiame puslapyje – jo neperkraukite.',
      })
      return { draftId: draft.id, error: persisted ? fallbackMessage : 'Užsakymo išsiųsti nepavyko. Duomenys liko šiame puslapyje, bet localStorage jų išsaugoti nepavyko. Bandykite dar kartą.' }
    } finally {
      lock.current = false
      if (activeOwner.current === owner) setSaving(false)
    }
  }

  const current = owner && history.owner === owner && history.version === version
  return {
    rides: current ? history.rides : [],
    loading: Boolean(owner && !current), error: current ? history.error : '',
    draft: draftState.draft, draftWarning: draftState.warning,
    saving, checkingDraft, busy: saving || checkingDraft,
    createRide, getDraftForRestore, retry: () => setVersion(previous => previous + 1),
  }
}
