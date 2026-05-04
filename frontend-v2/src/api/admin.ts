import client from './client'
import type { AppConfig, LdapConfig, MailTemplate, AuditLogEntry, PaginatedResponse, PaginationParams } from '../types'

export const adminApi = {
  // Configuration
  getConfig: () =>
    client.get<AppConfig>('/api/admin/config'),

  updateConfig: (data: Partial<AppConfig>) =>
    client.put<AppConfig>('/api/admin/config', data),

  // LDAP
  getLdapConfig: () =>
    client.get<LdapConfig>('/api/admin/ldap'),

  updateLdapConfig: (data: Partial<LdapConfig>) =>
    client.put<LdapConfig>('/api/admin/ldap', data),

  testLdap: (credentials?: { bindDN?: string; password?: string }) =>
    client.post<{ success: boolean; message?: string }>('/api/admin/ldap/test', credentials),

  syncLdap: () =>
    client.post<{ synced: number; errors: number }>('/api/admin/ldap/sync'),

  previewLdap: (config: Partial<LdapConfig>) =>
    client.post('/api/admin/ldap/preview', config),

  // Journal d'audit
  getAuditLog: (params?: PaginationParams & { action?: string; actorId?: string }) =>
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
}
