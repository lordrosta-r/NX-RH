import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLocale } from '../../hooks/useLocale.js'

// =============================================================================
// Tests — hooks/useLocale.js
// =============================================================================

const frTranslations = { 'a.key': 'Bonjour', 'b.key': 'Monde' }
const enTranslations = { 'a.key': 'Hello',   'b.key': 'World' }

// Minimal pageT factory mimicking makeT behaviour
function makePageT(locales) {
  return (key, locale = 'fr') => locales[locale]?.[key] ?? locales['fr']?.[key] ?? key
}

describe('useLocale', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns locale, setLocale, and t', () => {
    const pageT = makePageT({ fr: frTranslations, en: enTranslations })
    const { result } = renderHook(() => useLocale(pageT))
    expect(result.current).toHaveProperty('locale')
    expect(result.current).toHaveProperty('setLocale')
    expect(result.current).toHaveProperty('t')
  })

  it('initial locale comes from localStorage (defaults to fr)', () => {
    const pageT = makePageT({ fr: frTranslations, en: enTranslations })
    const { result } = renderHook(() => useLocale(pageT))
    expect(result.current.locale).toBe('fr')
  })

  it('initial locale reads from stored localStorage value', () => {
    localStorage.setItem('nx_locale', 'en')
    const pageT = makePageT({ fr: frTranslations, en: enTranslations })
    const { result } = renderHook(() => useLocale(pageT))
    expect(result.current.locale).toBe('en')
  })

  it('t() calls pageT with current locale', () => {
    const pageT = makePageT({ fr: frTranslations, en: enTranslations })
    const { result } = renderHook(() => useLocale(pageT))
    expect(result.current.t('a.key')).toBe('Bonjour')
  })

  it('setLocale changes locale and t() reflects new locale', () => {
    const pageT = makePageT({ fr: frTranslations, en: enTranslations })
    const { result } = renderHook(() => useLocale(pageT))

    act(() => result.current.setLocale('en'))

    expect(result.current.locale).toBe('en')
    expect(result.current.t('a.key')).toBe('Hello')
  })

  it('setLocale persists to localStorage', () => {
    const pageT = makePageT({ fr: frTranslations, en: enTranslations })
    const { result } = renderHook(() => useLocale(pageT))

    act(() => result.current.setLocale('en'))

    expect(localStorage.getItem('nx_locale')).toBe('en')
  })

  it('t() re-binds when locale changes', () => {
    const pageT = makePageT({ fr: frTranslations, en: enTranslations })
    const { result } = renderHook(() => useLocale(pageT))

    act(() => result.current.setLocale('en'))
    expect(result.current.t('b.key')).toBe('World')

    act(() => result.current.setLocale('fr'))
    expect(result.current.t('b.key')).toBe('Monde')
  })
})
