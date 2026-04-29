// ============================================================
// ThemeContext.jsx — Global theme context (KISS: dark / light)
// ============================================================

import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const ThemeContext = createContext(null)

const STORAGE_KEY   = 'nx_theme'
const DEFAULT_THEME = 'dark'
export const THEMES = ['dark', 'light']

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return THEMES.includes(stored) ? stored : DEFAULT_THEME
    } catch {
      return DEFAULT_THEME
    }
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    // Sync inline background set by theme-init.js (anti-flash).
    // Without this, the page background keeps the old color until a hard refresh.
    document.documentElement.style.background = theme === 'light' ? '#fcf9f8' : '#111010'
    try { localStorage.setItem(STORAGE_KEY, theme) } catch {}
  }, [theme])

  const toggleTheme = useCallback(() => {
    setThemeState(t => t === 'dark' ? 'light' : 'dark')
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useThemeCtx() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useThemeCtx() must be used inside <ThemeProvider>')
  return ctx
}
