import client from './client'
import type { User, PaginatedResponse, PaginationParams, ImportResult } from '../types'

export interface UserFilters extends PaginationParams {
  role?: string
  isActive?: boolean
  department?: string
  sectorId?: string
}

export const usersApi = {
  getUsers: (params?: UserFilters) =>
    client.get<PaginatedResponse<User>>('/api/users', { params }),

  getUser: (id: string) =>
    client.get<User>(`/api/users/${id}`),

  createUser: (data: Partial<User>) =>
    client.post<User>('/api/users', data),

  updateUser: (id: string, data: Partial<User>) =>
    client.put<User>(`/api/users/${id}`, data),

  deleteUser: (id: string) =>
    client.delete(`/api/users/${id}`),

  importUsers: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return client.post<ImportResult>('/api/admin/users/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  gdprExport: (id: string) =>
    client.get(`/api/users/${id}/gdpr`, { responseType: 'blob' }),

  offboard: (id: string, data?: { reason?: string; lastDay?: string }) =>
    client.post(`/api/users/${id}/offboarding`, data),
}
