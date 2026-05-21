import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import {
  ArrowLeft, ClipboardList, CheckCircle, TrendingUp, BadgeCheck,
} from 'lucide-react'
import { analyticsApi } from '../api/analytics'

const CAMPAIGN_STATUS_COLORS = {
  notStarted: 'var(--color-slate-400)',
  submitted:  'var(--color-amber-500)',
  validated:  'var(--color-green-500)',
}

interface KpiCardProps {
  label: string
  value: string | number
  icon: React.ReactNode
  iconBg: string
}

function KpiCard({ label, value, icon, iconBg }: KpiCardProps) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-3xl font-bold text-slate-900 leading-tight">{value}</p>
      </div>
    </div>
  )
}

function KpiSkeleton() {
  return <div className="h-24 animate-pulse bg-slate-200 rounded-2xl" />
}

interface PieEntry {
  name: string
  value: number
  color: string
}

interface BarEntry {
  range: string
  count: number
}

export default function AnalyticsCampaignPage() {
  const { id } = useParams<{ id: string }>()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['analytics-campaign-detail', id],
    queryFn:  () => analyticsApi.getCampaignAnalytics(id!).then(r => r.data),
    enabled:  Boolean(id),
  })

  const totalAssigned       = data?.totalAssigned ?? 0
  const submitted           = data?.submitted    ?? 0
  const validated           = data?.validated    ?? 0
  const completionPct       = ((data?.completionRate ?? 0) * 100).toFixed(1)
  const submittedNotValidated = Math.max(0, submitted - validated)
  const notStarted            = Math.max(0, totalAssigned - submitted)

  const statusData: PieEntry[] = [
    { name: 'Non commencé', value: notStarted,            color: CAMPAIGN_STATUS_COLORS.notStarted },
    { name: 'Soumis',       value: submittedNotValidated, color: CAMPAIGN_STATUS_COLORS.submitted  },
    { name: 'Validé',       value: validated,             color: CAMPAIGN_STATUS_COLORS.validated  },
  ].filter(d => d.value > 0)

  const scoreData: BarEntry[] = data?.scoreDistribution
    ? Object.entries(data.scoreDistribution).map(([range, count]) => ({ range, count }))
    : []

  return (
    <div className="space-y-6">
      {/* ── Breadcrumb + title ─────────────────────────────────────────────── */}
      <div>
        <Link
          to="/analytics"
          className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 mb-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à l'analytique
        </Link>
        <nav className="mb-1 text-xs text-slate-400">
          Accueil &rsaquo; Analytique &rsaquo; Campagne
        </nav>
        <h1 className="text-3xl font-bold text-slate-900">
          {isLoading ? 'Chargement…' : `Analytique — Campagne ${id}`}
        </h1>
      </div>

      {/* ── Error ─────────────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-600">Erreur lors du chargement des données de la campagne.</p>
          <button
            onClick={() => void refetch()}
            className="ml-4 text-sm font-medium text-red-600 hover:underline"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* ── KPI cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)
          : (
            <>
              <KpiCard
                label="Total évaluations"
                value={totalAssigned}
                icon={<ClipboardList className="h-6 w-6 text-primary-500" />}
                iconBg="bg-primary-100"
              />
              <KpiCard
                label="Complétées"
                value={submitted}
                icon={<CheckCircle className="h-6 w-6 text-amber-500" />}
                iconBg="bg-amber-100"
              />
              <KpiCard
                label="Score moyen"
                value={data?.averageScore != null ? `${data.averageScore.toFixed(1)}/100` : '—'}
                icon={<TrendingUp className="h-6 w-6 text-green-600" />}
                iconBg="bg-green-100"
              />
              <KpiCard
                label="Taux de complétion"
                value={`${completionPct} %`}
                icon={<BadgeCheck className="h-6 w-6 text-purple-500" />}
                iconBg="bg-purple-100"
              />
            </>
          )
        }
      </div>

      {/* ── Charts ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status donut */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-slate-700">Distribution des statuts</h2>
          {isLoading ? (
            <div className="h-72 animate-pulse rounded-xl bg-slate-200" />
          ) : statusData.length === 0 ? (
            <div className="flex h-72 items-center justify-center text-sm text-slate-400">
              Aucune donnée disponible
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={288}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  dataKey="value"
                  paddingAngle={2}
                >
                  {statusData.map((entry, i) => (
                    <Cell key={`c-${i}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Score bar */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-slate-700">Distribution des scores</h2>
          {isLoading ? (
            <div className="h-72 animate-pulse rounded-xl bg-slate-200" />
          ) : scoreData.length === 0 ? (
            <div className="flex h-72 items-center justify-center text-sm text-slate-400">
              Aucune donnée de score disponible
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={288}>
              <BarChart data={scoreData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-slate-200)" />
                <XAxis
                  dataKey="range"
                  tick={{ fontSize: 12, fill: 'var(--color-slate-500)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: 'var(--color-slate-500)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip />
                <Bar dataKey="count" fill="var(--color-primary)" radius={[4, 4, 0, 0]} name="Évaluations" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Department completion ──────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-slate-700">Taux de complétion par département</h2>
        {isLoading ? (
          <div className="h-40 animate-pulse rounded-xl bg-slate-200" />
        ) : !data?.byDepartment?.length ? (
          <p className="py-8 text-center text-sm text-slate-400">Aucune donnée disponible</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="pb-3 pr-4 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Département</th>
                  <th className="pb-3 pr-4 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Total</th>
                  <th className="pb-3 pr-4 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Complétés</th>
                  <th className="min-w-[200px] pb-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">%</th>
                </tr>
              </thead>
              <tbody>
                {data.byDepartment.map(d => {
                  const rate = d.total > 0 ? (d.completed / d.total) * 100 : 0
                  return (
                    <tr key={d.department} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                      <td className="py-3 pr-4 font-medium text-slate-800">{d.department}</td>
                      <td className="py-3 pr-4 text-slate-600">{d.total}</td>
                      <td className="py-3 pr-4 text-slate-600">{d.completed}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <span className="w-14 text-right text-sm text-slate-700">{rate.toFixed(1)} %</span>
                          <div className="h-1 min-w-[80px] flex-1 rounded bg-slate-100">
                            <div
                              className="h-1 rounded bg-primary-500"
                              style={{ width: `${Math.min(rate, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
