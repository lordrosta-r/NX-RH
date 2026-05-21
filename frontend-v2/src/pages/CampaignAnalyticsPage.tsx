import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { BarChart2, FileText, Download, ChevronRight } from 'lucide-react'
import { analyticsApi } from '../api/analytics'

const CHART_COLORS = {
  track: '#f1f5f9',
  gauge: '#3b82f6',
  score: {
    veryLow:  '#ef4444',
    low:      '#f97316',
    medium:   '#eab308',
    good:     '#22c55e',
    veryGood: '#10b981',
  },
  status: {
    assigned:    '#94a3b8',
    in_progress: '#3b82f6',
    submitted:   '#f59e0b',
    validated:   '#22c55e',
  },
}

// ─── DonutChart ───────────────────────────────────────────────────────────────
interface DonutSegment { label: string; value: number; color: string }

function DonutChart({ data }: { data: DonutSegment[] }) {
  const total       = data.reduce((s, d) => s + d.value, 0)
  const radius      = 60
  const circumference = 2 * Math.PI * radius
  let accumulated   = 0

  return (
    <div className="flex items-center gap-6 flex-wrap">
      <svg width="160" height="160" viewBox="0 0 160 160" className="flex-shrink-0">
        <circle cx="80" cy="80" r={radius} fill="none" strokeWidth="20" stroke={CHART_COLORS.track} />
        {total > 0 && data.map((segment, i) => {
          const dash   = (segment.value / total) * circumference
          const gap    = circumference - dash
          const offset = circumference - accumulated
          accumulated += dash
          return (
            <circle
              key={i}
              cx="80" cy="80" r={radius}
              fill="none" strokeWidth="20"
              stroke={segment.color}
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={offset}
              transform="rotate(-90 80 80)"
            />
          )
        })}
        <text x="80" y="80" textAnchor="middle" dy="0.3em" fontSize="24" fontWeight="bold" fill="#0f172a">
          {total}
        </text>
      </svg>
      <div className="space-y-2">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-sm min-w-[140px]">
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
            <span className="text-slate-600">{d.label}</span>
            <span className="font-semibold text-slate-900 ml-auto pl-4">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── ScoreHistogram ───────────────────────────────────────────────────────────
function ScoreHistogram({ distribution }: { distribution: Record<string, number> }) {
  const bars = [
    { range: '0-2',  count: distribution['0-2']  || 0, color: CHART_COLORS.score.veryLow  },
    { range: '3-4',  count: distribution['3-4']  || 0, color: CHART_COLORS.score.low      },
    { range: '5-6',  count: distribution['5-6']  || 0, color: CHART_COLORS.score.medium   },
    { range: '7-8',  count: distribution['7-8']  || 0, color: CHART_COLORS.score.good     },
    { range: '9-10', count: distribution['9-10'] || 0, color: CHART_COLORS.score.veryGood },
  ]
  const max = Math.max(...bars.map(b => b.count), 1)

  return (
    <div className="flex items-end gap-3 h-32">
      {bars.map(bar => (
        <div key={bar.range} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-xs text-slate-500">{bar.count}</span>
          <div
            className="w-full rounded-t-sm transition-all"
            style={{
              height:          `${(bar.count / max) * 100}%`,
              backgroundColor: bar.color,
              minHeight:       bar.count ? '4px' : '0',
            }}
          />
          <span className="text-xs text-slate-400">{bar.range}</span>
        </div>
      ))}
    </div>
  )
}

// ─── SemiCircleGauge ──────────────────────────────────────────────────────────
function SemiCircleGauge({ value, max = 10 }: { value: number; max?: number }) {
  const radius      = 55
  const circumference = Math.PI * radius
  const filled      = Math.min(Math.max(value / max, 0), 1) * circumference

  return (
    <svg width="160" height="90" viewBox="0 0 160 90">
      <path
        d={`M 25,80 A ${radius},${radius} 0 0 1 135,80`}
        fill="none" stroke={CHART_COLORS.track} strokeWidth="14" strokeLinecap="round"
      />
      <path
        d={`M 25,80 A ${radius},${radius} 0 0 1 135,80`}
        fill="none" stroke={CHART_COLORS.gauge} strokeWidth="14" strokeLinecap="round"
        strokeDasharray={`${filled} ${circumference}`}
        strokeDashoffset="0"
      />
    </svg>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CampaignAnalyticsPage() {
  const { id } = useParams<{ id: string }>()

  const { data: analytics, isLoading, isError, refetch } = useQuery({
    queryKey: ['campaign-analytics', id],
    queryFn:  () => analyticsApi.getCampaignAnalytics(id!).then(r => r.data),
    enabled:  !!id,
  })

  const campaignName = analytics?.campaignName ?? '…'

  const statusData = analytics?.statusDistribution ?? {}
  const donutData: DonutSegment[] = [
    { label: 'Assignées', value: statusData.assigned    ?? 0, color: CHART_COLORS.status.assigned    },
    { label: 'En cours',  value: statusData.in_progress ?? 0, color: CHART_COLORS.status.in_progress },
    { label: 'Soumises',  value: statusData.submitted   ?? 0, color: CHART_COLORS.status.submitted   },
    { label: 'Validées',  value: statusData.validated   ?? 0, color: CHART_COLORS.status.validated   },
  ]

  const departmentCompletion = (analytics?.byDepartment ?? []).map(d => ({
    ...d,
    percentage: d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0,
  }))

  const avgScore = analytics?.averageScore ?? 0

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <nav className="text-sm text-slate-500 mb-1 flex items-center gap-1">
            <Link to="/" className="hover:text-slate-700">Accueil</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link to="/campaigns" className="hover:text-slate-700">Campagnes</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link to={`/campaigns/${id}`} className="hover:text-slate-700">{campaignName}</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-700">Analytique</span>
          </nav>
          <h1 className="text-2xl font-bold text-slate-900">
            Analytique — {campaignName}
          </h1>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => window.open(`/api/analytics/export/pdf?campaignId=${id}`)}
            disabled={isLoading}
            className="flex items-center gap-2 border border-slate-200 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            <FileText className="w-4 h-4" /> Exporter PDF
          </button>
          <button
            onClick={() => window.open(`/api/analytics/export/csv?campaignId=${id}`)}
            disabled={isLoading}
            className="flex items-center gap-2 border border-slate-200 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> Exporter CSV
          </button>
        </div>
      </div>

      {/* Error state */}
      {isError && (
        <div className="border-l-4 border-error-500 bg-error-50 p-4 rounded-lg mb-6">
          <p className="text-sm text-error-700 font-medium">Impossible de charger les données analytiques</p>
          <button onClick={() => refetch()} className="mt-2 text-sm text-error-600 underline">
            Réessayer
          </button>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && !analytics && (
        <div className="text-center py-16">
          <BarChart2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">Aucune donnée analytique disponible.</p>
          <p className="text-xs text-slate-400 mt-2">Lancez la campagne pour commencer.</p>
        </div>
      )}

      {analytics && (
        <>
          {/* Row 1 : Donut + Histogramme */}
          <div className="grid grid-cols-12 gap-6 mb-6">
            <div className="col-span-12 md:col-span-6 bg-white rounded-xl shadow-sm border border-slate-100 p-6">
              <p className="text-sm font-medium text-slate-700 mb-4">Distribution des statuts</p>
              <DonutChart data={donutData} />
            </div>

            <div className="col-span-12 md:col-span-6 bg-white rounded-xl shadow-sm border border-slate-100 p-6">
              <p className="text-sm font-medium text-slate-700 mb-4">Distribution des scores</p>
              <ScoreHistogram distribution={analytics.scoreDistribution ?? {}} />
            </div>
          </div>

          {/* Row 2 : Score moyen + Tableau */}
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 md:col-span-4 bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col items-center justify-center">
              <p className="text-sm font-medium text-slate-700 mb-3">Score moyen global</p>
              <SemiCircleGauge value={avgScore} />
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-4xl font-bold text-slate-900">
                  {avgScore > 0 ? avgScore.toFixed(1) : '—'}
                </span>
                <span className="text-slate-400 text-lg">/10</span>
              </div>
            </div>

            <div className="col-span-12 md:col-span-8 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-4 border-b border-slate-100">
                <p className="text-sm font-medium text-slate-700">Complétion par département</p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs text-slate-500 uppercase">
                    <th className="px-4 py-3 text-left">Département</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-right">Complété</th>
                    <th className="px-4 py-3 text-right">%</th>
                  </tr>
                </thead>
                <tbody>
                  {departmentCompletion.map(row => (
                    <tr key={row.department} className="border-t border-slate-50 hover:bg-slate-50/50">
                      <td className="px-4 py-3 text-slate-700">{row.department}</td>
                      <td className="px-4 py-3 text-right text-slate-900 font-medium">{row.total}</td>
                      <td className="px-4 py-3 text-right text-slate-900 font-medium">{row.completed}</td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`font-semibold ${
                            row.percentage >= 80
                              ? 'text-success-600'
                              : row.percentage >= 50
                              ? 'text-warning-600'
                              : 'text-error-600'
                          }`}
                        >
                          {row.percentage}%
                        </span>
                      </td>
                    </tr>
                  ))}
                  {departmentCompletion.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-400 text-sm">
                        Aucune donnée disponible
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
