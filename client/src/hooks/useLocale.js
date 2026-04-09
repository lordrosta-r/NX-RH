import { useState, useCallback } from 'react'
import { getLocale, setLocale as persist } from '../i18n'

// =============================================================================
// useLocale — React hook for i18n
//
// Prend le `pageT` de la page courante (chaque page a ses propres traductions).
//
// Usage :
//   import { t as pageT } from './i18n'          ← dans la page
//   const { t, locale, setLocale } = useLocale(pageT)
// =============================================================================

export function useLocale(pageT) {
  const [locale, setLocaleState] = useState(getLocale)

  const setLocale = useCallback((newLocale) => {
    persist(newLocale)
    setLocaleState(newLocale)
  }, [])

  // Re-bind pageT with the current locale on each render
  const t = useCallback(
    (key) => pageT(key, locale),
    [pageT, locale]
  )

  return { locale, setLocale, t }
}
