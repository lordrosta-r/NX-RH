import { useTheme }          from '../../hooks/useTheme'
import { SunIcon, MoonIcon } from './icons'
import './ThemeToggle.css'

// =============================================================================
// ThemeToggle — Sun / Moon icon button
// Reads & writes theme via useTheme hook (sets data-theme on <html>).
//
// Props:
//   size  {number} — icon size in px (default 16)
// =============================================================================

export default function ThemeToggle({ size = 16 }) {
  const { isDark, toggleTheme, theme } = useTheme()

  return (
    <button
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
      title={isDark ? 'Mode clair' : 'Mode sombre'}
      type="button"
    >
      {isDark
        ? <SunIcon  size={size} />
        : <MoonIcon size={size} />
      }
    </button>
  )
}
