import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

const profileMessage = 'Paskyra yra sukurta, tačiau keleivio profilio išsaugoti arba patikrinti nepavyko. Bandyk dar kartą.'

function authMessage(error) {
  const messages = {
    invalid_credentials: 'Neteisingas el. paštas arba slaptažodis.',
    user_already_exists: 'Šiuo el. paštu paskyra jau sukurta. Prisijunk.',
    weak_password: 'Slaptažodis per silpnas. Pasirink ilgesnį ir sudėtingesnį.',
    email_address_invalid: 'Įvesk galiojantį el. pašto adresą.',
    email_not_confirmed: 'Prieš prisijungdama patvirtink el. paštą.',
    over_request_rate_limit: 'Per daug bandymų. Palauk ir bandyk dar kartą.',
    over_email_send_rate_limit: 'Per daug bandymų. Palauk ir bandyk dar kartą.',
  }
  return messages[error?.code] || 'Veiksmas nepavyko. Patikrink interneto ryšį ir bandyk dar kartą.'
}

export function useAuth() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [profileState, setProfileState] = useState({ userId: null, profile: null, loading: false, error: '' })
  const lock = useRef(false)
  const currentUser = useRef(null)
  const profileRequest = useRef(0)
  const userId = session?.user.id || null

  useEffect(() => {
    let active = true
    let receivedEvent = false
    const apply = (next) => {
      if (!active) return
      currentUser.current = next?.user.id || null
      setSession(next)
      setLoading(false)
    }
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      receivedEvent = true
      apply(next)
    })
    supabase.auth.getSession().then(({ data: initial, error: failure }) => {
      if (!active || receivedEvent) return
      if (failure) setError(authMessage(failure))
      apply(initial.session)
    }).catch(() => {
      if (active && !receivedEvent) {
        setError('Nepavyko atkurti prisijungimo. Perkrauk puslapį ir bandyk dar kartą.')
        setLoading(false)
      }
    })
    return () => { active = false; data.subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    if (!userId) return
    let active = true
    const request = ++profileRequest.current
    const update = (value) => {
      if (active && currentUser.current === userId && request === profileRequest.current) {
        setProfileState(previous => !value.loading && !value.profile && previous.userId === userId && previous.profile ? previous : { userId, ...value })
      }
    }
    update({ profile: null, loading: true, error: '' })
    async function load() {
      try {
        const { data, error: failure } = await supabase.from('passengers').select('id,user_id,name').eq('user_id', userId).maybeSingle()
        if (failure) throw failure
        update({ profile: data, loading: false, error: '' })
      } catch {
        update({ profile: null, loading: false, error: profileMessage })
      }
    }
    load()
    return () => { active = false }
  }, [userId])

  async function run(action) {
    if (lock.current) return false
    lock.current = true
    setBusy(true)
    setError('')
    setMessage('')
    try { return await action() }
    catch (failure) { setError(authMessage(failure)); return false }
    finally { lock.current = false; setBusy(false) }
  }

  async function saveProfile(name, id = currentUser.current) {
    if (!id || id !== currentUser.current) return false
    ++profileRequest.current
    try {
      // Ignore duplicate user_id values; never overwrite an existing profile on retry.
      const { error: failure } = await supabase.from('passengers').upsert(
        { user_id: id, name: name.trim() },
        { onConflict: 'user_id', ignoreDuplicates: true },
      )
      if (failure) throw failure
      const { data, error: readFailure } = await supabase.from('passengers').select('id,user_id,name').eq('user_id', id).single()
      if (readFailure) throw readFailure
      if (currentUser.current !== id) return false
      setProfileState({ userId: id, profile: data, loading: false, error: '' })
      return true
    } catch {
      if (currentUser.current === id) setProfileState({ userId: id, profile: null, loading: false, error: profileMessage })
      return false
    }
  }

  return {
    session, loading, busy, error, message,
    profile: profileState.userId === userId ? profileState.profile : null,
    profileLoading: Boolean(userId) && (profileState.userId !== userId || profileState.loading),
    profileError: profileState.userId === userId ? profileState.error : '',
    signUp: (name, email, password) => run(async () => {
      const { data, error: failure } = await supabase.auth.signUp({ email, password, options: { data: { name: name.trim() } } })
      if (failure) throw failure
      if (!data.session) {
        setMessage('Registracija priimta. Jei reikia, patvirtink el. paštą, tada prisijunk.')
        return false
      }
      currentUser.current = data.session.user.id
      setSession(data.session)
      await saveProfile(name, data.session.user.id)
      return true
    }),
    signIn: (email, password) => run(async () => {
      const { error: failure } = await supabase.auth.signInWithPassword({ email, password })
      if (failure) throw failure
      return true
    }),
    signOut: () => run(async () => {
      const { error: failure } = await supabase.auth.signOut()
      if (failure) throw failure
      currentUser.current = null
      setSession(null)
      setProfileState({ userId: null, profile: null, loading: false, error: '' })
      return true
    }),
    retryProfile: (name) => run(() => saveProfile(name)),
  }
}

