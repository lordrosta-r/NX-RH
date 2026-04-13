import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTheme } from '../../hooks/useTheme.js'

// =============================================================================
// Tests — hooks/useTheme.js
// =============================================================================

const STORAGE_KEY = 'nx_theme'
const THEMES = ['dark', 'light', 'light-sidebar']

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

  it('sets data-theme attribute on <html> on mount', () => {
    const { result } = renderHook(() => useTheme())
    expect(document.documentElement.getAttribute('data-theme')).toBe(result.current.theme)
  })

  describe('cycleTheme', () => {
    it('cycles dark → light → light-sidebar → dark', () => {
      const { result } = renderHook(() => useTheme())

      // Start: dark
      expect(result.current.theme).toBe('dark')

      act(() => result.current.cycleTheme())
      expect(result.current.theme).toBe('light')

      act(() => result.current.cycleTheme())
      expect(result.current.theme).toBe('light-sidebar')

      act(() => result.current.cycleTheme())
      expect(result.current.theme).toBe('dark')
    })

    it('updates data-theme on <html> after each cycle', () => {
      const { result } = renderHook(() => useTheme())

      act(() => result.current.cycleTheme())
      expect(document.documentElement.getAttribute('data-theme')).toBe('light')

      act(() => result.current.cycleTheme())
      expect(document.documentElement.getAttribute('data-theme')).toBe('light-sidebar')
    })

    it('persists theme to localStorage after cycle', () => {
      const { result } = renderHook(() => useTheme())

      act(() => result.current.cycleTheme())
      expect(localStorage.getItem(STORAGE_KEY)).toBe('light')
    })
  })

  describe('toggleTheme alias', () => {
    it('toggleTheme is an alias for cycleTheme', () => {
      const { result } = renderHook(() => useTheme())
      act(() => result.current.toggleTheme())
      expect(result.current.theme).toBe('light')
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

    it('isDark is false when theme is "light-sidebar"', () => {
      localStorage.setItem(STORAGE_KEY, 'light-sidebar')
      const { result } = renderHook(() => useTheme())
      expect(result.current.isDark).toBe(false)
    })
  })
})
