import { Link } from 'react-router-dom'
import {
  BarChart2, AlertCircle, Users, TrendingUp, Clock,
  UserCheck, UserX, Calendar, CheckCircle2, Download,
  Timer, Briefcase,
} from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { useDashboardHr, useDashboardHrStats, useMonthlyTrend, useAnalyticsSummary } from '../hooks/useDashboard'
import { usePdfExport } from '../hooks/usePdfExport'
import { KpiCard } from '../components/KpiCard'
import { KPICard } from '../components/ui/KPICard'
import Spinner from '../components/ui/Spinner'
import type { Campaign } from '../types'

// ─── Design-token colours for charts ─────────────────────────────────────────
const CHART_COLORS = {
  primary: '#2563eb',
  success: '#16a34a',
  warning: '#d97706',
  danger:  '#dc2626',
  purple:  '#7c3aed',
}

const STATUS_COLORS: Record<string, string> = {
  assigned:        CHART_COLORS.warning,
  in_progress:     CHART_COLORS.primary,
  submitted:       CHART_COLORS.purple,
  reviewed:        '#0891b2',
  signed_evaluatee:'#0284c7',
  signed_manager:  '#0369a1',
  signed_hr:       '#1e40af',
  validated:       CHART_COLORS.success,
  expired:         CHART_COLORS.danger,
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
      <p className="text-xs text-slate-500">{start} → {end}</p>
    </Link>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardHrPage() {
  const { campaigns } = useDashboardHr()
  const stats = useDashboardHrStats()
  const monthlyTrend = useMonthlyTrend()
  const analyticsSummary = useAnalyticsSummary()
  const { exportDashboardPdf, isExporting } = usePdfExport()

  const isLoading = campaigns.isLoading
  const isError   = campaigns.isError

  if (isLoading) {
    return (
      <div>
        <div className="h-8 w-64 bg-slate-200 rounded animate-pulse mb-8" />
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-200 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 h-64 bg-slate-200 rounded-xl animate-pulse" />
          <div className="lg:col-span-4 h-64 bg-slate-200 rounded-xl animate-pulse" />
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

  const campaignList  = campaigns.data?.data?.data ?? []
  const s             = stats.data
  const byStatus      = analyticsSummary.data?.byStatus as Record<string, number> | undefined
  const byDeptRaw     = analyticsSummary.data?.byDepartmentCompletion as Array<{
    department: string; total: number; submitted: number; validated: number; rate: number
  }> | undefined

  // ── Pie data (status distribution) ──────────────────────────────────────────
  const pieData = byStatus
    ? Object.entries(byStatus)
        .filter(([, v]) => (v as number) > 0)
        .map(([key, value]) => ({ name: key, value: value as number }))
    : []

  // ── Bar data (dept completion %) ─────────────────────────────────────────────
  const barData = (byDeptRaw ?? [])
    .slice(0, 8)
    .map(d => ({ department: d.department || 'N/A', rate: d.rate }))

  // ── PDF data ─────────────────────────────────────────────────────────────────
  const kpiRows = [
    { Indicateur: 'Collaborateurs actifs',          Valeur: s?.users.active ?? '—' },
    { Indicateur: 'Collaborateurs inactifs',         Valeur: s?.users.inactive ?? '—' },
    { Indicateur: 'Campagnes en cours',              Valeur: s?.campaigns.active ?? '—' },
    { Indicateur: 'Campagnes terminées',             Valeur: s?.campaigns.completed ?? '—' },
    { Indicateur: 'Campagnes en retard',             Valeur: s?.campaigns.overdue ?? '—' },
    { Indicateur: 'Taux de complétion éval. (%)',    Valeur: s?.evaluations.completionRate ?? '—' },
    { Indicateur: 'Évals signées des 2 côtés (%)',   Valeur: s?.evaluations.signedBothRate ?? '—' },
    { Indicateur: 'Temps moyen complétion (jours)',  Valeur: s?.evaluations.avgCompletionDays ?? '—' },
    { Indicateur: 'Demandes mobilité en attente',    Valeur: s?.mobility.pending ?? '—' },
  ]
  const deptRows = (byDeptRaw ?? []).map(d => ({
    Département:  d.department || 'N/A',
    Total:        d.total,
    Complétées:   d.validated,
    'Taux (%)':   d.rate,
  }))

  return (
    <div className="bg-slate-50 dark:bg-slate-900 min-h-full">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
          Tableau de bord RH
        </h1>
        <div className="flex items-center gap-3">
          <Link
            to="/campaigns/new"
            className="inline-flex items-center px-4 py-2 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium transition-colors"
          >
            + Nouvelle campagne
          </Link>
          <button
            onClick={() =>
              exportDashboardPdf({
                title: `Rapport RH — ${new Date().toLocaleDateString('fr-FR')}`,
                sections: [
                  { title: 'KPIs clés', data: kpiRows as Record<string, unknown>[] },
                  { title: 'Évaluations par département', data: deptRows as Record<string, unknown>[] },
                ],
              })
            }
            disabled={isExporting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isExporting ? <Spinner size="sm" /> : <Download className="w-4 h-4" />}
            Exporter PDF
          </button>
        </div>
      </div>

      {/* ── KPI grid — Row 1: collaborateurs + campagnes ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <KPICard
          title="Collaborateurs actifs"
          value={s?.users.active ?? '—'}
          subtitle={`Total : ${s?.users.total ?? '—'}`}
          icon={<UserCheck className="w-4 h-4" />}
          color="success"
          isLoading={stats.isLoading}
        />
        <KPICard
          title="Collaborateurs inactifs"
          value={s?.users.inactive ?? '—'}
          icon={<UserX className="w-4 h-4" />}
          color="danger"
          isLoading={stats.isLoading}
        />
        <KPICard
          title="Campagnes en cours"
          value={s?.campaigns.active ?? '—'}
          icon={<BarChart2 className="w-4 h-4" />}
          color="primary"
          isLoading={stats.isLoading}
        />
        <KPICard
          title="Campagnes terminées"
          value={s?.campaigns.completed ?? '—'}
          icon={<CheckCircle2 className="w-4 h-4" />}
          color="success"
          isLoading={stats.isLoading}
        />
        <KPICard
          title="Campagnes en retard"
          value={s?.campaigns.overdue ?? '—'}
          icon={<AlertCircle className="w-4 h-4" />}
          color="warning"
          isLoading={stats.isLoading}
        />
        <KPICard
          title="Mobilités en attente"
          value={s?.mobility.pending ?? '—'}
          icon={<Briefcase className="w-4 h-4" />}
          color="warning"
          isLoading={stats.isLoading}
        />
      </div>

      {/* ── KPI grid — Row 2: évaluations ── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          title="Taux de complétion"
          value={s?.evaluations.completionRate != null ? `${s.evaluations.completionRate}%` : '—'}
          icon={<TrendingUp className="w-5 h-5" />}
          color="purple"
          isLoading={stats.isLoading}
        />
        <KpiCard
          title="Signées des 2 côtés"
          value={s?.evaluations.signedBothRate != null ? `${s.evaluations.signedBothRate}%` : '—'}
          total={s?.evaluations.signedBoth}
          icon={<CheckCircle2 className="w-5 h-5" />}
          color="green"
          isLoading={stats.isLoading}
        />
        <KpiCard
          title="Évals en attente"
          value={s?.evaluations.pending ?? '—'}
          icon={<Clock className="w-5 h-5" />}
          color="orange"
          isLoading={stats.isLoading}
        />
        <KpiCard
          title="Temps moyen complétion"
          value={
            s?.evaluations.avgCompletionDays != null
              ? `${s.evaluations.avgCompletionDays}j`
              : '—'
          }
          icon={<Timer className="w-5 h-5" />}
          color="blue"
          isLoading={stats.isLoading}
        />
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        {/* LineChart — monthly trend */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Évolution des évaluations (6 mois)
          </h2>
          {monthlyTrend.isLoading ? (
            <div className="h-48 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" />
          ) : (monthlyTrend.data ?? []).length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-12">Aucune donnée mensuelle</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={monthlyTrend.data}>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="total"
                  name="Total"
                  stroke={CHART_COLORS.primary}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="completed"
                  name="Complétées"
                  stroke={CHART_COLORS.success}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* PieChart — status distribution */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Répartition par statut
          </h2>
          {analyticsSummary.isLoading ? (
            <div className="h-48 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" />
          ) : pieData.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-12">Aucune donnée</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="value"
                  nameKey="name"
                >
                  {pieData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={STATUS_COLORS[entry.name] ?? '#94a3b8'}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number, name: string) => [v, name]} />
                <Legend iconSize={10} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── BarChart — dept completion ── */}
      {barData.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 mb-6">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Top départements — taux de complétion (%)
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} layout="vertical" margin={{ left: 20 }}>
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
              <YAxis type="category" dataKey="department" tick={{ fontSize: 11 }} width={110} />
              <Tooltip formatter={(v: number) => [`${v}%`, 'Taux']} />
              <Bar dataKey="rate" name="Taux de complétion" fill={CHART_COLORS.primary} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Middle row : campagnes + alertes ── */}
      <div className="grid grid-cols-12 gap-6 mb-6">
        <div className="col-span-8 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Campagnes en cours</h2>
          {campaignList.length === 0 ? (
            <p className="text-sm text-slate-600 text-center py-8">Aucune campagne active</p>
          ) : (
            <div className="space-y-3">
              {campaignList.map((c) => <CampaignCard key={c.id} campaign={c} />)}
            </div>
          )}
        </div>

        <div className="lg:col-span-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Alertes</h2>
          <div className="space-y-3">
            {(s?.campaigns.overdue ?? 0) > 0 && (
              <div className="flex items-start gap-3 p-3 bg-warning-50 rounded-lg border border-warning-100">
                <AlertCircle className="w-4 h-4 text-warning-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-warning-700">
                    {s!.campaigns.overdue} campagne{s!.campaigns.overdue > 1 ? 's' : ''} en retard
                  </p>
                  <p className="text-xs text-warning-600 mt-0.5">
                    <Link to="/campaigns" className="underline">Voir les campagnes →</Link>
                  </p>
                </div>
              </div>
            )}
            {(s?.evaluations.pending ?? 0) > 0 && (
              <div className="flex items-start gap-3 p-3 bg-error-50 rounded-lg border border-error-100">
                <AlertCircle className="w-4 h-4 text-error-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-error-700">
                    {s!.evaluations.pending} évaluation{s!.evaluations.pending > 1 ? 's' : ''} en attente
                  </p>
                  <p className="text-xs text-error-600 mt-0.5">
                    <Link to="/evaluations" className="underline">Voir les évaluations →</Link>
                  </p>
                </div>
              </div>
            )}
            {(s?.mobility.pending ?? 0) > 0 && (
              <div className="flex items-start gap-3 p-3 bg-primary-50 rounded-lg border border-primary-100">
                <Briefcase className="w-4 h-4 text-primary-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-primary-700">
                    {s!.mobility.pending} demande{s!.mobility.pending > 1 ? 's' : ''} de mobilité
                  </p>
                  <p className="text-xs text-primary-600 mt-0.5">
                    <Link to="/mobility" className="underline">Voir les demandes →</Link>
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3 p-3 bg-error-50 rounded-lg border border-error-100">
              <AlertCircle className="w-4 h-4 text-error-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-error-700">Offboardings en cours</p>
                <p className="text-xs text-error-600 mt-0.5">
                  <Link to="/offboarding" className="underline">Voir les offboardings →</Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom row: stats + événements ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Stats rapides</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-slate-50 dark:border-slate-700">
              <span className="text-sm text-slate-600 dark:text-slate-400">Total évaluations</span>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {s?.evaluations.total ?? '—'}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-50 dark:border-slate-700">
              <span className="text-sm text-slate-600 dark:text-slate-400">Évaluations complétées</span>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {s?.evaluations.completed ?? '—'}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-slate-600 dark:text-slate-400">Total collaborateurs</span>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {s?.users.total ?? '—'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Prochains événements</h2>
            <Link to="/events" className="text-sm text-primary-600 hover:underline">Voir tous →</Link>
          </div>
          <p className="text-sm text-slate-600 text-center py-8 flex items-center justify-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            Aucun événement à venir
          </p>
        </div>
      </div>
    </div>
  )
}
