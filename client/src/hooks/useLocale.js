import { useState, useCallback } from 'react'
import { getLocale, setLocale as persist, t as translate } from '../i18n'

// =============================================================================
// useLocale — React hook for i18n
//
// Returns:
//   locale    {string}            — current locale code ('fr' | 'en')
//   setLocale {function(string)}  — change + persist locale
//   t         {function(string)}  — translate a key in the current locale
//
// Usage:
//   const { t, locale, setLocale } = useLocale()
//   <h1>{t('login.title')}</h1>
// =============================================================================

export function useLocale() {
  const [locale, setLocaleState] = useState(getLocale)

  const setLocale = useCallback((newLocale) => {
    persist(newLocale)
    setLocaleState(newLocale)
  }, [])

  const t = useCallback(
    (key) => translate(key, locale),
    [locale]
  )

  return { locale, setLocale, t }
}
