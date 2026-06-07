import client from './client'
import type { Form, PaginatedResponse, PaginationParams, ImportResult } from '../types'

export const formsApi = {
  getForms: (params?: PaginationParams) =>
    client.get<PaginatedResponse<Form>>('/api/forms', { params }),

  getForm: (id: string) =>
    client.get<Form>(`/api/forms/${id}`),

  createForm: (data: Partial<Form>) =>
    client.post<Form>('/api/forms', data),

  updateForm: (id: string, data: Partial<Form>) =>
    client.put<Form>(`/api/forms/${id}`, data),

  deleteForm: (id: string) =>
    client.delete(`/api/forms/${id}`),

  cloneForm: (id: string) =>
    client.post<Form>(`/api/forms/${id}/clone`),

  freezeForm: (id: string) =>
    client.post<Form>(`/api/forms/${id}/freeze`),

  unfreezeForm: (id: string) =>
    client.post<Form>(`/api/forms/${id}/unfreeze`),

  exportForm: (id: string) =>
    client.get(`/api/forms/${id}/export`, { responseType: 'blob' }),

  importForm: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return client.post<ImportResult>('/api/admin/forms/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}
