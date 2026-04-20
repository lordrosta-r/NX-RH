// ============================================================
// ThemeContext.jsx — Global theme context
// Replaces the duplicated hooks/useTheme.js pattern.
// Persists theme in localStorage, applies data-theme attribute.
// ============================================================

import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const ThemeContext = createContext(null)

// ── Constants ───────────────────────────────────────────────
const STORAGE_KEY   = 'nx_theme'
const DEFAULT_THEME = 'dark'
export const THEMES = ['dark', 'light', 'light-sidebar']

// ── Provider ────────────────────────────────────────────────
export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return THEMES.includes(stored) ? stored : DEFAULT_THEME
    } catch {
      return DEFAULT_THEME
    }
  })

  // Sync data-theme attribute & localStorage on every change
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try { localStorage.setItem(STORAGE_KEY, theme) } catch {}
  }, [theme])

  const cycleTheme = useCallback(() => {
    setThemeState(current => {
      const idx = THEMES.indexOf(current)
      return THEMES[(idx + 1) % THEMES.length]
    })
  }, [])

  const setTheme = useCallback((name) => {
    if (THEMES.includes(name)) setThemeState(name)
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, cycleTheme, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  )
}

// ── Hook ────────────────────────────────────────────────────
export function useThemeCtx() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useThemeCtx() must be used inside <ThemeProvider>')
  return ctx
}
