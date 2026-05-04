import client from './client'
import type { AnalyticsSummary, CampaignAnalytics } from '../types'

export const analyticsApi = {
  getSummary: () =>
    client.get<AnalyticsSummary>('/api/analytics/summary'),

  getCampaignAnalytics: (campaignId: string) =>
    client.get<CampaignAnalytics>(`/api/analytics/campaigns/${campaignId}`),

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
