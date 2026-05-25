import { useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import {
  ClipboardList, TrendingUp, CheckCircle, BadgeCheck,
  Download, FileText,
} from 'lucide-react'
import { analyticsApi } from '../api/analytics'
import type { EvaluationStatus } from '../types'

const CHART_COLORS = {
  bar: 'var(--color-primary)',
  gridStroke: 'var(--color-slate-200)',
  axisText: 'var(--color-slate-500)',
}

const STATUS_COLORS: Record<EvaluationStatus, string> = {
  assigned:         'var(--color-slate-400)',
  in_progress:      'var(--color-blue-500)',
  submitted:        'var(--color-amber-500)',
  reviewed:         'var(--color-orange-500)',
  signed_evaluatee: 'var(--color-purple-500)',
  signed_manager:   'var(--color-indigo-500)',
  signed_hr:        'var(--color-violet-500)',
  validated:        'var(--color-green-500)',
  expired:          'var(--color-red-500)',
  archived:         'var(--color-slate-500)',
}

const STATUS_LABELS: Record<EvaluationStatus, string> = {
  assigned:         'Assigné',
  in_progress:      'En cours',
  submitted:        'Soumis',
  reviewed:         'Révisé',
  signed_evaluatee: 'Signé (évalué)',
  signed_manager:   'Signé (responsable)',
  signed_hr:        'Signé (RH)',
  validated:        'Validé',
  expired:          'Expiré',
  archived:         'Archivé',
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

export default function AnalyticsPage() {
  const [selectedCampaignId, setSelectedCampaignId] = useState('')
  const [isExporting, setIsExporting] = useState<'pdf' | 'csv' | null>(null)

  const { data: campaignsPage } = useQuery({
    queryKey: ['analytics-campaigns-list'],
    queryFn: () => analyticsApi.getCampaigns().then(r => r.data),
  })
  const campaigns = campaignsPage?.data

  const {
    data: summary,
    isLoading: summaryLoading,
    error: summaryError,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: ['analytics-summary'],
    queryFn: () => analyticsApi.getSummary().then(r => r.data),
    enabled: !selectedCampaignId,
  })

  const {
    data: campaignAnalytics,
    isLoading: campaignLoading,
    error: campaignError,
    refetch: refetchCampaign,
  } = useQuery({
    queryKey: ['analytics-campaign', selectedCampaignId],
    queryFn: () => analyticsApi.getCampaignAnalytics(selectedCampaignId).then(r => r.data),
    enabled: Boolean(selectedCampaignId),
    placeholderData: keepPreviousData,
  })

  const isLoading = selectedCampaignId ? campaignLoading : summaryLoading
  const hasError   = selectedCampaignId ? Boolean(campaignError) : Boolean(summaryError)

  const handleRetry = () => {
    if (selectedCampaignId) void refetchCampaign()
    else void refetchSummary()
  }

  // KPIs — unified view for both modes
  const totalEvaluations = selectedCampaignId
    ? (campaignAnalytics?.totalAssigned ?? 0)
    : (summary?.totalEvaluations ?? 0)
  const averageScore = selectedCampaignId
    ? campaignAnalytics?.averageScore
    : summary?.averageScore
  const completionRate = selectedCampaignId
    ? (campaignAnalytics?.completionRate ?? 0)
    : (summary?.completionRate ?? 0)
  const validatedCount = selectedCampaignId
    ? (campaignAnalytics?.validated ?? 0)
    : (summary?.byStatus?.validated ?? 0)

  // Status distribution (from global summary only)
  const statusChartData: PieEntry[] = summary?.byStatus
    ? (Object.entries(summary.byStatus) as Array<[EvaluationStatus, number]>)
        .filter(([, v]) => v > 0)
        .map(([key, value]) => ({
          name:  STATUS_LABELS[key],
          value,
          color: STATUS_COLORS[key],
        }))
    : []

  // Score distribution (from campaign analytics)
  const scoreChartData: BarEntry[] = campaignAnalytics?.scoreDistribution
    ? Object.entries(campaignAnalytics.scoreDistribution).map(([range, count]) => ({ range, count }))
    : []

  const handleExport = async (type: 'pdf' | 'csv') => {
    setIsExporting(type)
    try {
      const campaignId = selectedCampaignId || undefined
      const res = type === 'pdf'
        ? await analyticsApi.exportPdf(campaignId)
        : await analyticsApi.exportCsv(campaignId)
      const blob = res.data as Blob
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = type === 'pdf' ? 'analytics-rapport.pdf' : 'analytics-export.csv'
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setIsExporting(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-bold text-slate-900">Analytique RH</h1>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedCampaignId}
            onChange={e => setSelectedCampaignId(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Toutes les campagnes</option>
            {campaigns?.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <button
            onClick={() => void handleExport('pdf')}
            disabled={Boolean(isExporting)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            <FileText className="h-4 w-4" />
            {isExporting === 'pdf' ? 'Export…' : 'Exporter PDF'}
          </button>

          <button
            onClick={() => void handleExport('csv')}
            disabled={Boolean(isExporting)}
            className="inline-flex items-center gap-2 rounded-xl bg-primary-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-600 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {isExporting === 'csv' ? 'Export…' : 'Exporter CSV'}
          </button>
        </div>
      </div>

      {/* ── Error banner ───────────────────────────────────────────────────── */}
      {hasError && (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-600">Erreur lors du chargement des données analytiques.</p>
          <button
            onClick={handleRetry}
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
                value={totalEvaluations}
                icon={<ClipboardList className="h-6 w-6 text-primary-500" />}
                iconBg="bg-primary-100"
              />
              <KpiCard
                label="Score moyen"
                value={averageScore != null ? `${averageScore.toFixed(1)}/100` : '—'}
                icon={<TrendingUp className="h-6 w-6 text-green-600" />}
                iconBg="bg-green-100"
              />
              <KpiCard
                label="Taux de complétion"
                value={`${(completionRate * 100).toFixed(1)} %`}
                icon={<CheckCircle className="h-6 w-6 text-amber-500" />}
                iconBg="bg-amber-100"
              />
              <KpiCard
                label="Évals validées"
                value={validatedCount}
                icon={<BadgeCheck className="h-6 w-6 text-purple-500" />}
                iconBg="bg-purple-100"
              />
            </>
          )
        }
      </div>

      {/* ── Charts row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status donut */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-slate-700">Distribution des statuts</h2>
          {isLoading ? (
            <div className="h-72 animate-pulse rounded-xl bg-slate-200" />
          ) : statusChartData.length === 0 ? (
            <div className="flex h-72 items-center justify-center text-sm text-slate-600">
              Aucune donnée de statut disponible
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={288}>
              <PieChart>
                <Pie
                  data={statusChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  dataKey="value"
                  paddingAngle={2}
                >
                  {statusChartData.map((entry, i) => (
                    <Cell key={`s-${i}`} fill={entry.color} />
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
          ) : scoreChartData.length === 0 ? (
            <div className="flex h-72 items-center justify-center text-sm text-slate-600">
              Aucune donnée de score disponible
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={288}>
              <BarChart data={scoreChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_COLORS.gridStroke} />
                <XAxis
                  dataKey="range"
                  tick={{ fontSize: 12, fill: CHART_COLORS.axisText }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: CHART_COLORS.axisText }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip />
                <Bar dataKey="count" fill={CHART_COLORS.bar} radius={[4, 4, 0, 0]} name="Évaluations" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Top 5 performers ───────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-slate-700">Top 5 performances</h2>
        {isLoading ? (
          <div className="h-40 animate-pulse rounded-xl bg-slate-200" />
        ) : !summary?.topPerformers?.length ? (
          <p className="py-8 text-center text-sm text-slate-600">Aucune donnée disponible</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="w-10 pb-3 pr-4 text-left text-xs font-medium uppercase tracking-wide text-slate-500">#</th>
                  <th className="pb-3 pr-4 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Collaborateur</th>
                  <th className="pb-3 pr-4 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Score</th>
                  <th className="pb-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Campagne</th>
                </tr>
              </thead>
              <tbody>
                {summary.topPerformers.slice(0, 5).map((p, i) => (
                  <tr key={p.userId} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                    <td className="py-3 pr-4 font-medium text-slate-500">{i + 1}</td>
                    <td className="py-3 pr-4 font-medium text-slate-800">{p.name}</td>
                    <td className="py-3 pr-4">
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                        {p.score}/100
                      </span>
                    </td>
                    <td className="py-3 text-slate-500">{p.campaignName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Department completion ──────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-slate-700">Taux de complétion par département</h2>
        {isLoading ? (
          <div className="h-40 animate-pulse rounded-xl bg-slate-200" />
        ) : !summary?.byDepartmentCompletion?.length ? (
          <p className="py-8 text-center text-sm text-slate-600">Aucune donnée disponible</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="pb-3 pr-4 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Département</th>
                  <th className="pb-3 pr-4 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Total</th>
                  <th className="pb-3 pr-4 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Soumis</th>
                  <th className="pb-3 pr-4 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Validés</th>
                  <th className="min-w-[200px] pb-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">%</th>
                </tr>
              </thead>
              <tbody>
                {summary.byDepartmentCompletion.map(d => (
                  <tr key={d.department} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                    <td className="py-3 pr-4 font-medium text-slate-800">{d.department}</td>
                    <td className="py-3 pr-4 text-slate-600">{d.total}</td>
                    <td className="py-3 pr-4 text-slate-600">{d.submitted}</td>
                    <td className="py-3 pr-4 text-slate-600">{d.validated}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <span className="w-14 text-right text-sm text-slate-700">{d.rate.toFixed(1)} %</span>
                        <div className="h-1 min-w-[80px] flex-1 rounded bg-slate-100">
                          <div
                            className="h-1 rounded bg-primary-500"
                            style={{ width: `${Math.min(d.rate, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
