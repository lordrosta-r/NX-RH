import client from './client'
import type { Resource, PaginatedResponse, PaginationParams } from '../types'

export const resourcesApi = {
  getResources: (params?: PaginationParams & { category?: string; publishedOnly?: boolean }) =>
    client.get<PaginatedResponse<Resource>>('/api/resources', { params }),

  getResource: (id: string) =>
    client.get<Resource>(`/api/resources/${id}`),

  createResource: (data: Partial<Resource>) =>
    client.post<Resource>('/api/resources', data),

  updateResource: (id: string, data: Partial<Resource>) =>
    client.put<Resource>(`/api/resources/${id}`, data),

  publishResource: (id: string) =>
    client.post<Resource>(`/api/resources/${id}/publish`),

  unpublishResource: (id: string) =>
    client.post<Resource>(`/api/resources/${id}/unpublish`),

  deleteResource: (id: string) =>
    client.delete(`/api/resources/${id}`),
}
