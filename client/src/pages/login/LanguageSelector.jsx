import { GlobeIcon } from '../../components/ui/icons'
import './LanguageSelector.css'

// Composant spécifique à la page Login — vit dans son dossier.
// Props: locale {string}, onChange {function}, labelFr {string}, labelEn {string}

export default function LanguageSelector({ locale = 'fr', onChange, labelFr, labelEn, labelSelectLanguage = 'Sélectionner la langue' }) {
  const LOCALES = [
    { value: 'fr', label: labelFr || 'Français' },
    { value: 'en', label: labelEn || 'English'  },
  ]
  return (
    <div className="lang-selector">
      <GlobeIcon size={14} color="var(--th-controls-icon)" />
      <select
        value={locale}
        onChange={e => onChange?.(e.target.value)}
        className="lang-selector__select"
        aria-label={labelSelectLanguage}
      >
        {LOCALES.map(({ value, label }) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>
    </div>
  )
}
