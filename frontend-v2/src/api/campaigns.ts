import client from './client'
import type { Campaign, PaginatedResponse, PaginationParams, CampaignAnalytics, ItemResponse, MyFormRequest } from '../types'

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

  // ── Collecte des formulaires des managers ──────────────────────────────────
  // RH : demander à des managers de soumettre un formulaire (campagne draft).
  requestForms: (campaignId: string, managerIds: string[]) =>
    client.post(`/api/campaigns/${campaignId}/form-requests`, { managerIds }),

  // RH : annuler une demande.
  cancelFormRequest: (campaignId: string, managerId: string) =>
    client.delete(`/api/campaigns/${campaignId}/form-requests/${managerId}`),

  // Manager : attacher un de ses formulaires à la demande qui le cible.
  submitFormRequest: (campaignId: string, formId: string) =>
    client.post(`/api/campaigns/${campaignId}/form-requests/submit`, { formId }),

  // RH : accepter/refuser un formulaire soumis (au lancement).
  decideFormRequest: (
    campaignId: string,
    managerId: string,
    decision: 'accepted' | 'declined',
  ) =>
    client.patch(
      `/api/campaigns/${campaignId}/form-requests/${managerId}/decision`,
      { decision },
    ),

  // Manager : demandes de formulaire qui le ciblent.
  getMyFormRequests: () =>
    client.get<{ data: MyFormRequest[] }>('/api/campaigns/mine/form-requests'),
}
