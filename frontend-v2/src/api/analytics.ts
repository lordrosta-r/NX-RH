import client from './client'
import type { AnalyticsSummary, CampaignAnalytics, Campaign, PaginatedResponse } from '../types'

export const analyticsApi = {
  getSummary: () =>
    client.get<AnalyticsSummary>('/api/analytics/summary'),

  getCampaignAnalytics: (campaignId: string) =>
    client.get<CampaignAnalytics>(`/api/analytics/campaigns/${campaignId}`),

  getCampaigns: () =>
    client.get<PaginatedResponse<Campaign>>('/api/campaigns', { params: { limit: 100 } }),

  exportCsv: (campaignId?: string) =>
    client.get('/api/analytics/export/csv', {
      params: campaignId ? { campaignId } : undefined,
      responseType: 'blob',
    }),

  exportPdf: (campaignId?: string) =>
    client.get('/api/analytics/export/pdf', {
      params: campaignId ? { campaignId } : undefined,
      responseType: 'blob',
    }),
}
