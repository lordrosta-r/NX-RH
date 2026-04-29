// =============================================================================
// AppTopbar.test.jsx — Topbar component (dropdowns, theme, locale, logout)
// =============================================================================

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import AppTopbar from '../components/ui/AppTopbar'

// AppTopbar uses NavLink/useLocation — must be rendered inside a Router
function renderTopbar(props = {}) {
  const defaults = {
    locale:      'fr',
    setLocale:   vi.fn(),
    theme:       'dark',
    cycleTheme:  vi.fn(),
    notifItems:  [],
    user:        { firstName: 'Alice', lastName: 'Martin', role: 'admin' },
    onLogout:    vi.fn(),
    badges:      {},
  }
  return render(
    <MemoryRouter>
      <AppTopbar {...defaults} {...props} />
    </MemoryRouter>
  )
}

// ── Tests ──────────────────────────────────────────────────────────────────────
describe('AppTopbar', () => {
  describe('user identity', () => {
    it('renders user initials derived from firstName and lastName', () => {
      renderTopbar({ user: { firstName: 'Jean', lastName: 'Dupont', role: 'hr' } })
      expect(screen.getByText('JD')).toBeInTheDocument()
    })

    it('falls back to RH when user is undefined', () => {
      renderTopbar({ user: undefined })
      expect(screen.getByText('RH')).toBeInTheDocument()
    })
  })

  describe('user dropdown', () => {
    it('user dropdown is closed by default', () => {
      renderTopbar()
      expect(screen.queryByText('Se déconnecter')).not.toBeInTheDocument()
    })

    it('opens user dropdown when avatar button is clicked', () => {
      renderTopbar()
      fireEvent.click(screen.getByLabelText('Menu utilisateur'))
      expect(screen.getByText('Se déconnecter')).toBeInTheDocument()
    })

    it('shows full name and role inside the dropdown', () => {
      renderTopbar({ user: { firstName: 'Alice', lastName: 'Martin', role: 'admin' } })
      fireEvent.click(screen.getByLabelText('Menu utilisateur'))
      expect(screen.getByText('Alice Martin')).toBeInTheDocument()
      expect(screen.getByText('admin')).toBeInTheDocument()
    })

    it('calls onLogout when logout button is clicked', () => {
      const onLogout = vi.fn()
      renderTopbar({ onLogout })
      fireEvent.click(screen.getByLabelText('Menu utilisateur'))
      fireEvent.click(screen.getByText('Se déconnecter'))
      expect(onLogout).toHaveBeenCalledTimes(1)
    })

    it('closes user dropdown after logout click', () => {
      renderTopbar()
      fireEvent.click(screen.getByLabelText('Menu utilisateur'))
      fireEvent.click(screen.getByText('Se déconnecter'))
      expect(screen.queryByText('Se déconnecter')).not.toBeInTheDocument()
    })
  })

  describe('notifications', () => {
    it('notification dropdown is closed by default', () => {
      renderTopbar()
      expect(screen.queryByText('NOTIFICATIONS')).not.toBeInTheDocument()
    })

    it('opens notifications dropdown on bell click', () => {
      renderTopbar({ notifItems: [{ id: '1', color: 'red', text: 'New eval', meta: '2 min ago' }] })
      fireEvent.click(screen.getByLabelText('Notifications'))
      expect(screen.getByText('NOTIFICATIONS')).toBeInTheDocument()
      expect(screen.getByText('New eval')).toBeInTheDocument()
    })

    it('shows notification count badge when items are present', () => {
      const items = [
        { id: '1', color: 'red',  text: 'Eval A', meta: '1h' },
        { id: '2', color: 'blue', text: 'Eval B', meta: '2h' },
      ]
      renderTopbar({ notifItems: items })
      fireEvent.click(screen.getByLabelText('Notifications'))
      expect(screen.getByText('2')).toBeInTheDocument()
    })
  })

  describe('theme toggle', () => {
    it('calls cycleTheme when theme button is clicked', () => {
      const cycleTheme = vi.fn()
      renderTopbar({ cycleTheme, theme: 'light' })
      fireEvent.click(screen.getByLabelText('Mode sombre'))
      expect(cycleTheme).toHaveBeenCalledTimes(1)
    })

    it('shows light mode label in dark theme', () => {
      renderTopbar({ theme: 'dark' })
      expect(screen.getByLabelText('Mode clair')).toBeInTheDocument()
    })
  })

  describe('locale toggle', () => {
    it('calls setLocale with "en" when current locale is "fr"', () => {
      const setLocale = vi.fn()
      renderTopbar({ locale: 'fr', setLocale })
      fireEvent.click(screen.getByLabelText('Switch to English'))
      expect(setLocale).toHaveBeenCalledWith('en')
    })

    it('calls setLocale with "fr" when current locale is "en"', () => {
      const setLocale = vi.fn()
      renderTopbar({ locale: 'en', setLocale })
      fireEvent.click(screen.getByLabelText('Passer en français'))
      expect(setLocale).toHaveBeenCalledWith('fr')
    })

    it('hides language toggle when setLocale prop is not provided', () => {
      renderTopbar({ setLocale: undefined })
      expect(screen.queryByLabelText('Switch to English')).not.toBeInTheDocument()
    })
  })
})
