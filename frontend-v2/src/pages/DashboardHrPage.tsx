import { Link } from 'react-router-dom'
import { BarChart2, CheckSquare, ClipboardList, AlertCircle } from 'lucide-react'
import { useDashboardHr } from '../hooks/useDashboard'
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

// ─── Campaign mini-card ───────────────────────────────────────────────────────

function CampaignCard({ campaign }: { campaign: Campaign }) {
  const start = campaign.startDate
    ? new Date(campaign.startDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—'
  const end = campaign.endDate
    ? new Date(campaign.endDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—'

  return (
    <Link
      to={`/campaigns/${campaign.id}`}
      className="block p-4 border border-slate-200 rounded-xl hover:border-primary-200 hover:bg-primary-50 transition-colors"
    >
      <p className="font-semibold text-slate-900 mb-2 text-sm">{campaign.name}</p>
      <div className="w-full bg-slate-100 rounded-full h-1.5 mb-2">
        <div className="bg-primary-500 h-1.5 rounded-full" style={{ width: '0%' }} />
      </div>
      <p className="text-xs text-slate-400">
        {start} → {end}
      </p>
    </Link>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardHrPage() {
  const { campaigns, flags } = useDashboardHr()

  const isLoading = campaigns.isLoading
  const isError = campaigns.isError

  if (isLoading) {
    return (
      <div>
        <div className="h-8 w-64 bg-slate-200 rounded animate-pulse mb-8" />
        <div className="grid grid-cols-3 gap-6 mb-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-200 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-8 h-64 bg-slate-200 rounded-xl animate-pulse" />
          <div className="col-span-4 h-64 bg-slate-200 rounded-xl animate-pulse" />
          <div className="col-span-6 h-40 bg-slate-200 rounded-xl animate-pulse" />
          <div className="col-span-6 h-40 bg-slate-200 rounded-xl animate-pulse" />
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="border-l-4 border-error-500 bg-error-50 p-4 rounded-lg">
        <p className="text-sm text-error-700">Impossible de charger les données du tableau de bord.</p>
        <button onClick={() => campaigns.refetch()} className="mt-2 text-sm text-error-600 underline">
          Réessayer
        </button>
      </div>
    )
  }

  const totalCampaigns = campaigns.data?.data?.total ?? 0
  const flagsCount = flags.data?.data?.total ?? 0
  const campaignList = campaigns.data?.data?.data ?? []

  return (
    <div className="bg-slate-50 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Tableau de bord RH</h1>
        <div className="flex items-center gap-3">
          <Link
            to="/campaigns/new"
            className="inline-flex items-center px-4 py-2 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium transition-colors"
          >
            + Nouvelle campagne
          </Link>
          <button
            disabled
            className="inline-flex items-center px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-400 cursor-not-allowed"
          >
            Exporter PDF
          </button>
        </div>
      </div>

      {/* KPI Grid — 3 cols */}
      <div className="grid grid-cols-12 gap-6 mb-6">
        <div className="col-span-4">
          <KpiCard
            label="Campagnes actives"
            value={totalCampaigns}
            icon={BarChart2}
            colorClass="bg-primary-50 text-primary-500"
          />
        </div>
        <div className="col-span-4">
          <KpiCard
            label="Évals à signer"
            value={0}
            icon={CheckSquare}
            colorClass="bg-warning-50 text-warning-500"
          />
        </div>
        <div className="col-span-4">
          <KpiCard
            label="Évals soumises"
            value={flagsCount}
            icon={ClipboardList}
            colorClass="bg-success-50 text-success-500"
          />
        </div>
      </div>

      {/* Middle row */}
      <div className="grid grid-cols-12 gap-6 mb-6">
        {/* Campagnes en cours */}
        <div className="col-span-8 bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Campagnes en cours</h2>
          {campaignList.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Aucune campagne active</p>
          ) : (
            <div className="space-y-3">
              {campaignList.map((c) => (
                <CampaignCard key={c.id} campaign={c} />
              ))}
            </div>
          )}
        </div>

        {/* Alertes */}
        <div className="col-span-4 bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Alertes</h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-warning-50 rounded-lg border border-warning-100">
              <AlertCircle className="w-4 h-4 text-warning-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-warning-700">Deadlines proches (J-3)</p>
                <p className="text-xs text-warning-600 mt-0.5">
                  <Link to="/campaigns" className="underline">
                    Voir les campagnes →
                  </Link>
                </p>
              </div>
            </div>
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
            <div className="flex items-start gap-3 p-3 bg-error-50 rounded-lg border border-error-100">
              <AlertCircle className="w-4 h-4 text-error-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-error-700">Offboardings en cours</p>
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

      {/* Bottom row */}
      <div className="grid grid-cols-12 gap-6">
        {/* Stats rapides */}
        <div className="col-span-6 bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Stats rapides</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-slate-50">
              <span className="text-sm text-slate-600">Score moyen global</span>
              <span className="text-sm font-semibold text-slate-400">— (S8)</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-slate-600">Taux de complétion global</span>
              <span className="text-sm font-semibold text-slate-400">— (S8)</span>
            </div>
          </div>
        </div>

        {/* Prochains événements */}
        <div className="col-span-6 bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Prochains événements</h2>
            <Link to="/events" className="text-sm text-primary-600 hover:underline">
              Voir tous →
            </Link>
          </div>
          <p className="text-sm text-slate-400 text-center py-8">Calendrier événements disponible en S8</p>
        </div>
      </div>
    </div>
  )
}
