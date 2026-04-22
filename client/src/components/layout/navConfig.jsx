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
  Home,
  Clipboard,
  ClipboardCheck,
  FileText,
  Folder,
  Settings,
  HelpCircle,
  TrendingUp,
  Star,
  Users,
  ShieldCheck,
  GitBranch,
  PlugZap,
  Mail,
  Lock,
  FlaskConical,
  BookOpen,
  Target,
} from 'lucide-react'

// ── Per-role nav items ──────────────────────────────────────────────────────
const NAV = {
  employee: [
    { id: 'home',       to: '/employee',            label: 'Tableau de bord',  Icon: Home,    end: true },
    { id: 'evaluation', to: '/employee/evaluation', label: 'Mon évaluation',   Icon: Star           },
    { id: 'goals',      to: '/employee/goals',      label: 'Mes objectifs',    Icon: Target         },
    { id: 'history',    to: '/employee/history',    label: 'Historique',       Icon: Folder         },
    { id: 'settings',   to: '/employee/settings',   label: 'Préférences',      Icon: Settings       },
  ],

  manager: [
    { id: 'home',      to: '/manager',           label: 'Tableau de bord', Icon: Home,       end: true },
    { id: 'team',      to: '/manager/team',      label: 'Mon équipe',      Icon: Users       },
    { id: 'history',   to: '/manager/history',   label: 'Historique',      Icon: Folder      },
    { id: 'analytics', to: '/manager/analytics', label: 'Analyses',        Icon: TrendingUp  },
    { id: 'settings',  to: '/employee/settings', label: 'Préférences',     Icon: Settings    },
  ],

  hr: [
    { id: 'home',       to: '/hr',           label: 'Tableau de bord', Icon: Home,        end: true },
    { id: 'campaigns',  to: '/hr/campaigns', label: 'Campagnes',       Icon: Clipboard    },
    { id: 'templates',  to: '/hr/templates', label: 'Modèles',         Icon: FileText     },
    { id: 'directory',  to: '/hr/directory', label: 'Annuaire',        Icon: Users        },
    { id: 'requests',   to: '/hr/requests',  label: 'Demandes',        Icon: BookOpen     },
    { id: 'analytics',  to: '/hr/analytics', label: 'Analyses',        Icon: TrendingUp   },
    { id: 'resources',  to: '/hr/resources', label: 'Ressources',      Icon: HelpCircle   },
    { id: 'settings',   to: '/hr/settings',  label: 'Préférences',     Icon: Settings     },
  ],

  admin: [
    { id: 'home',          to: '/admin',                label: 'Tableau de bord',  Icon: Home,         end: true },
    { id: 'users',         to: '/admin/users',          label: 'Utilisateurs',     Icon: Users         },
    { id: 'org-chart',     to: '/admin/org-chart',      label: 'Organigramme',     Icon: GitBranch     },
    { id: 'roles',         to: '/admin/roles',          label: 'Rôles & accès',    Icon: ShieldCheck   },
    { id: 'integrations',  to: '/admin/integrations',   label: 'Intégrations',     Icon: PlugZap       },
    { id: 'communications',to: '/admin/communications', label: 'Communications',   Icon: Mail          },
    { id: 'compliance',    to: '/admin/compliance',     label: 'Conformité',       Icon: Clipboard     },
    { id: 'security',      to: '/admin/security',       label: 'Sécurité & audit', Icon: Lock          },
    { id: 'sandbox',       to: '/admin/sandbox',        label: 'Bac à sable',      Icon: FlaskConical  },
    { id: 'settings',      to: '/admin/settings',       label: 'Paramètres',       Icon: Settings      },
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
