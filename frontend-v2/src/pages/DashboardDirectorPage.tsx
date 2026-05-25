import { Link } from 'react-router-dom'
import { Users, CheckSquare, Eye, TrendingUp } from 'lucide-react'
import { useDashboardDirector } from '../hooks/useDashboardByRole'
import { StatusBadge } from '../components/ui'
import type { Evaluation, Campaign } from '../types'
import { getCampaignName } from '../types'

function getInitials(id: string): string {
  return id.slice(0, 2).toUpperCase()
}

function computeAverageScore(evaluations: Evaluation[]): string {
  const scored = evaluations.filter(e => e.reviewerScore !== undefined && e.reviewerScore !== null)
  if (scored.length === 0) return '—'
  const avg = scored.reduce((sum, e) => sum + (e.reviewerScore as number), 0) / scored.length
  return `${(avg / 10).toFixed(1)}/10`
}

interface KpiCardProps {
  label: string
  value: string | number
  icon: React.ReactNode
  color: 'primary' | 'success' | 'warning' | 'error'
}

function KpiCard({ label, value, icon, color }: KpiCardProps) {
  const colorMap = {
    primary: 'bg-primary-50 text-primary-600',
    success: 'bg-success-50 text-success-600',
    warning: 'bg-warning-50 text-warning-600',
    error:   'bg-error-50 text-error-600',
  }
  return (
    <div className="col-span-3 bg-white rounded-xl shadow-sm border border-slate-100 p-6">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
          {icon}
        </div>
      </div>
      <p className="text-3xl font-bold text-slate-900">{value}</p>
    </div>
  )
}

function EvaluationsTable({ evaluations }: { evaluations: Evaluation[] }) {
  return (
    <>
      <div className="overflow-x-auto hidden sm:block">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50">
              <th className="text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 text-left">
                Collaborateur
              </th>
              <th className="text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 text-left">
                Campagne
              </th>
              <th className="text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 text-left">
                Statut
              </th>
              <th className="text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 text-left">
                Score
              </th>
              <th className="text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 text-left">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {evaluations.map(ev => (
              <tr key={ev.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 text-xs font-semibold flex items-center justify-center">
                      {getInitials(ev.evaluateeId)}
                    </div>
                    <span className="text-sm text-slate-700">{ev.evaluateeId}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-slate-500">{getCampaignName(ev.campaignId)}</span>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={ev.status} />
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm font-medium text-slate-900">
                    {ev.reviewerScore !== undefined && ev.reviewerScore !== null
                      ? `${(ev.reviewerScore / 10).toFixed(1)}/10`
                      : '—'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link
                    to={`/evaluations/${ev.id}`}
                    className="text-sm text-primary-600 hover:underline"
                  >
                    Voir →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="sm:hidden space-y-2">
        {evaluations.map(ev => (
          <div key={ev.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 text-xs font-semibold flex items-center justify-center flex-shrink-0">
                {getInitials(ev.evaluateeId)}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700 truncate">{ev.evaluateeId}</p>
                <StatusBadge status={ev.status} />
              </div>
            </div>
            <Link to={`/evaluations/${ev.id}`} className="text-xs text-primary-600 hover:underline shrink-0 ml-2">
              Voir →
            </Link>
          </div>
        ))}
      </div>
    </>
  )
}

function TeamSummary({ evaluations }: { evaluations: Evaluation[] }) {
  return (
    <div className="space-y-2">
      {evaluations.map(ev => (
        <div
          key={ev.id}
          className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0"
        >
          <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 text-xs font-semibold flex items-center justify-center flex-shrink-0">
            {ev.evaluateeId.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-700 truncate">{ev.evaluateeId}</p>
            <StatusBadge status={ev.status} />
          </div>
        </div>
      ))}
    </div>
  )
}

function CampaignsTable({ campaigns }: { campaigns: Campaign[] }) {
  if (campaigns.length === 0) {
    return <p className="text-sm text-slate-600 text-center py-4">Aucune campagne active</p>
  }
  return (
    <table className="w-full">
      <thead>
        <tr className="bg-slate-50">
          <th className="text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 text-left">
            Nom
          </th>
          <th className="text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 text-left">
            Statut
          </th>
          <th className="text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 text-left">
            Action
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-50">
        {campaigns.map(c => (
          <tr key={c.id} className="hover:bg-slate-50 transition-colors">
            <td className="px-4 py-3">
              <span className="text-sm font-medium text-slate-700">{c.name}</span>
            </td>
            <td className="px-4 py-3">
              <StatusBadge status={c.status} />
            </td>
            <td className="px-4 py-3">
              <Link
                to={`/campaigns/${c.id}`}
                className="text-sm text-primary-600 hover:underline"
              >
                Voir →
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default function DashboardDirectorPage() {
  const { evaluations, campaigns } = useDashboardDirector()

  const isLoading = evaluations.isLoading || campaigns.isLoading

  if (isLoading) {
    return (
      <div>
        <div className="h-8 w-64 bg-slate-200 rounded animate-pulse mb-8" />
        <div className="grid grid-cols-12 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="col-span-3 h-32 bg-slate-200 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const evalList = evaluations.data?.data ?? []
  const campaignList = campaigns.data?.data ?? []

  const submittedCount = evalList.filter(e => e.status === 'submitted').length
  const reviewedCount  = evalList.filter(e => e.status === 'reviewed').length
  const uniqueMembers  = new Set(evalList.map(e => e.evaluateeId)).size
  const avgScore       = computeAverageScore(evalList)

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Tableau de bord — Mon département</h1>
        <p className="text-slate-500 mt-1">Vue globale de votre département</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-12 gap-6 mb-6">
        <KpiCard
          label="Membres d'équipe"
          value={uniqueMembers}
          icon={<Users size={18} />}
          color="primary"
        />
        <KpiCard
          label="Évals soumises"
          value={submittedCount}
          icon={<CheckSquare size={18} />}
          color="success"
        />
        <KpiCard
          label="Évals à revoir"
          value={reviewedCount}
          icon={<Eye size={18} />}
          color="warning"
        />
        <KpiCard
          label="Score moyen dép."
          value={avgScore}
          icon={<TrendingUp size={18} />}
          color="primary"
        />
      </div>

      {/* Middle row: table + team summary */}
      <div className="grid grid-cols-12 gap-6 mb-6">
        {/* Evaluations table */}
        <div className="col-span-8 bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Évaluations de mon équipe</h2>
          {evalList.length === 0 ? (
            <p className="text-sm text-slate-600 text-center py-4">Aucune évaluation trouvée</p>
          ) : (
            <EvaluationsTable evaluations={evalList} />
          )}
        </div>

        {/* Team summary */}
        <div className="col-span-4 bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Résumé équipe</h2>
          {evalList.length === 0 ? (
            <p className="text-sm text-slate-600 text-center py-4">Aucun membre</p>
          ) : (
            <TeamSummary evaluations={evalList} />
          )}
        </div>
      </div>

      {/* Campaigns row */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Campagnes actives</h2>
          <CampaignsTable campaigns={campaignList} />
        </div>
      </div>
    </div>
  )
}
