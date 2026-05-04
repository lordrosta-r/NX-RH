import client from './client'
import type { CalendarEvent, PaginatedResponse, PaginationParams } from '../types'

export const eventsApi = {
  getEvents: (params?: PaginationParams & { from?: string; to?: string; type?: string }) =>
    client.get<PaginatedResponse<CalendarEvent>>('/api/events', { params }),

  getEvent: (id: string) =>
    client.get<CalendarEvent>(`/api/events/${id}`),

  createEvent: (data: Partial<CalendarEvent>) =>
    client.post<CalendarEvent>('/api/events', data),

  updateEvent: (id: string, data: Partial<CalendarEvent>) =>
    client.put<CalendarEvent>(`/api/events/${id}`, data),

  deleteEvent: (id: string) =>
    client.delete(`/api/events/${id}`),
}
