import ThemeToggle      from '../../components/ui/ThemeToggle'
import LanguageSelector from './LanguageSelector'
import './LoginControls.css'

// Pill flottante bas-droite — regroupe toggle thème + sélecteur langue.
// Spécifique à la page Login.

export default function LoginControls({ locale, onLocaleChange }) {
  return (
    <div className="login-controls">
      <ThemeToggle size={15} />
      <div className="login-controls__divider" aria-hidden="true" />
      <LanguageSelector locale={locale} onChange={onLocaleChange} />
    </div>
  )
}
