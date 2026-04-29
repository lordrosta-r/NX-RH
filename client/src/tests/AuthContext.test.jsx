// =============================================================================
// AuthContext.test.jsx — Tests for the global auth context
// =============================================================================

import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AuthProvider, useAuth } from '../contexts/AuthContext'

// ── Test consumer ──────────────────────────────────────────────────────────────
function TestConsumer() {
  const { user, loading, error } = useAuth()
  if (loading) return <div data-testid="state">loading</div>
  if (error)   return <div data-testid="state">error:{error}</div>
  return <div data-testid="state">{user ? `user:${user.role}` : 'no-user'}</div>
}

function LogoutConsumer() {
  const { user, loading, logout } = useAuth()
  if (loading) return <div data-testid="state">loading</div>
  return (
    <>
      <div data-testid="state">{user ? `user:${user.role}` : 'no-user'}</div>
      <button onClick={logout}>logout</button>
    </>
  )
}

function renderWithAuth(ui) {
  return render(<AuthProvider>{ui}</AuthProvider>)
}

// ── Tests ──────────────────────────────────────────────────────────────────────
describe('AuthContext', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('starts in loading state before fetch resolves', () => {
    global.fetch = vi.fn(() => new Promise(() => {})) // never resolves
    renderWithAuth(<TestConsumer />)
    expect(screen.getByTestId('state').textContent).toBe('loading')
  })

  it('exposes user data after a successful /api/auth/me response', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ _id: '1', role: 'admin', firstName: 'Alice', lastName: 'A' }),
    })

    renderWithAuth(<TestConsumer />)

    await waitFor(() =>
      expect(screen.getByTestId('state').textContent).toBe('user:admin')
    )
  })

  it('sets user to null on 401 (unauthenticated)', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
    })

    renderWithAuth(<TestConsumer />)

    await waitFor(() =>
      expect(screen.getByTestId('state').textContent).toBe('no-user')
    )
  })

  it('sets user to null on 403 (forbidden)', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 403,
    })

    renderWithAuth(<TestConsumer />)

    await waitFor(() =>
      expect(screen.getByTestId('state').textContent).toBe('no-user')
    )
  })

  it('logout calls POST /api/auth/logout and redirects to /login', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ _id: '2', role: 'hr', firstName: 'Bob', lastName: 'B' }),
      })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({}) })

    renderWithAuth(<LogoutConsumer />)

    await waitFor(() =>
      expect(screen.getByTestId('state').textContent).toBe('user:hr')
    )

    await act(async () => {
      screen.getByRole('button', { name: 'logout' }).click()
    })

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/auth/logout',
      expect.objectContaining({ method: 'POST' })
    )
    expect(window.location.href).toBe('/login')
  })

  it('throws if useAuth is called outside <AuthProvider>', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<TestConsumer />)).toThrow()
    spy.mockRestore()
  })
})
