import client from './client'
import type { HrFlag, PaginatedResponse, PaginationParams } from '../types'

export interface HrFlagFilters extends PaginationParams {
  status?: string
  type?: string
}

export const hrApi = {
  getFlags: (params?: HrFlagFilters) =>
    client.get<PaginatedResponse<HrFlag>>('/api/hr/flags', { params }),

  getFlagsCount: () =>
    client.get<{ count: number }>('/api/hr/flags/count'),

  getFlag: (id: string) =>
    client.get<HrFlag>(`/api/hr/flags/${id}`),

  updateFlagStatus: (id: string, status: string, note?: string) =>
    client.patch<HrFlag>(`/api/hr/flags/${id}/status`, { status, note }),
}
