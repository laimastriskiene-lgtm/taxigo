import { useState } from 'react'

export default function AuthForm({ auth, onDemo, onSuccess }) {
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [validation, setValidation] = useState('')
  const [showResult, setShowResult] = useState(false)
  const register = mode === 'register'
  const needsProfile = Boolean(auth.session && !auth.profile)

  async function submit(event) {
    event.preventDefault()
    setValidation('')
    setShowResult(false)
    if ((register || needsProfile) && !name.trim()) {
      setValidation('Įvesk savo vardą.')
      return
    }
    if (!needsProfile && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setValidation('Įvesk galiojantį el. pašto adresą.')
      return
    }
    if (!needsProfile && (!password || (register && password.length < 6))) {
      setValidation(register ? 'Slaptažodį turi sudaryti bent 6 simboliai.' : 'Įvesk slaptažodį.')
      return
    }
    const success = needsProfile
      ? await auth.retryProfile(name)
      : register ? await auth.signUp(name, email.trim(), password) : await auth.signIn(email.trim(), password)
    setPassword('')
    setShowResult(true)
    if (success && !needsProfile) onSuccess()
  }

  if (auth.loading) return <section className="login-card" role="status">Tikrinamas prisijungimas…</section>
  if (auth.session) return <section className="login-card">
    <span className="eyebrow">TAVO PASKYRA</span><h2>{auth.profile ? `Labas, ${auth.profile.name}!` : 'Keleivio profilis'}</h2>
    {auth.profileLoading ? <p role="status">Tikrinamas keleivio profilis…</p> : needsProfile && <>
      <p className="muted">Paskyra sukurta. Užbaik keleivio profilio išsaugojimą.</p>
      <form onSubmit={submit} noValidate>
        <label>Vardas<input name="name" autoComplete="given-name" value={name} onChange={e => setName(e.target.value)} required /></label>
        <button className="primary" disabled={auth.busy} type="submit">{auth.busy ? 'Saugoma…' : 'Išsaugoti profilį / bandyti dar kartą'}</button>
      </form>
    </>}
    {(validation || auth.profileError || auth.error) && <p className="auth-error" role="alert">{validation || auth.profileError || auth.error}</p>}
    <button className="secondary auth-action" disabled={auth.busy} onClick={onSuccess}>Tęsti į keliones</button>
    <button className="secondary auth-action" disabled={auth.busy} onClick={() => auth.signOut()}>Atsijungti</button>
  </section>

  return <section className="login-card">
    <span className="eyebrow">MALONU TAVE MATYTI</span><h2>{register ? 'Registracija' : 'Prisijungimas'}</h2>
    <p className="muted">Tavo kelionės prasideda čia.</p>
    <form onSubmit={submit} noValidate>
      {register && <label>Vardas<input name="name" autoComplete="given-name" value={name} onChange={e => setName(e.target.value)} required /></label>}
      <label>El. paštas<input name="email" type="email" autoComplete="email" placeholder="vardas@pastas.lt" value={email} onChange={e => setEmail(e.target.value)} required /></label>
      <label>Slaptažodis<input name="password" type="password" autoComplete={register ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} required minLength={register ? 6 : undefined} /></label>
      {register && <p className="form-note">Bent 6 simboliai. Supabase gali taikyti papildomus slaptažodžio reikalavimus.</p>}
      {(validation || (showResult && auth.error)) && <p className="auth-error" role="alert">{validation || auth.error}</p>}
      {showResult && auth.message && <p className="auth-message" role="status">{auth.message}</p>}
      <button className="primary auth-action" disabled={auth.busy} type="submit">{auth.busy ? 'Palauk…' : register ? 'Registruotis' : 'Prisijungti'}</button>
    </form>
    <button className="secondary auth-action" disabled={auth.busy} onClick={() => { setMode(register ? 'login' : 'register'); setPassword(''); setValidation(''); setShowResult(false) }}>{register ? 'Jau turi paskyrą? Prisijunk' : 'Neturi paskyros? Registruokis'}</button>
    <div className="divider"><span>arba</span></div><button className="secondary" disabled={auth.busy} onClick={onDemo}>Išbandyti be prisijungimo</button>
    <p className="privacy-note">Paskyros duomenys siunčiami į Supabase.<br />Prisijungus užsakymai saugomi Supabase. Be prisijungimo veikia demonstracija.</p>
  </section>
}
