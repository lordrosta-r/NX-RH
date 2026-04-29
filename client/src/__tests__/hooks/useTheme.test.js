import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTheme } from '../../hooks/useTheme.js'

// =============================================================================
// Tests — hooks/useTheme.js (2-theme: dark / light)
// =============================================================================

const STORAGE_KEY = 'nx_theme'

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
  })

  it('defaults to "dark" when no stored value', () => {
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('dark')
  })

  it('reads initial theme from localStorage', () => {
    localStorage.setItem(STORAGE_KEY, 'light')
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('light')
  })

  it('ignores invalid stored theme and defaults to "dark"', () => {
    localStorage.setItem(STORAGE_KEY, 'invalid-theme')
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('dark')
  })

  it('ignores legacy "light-sidebar" and defaults to "dark"', () => {
    localStorage.setItem(STORAGE_KEY, 'light-sidebar')
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('dark')
  })

  it('sets data-theme attribute on <html> on mount', () => {
    const { result } = renderHook(() => useTheme())
    expect(document.documentElement.getAttribute('data-theme')).toBe(result.current.theme)
  })

  describe('toggleTheme', () => {
    it('toggles dark → light → dark', () => {
      const { result } = renderHook(() => useTheme())
      expect(result.current.theme).toBe('dark')

      act(() => result.current.toggleTheme())
      expect(result.current.theme).toBe('light')

      act(() => result.current.toggleTheme())
      expect(result.current.theme).toBe('dark')
    })

    it('updates data-theme on <html> after toggle', () => {
      const { result } = renderHook(() => useTheme())

      act(() => result.current.toggleTheme())
      expect(document.documentElement.getAttribute('data-theme')).toBe('light')

      act(() => result.current.toggleTheme())
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    })

    it('persists theme to localStorage after toggle', () => {
      const { result } = renderHook(() => useTheme())

      act(() => result.current.toggleTheme())
      expect(localStorage.getItem(STORAGE_KEY)).toBe('light')
    })
  })

  describe('cycleTheme alias', () => {
    it('cycleTheme is an alias for toggleTheme', () => {
      const { result } = renderHook(() => useTheme())
      act(() => result.current.cycleTheme())
      expect(result.current.theme).toBe('light')
    })
  })

  describe('setTheme', () => {
    it('sets theme directly to "light"', () => {
      const { result } = renderHook(() => useTheme())
      act(() => result.current.setTheme('light'))
      expect(result.current.theme).toBe('light')
    })

    it('ignores unknown values', () => {
      const { result } = renderHook(() => useTheme())
      act(() => result.current.setTheme('light-sidebar'))
      expect(result.current.theme).toBe('dark')
    })
  })

  describe('isDark shorthand', () => {
    it('isDark is true when theme is "dark"', () => {
      const { result } = renderHook(() => useTheme())
      expect(result.current.isDark).toBe(true)
    })

    it('isDark is false when theme is "light"', () => {
      localStorage.setItem(STORAGE_KEY, 'light')
      const { result } = renderHook(() => useTheme())
      expect(result.current.isDark).toBe(false)
    })
  })
})
