import client from './client'
import type { PaginatedResponse, PaginationParams } from '../types'

export interface OffboardingRecord {
  id: string
  userId: string
  userName?: string
  userAvatarUrl?: string
  department?: string
  managerId?: string
  managerName?: string
  reason: 'resignation' | 'termination' | 'retirement' | 'other'
  lastDay: string
  status: 'pending' | 'in_progress' | 'completed'
  checklist: Array<{
    label: string
    done: boolean
    doneAt?: string
    doneBy?: string
  }>
  notes?: string
  createdBy?: string
  createdAt: string
  updatedAt?: string
}

export interface OffboardingFilters extends PaginationParams {
  status?: string
  reason?: string
  q?: string
}

export const offboardingApi = {
  getOffboardings: (params?: OffboardingFilters) =>
    client.get<PaginatedResponse<OffboardingRecord>>('/api/offboarding', { params }),

  getOffboarding: (id: string) =>
    client.get<OffboardingRecord>(`/api/offboarding/${id}`),

  createOffboarding: (data: Partial<OffboardingRecord>) =>
    client.post<OffboardingRecord>('/api/offboarding', data),

  updateOffboarding: (id: string, data: Partial<OffboardingRecord>) =>
    client.put<OffboardingRecord>(`/api/offboarding/${id}`, data),

  toggleChecklistItem: (id: string, index: number) =>
    client.patch<OffboardingRecord>(`/api/offboarding/${id}/checklist/${index}`),

  updateNotes: (id: string, notes: string) =>
    client.patch(`/api/offboarding/${id}/notes`, { notes }),

  changeStatus: (id: string, status: string) =>
    client.patch(`/api/offboarding/${id}/status`, { status }),

  deleteOffboarding: (id: string) =>
    client.delete(`/api/offboarding/${id}`),
}
