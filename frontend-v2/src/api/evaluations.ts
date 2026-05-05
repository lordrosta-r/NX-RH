import client from './client'
import type { Evaluation, PaginatedResponse, PaginationParams } from '../types'

export interface EvaluationFilters extends PaginationParams {
  campaignId?: string
  status?: string
  evaluateeId?: string
  evaluatorId?: string
  q?: string
  year?: string
}

export const evaluationsApi = {
  getEvaluations: (params?: EvaluationFilters) =>
    client.get<PaginatedResponse<Evaluation>>('/api/evaluations', { params }),

  getMyEvaluations: (params?: EvaluationFilters) =>
    client.get<PaginatedResponse<Evaluation>>('/api/evaluations/me', { params }),

  getEvaluation: (id: string) =>
    client.get<Evaluation>(`/api/evaluations/${id}`),

  updateEvaluation: (id: string, data: Partial<Evaluation>) =>
    client.patch<Evaluation>(`/api/evaluations/${id}`, data),

  submitEvaluation: (id: string) =>
    client.post<Evaluation>(`/api/evaluations/${id}/submit`),

  signEvaluation: (id: string) =>
    client.post<Evaluation>(`/api/evaluations/${id}/sign`),

  validateEvaluation: (id: string) =>
    client.post<Evaluation>(`/api/evaluations/${id}/validate`),

  getEvaluationPdf: (id: string) =>
    client.get(`/api/evaluations/${id}/pdf`, { responseType: 'blob' }),

  createBulk: (data: { campaignId: string; pairs: Array<{ evaluateeId: string; evaluatorId: string }> }) =>
    client.post('/api/evaluations/bulk', data),
}
