import { http, HttpResponse } from 'msw'
import type { User } from '../../types'

// --- DATA FIXTURES ---
export const mockUser: User = {
  id: 'user-1',
  _id: 'user-1',
  firstName: 'Jean',
  lastName: 'Dupont',
  email: 'jean.dupont@example.com',
  role: 'employee',
  department: 'RH',
  isActive: true,
  authSource: 'local',
}

export const mockManager: User = {
  ...mockUser,
  id: 'user-2',
  _id: 'user-2',
  role: 'manager',
  firstName: 'Marie',
  lastName: 'Martin',
  email: 'marie.martin@example.com',
}

export const mockAdmin: User = {
  ...mockUser,
  id: 'user-3',
  _id: 'user-3',
  role: 'admin',
  firstName: 'Admin',
  lastName: 'NX',
  email: 'admin@example.com',
}

export const mockCampaign = {
  _id: 'camp-1',
  title: 'Évaluation annuelle 2025',
  status: 'active' as const,
  startDate: '2025-01-01',
  endDate: '2025-03-31',
  formId: 'form-1',
  createdAt: '2024-12-01T00:00:00Z',
}

export const mockEvaluation = {
  _id: 'eval-1',
  campaignId: 'camp-1',
  evaluateeId: 'user-1',
  evaluatorId: 'user-2',
  status: 'assigned' as const,
  answers: [],
  createdAt: '2025-01-10T00:00:00Z',
}

export const mockNotification = {
  _id: 'notif-1',
  type: 'eval_assigned',
  message: 'Une évaluation vous a été assignée',
  read: false,
  createdAt: new Date().toISOString(),
}

// --- HANDLERS ---
export const handlers = [
  // Auth
  http.post('http://localhost:5050/api/auth/login', () =>
    HttpResponse.json({ user: mockUser })),
  http.post('http://localhost:5050/api/auth/login/ldap', () =>
    HttpResponse.json({ user: mockUser })),
  http.post('http://localhost:5050/api/auth/logout', () =>
    HttpResponse.json({ message: 'Logged out' })),
  http.get('http://localhost:5050/api/auth/me', () =>
    HttpResponse.json({ user: mockUser })),
  http.patch('http://localhost:5050/api/auth/preferences', () =>
    HttpResponse.json({ locale: 'fr', theme: 'light', notificationPrefs: {} })),

  // Users
  http.get('http://localhost:5050/api/users', () =>
    HttpResponse.json({ data: [mockUser, mockManager], total: 2, page: 1, limit: 20 })),
  http.get('http://localhost:5050/api/users/me', () =>
    HttpResponse.json(mockUser)),
  http.get('http://localhost:5050/api/users/:id', ({ params }) =>
    HttpResponse.json({ ...mockUser, _id: params.id as string, id: params.id as string })),
  http.put('http://localhost:5050/api/users/:id', async ({ request, params }) => {
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json({ ...mockUser, _id: params.id as string, id: params.id as string, ...body })
  }),
  http.patch('http://localhost:5050/api/users/:id/avatar', () =>
    HttpResponse.json({ ...mockUser, avatarUrl: 'data:image/png;base64,abc' })),
  http.patch('http://localhost:5050/api/users/:id/onboarding/:step', () =>
    HttpResponse.json({ success: true })),
  http.patch('http://localhost:5050/api/users/:id/onboarding/complete', () =>
    HttpResponse.json({ success: true })),
  http.get('http://localhost:5050/api/users/:id/gdpr-export', () =>
    new HttpResponse(new Blob(['{}'], { type: 'application/json' }), { headers: { 'Content-Type': 'application/json' } })),
  http.post('http://localhost:5050/api/admin/users/:id/anonymize', () =>
    HttpResponse.json({ success: true })),

  // Campaigns
  http.get('http://localhost:5050/api/campaigns', () =>
    HttpResponse.json({ data: [mockCampaign], total: 1, page: 1, limit: 20 })),
  http.get('http://localhost:5050/api/campaigns/:id', ({ params }) =>
    HttpResponse.json({ ...mockCampaign, _id: params.id as string })),
  http.post('http://localhost:5050/api/campaigns', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json({ ...mockCampaign, ...body, _id: 'camp-new' })
  }),
  http.put('http://localhost:5050/api/campaigns/:id', async ({ request, params }) => {
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json({ ...mockCampaign, _id: params.id as string, ...body })
  }),
  http.post('http://localhost:5050/api/campaigns/:id/activate', ({ params }) =>
    HttpResponse.json({ ...mockCampaign, _id: params.id as string, status: 'active' })),
  http.post('http://localhost:5050/api/campaigns/:id/close', ({ params }) =>
    HttpResponse.json({ ...mockCampaign, _id: params.id as string, status: 'closed' })),
  http.post('http://localhost:5050/api/campaigns/:id/archive', ({ params }) =>
    HttpResponse.json({ ...mockCampaign, _id: params.id as string, status: 'archived' })),
  http.post('http://localhost:5050/api/campaigns/:id/clone', ({ params }) =>
    HttpResponse.json({ ...mockCampaign, _id: 'camp-clone', id: 'camp-clone', name: `Copie campagne` })),
  http.delete('http://localhost:5050/api/campaigns/:id', () =>
    new HttpResponse(null, { status: 204 })),

  // Forms
  http.get('http://localhost:5050/api/forms', () =>
    HttpResponse.json({ data: [{ _id: 'form-1', title: 'Formulaire annuel', status: 'active', sections: [] }], total: 1, page: 1, limit: 20 })),
  http.get('http://localhost:5050/api/forms/:id', ({ params }) =>
    HttpResponse.json({ _id: params.id, title: 'Formulaire annuel', status: 'active', sections: [] })),
  http.post('http://localhost:5050/api/forms', () =>
    HttpResponse.json({ _id: 'form-new', title: 'Nouveau formulaire', status: 'draft', sections: [] })),
  http.post('http://localhost:5050/api/forms/:id/freeze', () =>
    HttpResponse.json({ success: true })),
  http.post('http://localhost:5050/api/forms/:id/unfreeze', () =>
    HttpResponse.json({ success: true })),
  http.post('http://localhost:5050/api/forms/:id/clone', () =>
    HttpResponse.json({ _id: 'form-clone', title: 'Copie formulaire', status: 'draft', sections: [] })),

  // Evaluations
  http.get('http://localhost:5050/api/evaluations', () =>
    HttpResponse.json({ data: [mockEvaluation], total: 1, page: 1, limit: 20 })),
  http.get('http://localhost:5050/api/evaluations/me', () =>
    HttpResponse.json({ data: [mockEvaluation], total: 1, page: 1, limit: 20 })),
  http.get('http://localhost:5050/api/evaluations/:id', ({ params }) =>
    HttpResponse.json({ ...mockEvaluation, _id: params.id as string })),
  http.patch('http://localhost:5050/api/evaluations/:id', async ({ request, params }) => {
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json({ ...mockEvaluation, _id: params.id as string, ...body })
  }),
  http.post('http://localhost:5050/api/evaluations/:id/submit', ({ params }) =>
    HttpResponse.json({ ...mockEvaluation, _id: params.id as string, status: 'submitted' })),
  http.post('http://localhost:5050/api/evaluations/:id/sign', ({ params }) =>
    HttpResponse.json({ ...mockEvaluation, _id: params.id as string, status: 'signed_evaluatee' })),
  http.get('http://localhost:5050/api/evaluations/:id/pdf', () =>
    new HttpResponse(new Blob(['%PDF'], { type: 'application/pdf' }))),
  http.post('http://localhost:5050/api/evaluations/bulk', () =>
    HttpResponse.json({ updated: 2 })),
  http.patch('http://localhost:5050/api/evaluations/bulk', () =>
    HttpResponse.json({ success: 2, skipped: 0, errors: [] })),

  // Notifications
  http.get('http://localhost:5050/api/notifications', () =>
    HttpResponse.json({ data: [mockNotification], total: 1, page: 1, limit: 20, unreadCount: 1 })),
  http.get('http://localhost:5050/api/notifications/count', () =>
    HttpResponse.json({ count: 1 })),
  http.patch('http://localhost:5050/api/notifications/:id/read', () =>
    HttpResponse.json({ success: true })),
  http.post('http://localhost:5050/api/notifications/read-all', () =>
    HttpResponse.json({ success: true })),

  // Analytics
  http.get('http://localhost:5050/api/analytics/summary', () =>
    HttpResponse.json({ totalEvaluations: 100, completionRate: 0.75, avgScore: 3.8, activeCount: 25, topPerformers: [], byDepartmentCompletion: [] })),
  http.get('http://localhost:5050/api/analytics/campaigns/:id', ({ params }) =>
    HttpResponse.json({ campaignId: params.id, completionRate: 0.8, avgScore: 3.9, byStatus: [], byDepartment: [], participants: 50 })),
  http.get('http://localhost:5050/api/analytics/export/pdf', () =>
    new HttpResponse(new Blob(['%PDF'], { type: 'application/pdf' }))),
  http.get('http://localhost:5050/api/analytics/export/csv', () =>
    new HttpResponse(new Blob(['col1,col2'], { type: 'text/csv' }))),

  // Events
  http.get('http://localhost:5050/api/events', () =>
    HttpResponse.json({ data: [{ _id: 'evt-1', title: 'Réunion', date: '2025-06-01', type: 'meeting' }], total: 1 })),
  http.get('http://localhost:5050/api/events/:id', ({ params }) =>
    HttpResponse.json({ _id: params.id, title: 'Réunion', date: '2025-06-01', type: 'meeting' })),

  // Resources
  http.get('http://localhost:5050/api/resources', () =>
    HttpResponse.json({ data: [{ _id: 'res-1', title: 'Guide RH', type: 'document', status: 'published' }], total: 1 })),
  http.get('http://localhost:5050/api/resources/:id', ({ params }) =>
    HttpResponse.json({ _id: params.id, title: 'Guide RH', type: 'document', status: 'published' })),

  // Offboarding
  http.get('http://localhost:5050/api/offboarding', () =>
    HttpResponse.json({ data: [{ _id: 'off-1', userId: 'user-1', reason: 'resignation', lastDay: '2025-07-01', status: 'pending', checklist: [] }], total: 1 })),
  http.get('http://localhost:5050/api/offboarding/:id', ({ params }) =>
    HttpResponse.json({ _id: params.id, userId: 'user-1', reason: 'resignation', lastDay: '2025-07-01', status: 'pending', checklist: [{ label: 'Badge retourné', done: false }] })),
  http.patch('http://localhost:5050/api/offboarding/:id/checklist/:index', () =>
    HttpResponse.json({ success: true })),

  // HR Flags
  http.get('http://localhost:5050/api/hr/flags', () =>
    HttpResponse.json({ data: [{ _id: 'flag-1', type: 'mobility_request', status: 'pending', userId: 'user-1', createdAt: new Date().toISOString() }], total: 1 })),
  http.patch('http://localhost:5050/api/hr/flags/:id/status', () =>
    HttpResponse.json({ success: true })),

  // Admin
  http.get('http://localhost:5050/api/admin/config', () =>
    HttpResponse.json({ smtp: { host: 'smtp.example.com', port: 587 }, features: {} })),
  http.get('http://localhost:5050/api/admin/config/keys', () =>
    HttpResponse.json([{ key: 'smtp.host', value: 'smtp.example.com' }, { key: 'feature.onboarding', value: 'true' }])),
  http.put('http://localhost:5050/api/admin/config/keys', () =>
    HttpResponse.json({ success: true })),
  http.delete('http://localhost:5050/api/admin/config/keys/:key', () =>
    HttpResponse.json({ success: true })),
  http.post('http://localhost:5050/api/admin/config/test-email', () =>
    HttpResponse.json({ success: true })),
  http.post('http://localhost:5050/api/admin/email/test', () =>
    HttpResponse.json({ success: true })),
  http.get('http://localhost:5050/api/admin/ldap', () =>
    HttpResponse.json({ url: 'ldap://example.com', baseDn: 'dc=example,dc=com', bindDn: 'cn=admin,dc=example,dc=com' })),
  http.put('http://localhost:5050/api/admin/ldap', () =>
    HttpResponse.json({ success: true })),
  http.post('http://localhost:5050/api/admin/ldap/test', () =>
    HttpResponse.json({ success: true, message: 'Connexion réussie' })),
  http.post('http://localhost:5050/api/admin/ldap/sync', () =>
    HttpResponse.json({ synced: 42, errors: 0 })),
  http.post('http://localhost:5050/api/admin/ldap/preview', () =>
    HttpResponse.json([{ dn: 'cn=user1,dc=example', email: 'user1@example.com', firstName: 'User', lastName: 'One' }])),
  http.get('http://localhost:5050/api/admin/audit', () =>
    HttpResponse.json({ data: [{ _id: 'audit-1', action: 'campaign_activate', actorName: 'Admin', createdAt: new Date().toISOString() }], total: 1 })),
  http.get('http://localhost:5050/api/admin/audit/export', () =>
    new HttpResponse(new Blob(['date,action\n2025-01-01,activate'], { type: 'text/csv' }))),
  http.get('http://localhost:5050/api/admin/users', () =>
    HttpResponse.json({ data: [mockUser], total: 1, page: 1, limit: 20 })),
  http.get('http://localhost:5050/api/admin/mail-templates', () =>
    HttpResponse.json([{ _id: 'tpl-1', name: 'eval_assigned', subject: 'Évaluation assignée', body: 'Bonjour {{name}}' }])),
  http.put('http://localhost:5050/api/admin/mail-templates/:id', () =>
    HttpResponse.json({ success: true })),
  http.post('http://localhost:5050/api/admin/mail-templates/test', () =>
    HttpResponse.json({ success: true })),
  http.post('http://localhost:5050/api/users/import', () =>
    HttpResponse.json({ imported: 3, errors: 0 })),
  http.post('http://localhost:5050/api/admin/forms/import', () =>
    HttpResponse.json({ success: true, formId: 'form-imported' })),
  http.post('http://localhost:5050/api/forms/import', () =>
    HttpResponse.json({ imported: 1, errors: [] })),

  // Org
  http.get('http://localhost:5050/api/org/chart', () =>
    HttpResponse.json({ id: 'user-3', name: 'Admin NX', role: 'admin', children: [] })),
  http.get('http://localhost:5050/api/org/sectors', () =>
    HttpResponse.json([{ _id: 'sec-1', name: 'RH' }, { _id: 'sec-2', name: 'IT' }])),
  http.get('http://localhost:5050/api/hr/settings', () =>
    HttpResponse.json({ campaignReminders: true, autoClose: false })),
  http.put('http://localhost:5050/api/hr/settings', () =>
    HttpResponse.json({ success: true })),
  http.post('http://localhost:5050/api/hr/notifications/bulk-remind', () =>
    HttpResponse.json({ sent: 10 })),
]
