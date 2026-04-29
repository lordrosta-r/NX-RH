// =============================================================================
// useTheme — standalone hook for theme management (dark / light only)
//
// KISS: deux thèmes uniquement. Toggles dark ↔ light.
// Syncs with <html data-theme> and localStorage('nx_theme').
//
// NOTE: ThemeToggle.jsx utilise useThemeCtx() (ThemeContext) pour rester
// synchronisé avec l'état global de l'app. Ce hook reste disponible pour
// tout code qui ne peut pas accéder au contexte React.
//
// Returns:
//   theme       {string}   — 'dark' | 'light'
//   toggleTheme {function} — switch dark ↔ light
//   setTheme    {function} — set theme directly ('dark' | 'light')
//   isDark      {boolean}  — shorthand for theme === 'dark'
// =============================================================================

const STORAGE_KEY   = 'nx_theme'
const DEFAULT_THEME = 'dark'
export const THEMES = ['dark', 'light']

import { useState, useEffect } from 'react'

export function useTheme() {
  const [theme, setThemeState] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return THEMES.includes(stored) ? stored : DEFAULT_THEME
    } catch {
      return DEFAULT_THEME
    }
  })

  // Apply to <html> whenever theme changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try { localStorage.setItem(STORAGE_KEY, theme) } catch { /* private browsing */ }
  }, [theme])

  const toggleTheme = () => setThemeState(t => t === 'dark' ? 'light' : 'dark')

  const setTheme = (name) => {
    if (THEMES.includes(name)) setThemeState(name)
  }

  // cycleTheme kept as alias for backward compat
  const cycleTheme = toggleTheme

  return { theme, setTheme, cycleTheme, toggleTheme, isDark: theme === 'dark' }
}
