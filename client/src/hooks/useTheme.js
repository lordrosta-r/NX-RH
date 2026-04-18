import { useState, useEffect } from 'react'

// =============================================================================
// useTheme — React hook for 3-state theme cycle
//
// Writes `data-theme="dark|light|light-sidebar"` on <html>.
// Persists choice in localStorage.
//
// Cycle order: dark → light → light-sidebar → dark
//
// Returns:
//   theme       {string}   — 'dark' | 'light' | 'light-sidebar'
//   cycleTheme  {function} — advance to next theme
//   isDark      {boolean}  — shorthand for theme === 'dark'
// =============================================================================

const STORAGE_KEY   = 'nx_theme'
const DEFAULT_THEME = 'dark'
export const THEMES = ['dark', 'light', 'light-sidebar']

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

  const cycleTheme = () =>
    setThemeState(current => {
      const idx = THEMES.indexOf(current)
      return THEMES[(idx + 1) % THEMES.length]
    })

  // Sélection directe d'un thème (utilisé par /settings).
  const setTheme = (name) => {
    if (THEMES.includes(name)) setThemeState(name)
  }

  // Keep toggleTheme as alias for backward compat (login page)
  const toggleTheme = cycleTheme

  return { theme, setTheme, cycleTheme, toggleTheme, isDark: theme === 'dark' }
}
