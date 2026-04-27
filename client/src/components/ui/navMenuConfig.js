// =============================================================================
// navMenuConfig — Grouped topbar nav per role.
// Each role has `groups` (dropdown menus) and `direct` (bare links).
//
// Group shape:  { id, label, notifKey?, children: [{ id, to, label, end?, notifKey? }] }
// Direct shape: { id, to, label, end? }
//
// `notifKey` references a key in the badges object from useNotifBadges().
// =============================================================================

const NAV_MENU = {
  employee: {
    groups: [
      {
        id: 'mon-espace',
        label: 'Mon espace',
        children: [
          { id: 'dashboard', to: '/employee',         label: 'Dashboard',   end: true },
          { id: 'goals',     to: '/employee/goals',   label: 'Objectifs' },
          { id: 'history',   to: '/employee/history', label: 'Historique' },
        ],
      },
    ],
    direct: [
      { id: 'settings', to: '/employee/settings', label: 'Préférences' },
    ],
  },

  manager: {
    groups: [
      {
        id: 'mon-equipe',
        label: 'Mon équipe',
        children: [
          { id: 'dashboard', to: '/manager',          label: 'Tableau de bord', end: true },
          { id: 'team',      to: '/manager/team',     label: 'Équipe' },
          { id: 'history',   to: '/manager/history',  label: 'Historique' },
        ],
      },
      {
        id: 'pilotage',
        label: 'Pilotage',
        children: [
          { id: 'analytics', to: '/manager/analytics', label: 'Analytique' },
        ],
      },
    ],
    direct: [],
  },

  hr: {
    groups: [
      {
        id: 'campagnes',
        label: 'Campagnes',
        children: [
          { id: 'campaigns', to: '/hr/campaigns', label: 'Campagnes' },
          { id: 'templates', to: '/hr/templates', label: 'Modèles' },
        ],
      },
      {
        id: 'collaborateurs',
        label: 'Collaborateurs',
        notifKey: 'requests',
        children: [
          { id: 'directory',   to: '/hr/directory',   label: 'Annuaire' },
          { id: 'requests',    to: '/hr/requests',    label: 'Demandes', notifKey: 'requests' },
          { id: 'offboarding', to: '/hr/offboarding', label: 'Départs' },
        ],
      },
      {
        id: 'analytique',
        label: 'Analytique',
        children: [
          { id: 'analytics', to: '/hr/analytics', label: 'Analytique' },
        ],
      },
      {
        id: 'ressources',
        label: 'Ressources',
        children: [
          { id: 'resources', to: '/hr/resources', label: 'Ressources' },
        ],
      },
    ],
    direct: [
      { id: 'settings', to: '/hr/settings', label: 'Paramètres' },
    ],
  },

  admin: {
    groups: [
      {
        id: 'utilisateurs',
        label: 'Utilisateurs',
        children: [
          { id: 'users',     to: '/admin/users',     label: 'Utilisateurs' },
          { id: 'org-chart', to: '/admin/org-chart', label: 'Organigramme' },
        ],
      },
      {
        id: 'configuration',
        label: 'Configuration',
        children: [
          { id: 'roles',        to: '/admin/roles',        label: 'Rôles & accès' },
          { id: 'integrations', to: '/admin/integrations', label: 'Intégrations' },
          { id: 'security',     to: '/admin/security',     label: 'Sécurité' },
        ],
      },
      {
        id: 'communications',
        label: 'Communications',
        children: [
          { id: 'communications', to: '/admin/communications', label: 'Communications' },
          { id: 'compliance',     to: '/admin/compliance',     label: 'Conformité' },
        ],
      },
      {
        id: 'systeme',
        label: 'Système',
        children: [
          { id: 'sandbox',  to: '/admin/sandbox',  label: 'Bac à sable' },
          { id: 'settings', to: '/admin/settings', label: 'Paramètres' },
        ],
      },
    ],
    direct: [],
  },
}

export function getNavMenuForRole(role) {
  const resolved = role === 'director' ? 'manager' : role
  return NAV_MENU[resolved] ?? { groups: [], direct: [] }
}
