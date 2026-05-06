import client from './client'
import type { Notification, PaginatedResponse, PaginationParams } from '../types'

export const notificationsApi = {
  getNotifications: (params?: PaginationParams & { unreadOnly?: boolean }) =>
    client.get<PaginatedResponse<Notification>>('/api/notifications', { params }),

  getNotificationCount: () =>
    client.get<{ unreadCount: number }>('/api/notifications', { params: { limit: 1 } })
      .then(r => ({ data: { count: r.data.unreadCount } })),

  markRead: (id: string) =>
    client.patch(`/api/notifications/${id}/read`),

  markAllRead: () =>
    client.post('/api/notifications/read-all'),

  globalRemind: (data: { campaignId?: string; targetStatuses?: string[] }) =>
    client.post('/api/notifications/remind', data),
}
