import React, { useMemo, useState } from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, screen, waitFor, render } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import {
  MemoryRouter,
  Route,
  Routes,
  useNavigate,
} from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthContext } from '../contexts/AuthContext'
import { authApi } from '../api/auth'
import { server } from './msw/server'
import { makeUser } from './utils'
import Navbar from '../components/layout/Navbar'
import AuthGuard from '../components/shared/AuthGuard'
import AuthLayout from '../layouts/AuthLayout'
import AppLayout from '../layouts/AppLayout'
import LoginPage from '../pages/LoginPage'
import LoginLdapPage from '../pages/LoginLdapPage'
import DashboardPage from '../pages/DashboardPage'
import UsersPage from '../pages/UsersPage'
import NotFoundPage from '../pages/NotFoundPage'

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })
}

function TestAuthShell({
  initialUser,
  children,
}: {
  initialUser: ReturnType<typeof makeUser> | null
  children: React.ReactNode
}) {
  const navigate = useNavigate()
  const [user, setUser] = useState(initialUser)

  const authValue = useMemo(
    () => ({
      user,
      isLoading: false,
      isAuthenticated: !!user,
      login: async (email: string, password: string, remember?: boolean) => {
        const { data } = await authApi.login(email, password, remember)
        setUser(data.data.user)
      },
      loginLdap: async (login: string, password: string) => {
        const { data } = await authApi.loginLdap(login, password)
        setUser(data.user)
      },
      logout: async () => {
        await authApi.logout()
        setUser(null)
        navigate('/login', { replace: true })
      },
      refreshUser: async () => {},
    }),
    [navigate, user],
  )

  return <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>
}

function AppRoutes() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="login" element={<LoginPage />} />
        <Route path="login/ldap" element={<LoginLdapPage />} />
      </Route>
      <Route
        element={
          <AuthGuard>
            <AppLayout />
          </AuthGuard>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="users" element={<UsersPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

function renderApp(initialPath: string, initialUser: ReturnType<typeof makeUser> | null = null) {
  const queryClient = createQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <TestAuthShell initialUser={initialUser}>
          <AppRoutes />
        </TestAuthShell>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function renderNavbar(initialUser: ReturnType<typeof makeUser>, initialPath = '/') {
  const queryClient = createQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <TestAuthShell initialUser={initialUser}>
          <Routes>
            <Route path="/" element={<Navbar />} />
            <Route path="/login" element={<div>Connexion</div>} />
          </Routes>
        </TestAuthShell>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('Navbar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('affiche le logo NX RH', () => {
    renderNavbar(makeUser({ role: 'employee' }))

    expect(screen.getByRole('link', { name: /nanoxplore rh/i })).toBeInTheDocument()
  })

  it.each([
    ['admin', [/collaborateurs/i, /campagnes/i, /évaluations/i, /pilotage/i, /administration/i]],
    ['employee', [/mes évaluations/i, /pilotage/i]],
    ['hr', [/collaborateurs/i, /campagnes/i, /évaluations/i, /pilotage/i, /paramètres/i]],
  ] as const)('affiche les bons liens pour %s', (role, labels) => {
    renderNavbar(makeUser({ role }))

    labels.forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument()
    })
  })

  it('affiche la zone notifications même sans compteur', async () => {
    server.use(
      http.get('http://localhost:5050/api/notifications/count', () =>
        HttpResponse.json({ count: 0 }),
      ),
    )

    renderNavbar(makeUser({ role: 'employee' }))

    expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument()
  })

  it('polling GET /api/notifications toutes les 30s', async () => {
    vi.useFakeTimers()
    let calls = 0

    server.use(
      http.get('http://localhost:5050/api/notifications', () => {
        calls += 1
        return HttpResponse.json({ data: [], total: 0, page: 1, limit: 1, unreadCount: calls })
      }),
    )

    renderNavbar(makeUser({ role: 'employee' }))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
    })
    expect(calls).toBe(1)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000)
    })
    expect(calls).toBe(2)
  })
})

describe('Navigation routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  it.each([
    ['admin', /tableau de bord/i],
    ['employee', /mes évaluations en cours/i],
    ['hr', /tableau de bord rh/i],
  ] as const)('route / affiche le dashboard pour %s', async (role, heading) => {
    renderApp('/', makeUser({ role }))

    await waitFor(() => expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument())
  })

  it('route /login est accessible sans auth', () => {
    renderApp('/login', null)

    expect(screen.getByRole('heading', { name: /connexion/i })).toBeInTheDocument()
  })

  it('route /users est accessible pour admin', async () => {
    renderApp('/users', makeUser({ role: 'admin' }))

    await waitFor(() => expect(screen.getByRole('heading', { name: /collaborateurs/i })).toBeInTheDocument())
  })

  it('route /users redirige vers /login si non authentifié', async () => {
    renderApp('/users', null)

    await waitFor(() => expect(screen.getByRole('heading', { name: /connexion/i })).toBeInTheDocument())
    expect(screen.queryByRole('heading', { name: /collaborateurs/i })).not.toBeInTheDocument()
  })

  it('route inconnue affiche 404', () => {
    renderApp('/route-inconnue', makeUser())

    expect(screen.getByText('404')).toBeInTheDocument()
    expect(screen.getByText(/page introuvable/i)).toBeInTheDocument()
  })
})
