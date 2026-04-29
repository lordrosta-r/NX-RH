// =============================================================================
// navMenuConfig — Grouped topbar nav per role.
// Each role has `groups` (dropdown menus) and `direct` (bare links).
//
// Group shape:  { id, labels, notifKey?, children: [{ id, to, labels, end?, notifKey? }] }
// Direct shape: { id, to, labels, end? }
//
// `notifKey` references a key in the badges object from useNotifBadges().
// `labels` is a { fr, en } object — resolved to a string by getNavMenuForRole(role, locale).
// =============================================================================

const NAV_MENU = {
  employee: {
    groups: [
      {
        id: 'mon-espace',
        labels: { fr: 'Mon espace',  en: 'My Space' },
        children: [
          { id: 'dashboard', to: '/employee',         labels: { fr: 'Dashboard',  en: 'Dashboard' }, end: true },
          { id: 'goals',     to: '/employee/goals',   labels: { fr: 'Objectifs',  en: 'Goals'     } },
          { id: 'history',   to: '/employee/history', labels: { fr: 'Historique', en: 'History'   } },
        ],
      },
    ],
    direct: [
      { id: 'settings', to: '/employee/settings', labels: { fr: 'Préférences', en: 'Preferences' } },
    ],
  },

  manager: {
    groups: [
      {
        id: 'mon-equipe',
        labels: { fr: 'Mon équipe', en: 'My Team' },
        children: [
          { id: 'dashboard', to: '/manager',          labels: { fr: 'Tableau de bord', en: 'Dashboard' }, end: true },
          { id: 'team',      to: '/manager/team',     labels: { fr: 'Équipe',          en: 'Team'      } },
          { id: 'history',   to: '/manager/history',  labels: { fr: 'Historique',      en: 'History'   } },
        ],
      },
      {
        id: 'pilotage',
        labels: { fr: 'Pilotage', en: 'Analytics' },
        children: [
          { id: 'analytics', to: '/manager/analytics', labels: { fr: 'Analytique', en: 'Analytics' } },
        ],
      },
    ],
    direct: [],
  },

  hr: {
    groups: [
      {
        id: 'campagnes',
        labels: { fr: 'Campagnes', en: 'Campaigns' },
        children: [
          { id: 'campaigns', to: '/hr/campaigns', labels: { fr: 'Campagnes', en: 'Campaigns' } },
          { id: 'templates', to: '/hr/templates', labels: { fr: 'Modèles',   en: 'Templates' } },
        ],
      },
      {
        id: 'collaborateurs',
        labels: { fr: 'Collaborateurs', en: 'People' },
        notifKey: 'requests',
        children: [
          { id: 'directory',   to: '/hr/directory',   labels: { fr: 'Annuaire', en: 'Directory'   } },
          { id: 'requests',    to: '/hr/requests',    labels: { fr: 'Demandes', en: 'Requests'    }, notifKey: 'requests' },
          { id: 'offboarding', to: '/hr/offboarding', labels: { fr: 'Départs',  en: 'Offboarding' } },
        ],
      },
      {
        id: 'analytique',
        labels: { fr: 'Analytique', en: 'Analytics' },
        children: [
          { id: 'analytics', to: '/hr/analytics', labels: { fr: 'Analytique',    en: 'Analytics'  } },
          { id: 'audit',     to: '/admin/audit',  labels: { fr: 'Piste d\'audit', en: 'Audit Log' } },
        ],
      },
      {
        id: 'ressources',
        labels: { fr: 'Ressources', en: 'Resources' },
        children: [
          { id: 'resources', to: '/hr/resources', labels: { fr: 'Ressources', en: 'Resources' } },
        ],
      },
    ],
    direct: [
      { id: 'settings', to: '/hr/settings', labels: { fr: 'Paramètres', en: 'Settings' } },
    ],
  },

  admin: {
    groups: [
      {
        id: 'utilisateurs',
        labels: { fr: 'Utilisateurs', en: 'Users' },
        children: [
          { id: 'users',     to: '/admin/users',     labels: { fr: 'Utilisateurs', en: 'Users'     } },
          { id: 'org-chart', to: '/admin/org-chart', labels: { fr: 'Organigramme', en: 'Org Chart' } },
        ],
      },
      {
        id: 'configuration',
        labels: { fr: 'Configuration', en: 'Configuration' },
        children: [
          { id: 'roles',        to: '/admin/roles',        labels: { fr: 'Rôles & accès', en: 'Roles & Access' } },
          { id: 'integrations', to: '/admin/integrations', labels: { fr: 'Intégrations',  en: 'Integrations'   } },
          { id: 'security',     to: '/admin/security',     labels: { fr: 'Sécurité',      en: 'Security'       } },
        ],
      },
      {
        id: 'communications',
        labels: { fr: 'Communications', en: 'Communications' },
        children: [
          { id: 'communications', to: '/admin/communications', labels: { fr: 'Communications', en: 'Communications' } },
          { id: 'compliance',     to: '/admin/compliance',     labels: { fr: 'Conformité',     en: 'Compliance'     } },
          { id: 'audit',          to: '/admin/audit',          labels: { fr: 'Piste d\'audit', en: 'Audit Log'      } },
        ],
      },
      {
        id: 'systeme',
        labels: { fr: 'Système', en: 'System' },
        children: [
          { id: 'sandbox',  to: '/admin/sandbox',  labels: { fr: 'Bac à sable', en: 'Sandbox'  } },
          { id: 'settings', to: '/admin/settings', labels: { fr: 'Paramètres',  en: 'Settings' } },
        ],
      },
    ],
    direct: [],
  },
}

function resolveLabels(menu, locale) {
  return {
    groups: menu.groups.map(g => ({
      ...g,
      label: g.labels?.[locale] ?? g.labels?.fr ?? '',
      children: g.children.map(c => ({
        ...c,
        label: c.labels?.[locale] ?? c.labels?.fr ?? '',
      })),
    })),
    direct: menu.direct.map(d => ({
      ...d,
      label: d.labels?.[locale] ?? d.labels?.fr ?? '',
    })),
  }
}

export function getNavMenuForRole(role, locale = 'fr') {
  const resolved = role === 'director' ? 'manager' : role
  return resolveLabels(NAV_MENU[resolved] ?? { groups: [], direct: [] }, locale)
}
