import { useTheme }          from '../../hooks/useTheme'
import { SunIcon, MoonIcon } from './icons'
import './ThemeToggle.css'

// =============================================================================
// ThemeToggle — Sun / Moon icon button
// Reads & writes theme via useTheme hook (sets data-theme on <html>).
//
// Props:
//   size        {number} — icon size in px (default 16)
//   labelLight  {string} — aria-label/title when in light mode (action = switch to dark)
//   labelDark   {string} — aria-label/title when in dark mode (action = switch to light)
// =============================================================================

export default function ThemeToggle({
  size       = 16,
  labelLight = 'Switch to dark mode',
  labelDark  = 'Switch to light mode',
}) {
  const { isDark, setTheme } = useTheme()
  const label = isDark ? labelDark : labelLight

  return (
    <button
      className="theme-toggle"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={label}
      title={label}
      type="button"
    >
      {isDark
        ? <SunIcon  size={size} />
        : <MoonIcon size={size} />
      }
    </button>
  )
}
