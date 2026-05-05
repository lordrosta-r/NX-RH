import { Link } from 'react-router-dom'
import { Settings, Server, Shield, Users, SlidersHorizontal, Network } from 'lucide-react'

const cards = [
  { icon: Settings, color: 'bg-primary-100 text-primary-600', title: 'Config système', desc: 'Clés de configuration, SMTP, feature flags', to: '/admin/config' },
  { icon: Server, color: 'bg-blue-100 text-blue-600', title: 'LDAP', desc: "Annuaire d'entreprise, synchronisation", to: '/admin/ldap' },
  { icon: Shield, color: 'bg-amber-100 text-amber-600', title: "Journal d'audit", desc: "Piste d'audit complète des actions", to: '/admin/audit' },
  { icon: Users, color: 'bg-purple-100 text-purple-600', title: 'Gestion avancée', desc: 'Conformité RGPD, anonymisation', to: '/admin/users' },
  { icon: SlidersHorizontal, color: 'bg-green-100 text-green-600', title: 'Paramètres système', desc: 'Général, SMTP, feature flags, sécurité', to: '/admin/settings' },
  { icon: Network, color: 'bg-rose-100 text-rose-600', title: 'Organigramme', desc: 'Visualiser et gérer la hiérarchie', to: '/admin/orgchart' },
]

export default function AdminHubPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Administration</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        {cards.map(({ icon: Icon, color, title, desc, to }) => (
          <Link
            key={to}
            to={to}
            className="bg-white rounded-2xl shadow p-6 flex flex-col gap-4 hover:shadow-lg hover:scale-[1.01] transition-all duration-150"
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
              <Icon size={24} />
            </div>
            <div>
              <p className="font-bold text-slate-900">{title}</p>
              <p className="text-sm text-slate-500 mt-1">{desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
