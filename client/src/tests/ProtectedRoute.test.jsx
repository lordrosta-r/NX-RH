// =============================================================================
// ProtectedRoute.test.jsx — Role-based route guard
// =============================================================================

import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import ProtectedRoute from '../layouts/ProtectedRoute'

// Mock useAuth so we can control the auth state in each test
vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))
import { useAuth } from '../contexts/AuthContext'

// ── Helpers ────────────────────────────────────────────────────────────────────

function renderRoute({ authState, allowedRoles, initialPath = '/protected' }) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<ProtectedRoute allowedRoles={allowedRoles} />}>
          <Route path="/protected" element={<div>protected content</div>} />
        </Route>
        <Route path="/login"        element={<div>login page</div>} />
        <Route path="/unauthorized" element={<div>unauthorized page</div>} />
        <Route path="/employee"     element={<div>employee page</div>} />
      </Routes>
    </MemoryRouter>
  )
}

// ── Tests ──────────────────────────────────────────────────────────────────────
describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders nothing while auth is loading', () => {
    useAuth.mockReturnValue({ user: null, loading: true })
    const { container } = renderRoute({ authState: null, allowedRoles: ['admin'] })
    expect(container.firstChild).toBeNull()
  })

  it('redirects to /login when user is not authenticated', () => {
    useAuth.mockReturnValue({ user: null, loading: false })
    renderRoute({ authState: null, allowedRoles: ['admin'] })
    expect(screen.getByText('login page')).toBeInTheDocument()
  })

  it('renders child route when user has an allowed role', () => {
    useAuth.mockReturnValue({ user: { role: 'admin' }, loading: false })
    renderRoute({ authState: { role: 'admin' }, allowedRoles: ['admin'] })
    expect(screen.getByText('protected content')).toBeInTheDocument()
  })

  it('renders child route when no allowedRoles restriction is set', () => {
    useAuth.mockReturnValue({ user: { role: 'employee' }, loading: false })
    renderRoute({ authState: { role: 'employee' }, allowedRoles: undefined })
    expect(screen.getByText('protected content')).toBeInTheDocument()
  })

  it('redirects to /unauthorized (not /employee) when role does not match', () => {
    useAuth.mockReturnValue({ user: { role: 'employee' }, loading: false })
    renderRoute({ authState: { role: 'employee' }, allowedRoles: ['admin', 'hr'] })
    expect(screen.getByText('unauthorized page')).toBeInTheDocument()
    expect(screen.queryByText('employee page')).not.toBeInTheDocument()
  })

  it('grants access when user has one of several allowed roles', () => {
    useAuth.mockReturnValue({ user: { role: 'hr' }, loading: false })
    renderRoute({ authState: { role: 'hr' }, allowedRoles: ['hr', 'admin'] })
    expect(screen.getByText('protected content')).toBeInTheDocument()
  })
})
