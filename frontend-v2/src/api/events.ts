import client from './client'
import type { CalendarEvent, PaginatedResponse, PaginationParams } from '../types'

// L'API /api/events renvoie des docs Mongo `.lean()` → seulement `_id`, pas le
// virtual `id`. On normalise ici pour que tous les consommateurs (EventsPage,
// EventDetailPage) lisent `ev.id` (sinon clic → navigation vers /events/undefined).
const withId = (e: CalendarEvent): CalendarEvent => ({ ...e, id: e.id ?? e._id ?? '' })

export const eventsApi = {
  getEvents: (params?: PaginationParams & { from?: string; to?: string; type?: string }) =>
    client
      .get<PaginatedResponse<CalendarEvent>>('/api/events', { params })
      .then((r) => ({
        ...r,
        data: { ...r.data, data: (r.data.data ?? []).map(withId) },
      })),

  getEvent: (id: string) =>
    client
      .get<CalendarEvent>(`/api/events/${id}`)
      .then((r) => ({ ...r, data: withId(r.data) })),

  createEvent: (data: Partial<CalendarEvent>) =>
    client.post<CalendarEvent>('/api/events', data),

  updateEvent: (id: string, data: Partial<CalendarEvent>) =>
    client.put<CalendarEvent>(`/api/events/${id}`, data),

  deleteEvent: (id: string) =>
    client.delete(`/api/events/${id}`),

  // RSVP : l'utilisateur répond à un événement (accepter / décliner / incertain).
  respond: (id: string, status: 'accepted' | 'declined' | 'tentative') =>
    client
      .post<CalendarEvent>(`/api/events/${id}/respond`, { status })
      .then((r) => ({ ...r, data: withId(r.data) })),
}
