import { GlobeIcon } from '../ui/icons'
import './LanguageSelector.css'

// =============================================================================
// LanguageSelector — inline (used inside LoginControls pill)
// Uses SVG GlobeIcon instead of Material Symbols font.
//
// Props:
//   locale   {string}            — current locale ('fr' | 'en')
//   onChange {function(string)}  — called on selection change
// =============================================================================

const LOCALES = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'English'  },
]

export default function LanguageSelector({ locale = 'fr', onChange }) {
  return (
    <div className="lang-selector">
      <GlobeIcon size={14} color="var(--th-controls-icon, rgba(255,255,255,0.5))" />
      <select
        value={locale}
        onChange={e => onChange?.(e.target.value)}
        className="lang-selector__select"
        aria-label="Select language"
      >
        {LOCALES.map(({ value, label }) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>
    </div>
  )
}
