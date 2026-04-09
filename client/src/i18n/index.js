// =============================================================================
// i18n — Minimal translation engine (no library, no overhead)
//
// Strategy: each page imports its own locale files.
// The current locale is persisted in localStorage.
//
// Usage:
//   const { t, locale, setLocale } = useLocale()   ← inside React
//   t('login.submit')                               → "Sign In" or "Connexion"
// =============================================================================

import fr from './fr'
import en from './en'

const LOCALES = { fr, en }
const STORAGE_KEY = 'nx_locale'
const FALLBACK    = 'fr'

// Supported locale codes
export const SUPPORTED_LOCALES = Object.keys(LOCALES)

/**
 * Translate a key for a given locale.
 * Falls back to French, then to the raw key if nothing is found.
 */
export function t(key, locale = getLocale()) {
  return LOCALES[locale]?.[key]
      ?? LOCALES[FALLBACK]?.[key]
      ?? key
}

/** Read persisted locale from localStorage (defaults to 'fr'). */
export function getLocale() {
  const stored = typeof localStorage !== 'undefined'
    ? localStorage.getItem(STORAGE_KEY)
    : null
  return SUPPORTED_LOCALES.includes(stored) ? stored : FALLBACK
}

/** Persist locale choice. */
export function setLocale(locale) {
  if (!SUPPORTED_LOCALES.includes(locale)) return
  localStorage.setItem(STORAGE_KEY, locale)
}
