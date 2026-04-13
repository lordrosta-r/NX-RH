import { describe, it, expect, beforeEach } from 'vitest'
import { makeT, getLocale, setLocale, FALLBACK, SUPPORTED } from '../../i18n/index.js'

// =============================================================================
// Tests — i18n/index.js  (makeT factory)
// =============================================================================

const fr = {
  'page.title':      'Tableau de bord',
  'page.welcome':    'Bienvenue',
  'page.only_in_fr': 'Uniquement en français',
}

const en = {
  'page.title':   'Dashboard',
  'page.welcome': 'Welcome',
}

describe('makeT factory', () => {
  describe('constants', () => {
    it('FALLBACK is "fr"', () => {
      expect(FALLBACK).toBe('fr')
    })

    it('SUPPORTED contains "fr" and "en"', () => {
      expect(SUPPORTED).toContain('fr')
      expect(SUPPORTED).toContain('en')
    })
  })

  describe('getLocale / setLocale', () => {
    beforeEach(() => localStorage.clear())

    it('returns FALLBACK when no locale stored', () => {
      expect(getLocale()).toBe(FALLBACK)
    })

    it('returns stored locale when valid', () => {
      setLocale('en')
      expect(getLocale()).toBe('en')
    })

    it('ignores unsupported locale values', () => {
      localStorage.setItem('nx_locale', 'de')
      expect(getLocale()).toBe(FALLBACK)
    })

    it('setLocale does nothing for unsupported locale', () => {
      setLocale('zh')
      expect(localStorage.getItem('nx_locale')).toBeNull()
    })
  })

  describe('t() — key lookup', () => {
    const t = makeT({ fr, en })

    it('returns translation for current locale (fr)', () => {
      expect(t('page.title', 'fr')).toBe('Tableau de bord')
    })

    it('returns translation for current locale (en)', () => {
      expect(t('page.title', 'en')).toBe('Dashboard')
    })

    it('falls back to FALLBACK locale for missing key in en', () => {
      // 'page.only_in_fr' missing from en → should fall back to fr
      expect(t('page.only_in_fr', 'en')).toBe('Uniquement en français')
    })

    it('returns the key itself when missing in all locales', () => {
      expect(t('nonexistent.key', 'fr')).toBe('nonexistent.key')
      expect(t('nonexistent.key', 'en')).toBe('nonexistent.key')
    })

    it('uses getLocale() when no locale argument passed', () => {
      setLocale('en')
      expect(t('page.title')).toBe('Dashboard')
      setLocale('fr')
      expect(t('page.title')).toBe('Tableau de bord')
    })
  })

  describe('makeT — edge cases', () => {
    it('handles empty locales object — returns key', () => {
      const t = makeT({})
      expect(t('anything', 'fr')).toBe('anything')
    })

    it('handles single locale without fallback locale', () => {
      const t = makeT({ en: { 'a.key': 'value' } })
      // fr missing → falls back to key
      expect(t('a.key', 'fr')).toBe('a.key')
      // en present
      expect(t('a.key', 'en')).toBe('value')
    })
  })
})
