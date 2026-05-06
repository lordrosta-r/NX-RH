import client from './client'
import type { AppConfig, LdapConfig, MailTemplate, AuditLogEntry, PaginatedResponse, PaginationParams, User, OrgNode } from '../types'

export const adminApi = {
  // Configuration
  getConfig: () =>
    client.get<AppConfig>('/api/admin/config'),

  updateConfig: (data: Partial<AppConfig>) =>
    client.put<AppConfig>('/api/admin/config', data),

  // LDAP
  getLdapConfig: () =>
    client.get<LdapConfig>('/api/admin/ldap/config'),

  updateLdapConfig: (data: Partial<LdapConfig>) =>
    client.put<LdapConfig>('/api/admin/ldap/config', data),

  testLdap: (credentials?: { bindDN?: string; password?: string }) =>
    client.post<{ success: boolean; message?: string }>('/api/admin/ldap/test', credentials),

  syncLdap: () =>
    client.post<{ synced: number; errors: number }>('/api/admin/ldap/sync'),

  previewLdap: (config: Partial<LdapConfig>) =>
    client.post('/api/admin/ldap/preview', config),

  // Journal d'audit
  getAuditLog: (params?: PaginationParams & { action?: string; actorId?: string; targetType?: string; from?: string; to?: string }) =>
    client.get<PaginatedResponse<AuditLogEntry>>('/api/admin/audit', { params }),

  // Modèles email
  getMailTemplates: () =>
    client.get<MailTemplate[]>('/api/admin/mail-templates'),

  getMailTemplate: (id: string) =>
    client.get<MailTemplate>(`/api/admin/mail-templates/${id}`),

  updateMailTemplate: (id: string, data: Partial<MailTemplate>) =>
    client.put<MailTemplate>(`/api/admin/mail-templates/${id}`, data),

  sendTestMail: (templateId: string, to?: string) =>
    client.post('/api/admin/mail-templates/test', { templateId, to }),

  // Config keys CRUD
  getConfigKeys: () => client.get<Array<{ key: string; value: string }>>('/api/admin/config'),
  setConfigKey: (key: string, value: string) => client.put('/api/admin/config/keys', { key, value }),
  deleteConfigKey: (key: string) => client.delete(`/api/admin/config/keys/${encodeURIComponent(key)}`),
  sendTestEmail: (to: string) => client.post('/api/admin/config/test-email', { to }),
  exportAuditCsv: (params?: { action?: string; actorId?: string; targetType?: string; from?: string; to?: string }) =>
    client.get('/api/admin/audit/export/csv', { params, responseType: 'blob' }),
  // RGPD advanced users
  getAdminUsers: (params?: PaginationParams & { q?: string; authSource?: string }) => client.get<PaginatedResponse<User>>('/api/admin/users', { params }),
  anonymizeUser: (id: string) => client.post(`/api/admin/users/${id}/anonymize`),
  exportUserGdpr: (id: string) => client.get(`/api/admin/users/${id}/gdpr-export`, { responseType: 'blob' }),
  forceDeactivateUser: (id: string) => client.patch(`/api/users/${id}`, { isActive: false }),
  // Import
  importUsers: (data: unknown[], dryRun = true) => client.post('/api/users/import', data, { params: { dryRun } }),
  importForm: (json: unknown) => client.post<{ id: string }>('/api/forms/import', json),
  getFormTemplate: () => client.get('/api/forms/template', { responseType: 'blob' }),
  // Org chart
  getOrgChart: () => client.get<OrgNode>('/api/org/chart'),
  getOrgChartManaged: () => client.get<OrgNode[]>('/api/org/chart/managed'),
  updateOrgChart: (data: { userId: string; managerId: string | null }[]) => client.put('/api/org/chart', data),
  // HR flags
  getFlags: (params?: PaginationParams & { status?: string; type?: string }) => client.get('/api/hr/flags', { params }),
  updateFlagStatus: (id: string, status: string, note?: string) => client.patch(`/api/hr/flags/${id}/status`, { status, note }),
  // HR settings
  getHrSettings: () => client.get('/api/hr/settings'),
  updateHrSettings: (data: unknown) => client.put('/api/hr/settings', data),
  bulkRemind: (data: { campaignId?: string; targetStatuses?: string[] }) => client.post('/api/hr/notifications/bulk-remind', data),
}
