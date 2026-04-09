import ThemeToggle    from '../ui/ThemeToggle'
import LanguageSelector from './LanguageSelector'
import './LoginControls.css'

// =============================================================================
// LoginControls — Groups the Theme toggle and Language selector into one pill.
// Replaces the standalone LanguageSelector on the login page.
// =============================================================================

export default function LoginControls({ locale, onLocaleChange }) {
  return (
    <div className="login-controls">
      <ThemeToggle size={15} />
      <div className="login-controls__divider" aria-hidden="true" />
      <LanguageSelector locale={locale} onChange={onLocaleChange} />
    </div>
  )
}
