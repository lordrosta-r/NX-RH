import client from './client'
import type { User, UserPreferences } from '../types'

export const authApi = {
  login: (email: string, password: string) =>
    client.post<{ user: User }>('/api/auth/login', { email, password }),

  loginLdap: (login: string, password: string) =>
    client.post<{ user: User }>('/api/auth/login/ldap', { login, password }),

  logout: () =>
    client.post('/api/auth/logout'),

  getMe: () =>
    client.get<{ user: User }>('/api/auth/me'),

  updatePreferences: (data: Partial<UserPreferences>) =>
    client.patch('/api/auth/preferences', data),
}
