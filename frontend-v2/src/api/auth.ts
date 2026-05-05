import client from './client'
import type { User, UserPreferences } from '../types'

export const authApi = {
  login: (email: string, password: string, remember?: boolean) =>
    client.post<{ user: User }>('/api/auth/login', { email, password, remember }),

  loginLdap: (login: string, password: string) =>
    client.post<{ user: User }>('/api/auth/login/ldap', { login, password }),

  logout: () =>
    client.post<{ message: string }>('/api/auth/logout'),

  getMe: () =>
    client.get<{ user: User }>('/api/auth/me'),

  updatePreferences: (data: Partial<UserPreferences>) =>
    client.patch<{ _id: string; locale: string; theme: string; notificationPrefs: Record<string, boolean> }>('/api/auth/preferences', data),
}
