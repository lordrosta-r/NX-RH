// ─── Standardized Query Key Factory ───────────────────────────────────────────
// Usage: queryKeys.evaluations.detail('abc') → ['evaluations', 'detail', 'abc']
// Invalidating queryKeys.evaluations.all invalidates ALL evaluations queries.
// Invalidating queryKeys.evaluations.lists() invalidates only list queries.

export const queryKeys = {
  evaluations: {
    all: ['evaluations'] as const,
    lists: () => [...queryKeys.evaluations.all, 'list'] as const,
    list: (filters: object) => [...queryKeys.evaluations.lists(), filters] as const,
    details: () => [...queryKeys.evaluations.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.evaluations.details(), id] as const,
  },
  campaigns: {
    all: ['campaigns'] as const,
    lists: () => [...queryKeys.campaigns.all, 'list'] as const,
    list: (filters: object) => [...queryKeys.campaigns.lists(), filters] as const,
    details: () => [...queryKeys.campaigns.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.campaigns.details(), id] as const,
    analytics: (id: string) => [...queryKeys.campaigns.all, 'analytics', id] as const,
  },
  users: {
    all: ['users'] as const,
    lists: () => [...queryKeys.users.all, 'list'] as const,
    list: (filters: object) => [...queryKeys.users.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.users.all, 'detail', id] as const,
    stats: () => [...queryKeys.users.all, 'stats'] as const,
    evaluators: () => [...queryKeys.users.all, 'evaluators'] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    lists: () => [...queryKeys.notifications.all, 'list'] as const,
    list: (filters: object) => [...queryKeys.notifications.lists(), filters] as const,
    count: () => [...queryKeys.notifications.all, 'count'] as const,
    preview: () => [...queryKeys.notifications.all, 'list', 'preview'] as const,
  },
  org: {
    all: ['org'] as const,
    chart: () => [...queryKeys.org.all, 'chart'] as const,
  },
  resources: {
    all: ['resources'] as const,
    lists: () => [...queryKeys.resources.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.resources.all, 'detail', id] as const,
  },
  mobility: {
    all: ['mobility'] as const,
    lists: () => [...queryKeys.mobility.all, 'list'] as const,
  },
  forms: {
    all: ['forms'] as const,
    lists: () => [...queryKeys.forms.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.forms.all, 'detail', id] as const,
    library: () => [...queryKeys.forms.all, 'library'] as const,
  },
  offboardings: {
    all: ['offboardings'] as const,
    lists: () => [...queryKeys.offboardings.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.offboardings.all, 'detail', id] as const,
  },
  offboarding: {
    all: ['offboardings'] as const,
    lists: () => [...queryKeys.offboardings.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.offboardings.all, 'detail', id] as const,
  },
  events: {
    all: ['events'] as const,
    lists: () => [...queryKeys.events.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.events.all, 'detail', id] as const,
  },
  groups: {
    all: ['groups'] as const,
    lists: () => [...queryKeys.groups.all, 'list'] as const,
  },
  hrFlags: {
    all: ['hr-flags'] as const,
    lists: () => [...queryKeys.hrFlags.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.hrFlags.all, 'detail', id] as const,
  },
  me: {
    all: ['me'] as const,
  },
  adminUsers: {
    all: ['admin-users'] as const,
  },
  configKeys: {
    all: ['config-keys'] as const,
  },
  ldapConfig: {
    all: ['ldap-config'] as const,
  },
  mailTemplates: {
    all: ['mail-templates'] as const,
  },
  mailConfig: {
    all: ['admin', 'mail-config'] as const,
  },
  campaignSettings: {
    all: ['campaign-settings'] as const,
  },
  pdi: {
    all: ['pdi'] as const,
    lists: () => [...queryKeys.pdi.all, 'list'] as const,
    list: (filters: object) => [...queryKeys.pdi.lists(), filters] as const,
    details: () => [...queryKeys.pdi.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.pdi.details(), id] as const,
  },
} as const
