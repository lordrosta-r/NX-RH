import client from './client'
import type { Sector, OrgTreeNode, PaginatedResponse } from '../types'

export const orgApi = {
  getOrgTree: (params?: { view?: 'team' | 'teams' | 'all'; managerId?: string }) =>
    client.get<OrgTreeNode[]>('/api/org/tree', { params }),

  getSectors: () =>
    client.get<Sector[]>('/api/org/sectors'),

  createSector: (data: Partial<Sector>) =>
    client.post<Sector>('/api/org/sectors', data),

  updateSector: (id: string, data: Partial<Sector>) =>
    client.put<Sector>(`/api/org/sectors/${id}`, data),

  deleteSector: (id: string) =>
    client.delete(`/api/org/sectors/${id}`),

  getUsersInSector: (sectorId: string) =>
    client.get<PaginatedResponse<import('../types').User>>(`/api/org/sectors/${sectorId}/users`),
}
