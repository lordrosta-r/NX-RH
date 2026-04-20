// =============================================================================
// LocaleContext — Global locale state for the SPA
//
// Provides the current locale ('fr' | 'en') and a setter that persists to
// localStorage, updates React state, and syncs <html lang="…">.
//
// Hooks:
//   useLocaleCtx()      → { locale, setLocale }
//   useTranslate(pageT) → t(key) bound to current locale
// =============================================================================

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from 'react'
import { getLocale, setLocale as persistLocale } from '../i18n'

// === Context ================================================================

const LocaleContext = createContext(null)

// === Provider ===============================================================

export function LocaleProvider({ children }) {
  const [locale, setLocaleState] = useState(getLocale)

  // Keep <html lang="…"> in sync
  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const setLocale = useCallback((newLocale) => {
    persistLocale(newLocale)
    setLocaleState(newLocale)
  }, [])

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      {children}
    </LocaleContext.Provider>
  )
}

// === Hooks ==================================================================

/** Access { locale, setLocale } — must be inside <LocaleProvider>. */
export function useLocaleCtx() {
  const ctx = useContext(LocaleContext)
  if (!ctx) {
    throw new Error('useLocaleCtx must be used within a <LocaleProvider>')
  }
  return ctx
}

/** Bind a page-level t(key, locale) to the current global locale. */
export function useTranslate(pageT) {
  const { locale } = useLocaleCtx()
  return useCallback((key) => pageT(key, locale), [pageT, locale])
}
