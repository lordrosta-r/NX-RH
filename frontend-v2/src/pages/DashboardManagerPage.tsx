import { Link } from 'react-router-dom'
import { ClipboardList, Users, Calendar, TrendingUp, AlertTriangle, PenLine, CheckCircle2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { useDashboardManager, useDashboardManagerStats } from '../hooks/useDashboardByRole'
import { KpiCard } from '../components/KpiCard'
import { StatusBadge } from '../components/ui'
import { eventsApi } from '../api/events'
import { campaignsApi } from '../api/campaigns'
import type { Evaluation, Campaign, DashboardManagerStats } from '../types'
import { getCampaignName } from '../types'

// ─── Design colours ───────────────────────────────────────────────────────────
const EVAL_STATUS_COLORS: Record<string, string> = {
  assigned:    '#d97706',
  in_progress: '#2563eb',
  submitted:   '#7c3aed',
  reviewed:    '#0891b2',
  validated:   '#16a34a',
  overdue:     '#dc2626',
}



function progressWidth(ev: Evaluation): string {
  switch (ev.status) {
    case 'validated':        return '100%'
    case 'submitted':        return '75%'
    case 'in_progress':      return '40%'
    default:                 return '10%'
  }
}

function EvalsToComplete({ evaluations }: { evaluations: Evaluation[] }) {
  const pending = evaluations.filter(e =>
    e.status === 'assigned' || e.status === 'in_progress'
  )

  if (pending.length === 0) {
    return (
      <p className="text-sm text-slate-600 text-center py-4">
        Aucune évaluation à compléter
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {pending.map(ev => (
        <div
          key={ev.id}
          className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold text-slate-900 text-sm">{ev.evaluateeId}</p>
              <p className="text-xs text-slate-500 mt-0.5">Campagne : {getCampaignName(ev.campaignId)}</p>
            </div>
            <StatusBadge status={ev.status} />
          </div>
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-slate-500">Deadline : —</span>
            <Link
              to={`/evaluations/${ev.id}`}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium hover:underline"
            >
              Remplir →
            </Link>
          </div>
        </div>
      ))}
    </div>
  )
}

function MyTeam({ evaluations }: { evaluations: Evaluation[] }) {
  if (evaluations.length === 0) {
    return (
      <p className="text-sm text-slate-600 text-center py-4">
        Aucun membre dans l'équipe
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {evaluations.map(ev => (
        <div key={ev.id} className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 text-xs font-semibold flex items-center justify-center flex-shrink-0">
            {ev.evaluateeId.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-medium text-slate-700 truncate">{ev.evaluateeId}</p>
              <StatusBadge status={ev.status} />
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5">
              <div
                className="bg-primary-500 h-1.5 rounded-full transition-all"
                style={{ width: progressWidth(ev) }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function CampaignsSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />
      ))}
    </div>
  )
}

function ActiveCampaigns() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-manager-campaigns'],
    queryFn: () => campaignsApi.getCampaigns({ status: 'active', limit: 5 }),
  })

  const campaigns: Campaign[] = data?.data?.data ?? []

  if (isLoading) return <CampaignsSkeleton />

  if (campaigns.length === 0) {
    return (
      <p className="text-sm text-slate-600 text-center py-4">
        Aucune campagne active
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {campaigns.map(c => {
        const pct =
          c.completionPct != null
            ? c.completionPct
            : c.stats && c.stats.total > 0
            ? Math.round(((c.stats.submitted + c.stats.validated) / c.stats.total) * 100)
            : 0

        return (
          <div
            key={c.id}
            className="flex items-center gap-4 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{c.name}</p>
              {c.endDate && (
                <p className="text-xs text-slate-500 mt-0.5">
                  {'Cloture : '}
                  {new Date(c.endDate).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              )}
            </div>
            <div className="w-40 flex-shrink-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-500">Progression</span>
                <span className="text-xs font-semibold text-slate-700">{pct}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5">
                <div
                  className="bg-primary-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
            <Link
              to={`/campaigns/${c.id}`}
              className="text-xs text-primary-600 hover:text-primary-700 font-medium hover:underline flex-shrink-0"
            >
              Voir
            </Link>
          </div>
        )
      })}
    </div>
  )
}

// ─── Pending signatures list ──────────────────────────────────────────────────
function PendingSignaturesList({ statsData }: { statsData: DashboardManagerStats | undefined }) {
  const list = (statsData?.pendingSignatures ?? []).slice(0, 5)

  if (list.length === 0) {
    return (
      <p className="text-sm text-slate-600 dark:text-slate-400 text-center py-4">
        Aucune évaluation en attente de votre signature
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {list.map(ev => {
        const evaluatee = typeof ev.evaluateeId === 'object'
          ? `${ev.evaluateeId.firstName} ${ev.evaluateeId.lastName}`
          : ev.evaluateeId
        const campaign = typeof ev.campaignId === 'object'
          ? ev.campaignId.name
          : ev.campaignId
        const signedAt = ev.signedByEvaluateeAt
          ? new Date(ev.signedByEvaluateeAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
          : '—'

        return (
          <div
            key={ev._id ?? ev.id}
            className="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{evaluatee}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {campaign} · signé le {signedAt}
              </p>
            </div>
            <Link
              to={`/evaluations/${ev._id ?? ev.id}`}
              className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium hover:underline flex-shrink-0"
            >
              <PenLine className="w-3 h-3" />
              Signer
            </Link>
          </div>
        )
      })}
    </div>
  )
}

// ─── Team evaluation status pie chart ────────────────────────────────────────
function TeamStatusChart({ statsData }: { statsData: DashboardManagerStats | undefined }) {
  if (!statsData) return <div className="h-40 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" />

  const ev = statsData.evaluations
  const data = [
    { name: 'En attente',  value: ev.pending,        color: EVAL_STATUS_COLORS.assigned },
    { name: 'Complétées',  value: ev.completed,       color: EVAL_STATUS_COLORS.validated },
    { name: 'En retard',   value: ev.overdue,         color: EVAL_STATUS_COLORS.overdue },
    { name: 'Signées',     value: ev.signedByManager, color: EVAL_STATUS_COLORS.signed_manager ?? '#1e40af' },
  ].filter(d => d.value > 0)

  if (data.length === 0) {
    return <p className="text-sm text-slate-500 text-center py-8">Aucune donnée d'équipe</p>
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" nameKey="name">
          {data.map(entry => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip formatter={(v: number, name: string) => [v, name]} />
        <Legend iconSize={10} />
      </PieChart>
    </ResponsiveContainer>
  )
}

export default function DashboardManagerPage() {
  const { evaluations } = useDashboardManager()
  const stats = useDashboardManagerStats()

  const { data: eventsData } = useQuery({
    queryKey: ['dashboard-manager-events'],
    queryFn: () => eventsApi.getEvents({ limit: 3 }),
  })
  const upcomingEvents = eventsData?.data?.data ?? []

  if (evaluations.isLoading) {
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

  const toCompleteCount = evalList.filter(
    e => e.status === 'assigned' || e.status === 'in_progress'
  ).length
  const waitingCount = evalList.filter(e => e.status === 'assigned').length

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Tableau de bord — Mon équipe</h1>
          <p className="text-slate-500 mt-1">Suivez et gérez les évaluations de votre équipe</p>
        </div>
        <Link
          to="/evaluations"
          className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          Mes évaluations →
        </Link>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {stats.isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-28 bg-gray-200 animate-pulse rounded-xl" />
          ))
        ) : (
          <>
            <KpiCard
              title="Évals à compléter"
              value={stats.data?.evaluations?.pending ?? toCompleteCount}
              icon={<ClipboardList size={18} />}
              color="orange"
              isLoading={stats.isLoading}
            />
            <KpiCard
              title="Taux de complétion"
              value={
                stats.data?.completionRate != null
                  ? `${stats.data.completionRate}%`
                  : '—'
              }
              icon={<TrendingUp size={18} />}
              color="green"
              isLoading={stats.isLoading}
            />
            <KpiCard
              title="Taille de l'équipe"
              value={stats.data?.teamSize ?? waitingCount}
              icon={<Users size={18} />}
              color="blue"
              isLoading={stats.isLoading}
            />
            <KpiCard
              title="En retard"
              value={stats.data?.evaluations?.overdue ?? 0}
              icon={<AlertTriangle size={18} />}
              color="red"
              isLoading={stats.isLoading}
            />
            <KpiCard
              title="Signées"
              value={stats.data?.evaluations?.signedByManager ?? 0}
              icon={<CheckCircle2 size={18} />}
              color="green"
              isLoading={stats.isLoading}
            />
          </>
        )}
      </div>

      {/* Middle row: evals to complete + my team */}
      <div className="grid grid-cols-12 gap-6 mb-6">
        <div className="col-span-7 bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Évaluations à compléter</h2>
          <EvalsToComplete evaluations={evalList} />
        </div>

        <div className="col-span-5 bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Mon équipe</h2>
          <MyTeam evaluations={evalList} />
        </div>
      </div>

      {/* Campagnes actives */}
      <div className="grid grid-cols-12 gap-6 mb-6">
        <div className="col-span-12 bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Campagnes actives</h2>
            <Link to="/campaigns" className="text-xs text-primary-600 hover:underline">
              Voir toutes →
            </Link>
          </div>
          <ActiveCampaigns />
        </div>
      </div>

      {/* En attente de signature */}
      <div className="grid grid-cols-12 gap-6 mb-6">
        <div className="col-span-12 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              En attente de signature
            </h2>
            <Link to="/evaluations" className="text-xs text-primary-600 hover:underline">
              Voir toutes →
            </Link>
          </div>
          <PendingSignaturesList statsData={stats.data} />
        </div>
      </div>

      {/* Upcoming events */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Prochains événements</h2>
            <Link to="/events" className="text-xs text-primary-600 hover:underline">Voir tout →</Link>
          </div>
          {upcomingEvents.length === 0 ? (
            <p className="text-sm text-slate-600 text-center py-4">Aucun événement à venir.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {upcomingEvents.map(ev => (
                <li key={ev.id} className="flex items-center gap-3 py-3">
                  <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
                    <Calendar size={15} className="text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{ev.title}</p>
                    {(ev.startDate ?? ev.date) && (
                      <p className="text-xs text-slate-500">{new Date(ev.startDate ?? ev.date!).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    )}
                  </div>
                  <Link to={`/events/${ev.id}`} className="text-xs text-primary-600 hover:underline flex-shrink-0">Voir</Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
