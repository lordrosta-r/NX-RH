import { useThemeCtx }         from '../../contexts/ThemeContext'
import { Sun, Moon } from 'lucide-react'


// =============================================================================
// ThemeToggle — Sun / Moon icon button
// Utilise ThemeContext (source de vérité globale) pour rester synchronisé
// avec l'état de thème de toute l'app (topbar, pages, login).
//
// Props:
//   size        {number} — icon size in px (default 16)
//   labelLight  {string} — aria-label when in light mode (action = switch to dark)
//   labelDark   {string} — aria-label when in dark mode (action = switch to light)
// =============================================================================

export default function ThemeToggle({
  size       = 16,
  labelLight = 'Switch to dark mode',
  labelDark  = 'Switch to light mode',
}) {
  const { isDark, toggleTheme } = useThemeCtx()
  const label = isDark ? labelDark : labelLight

  return (
    <button
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      type="button"
    >
      {isDark
        ? <Sun  size={size} />
        : <Moon size={size} />
      }
    </button>
  )
}

