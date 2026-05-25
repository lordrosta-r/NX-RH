import { Link } from 'react-router-dom'
import { Users, ClipboardList, Briefcase, Mail, Settings, BarChart2 } from 'lucide-react'

// ─── Palette helpers (full class names for Tailwind JIT) ──────────────────────

const iconBg: Record<string, string> = {
  blue:   'bg-blue-100 text-blue-600',
  green:  'bg-green-100 text-green-600',
  purple: 'bg-purple-100 text-purple-600',
  orange: 'bg-orange-100 text-orange-600',
  gray:   'bg-gray-100 text-gray-600',
  teal:   'bg-teal-100 text-teal-600',
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const adminFamilies = [
  {
    id: 'users',
    title: 'Utilisateurs & Accès',
    icon: <Users className="w-5 h-5" />,
    color: 'blue',
    items: [
      { label: 'Gestion des utilisateurs', href: '/admin/users',        desc: 'Créer, modifier, désactiver' },
      { label: 'Import CSV',               href: '/admin/users/import', desc: 'Importer en masse' },
      { label: 'Groupes & équipes',        href: '/users/groups',       desc: 'Organiser par équipe' },
      { label: 'Organigramme',             href: '/org',                desc: 'Visualiser la hiérarchie' },
    ],
  },
  {
    id: 'campaigns',
    title: 'Campagnes & Évaluations',
    icon: <ClipboardList className="w-5 h-5" />,
    color: 'green',
    items: [
      { label: 'Campagnes',             href: '/campaigns',   desc: 'Créer et gérer les campagnes' },
      { label: 'Formulaires',           href: '/forms',       desc: "Templates d'évaluation" },
      { label: 'Suivi des évaluations', href: '/evaluations', desc: 'Toutes les évaluations' },
    ],
  },
  {
    id: 'hr',
    title: 'RH & Mobilité',
    icon: <Briefcase className="w-5 h-5" />,
    color: 'purple',
    items: [
      { label: 'Demandes de mobilité', href: '/mobility',    desc: 'Suivre les demandes' },
      { label: 'Suivi des demandes RH', href: '/hr/flags',   desc: 'Flags et alertes RH' },
      { label: 'Onboarding',           href: '/onboarding',  desc: 'Nouveaux arrivants' },
      { label: 'Offboarding',          href: '/offboarding', desc: 'Départs' },
    ],
  },
  {
    id: 'communication',
    title: 'Configuration email',
    icon: <Mail className="w-5 h-5" />,
    color: 'orange',
    items: [
      { label: 'Templates email',    href: '/admin/mail-templates', desc: 'Personnaliser les emails' },
      { label: "Test d'envoi",       href: '/admin/test-mail',      desc: 'Tester la configuration' },
      { label: 'Configuration SMTP', href: '/admin/mail-config',    desc: 'Paramètres serveur mail' },
    ],
  },
  {
    id: 'system',
    title: 'Système',
    icon: <Settings className="w-5 h-5" />,
    color: 'gray',
    items: [
      { label: 'Configuration LDAP',  href: '/admin/ldap',     desc: 'Synchronisation annuaire' },
      { label: "Journal d'audit",     href: '/admin/audit',    desc: 'Logs et traçabilité' },
      { label: 'Paramètres généraux', href: '/admin/settings', desc: 'Configuration globale' },
    ],
  },
  {
    id: 'stats',
    title: 'Statistiques',
    icon: <BarChart2 className="w-5 h-5" />,
    color: 'teal',
    items: [
      { label: 'Vue d\'ensemble',        href: '/admin/stats',             desc: 'KPIs et indicateurs globaux' },
      { label: 'Analytics campagnes',    href: '/analytics',               desc: 'Statistiques des campagnes' },
      { label: 'Import formulaires',     href: '/admin/forms/import',      desc: 'Importer des modèles' },
    ],
  },
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminHubPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Administration</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {adminFamilies.map(family => (
          <div key={family.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2 rounded-lg ${iconBg[family.color]}`}>
                {family.icon}
              </div>
              <h2 className="font-semibold text-gray-800">{family.title}</h2>
            </div>
            <ul className="space-y-1">
              {family.items.map(item => (
                <li key={item.href}>
                  <Link
                    to={item.href}
                    className="flex flex-col hover:bg-gray-50 rounded-lg p-2 -mx-2 transition"
                  >
                    <span className="text-sm font-medium text-gray-700">{item.label}</span>
                    <span className="text-xs text-gray-500">{item.desc}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
