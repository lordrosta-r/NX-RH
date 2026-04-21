// =============================================================================
// navConfig — Role-aware sidebar navigation
// Single source of truth for the sidebar items per role.
// Used by <AuthedLayout> through <AppSidebar>.
//
// Each entry: { id, to, label, Icon }
// `id` is used as React key + sidebar item identifier.
// `to` is a React Router path (NavLink will mark it active when matched).
// `Icon` is a component from components/ui/icons.
// =============================================================================

import {
  HomeIcon,
  ClipboardIcon,
  DocumentIcon,
  FolderIcon,
  GearIcon,
  HelpIcon,
  TrendIcon,
  SparklesIcon,
} from '../ui/icons'

// ── Per-role nav items ──────────────────────────────────────────────────────
const NAV = {
  employee: [
    { id: 'home',     to: '/employee',          label: 'Tableau de bord', Icon: HomeIcon,     end: true },
    { id: 'goals',    to: '/employee/goals',    label: 'Mes objectifs',   Icon: SparklesIcon  },
    { id: 'history',  to: '/employee/history',  label: 'Historique',      Icon: FolderIcon    },
    { id: 'settings', to: '/employee/settings', label: 'Préférences',     Icon: GearIcon      },
  ],

  manager: [
    { id: 'home',      to: '/manager',          label: 'Tableau de bord', Icon: HomeIcon,     end: true },
    { id: 'team',      to: '/manager/team',     label: 'Mon équipe',      Icon: SparklesIcon  },
    { id: 'history',   to: '/manager/history',  label: 'Historique',      Icon: FolderIcon    },
    { id: 'analytics', to: '/manager/analytics',label: 'Analyses',        Icon: TrendIcon     },
    { id: 'settings',  to: '/employee/settings',label: 'Préférences',     Icon: GearIcon      },
  ],

  hr: [
    { id: 'home',       to: '/hr',           label: 'Tableau de bord', Icon: HomeIcon,      end: true },
    { id: 'campaigns',  to: '/hr/campaigns', label: 'Campagnes',       Icon: ClipboardIcon  },
    { id: 'templates',  to: '/hr/templates', label: 'Modèles',         Icon: DocumentIcon   },
    { id: 'directory',  to: '/hr/directory', label: 'Annuaire',        Icon: FolderIcon     },
    { id: 'requests',   to: '/hr/requests',  label: 'Demandes',        Icon: SparklesIcon   },
    { id: 'analytics',  to: '/hr/analytics', label: 'Analyses',        Icon: TrendIcon      },
    { id: 'resources',  to: '/hr/resources', label: 'Ressources',      Icon: HelpIcon       },
    { id: 'settings',   to: '/hr/settings',  label: 'Préférences',     Icon: GearIcon       },
  ],

  admin: [
    { id: 'home',          to: '/admin',                label: 'Tableau de bord',  Icon: HomeIcon,     end: true },
    { id: 'users',         to: '/admin/users',          label: 'Utilisateurs',     Icon: SparklesIcon  },
    { id: 'org-chart',     to: '/admin/org-chart',      label: 'Organigramme',     Icon: FolderIcon    },
    { id: 'roles',         to: '/admin/roles',          label: 'Rôles & accès',    Icon: ClipboardIcon },
    { id: 'integrations',  to: '/admin/integrations',   label: 'Intégrations',     Icon: GearIcon      },
    { id: 'communications',to: '/admin/communications', label: 'Communications',   Icon: DocumentIcon  },
    { id: 'compliance',    to: '/admin/compliance',     label: 'Conformité',       Icon: HelpIcon      },
    { id: 'security',      to: '/admin/security',       label: 'Sécurité & audit', Icon: TrendIcon     },
    { id: 'sandbox',       to: '/admin/sandbox',        label: 'Bac à sable',      Icon: SparklesIcon  },
    { id: 'settings',      to: '/admin/settings',       label: 'Paramètres',       Icon: GearIcon      },
  ],
}

const BRAND_SUB = {
  employee: 'Espace collaborateur',
  manager:  'Espace manager',
  hr:       'Ressources humaines',
  admin:    'Administration',
}

// Director role reuses the manager sidebar.
function resolveRole(role) {
  if (role === 'director') return 'manager'
  return role
}

export function getNavItemsForRole(role) {
  return NAV[resolveRole(role)] ?? []
}

export function getBrandSubForRole(role) {
  return BRAND_SUB[resolveRole(role)] ?? ''
}
