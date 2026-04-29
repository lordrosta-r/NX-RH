import { useCallback } from 'react'
import { useLocaleCtx } from '../contexts/LocaleContext'

// =============================================================================
// useLocale — React hook for i18n
//
// Prend le `pageT` de la page courante (chaque page a ses propres traductions).
// Délègue à LocaleContext pour que le changement de langue dans la topbar
// propage correctement à toutes les pages.
//
// Usage :
//   import { t as pageT } from './i18n'          ← dans la page
//   const { t, locale, setLocale } = useLocale(pageT)
// =============================================================================

export function useLocale(pageT) {
  const { locale, setLocale } = useLocaleCtx()
  const t = useCallback((key) => pageT(key, locale), [pageT, locale])
  return { locale, setLocale, t }
}
