import React, { useMemo, useState } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
import LoginPage from '../pages/LoginPage'
import LoginLdapPage from '../pages/LoginLdapPage'
import AuthGuard from '../components/shared/AuthGuard'
import AuthLayout from '../layouts/AuthLayout'
import AppLayout from '../layouts/AppLayout'
import DashboardPage from '../pages/DashboardPage'
import UsersPage from '../pages/UsersPage'
import NotFoundPage from '../pages/NotFoundPage'
import Navbar from '../components/layout/Navbar'

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

describe('Auth flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  it('LoginPage affiche les champs email et mot de passe', () => {
    renderApp('/login')

    expect(screen.getByRole('heading', { name: /connexion/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/^adresse e-mail$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^mot de passe$/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /se connecter/i })).toBeInTheDocument()
  })

  it('Login succès redirige vers /', async () => {
    const user = userEvent.setup()
    renderApp('/login')

    await user.type(screen.getByLabelText(/^adresse e-mail$/i), 'jean.dupont@example.com')
    await user.type(screen.getByLabelText(/^mot de passe$/i), 'password123')
    await user.click(screen.getByRole('button', { name: /se connecter/i }))

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /mes évaluations en cours/i })).toBeInTheDocument(),
    )
  })

  it.each([
    [401, /e-mail ou mot de passe incorrect/i],
    [429, /trop de tentatives/i],
    [403, /compte est désactivé/i],
  ])('Login échoue avec %s', async (status, message) => {
    server.use(
      http.post('http://localhost:5050/api/auth/login', () =>
        HttpResponse.json({ message: 'error' }, { status }),
      ),
    )

    const user = userEvent.setup()
    renderApp('/login')

    await user.type(screen.getByLabelText(/^adresse e-mail$/i), 'jean.dupont@example.com')
    await user.type(screen.getByLabelText(/^mot de passe$/i), 'wrong-password')
    await user.click(screen.getByRole('button', { name: /se connecter/i }))

    await waitFor(() => expect(screen.getByText(message)).toBeInTheDocument())
  })

  it('LoginLdapPage affiche le champ login et le bouton LDAP', () => {
    vi.stubEnv('VITE_LDAP_ENABLED', 'true')
    renderApp('/login/ldap')

    expect(screen.getByRole('heading', { name: /connexion ldap/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/identifiant ldap/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/adresse e-mail/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /se connecter via ldap/i })).toBeInTheDocument()
  })

  it('LoginLdapPage redirige vers /login si LDAP est désactivé', async () => {
    vi.stubEnv('VITE_LDAP_ENABLED', 'false')
    renderApp('/login/ldap')

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /connexion/i })).toBeInTheDocument(),
    )
    expect(screen.queryByRole('heading', { name: /connexion ldap/i })).not.toBeInTheDocument()
  })

  it('AuthGuard redirige vers /login si non authentifié', async () => {
    render(
      <QueryClientProvider client={createQueryClient()}>
        <MemoryRouter initialEntries={['/private']}>
          <TestAuthShell initialUser={null}>
            <Routes>
              <Route
                path="private"
                element={
                  <AuthGuard>
                    <div>Zone protégée</div>
                  </AuthGuard>
                }
              />
              <Route path="login" element={<div>Connexion</div>} />
            </Routes>
          </TestAuthShell>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    await waitFor(() => expect(screen.getByText(/connexion/i)).toBeInTheDocument())
    expect(screen.queryByText(/zone protégée/i)).not.toBeInTheDocument()
  })

  it('AuthGuard laisse passer si authentifié', () => {
    render(
      <QueryClientProvider client={createQueryClient()}>
        <MemoryRouter initialEntries={['/private']}>
          <TestAuthShell initialUser={makeUser()}>
            <Routes>
              <Route
                path="private"
                element={
                  <AuthGuard>
                    <div>Zone protégée</div>
                  </AuthGuard>
                }
              />
            </Routes>
          </TestAuthShell>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(screen.getByText(/zone protégée/i)).toBeInTheDocument()
  })

  it('AuthGuard redirige vers / si rôle insuffisant', async () => {
    render(
      <QueryClientProvider client={createQueryClient()}>
        <MemoryRouter initialEntries={['/admin']}>
          <TestAuthShell initialUser={makeUser({ role: 'employee' })}>
            <Routes>
              <Route
                path="admin"
                element={
                  <AuthGuard roles={['admin']}>
                    <div>Admin only</div>
                  </AuthGuard>
                }
              />
              <Route path="/" element={<div>Tableau de bord</div>} />
            </Routes>
          </TestAuthShell>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    await waitFor(() => expect(screen.getByText(/tableau de bord/i)).toBeInTheDocument())
    expect(screen.queryByText(/admin only/i)).not.toBeInTheDocument()
  })

  it('Logout appelle POST /api/auth/logout et redirige', async () => {
    let calls = 0
    server.use(
      http.post('http://localhost:5050/api/auth/logout', () => {
        calls += 1
        return HttpResponse.json({ message: 'Logged out' })
      }),
    )

    const user = userEvent.setup()
    render(
      <QueryClientProvider client={createQueryClient()}>
        <MemoryRouter initialEntries={['/']}>
          <TestAuthShell initialUser={makeUser()}>
            <Routes>
              <Route path="/" element={<Navbar />} />
              <Route path="/login" element={<div>Connexion</div>} />
            </Routes>
          </TestAuthShell>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    await user.click(screen.getByText('JD').closest('button')!)
    await user.click(screen.getByRole('menuitem', { name: /se déconnecter/i }))

    await waitFor(() => expect(calls).toBe(1))
    await waitFor(() => expect(screen.getByText(/connexion/i)).toBeInTheDocument())
  })
})
