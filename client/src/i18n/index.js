// =============================================================================
// i18n Engine — makeT factory
//
// Ce fichier contient UNIQUEMENT l'infrastructure.
// Les données de traduction vivent dans chaque page :
//   client/src/pages/<page>/i18n/fr.js
//   client/src/pages/<page>/i18n/en.js
//   client/src/pages/<page>/i18n/index.js  → export const t = makeT({ fr, en })
//
// Usage dans une page :
//   import { t as pageT } from './i18n'
//   const { t, locale, setLocale } = useLocale(pageT)
// =============================================================================

const STORAGE_KEY       = 'nx_locale'
export const FALLBACK   = 'fr'
export const SUPPORTED  = ['fr', 'en']

/** Read persisted locale from localStorage. */
export function getLocale() {
  const stored = typeof localStorage !== 'undefined'
    ? localStorage.getItem(STORAGE_KEY)
    : null
  return SUPPORTED.includes(stored) ? stored : FALLBACK
}

/** Persist locale choice. */
export function setLocale(locale) {
  if (!SUPPORTED.includes(locale)) return
  localStorage.setItem(STORAGE_KEY, locale)
}

/**
 * Factory — creates a page-scoped t() function.
 * @param {{ [locale: string]: { [key: string]: string } }} locales
 * @returns {function(key: string, locale?: string): string}
 */
export function makeT(locales) {
  return function t(key, locale = getLocale()) {
    return locales[locale]?.[key]
        ?? locales[FALLBACK]?.[key]
        ?? key
  }
}
