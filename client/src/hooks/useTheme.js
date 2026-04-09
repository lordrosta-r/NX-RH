import { useState, useEffect } from 'react'

// =============================================================================
// useTheme — React hook for dark/light mode
//
// Writes `data-theme="dark|light"` on <html> so all CSS variables respond.
// Persists choice in localStorage.
//
// Returns:
//   theme       {string}   — 'dark' | 'light'
//   toggleTheme {function} — flip between the two
//   isDark      {boolean}  — shorthand
// =============================================================================

const STORAGE_KEY  = 'nx_theme'
const DEFAULT_THEME = 'dark'   // Login page defaults to cinematic dark

export function useTheme() {
  const [theme, setThemeState] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'light' || stored === 'dark' ? stored : DEFAULT_THEME
  })

  // Apply to <html> whenever theme changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  const toggleTheme = () =>
    setThemeState(current => current === 'dark' ? 'light' : 'dark')

  return { theme, toggleTheme, isDark: theme === 'dark' }
}
