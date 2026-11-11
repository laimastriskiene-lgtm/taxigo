import { useRef, useState } from 'react'
import { DayPicker } from 'react-day-picker'
import { lt } from 'react-day-picker/locale'
import 'react-day-picker/style.css'
import './App.css'
import AuthForm from './components/AuthForm'
import { useAuth } from './hooks/useAuth'

function Icon({ name, size = 22 }) {
  const paths = { arrow: 'M5 12h14m-6-6 6 6-6 6', car: 'm5 7 2-3h10l2 3 2 2v9h-3v-3H6v3H3V9l2-2Zm0 0h14M7 11h.01M17 11h.01', trips: 'M8 4h8v3H8zM7 5H5v16h14V5h-2M8 12h8M8 16h5', user: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2', pin: 'M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z', calendar: 'M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2Z', clock: 'M12 8v4l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0', check: 'm5 12 4 4L19 6' }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] || paths.arrow} /></svg>
}
const demoTrips = [
  { id: 1, date: 'Lapkričio 10 d. · 18:32', from: 'Vilniaus oro uostas', to: 'Gedimino pr. 12, Vilnius', price: '14,50 €', status: 'Įvykdyta' },
  { id: 2, date: 'Lapkričio 8 d. · 09:15', from: 'Konstitucijos pr. 21, Vilnius', to: 'Vilniaus geležinkelio stotis', price: '8,20 €', status: 'Įvykdyta' },
]
const DEPARTURE_STEP_MS = 5 * 60 * 1000
const DEPARTURE_TIMES = Array.from({ length: 24 * 12 }, (_, index) => {
  const minutes = index * 5
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
})

function toDateValue(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function getMinimumDeparture(now = new Date()) {
  const minimum = new Date(now)
  minimum.setSeconds(0, 0)
  minimum.setMinutes(Math.ceil(minimum.getMinutes() / 5) * 5)
  if (minimum.getTime() < now.getTime()) {
    minimum.setTime(minimum.getTime() + DEPARTURE_STEP_MS)
  }
  const local = new Date(minimum.getTime() - minimum.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

function getDepartureError(value, now = Date.now()) {
  const departure = new Date(value)
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) || !Number.isFinite(departure.getTime()) || departure.getFullYear() !== Number(value.slice(0, 4)) || departure.getMonth() + 1 !== Number(value.slice(5, 7)) || departure.getDate() !== Number(value.slice(8, 10)) || departure.getHours() !== Number(value.slice(11, 13)) || departure.getMinutes() !== Number(value.slice(14, 16))) {
    return 'Pasirink galiojančią išvykimo datą ir laiką.'
  }
  if (departure.getMinutes() % 5 !== 0 || departure.getSeconds() !== 0 || departure.getMilliseconds() !== 0) {
    return 'Pasirink laiką kas 5 minutes: 00, 05, 10, 15 ir t. t.'
  }
  if (departure.getTime() <= now) {
    return 'Išvykimo laikas turi būti ateityje. Pasirink vėlesnį laiką.'
  }
  return ''
}

function normalizePhoneDigits(value) {
  let digits = value.replace(/[^0-9]/g, '')
  while (digits.length > 8 && (digits.startsWith('00370') || digits.startsWith('370'))) {
    digits = digits.slice(digits.startsWith('00370') ? 5 : 3)
  }
  return digits.slice(0, 8)
}

function App() {
  const auth = useAuth()
  const [screen, setScreen] = useState('login')
  const [filter, setFilter] = useState('all')
  const [timing, setTiming] = useState('now')
  const [car, setCar] = useState('standard')
  const [booking, setBooking] = useState(null)
  const [pickupAddress, setPickupAddress] = useState('')
  const [destinationAddress, setDestinationAddress] = useState('')
  const [notice, setNotice] = useState('')
  const [phoneDigits, setPhoneDigits] = useState('')
  const [departureDate, setDepartureDate] = useState('')
  const dateDialog = useRef(null)
  const dateTrigger = useRef(null)
  const [departureTime, setDepartureTime] = useState('')
  const [departureError, setDepartureError] = useState('')
  const [departureNow, setDepartureNow] = useState(() => new Date())
  const minimumDeparture = getMinimumDeparture(departureNow)
  const minimumDate = minimumDeparture.slice(0, 10)
  const minimumTime = departureDate === minimumDate ? minimumDeparture.slice(11, 16) : '00:00'
  function openDateCalendar() {
    refreshDepartureLimits()
    if (!dateDialog.current.open) dateDialog.current.showModal()
  }
  function selectDepartureDate(date) {
    if (!date) return
    const value = toDateValue(date)
    if (value < getMinimumDeparture().slice(0, 10)) return
    setDepartureDate(value)
    setDepartureError('')
    setNotice('')
    dateTrigger.current.form.elements.namedItem('time')?.setCustomValidity('')
    dateDialog.current.close()
  }
  function refreshDepartureLimits() {
    setDepartureNow(new Date())
  }
  function clearDepartureValidity(event) {
    for (const name of ['time']) {
      event.currentTarget.form.elements.namedItem(name)?.setCustomValidity('')
    }
    setDepartureError('')
    setNotice('')
  }
  const navigate = (next) => { setScreen(next); setNotice('') }
  const trips = [...(booking ? [booking] : []), ...demoTrips].filter(t => filter === 'all' || (filter === 'upcoming' ? t.status === 'Suplanuota' : t.status === 'Įvykdyta'))
  function book(event) {
    event.preventDefault()
    const phone = '+370' + phoneDigits
    const phoneInput = event.currentTarget.elements.namedItem('phone')
    phoneInput.setCustomValidity(/^[+]370[0-9]{8}$/.test(phone) ? '' : 'Įvesk 8 telefono numerio skaitmenis po +370.')
    if (!phoneInput.reportValidity()) return
    const departureValue = departureDate && departureTime ? departureDate + 'T' + departureTime : ''
    if (timing === 'later') {
      const error = getDepartureError(departureValue)
      setDepartureError(error)
      refreshDepartureLimits()
      if (error) {
        if (!departureDate) { openDateCalendar(); return }
        const input = event.currentTarget.elements.namedItem('time')
        input.setCustomValidity(error)
        input.reportValidity()
        return
      }
    }
    setBooking({ id: 'demo', phone, departureDate: timing === 'later' ? departureDate : null, departureTime: timing === 'later' ? departureTime : null, date: timing === 'now' ? 'Demonstracinė kelionė · dabar' : departureDate.split('-').reverse().join('.') + ' · ' + departureTime, from: pickupAddress.trim(), to: destinationAddress.trim(), price: car === 'standard' ? '9–12 €' : '13–16 €', status: 'Suplanuota' })
    setNotice('Demonstracinis užsakymas sukurtas. Tikras taksi neiškviestas.')
  }
  const navigation = <nav className="bottom-nav" aria-label="Demonstraciniai ekranai">{[['login','user','Prisijungimas'],['trips','trips','Kelionės'],['booking','car','Užsakymas']].map(([id,icon,label]) => <button key={id} className={screen === id ? 'active' : ''} aria-current={screen === id ? 'page' : undefined} onClick={() => navigate(id)}><Icon name={icon} /><span>{label}</span></button>)}</nav>
  return <div className="app-shell">
    <a className="skip-link" href="#main">Pereiti prie turinio</a>
    <header className="header"><a className="brand" href="#main" onClick={() => navigate('login')} aria-label="TaxiGo pradžia"><span className="brand-symbol"><Icon name="arrow" /></span>Taxi<span>Go</span><span className="brand-period">.</span></a><span className="demo-tag"><i /> Demonstracinė versija</span></header>
    {screen !== 'login' && navigation}
    {screen !== 'login' && (auth.loading || auth.session || auth.error || auth.profileError) && <div className="auth-bar">{auth.loading ? <span role="status">Tikrinamas prisijungimas…</span> : auth.session ? <><span>{auth.profile ? `Labas, ${auth.profile.name}!` : 'Prisijungta'}</span>{!auth.profile && <button className="secondary" onClick={() => navigate('login')}>Užbaigti profilį</button>}<button className="secondary" disabled={auth.busy} onClick={async () => { if (await auth.signOut()) navigate('login') }}>Atsijungti</button></> : null}{auth.error && <p className="auth-error" role="alert">{auth.error}</p>}{auth.profileError && <p className="auth-error" role="alert">{auth.profileError}</p>}</div>}
    <main id="main" className={screen === 'login' ? 'login-layout' : 'content'}>
      {screen === 'login' ? <>
        {navigation}
        <section className="welcome"><span className="eyebrow">MIESTAS LAUKIA TAVĘS</span><h1>Tavo kryptis.<br />Tavo <span>TaxiGo.</span></h1><p>Nuo pirmo paspaudimo iki kelionės tikslo.<br />Judėk per miestą paprasčiau.</p><div className="map-art" aria-hidden="true"><div className="map-street street-a" /><div className="map-street street-b" /><div className="map-street street-c" /><svg viewBox="0 0 400 230"><path d="M75 178V112Q75 95 92 95H285Q305 95 305 75V45" fill="none" stroke="#ffd43b" strokeWidth="5" strokeLinecap="round" /><circle cx="75" cy="178" r="9" fill="#ffd43b" /><circle cx="305" cy="45" r="9" fill="#fff" /></svg><span className="map-car"><Icon name="car" size={28} /></span><span className="map-caption">Kita stotelė — tavo planai.</span></div><div className="welcome-foot"><span>01 / 03</span><span>JUDĖK SAVO RITMU ↗</span></div></section>
        <AuthForm auth={auth} onDemo={() => navigate('trips')} onSuccess={() => navigate('trips')} />
      </> : <>
        <div className="page-heading"><div><span className="eyebrow">{screen === 'trips' ? 'KIEKVIENA KELIONĖ — ISTORIJA' : 'KUR KELIAUSIME ŠIANDIEN?'}</span><h1>{screen === 'trips' ? 'Kelionės' : 'Užsakymas'}<span>.</span></h1><p className="muted">{screen === 'trips' ? 'Visi tavo maršrutai vienoje vietoje.' : 'Pasirink kryptį. Visa kita — paprasta.'}</p></div><span className="heading-icon"><Icon name={screen === 'trips' ? 'trips' : 'car'} size={30} /></span></div>
        {screen === 'trips' ? <><section className="promo"><div><span className="eyebrow">NAUJI PLANAI?</span><h2>Kita kelionė laukia.</h2><p>Mieste visada yra kur nuvažiuoti.</p></div><button className="primary" onClick={() => navigate('booking')}>Užsakyti kelionę <Icon name="arrow" /></button></section><div className="list-heading"><h2>Mano kelionės</h2><span>{trips.length} kelionės</span></div><div className="filters" aria-label="Kelionių filtras">{[['all','Visos'],['upcoming','Būsimos'],['past','Praėjusios']].map(([id, label]) => <button key={id} aria-pressed={filter === id} className={filter === id ? 'selected' : ''} onClick={() => setFilter(id)}>{label}</button>)}</div><div className="trip-list">{trips.length ? trips.map(t => <article className="trip-card" key={t.id}><div className="trip-top"><span><Icon name="clock" size={15} />{t.date}</span><span className={'badge ' + (t.status === 'Suplanuota' ? 'upcoming' : '')}>{t.status}</span></div><div className="route"><p><i />{t.from}</p><p><i />{t.to}</p></div><div className="trip-bottom"><span><Icon name="car" size={18} /> TaxiGo</span><strong>{t.price}</strong></div></article>) : <div className="empty"><Icon name="trips" size={32} /><h3>Kol kas kelionių nėra</h3><p>Suplanuok naują kelionę ir ji atsiras čia.</p><button className="secondary" onClick={() => navigate('booking')}>Užsakyti kelionę <Icon name="arrow" /></button></div>}</div><p className="data-note">Rodomi pavyzdiniai duomenys. Nauji demo užsakymai saugomi tik iki puslapio perkrovimo.</p></> : <form className="booking-layout" onSubmit={book}><section className="panel"><h2><span className="step">01</span> Tavo maršrutas</h2><label>Paėmimo vieta<div className="input-icon"><Icon name="pin" /><input type="text" name="from" value={pickupAddress} onChange={event => { setPickupAddress(event.target.value); setNotice('') }} placeholder="Gatvė, namo numeris, miestas arba gyvenvietė" autoComplete="off" enterKeyHint="next" required pattern=".*\S.*" title="Įvesk paėmimo adresą; vien tarpų nepakanka." /></div></label><label>Kelionės tikslas<div className="input-icon"><Icon name="arrow" /><input type="text" name="to" value={destinationAddress} onChange={event => { setDestinationAddress(event.target.value); setNotice('') }} placeholder="Gatvė, namo numeris, miestas arba gyvenvietė" autoComplete="off" enterKeyHint="next" required pattern=".*\S.*" title="Įvesk kelionės tikslo adresą; vien tarpų nepakanka." /></div></label><h2 className="timing-title"><span className="step">02</span> Išvykimo laikas</h2><div className="timing-switch">{[['now','Kuo greičiau'],['later','Pasirinktu laiku']].map(([id,label]) => <button type="button" key={id} className={timing === id ? 'selected' : ''} aria-pressed={timing === id} onClick={() => {setTiming(id);setNotice('')}}><Icon name={id === 'now' ? 'arrow' : 'clock'} size={18} />{label}</button>)}</div>{timing === 'later' && <><div className="departure-fields"><div className="departure-date-field"><label htmlFor="departure-date">Data</label><button ref={dateTrigger} id="departure-date" type="button" className="date-trigger" aria-haspopup="dialog" aria-controls="departure-calendar" aria-describedby={departureError ? 'departure-error' : undefined} onClick={openDateCalendar}><Icon name="calendar" /><span className={departureDate ? '' : 'date-placeholder'}>{departureDate ? departureDate.split('-').reverse().join('.') : 'DD.MM.YYYY'}</span></button><dialog ref={dateDialog} id="departure-calendar" className="date-dialog" aria-labelledby="departure-calendar-title"><div className="calendar-heading"><h3 id="departure-calendar-title">Pasirink išvykimo datą</h3><button type="button" className="calendar-close" onClick={() => dateDialog.current.close()}>Uždaryti</button></div><DayPicker mode="single" required locale={lt} weekStartsOn={1} autoFocus selected={departureDate ? new Date(`${departureDate}T12:00:00`) : undefined} defaultMonth={new Date(`${departureDate && departureDate >= minimumDate ? departureDate : minimumDate}T12:00:00`)} startMonth={new Date(`${minimumDate}T00:00:00`)} disabled={{ before: new Date(`${minimumDate}T00:00:00`) }} onSelect={selectDepartureDate} labels={{ labelNext: () => 'Kitas mėnuo', labelPrevious: () => 'Ankstesnis mėnuo' }} /></dialog></div><label htmlFor="departure-time">Laikas<div className="input-icon"><Icon name="clock" /><select id="departure-time" name="time" value={departureTime} required onFocus={refreshDepartureLimits} onChange={event => { setDepartureTime(event.target.value); clearDepartureValidity(event) }} onInvalid={event => { event.currentTarget.setCustomValidity('Pasirink išvykimo laiką.'); setDepartureError('Pasirink būsimą laiką kas 5 minutes.') }} aria-describedby={departureError ? 'departure-time-help departure-error' : 'departure-time-help'}><option value="">Pasirink laiką</option>{DEPARTURE_TIMES.map(time => <option key={time} value={time} disabled={time < minimumTime}>{time}</option>)}</select></div></label></div><p id="departure-time-help" className="form-note">Laikas rodomas 24 valandų formatu (HH:mm), kas 5 minutes.</p><div id="departure-error" className="departure-error" role="alert">{departureError}</div></>}<h2 id="phone-step-title" className="booking-step-title"><span className="step">03</span> Telefono numeris</h2><label htmlFor="phone-number" className="phone-step-field"><div className="phone-field"><span id="phone-prefix" className="phone-prefix">+370</span><input id="phone-number" aria-labelledby="phone-step-title" type="tel" inputMode="numeric" name="phone" value={phoneDigits} onChange={event => { setPhoneDigits(normalizePhoneDigits(event.target.value)); event.currentTarget.setCustomValidity(''); setNotice('') }} onInvalid={event => event.currentTarget.setCustomValidity('Įvesk 8 telefono numerio skaitmenis po +370.')} placeholder="60000000" autoComplete="tel-national" required pattern="[0-9]{8}" aria-describedby="phone-prefix phone-help" /></div></label><p id="phone-help" className="form-note">Įvesk 8 skaitmenis. Šalies kodas +370 jau pridėtas.</p><p className="form-note">Demonstracijai įrašyk išgalvotą numerį.</p></section><section className="panel summary"><h2><span className="step">04</span> Keliauk patogiai</h2><div className="car-options">{[['standard','Standartinis','Iki 4 keleivių','9–12 €'],['comfort','Komfortas','Daugiau erdvės · iki 4','13–16 €']].map(([id,title,description,price]) => <label className={'car-option ' + (car === id ? 'chosen' : '')} key={id}><input type="radio" name="car" value={id} checked={car === id} onChange={() => {setCar(id);setNotice('')}} /><Icon name="car" size={30} /><span><strong>{title}</strong><small>{description}</small></span><b>{price}</b></label>)}</div><div className="booking-summary-bottom"><div className="estimate"><h2><span className="step">05</span> Kelionės informacija</h2><dl className="journey-details"><div><dt>Preliminarus atstumas (km)</dt><dd>Bus apskaičiuota</dd></div><div><dt>Preliminari kelionės trukmė (min.)</dt><dd>Bus apskaičiuota</dd></div><div className="journey-price"><dt>Preliminari kaina (€)</dt><dd><strong>{car === 'standard' ? '9–12 €' : '13–16 €'}</strong></dd></div></dl><p>Pavyzdinė kaina dizaino demonstracijai.</p></div><button type="submit" className="primary">Sukurti demo užsakymą <Icon name="arrow" /></button><p className="privacy-note">Tikras taksi nebus iškviestas.</p><div aria-live="polite">{notice && <div className="success"><Icon name="check" /><p>{notice}</p><button type="button" onClick={() => {setFilter('upcoming');navigate('trips')}}>Peržiūrėti kelionę →</button></div>}</div></div></section></form>}
      </>}
    </main>
    <footer className="footer"><span>TaxiGo © 2026</span><span>Tavo miestas. Tavo ritmas.</span></footer>

  </div>
}
export default App











