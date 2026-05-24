import client from './client'
import type { User, PaginatedResponse, PaginationParams, ImportResult, ItemResponse } from '../types'

export interface UserFilters extends PaginationParams {
  q?: string
  role?: string
  isActive?: boolean
  department?: string
  sectorId?: string
  managerId?: string
}

export const usersApi = {
  getUsers: (params?: UserFilters) =>
    client.get<PaginatedResponse<User>>('/api/users', { params }),

  getUser: (id: string) =>
    client.get<ItemResponse<User>>(`/api/users/${id}`),

  createUser: (data: Partial<User>) =>
    client.post<ItemResponse<User>>('/api/users', data),

  updateUser: (id: string, data: Partial<User>) =>
    client.patch<ItemResponse<User>>(`/api/users/${id}`, data),

  deleteUser: (id: string) =>
    client.delete(`/api/users/${id}`),

  importUsers: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return client.post<ImportResult>('/api/users/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  gdprExport: (id: string) =>
    client.get(`/api/users/${id}/gdpr-export`, { responseType: 'blob' }),

  anonymize: (id: string) =>
    client.post(`/api/users/${id}/anonymize`),

  offboard: (id: string, data?: { reason?: string; lastDay?: string }) =>
    client.post(`/api/users/${id}/offboarding`, data),

  updateAvatar: (id: string, avatar: string) =>
    client.patch(`/api/users/${id}/avatar`, { avatar }),

  updateOnboardingStep: (id: string, step: number) =>
    client.patch(`/api/users/${id}/onboarding/${step}`),

  completeOnboarding: (id: string) =>
    client.patch(`/api/users/${id}/onboarding/complete`),

  exportGdpr: (id: string) =>
    client.get(`/api/users/${id}/gdpr-export`, { responseType: 'blob' }),

  bulkAction: (data: { action: string; userIds: string[]; payload?: unknown }) =>
    client.post('/api/users/bulk', data),
}
