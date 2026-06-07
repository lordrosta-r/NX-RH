import React from 'react'
import { vi } from 'vitest'
import { render, type RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '../contexts/AuthContext'
import type { User } from '../types'

// Mock user factory — adapts to actual User type (id + authSource required)
export const makeUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-1',
  _id: 'user-1',
  firstName: 'Jean',
  lastName: 'Dupont',
  email: 'jean.dupont@example.com',
  role: 'employee',
  department: 'RH',
  isActive: true,
  authSource: 'local',
  ...overrides,
})

const mockAuthContextValue = {
  user: makeUser(),
  isAuthenticated: true,
  isLoading: false,
  login: vi.fn().mockResolvedValue(undefined),
  loginLdap: vi.fn().mockResolvedValue(undefined),
  logout: vi.fn().mockResolvedValue(undefined),
  refreshUser: vi.fn().mockResolvedValue(undefined),
}

let currentAuthValue = { ...mockAuthContextValue }

export function setMockUser(user: Partial<User>) {
  currentAuthValue = { ...mockAuthContextValue, user: makeUser(user) }
}

export function setUnauthenticated() {
  currentAuthValue = {
    ...mockAuthContextValue,
    user: null as unknown as User,
    isAuthenticated: false,
  }
}

interface WrapperProps {
  initialEntries?: string[]
  user?: Partial<User>
}

function createWrapper({ initialEntries = ['/'], user }: WrapperProps = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })

  return function Wrapper({ children }: { children: React.ReactNode }) {
    const authValue = user
      ? { ...mockAuthContextValue, user: makeUser(user) }
      : currentAuthValue
    return (
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={authValue}>
          <MemoryRouter initialEntries={initialEntries}>
            {children}
          </MemoryRouter>
        </AuthContext.Provider>
      </QueryClientProvider>
    )
  }
}

export function renderWithProviders(
  ui: React.ReactElement,
  options: WrapperProps & Omit<RenderOptions, 'wrapper'> = {}
) {
  const { initialEntries, user, ...renderOptions } = options
  return render(ui, {
    wrapper: createWrapper({ initialEntries, user }),
    ...renderOptions,
  })
}
