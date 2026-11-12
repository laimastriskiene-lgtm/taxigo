import { useEffect, useRef, useState } from 'react'
import { useAddressAutocomplete } from '../hooks/useAddressAutocomplete'
import { getAddressError } from '../lib/addressValidation'

export default function AddressAutocomplete({ id, name, label, value, selection, error = '', onChange, icon }) {
  const [query, setQuery] = useState(null)
  const [touched, setTouched] = useState(false)
  const input = useRef(null)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const list = useRef(null)
  const searching = open && query === value
  const search = useAddressAutocomplete(query, searching)
  const listId = id + '-suggestions'
  const helpId = id + '-help'
  const errorId = id + '-error'
  const validationError = error || (touched ? getAddressError(value, selection) : '')
  const expanded = searching && search.results.length > 0
  const activeOption = expanded && activeIndex >= 0 && activeIndex < search.results.length
    ? listId + '-' + activeIndex : undefined

  useEffect(() => {
    if (activeOption) list.current?.querySelector('[id="' + activeOption + '"]')?.scrollIntoView({ block: 'nearest' })
  }, [activeOption])

  useEffect(() => {
    input.current?.setCustomValidity(validationError)
  }, [validationError])

  function choose(result) {
    input.current?.setCustomValidity('')
    onChange(result.address, result)
    setTouched(true)
    setQuery(null)
    setOpen(false)
    setActiveIndex(-1)
  }

  function handleKeyDown(event) {
    if (event.nativeEvent.isComposing) return
    if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && search.results.length) {
      event.preventDefault()
      setOpen(true)
      const direction = event.key === 'ArrowDown' ? 1 : -1
      setActiveIndex(previous => previous < 0
        ? (direction > 0 ? 0 : search.results.length - 1)
        : (previous + direction + search.results.length) % search.results.length)
    } else if (event.key === 'Enter' && activeOption) {
      event.preventDefault()
      choose(search.results[activeIndex])
    } else if (event.key === 'Escape') {
      if (open) event.preventDefault()
      setOpen(false)
      setActiveIndex(-1)
    } else if (event.key === 'Enter') {
      // With no highlighted suggestion, Enter retains the normal form behavior.
      setOpen(false)
    }
  }

  return <div className="address-autocomplete" onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setTouched(true)
      setOpen(false)
      setActiveIndex(-1)
    }
  }}>
    <label htmlFor={id}>{label}</label>
    <div className="input-icon">
      {icon}
      <input
        ref={input} id={id} name={name} type="text" value={value}
        onChange={event => {
          const next = event.target.value
          event.currentTarget.setCustomValidity('')
          onChange(next, null)
          setQuery(next)
          setOpen(true)
          setActiveIndex(-1)
        }}
        onInvalid={event => {
          setTouched(true)
          event.currentTarget.setCustomValidity(getAddressError(value, selection))
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Gatvė ir namo numeris, gyvenvietė arba konkreti vieta"
        autoComplete="off" enterKeyHint="next" required pattern=".*\S.*"
        title="Įveskite adresą; vien tarpų nepakanka."
        role="combobox" aria-autocomplete="list" aria-expanded={expanded}
        aria-controls={listId} aria-activedescendant={activeOption}
        aria-describedby={validationError ? helpId + ' ' + errorId : helpId} aria-invalid={Boolean(validationError)} aria-busy={search.status === 'loading'}
      />
      {expanded && <ul id={listId} ref={list} className="address-suggestions" role="listbox" aria-label={label + ': Lietuvos adresai'}>
        {search.results.map((result, index) => <li key={result.address} role="presentation">
          <button
            id={listId + '-' + index} type="button" role="option" tabIndex={-1}
            className="address-option" aria-selected={index === activeIndex}
            onMouseDown={event => event.preventDefault()}
            onClick={() => choose(result)}
          >
            <span className="address-option-title">{result.title}</span>
            {result.details && <span className="address-option-details">{result.details}</span>}
            {getAddressError(result.address, result) && <span className="address-option-details">Reikia patikslinti iki pastato arba konkrečios vietos</span>}
          </button>
        </li>)}
      </ul>}
    </div>
    <p id={helpId} className="address-help" role="status" aria-live="polite">
      {searching && search.message ? search.message : 'Nurodykite gatvę, namo numerį ir gyvenvietę arba konkrečią vietą, pvz., Vilniaus autobusų stotį. Galite įvesti rankiniu būdu.'}
    </p>
    {validationError && <p id={errorId} className="auth-error" role="alert">{label}: {validationError}</p>}
  </div>
}
