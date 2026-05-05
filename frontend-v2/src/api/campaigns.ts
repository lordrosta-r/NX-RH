import client from './client'
import type { Campaign, PaginatedResponse, PaginationParams, CampaignAnalytics } from '../types'

export interface CampaignFilters extends PaginationParams {
  status?: string
  q?: string
}

export const campaignsApi = {
  getCampaigns: (params?: CampaignFilters) =>
    client.get<PaginatedResponse<Campaign>>('/api/campaigns', { params }),

  getCampaign: (id: string) =>
    client.get<Campaign>(`/api/campaigns/${id}`),

  createCampaign: (data: Partial<Campaign>) =>
    client.post<Campaign>('/api/campaigns', data),

  updateCampaign: (id: string, data: Partial<Campaign>) =>
    client.put<Campaign>(`/api/campaigns/${id}`, data),

  deleteCampaign: (id: string) =>
    client.delete(`/api/campaigns/${id}`),

  cloneCampaign: (id: string) =>
    client.post<Campaign>(`/api/campaigns/${id}/clone`),

  activateCampaign: (id: string) =>
    client.post(`/api/campaigns/${id}/activate`),

  closeCampaign: (id: string) =>
    client.post(`/api/campaigns/${id}/close`),

  archiveCampaign: (id: string) =>
    client.post(`/api/campaigns/${id}/archive`),

  updateCampaignStatus: (id: string, status: string) =>
    client.patch<Campaign>(`/api/campaigns/${id}/status`, { status }),

  getCampaignAnalytics: (id: string) =>
    client.get<CampaignAnalytics>(`/api/campaigns/${id}/analytics`),

  bulkRemind: (id: string, data?: { targetStatuses?: string[] }) =>
    client.post(`/api/campaigns/${id}/bulk-remind`, data),
}
