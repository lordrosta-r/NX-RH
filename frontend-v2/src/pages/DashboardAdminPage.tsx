import { Link } from 'react-router-dom'
import {
  Users,
  BarChart2,
  ClipboardList,
  LogOut,
  AlertCircle,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useDashboardAdmin } from '../hooks/useDashboard'
import type { Campaign } from '../types'

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  icon: Icon,
  colorClass,
  isLoading,
}: {
  label: string
  value: number | string
  icon: React.ComponentType<{ className?: string }>
  colorClass: string
  isLoading?: boolean
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClass}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {isLoading ? (
        <div className="h-8 bg-slate-200 rounded animate-pulse w-16" />
      ) : (
        <p className="text-3xl font-bold text-slate-900">{value ?? '—'}</p>
      )}
    </div>
  )
}

// ─── StatusBadge inline ───────────────────────────────────────────────────────

const statusLabels: Record<string, string> = {
  draft: 'Brouillon',
  active: 'Active',
  closed: 'Clôturée',
  archived: 'Archivée',
}

const statusColors: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  active: 'bg-success-50 text-success-600',
  closed: 'bg-slate-100 text-slate-500',
  archived: 'bg-slate-100 text-slate-400',
}

function StatusBadge({ status }: { status: string }) {
  const color = statusColors[status] ?? 'bg-slate-100 text-slate-600'
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {statusLabels[status] ?? status}
    </span>
  )
}

// ─── Campaign columns ─────────────────────────────────────────────────────────

function CampaignTable({ campaigns, isLoading }: { campaigns: Campaign[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-10 bg-slate-200 rounded animate-pulse" />
        ))}
      </div>
    )
  }

  if (campaigns.length === 0) {
    return <p className="text-sm text-slate-400 text-center py-8">Aucune campagne active</p>
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-slate-100">
          <th className="text-left text-xs font-medium text-slate-500 pb-3">Campagne</th>
          <th className="text-left text-xs font-medium text-slate-500 pb-3">Statut</th>
          <th className="text-left text-xs font-medium text-slate-500 pb-3">Progression</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-50">
        {campaigns.map((row) => (
          <tr key={row.id} className="hover:bg-slate-50 transition-colors">
            <td className="py-3 pr-4">
              <Link
                to={`/campaigns/${row.id}`}
                className="text-primary-600 hover:underline font-medium"
              >
                {row.name}
              </Link>
            </td>
            <td className="py-3 pr-4">
              <StatusBadge status={row.status} />
            </td>
            <td className="py-3">
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-primary-500 h-2 rounded-full" style={{ width: '0%' }} />
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardAdminPage() {
  const { user } = useAuth()
  const { campaigns, evaluations, users } = useDashboardAdmin()

  const isLoading = campaigns.isLoading || evaluations.isLoading || users.isLoading
  const isError = campaigns.isError || evaluations.isError || users.isError

  if (isLoading) {
    return (
      <div>
        <div className="h-8 w-64 bg-slate-200 rounded animate-pulse mb-8" />
        <div className="grid grid-cols-4 gap-6 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-200 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-8 h-64 bg-slate-200 rounded-xl animate-pulse" />
          <div className="col-span-4 h-64 bg-slate-200 rounded-xl animate-pulse" />
          <div className="col-span-12 h-40 bg-slate-200 rounded-xl animate-pulse" />
        </div>
      </div>
    )
  }

  if (isError) {
    const refetch = () => {
      campaigns.refetch()
      evaluations.refetch()
      users.refetch()
    }
    return (
      <div className="border-l-4 border-error-500 bg-error-50 p-4 rounded-lg">
        <p className="text-sm text-error-700">Impossible de charger les données du tableau de bord.</p>
        <button onClick={refetch} className="mt-2 text-sm text-error-600 underline">
          Réessayer
        </button>
      </div>
    )
  }

  const totalUsers = users.data?.data?.total ?? 0
  const totalCampaigns = campaigns.data?.data?.total ?? 0
  const totalEvals = evaluations.data?.data?.total ?? 0
  const campaignList = campaigns.data?.data?.data ?? []

  return (
    <div className="bg-slate-50 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-slate-900">
          Tableau de bord · Bonjour, {user?.firstName ?? '...'} 👋
        </h1>
        <button
          disabled
          className="inline-flex items-center px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-400 cursor-not-allowed"
        >
          Exporter PDF
        </button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-12 gap-6 mb-6">
        <div className="col-span-3">
          <KpiCard
            label="Utilisateurs actifs"
            value={totalUsers}
            icon={Users}
            colorClass="bg-primary-50 text-primary-500"
          />
        </div>
        <div className="col-span-3">
          <KpiCard
            label="Campagnes actives"
            value={totalCampaigns}
            icon={BarChart2}
            colorClass="bg-success-50 text-success-500"
          />
        </div>
        <div className="col-span-3">
          <KpiCard
            label="Évaluations non finalisées"
            value={totalEvals}
            icon={ClipboardList}
            colorClass="bg-warning-50 text-warning-500"
          />
        </div>
        <div className="col-span-3">
          <KpiCard
            label="Offboardings en attente"
            value={0}
            icon={LogOut}
            colorClass="bg-error-50 text-error-500"
          />
        </div>
      </div>

      {/* Middle row */}
      <div className="grid grid-cols-12 gap-6 mb-6">
        {/* Campagnes actives */}
        <div className="col-span-8 bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Campagnes actives</h2>
          <CampaignTable campaigns={campaignList} isLoading={campaigns.isLoading} />
        </div>

        {/* Actions urgentes */}
        <div className="col-span-4 bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Actions urgentes</h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-error-50 rounded-lg border border-error-100">
              <AlertCircle className="w-4 h-4 text-error-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-error-700">Évaluations expirées</p>
                <p className="text-xs text-error-600 mt-0.5">
                  <Link to="/evaluations" className="underline">
                    Voir les évaluations →
                  </Link>
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-warning-50 rounded-lg border border-warning-100">
              <AlertCircle className="w-4 h-4 text-warning-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-warning-700">Évaluations à signer côté RH</p>
                <p className="text-xs text-warning-600 mt-0.5">
                  <Link to="/hr/flags" className="underline">
                    Voir les alertes RH →
                  </Link>
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-error-50 rounded-lg border border-error-100">
              <AlertCircle className="w-4 h-4 text-error-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-error-700">Offboardings non complétés &gt; 30 j</p>
                <p className="text-xs text-error-600 mt-0.5">
                  <Link to="/offboarding" className="underline">
                    Voir les offboardings →
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Activité récente */}
      <div className="col-span-12 bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Activité récente</h2>
          <Link to="/admin/audit" className="text-sm text-primary-600 hover:underline">
            Voir le journal complet →
          </Link>
        </div>
        <p className="text-sm text-slate-400 text-center py-8">Journal d'audit disponible en S11</p>
      </div>
    </div>
  )
}
