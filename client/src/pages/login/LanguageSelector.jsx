import { useState, useEffect, useRef } from 'react'
import { Globe } from 'lucide-react'
import './LanguageSelector.css'

// Composant spécifique à la page Login — vit dans son dossier.
// Props: locale {string}, onChange {function}, labelFr {string}, labelEn {string}

export default function LanguageSelector({ locale = 'fr', onChange, labelFr, labelEn, labelSelectLanguage = '' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const LOCALES = [
    { value: 'fr', label: labelFr || 'FR' },
    { value: 'en', label: labelEn || 'EN' },
  ]
  const current = LOCALES.find(l => l.value === locale) || LOCALES[0]

  // Ferme le menu si on clique ailleurs
  useEffect(() => {
    if (!open) return
    function onOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [open])

  return (
    <div className="lang-selector" ref={ref}>
      <button
        type="button"
        className="lang-selector__btn"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={labelSelectLanguage}
      >
        <Globe size={14} color="var(--th-controls-icon)" />
        <span className="lang-selector__current">{current.label}</span>
      </button>
      {open && (
        <ul className="lang-selector__menu" role="listbox" aria-label={labelSelectLanguage}>
          {LOCALES.map(({ value, label }) => (
            <li key={value} role="option" aria-selected={locale === value}>
              <button
                type="button"
                className={`lang-selector__opt${locale === value ? ' lang-selector__opt--active' : ''}`}
                onClick={() => { onChange?.(value); setOpen(false) }}
              >
                {label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

