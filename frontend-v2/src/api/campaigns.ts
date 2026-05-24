import client from './client'
import type { Campaign, PaginatedResponse, PaginationParams, CampaignAnalytics, ItemResponse } from '../types'

export interface CampaignFilters extends PaginationParams {
  status?: string
  q?: string
}

export const campaignsApi = {
  getCampaigns: (params?: CampaignFilters) =>
    client.get<PaginatedResponse<Campaign>>('/api/campaigns', { params }),

  getCampaign: (id: string) =>
    client.get<ItemResponse<Campaign>>(`/api/campaigns/${id}`),

  createCampaign: (data: Partial<Campaign>) =>
    client.post<ItemResponse<Campaign>>('/api/campaigns', data),

  updateCampaign: (id: string, data: Partial<Campaign>) =>
    client.patch<ItemResponse<Campaign>>(`/api/campaigns/${id}`, data),

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

  linkForm: (campaignId: string, formId: string) =>
    client.post(`/api/campaigns/${campaignId}/forms`, { formId }),

  unlinkForm: (campaignId: string, formId: string) =>
    client.delete(`/api/campaigns/${campaignId}/forms/${formId}`),
}
