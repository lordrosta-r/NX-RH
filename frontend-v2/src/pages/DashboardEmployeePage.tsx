import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ClipboardList, Check, Calendar, BookOpen } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import client from '../api/client'
import { eventsApi } from '../api/events'
import { resourcesApi } from '../api/resources'
import type { Evaluation, EvaluationStatus } from '../types'
import { getCampaignName } from '../types'

// ─── StatusBadge (inline) ────────────────────────────────────────────────────

const evalStatusLabels: Record<EvaluationStatus, string> = {
  assigned: 'Assignée',
  in_progress: 'En cours',
  submitted: 'Soumise',
  reviewed: 'Revue',
  signed_evaluatee: 'Signée (évalué)',
  signed_manager: 'Signée (manager)',
  signed_hr: 'Signée (RH)',
  validated: 'Validée',
  expired: 'Expirée',
  archived: 'Archivée',
}

const evalStatusColors: Record<EvaluationStatus, string> = {
  assigned: 'bg-warning-50 text-warning-700',
  in_progress: 'bg-primary-50 text-primary-700',
  submitted: 'bg-blue-50 text-blue-700',
  reviewed: 'bg-blue-50 text-blue-700',
  signed_evaluatee: 'bg-blue-50 text-blue-700',
  signed_manager: 'bg-blue-50 text-blue-700',
  signed_hr: 'bg-blue-50 text-blue-700',
  validated: 'bg-success-50 text-success-700',
  expired: 'bg-slate-100 text-slate-500',
  archived: 'bg-slate-100 text-slate-400',
}

function EvalStatusBadge({ status }: { status: EvaluationStatus }) {
  const color = evalStatusColors[status] ?? 'bg-slate-100 text-slate-600'
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {evalStatusLabels[status] ?? status}
    </span>
  )
}

// ─── Border color helper ──────────────────────────────────────────────────────

function evalBorderColor(status: EvaluationStatus): string {
  if (status === 'in_progress') return 'border-primary-500'
  if (status === 'assigned') return 'border-warning-500'
  return 'border-success-500'
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DashboardEmployeePage() {
  const { user } = useAuth()

  const evaluations = useQuery({
    queryKey: ['dashboard-employee', 'evaluations'],
    queryFn: () =>
      client
        .get<{ data: Evaluation[]; total: number }>(
          '/api/evaluations?evaluateeId=me&status=in_progress,assigned'
        )
        .then((r) => r.data),
  })

  const history = useQuery({
    queryKey: ['dashboard-employee', 'history'],
    queryFn: () =>
      client
        .get<{ data: Evaluation[]; total: number }>(
          '/api/evaluations?evaluateeId=me&status=validated&limit=5'
        )
        .then((r) => r.data),
  })

  const { data: eventsData } = useQuery({
    queryKey: ['dashboard-employee-events'],
    queryFn: () => eventsApi.getEvents({ limit: 3 }),
  })
  const upcomingEvents = eventsData?.data?.data ?? []

  const { data: resourcesData } = useQuery({
    queryKey: ['dashboard-employee-resources'],
    queryFn: () => resourcesApi.getResources({ limit: 3, publishedOnly: true }),
  })
  const recentResources = resourcesData?.data?.data ?? []

  const showOnboarding = !!(user?.isActive && !user?.managerId)

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* ── Row 1 ─────────────────────────────────────────────────────── */}

      {/* Illustration + accueil */}
      <div className="col-span-12 lg:col-span-4">
        <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl p-8 text-white flex flex-col items-center justify-center h-full text-center min-h-[220px]">
          <svg className="w-24 h-24 mb-6 text-white/70" fill="none" viewBox="0 0 100 100">
            <circle cx="50" cy="30" r="18" fill="currentColor" opacity="0.8" />
            <ellipse cx="50" cy="72" rx="22" ry="18" fill="currentColor" opacity="0.6" />
            <line x1="28" y1="60" x2="15" y2="75" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.7" />
            <line x1="72" y1="60" x2="85" y2="75" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.7" />
          </svg>
          <h2 className="text-xl font-bold mb-2">Bonjour, {user?.firstName}</h2>
          <p className="text-white/70 text-sm">{user?.position ?? 'Votre espace personnel NX-RH'}</p>
          <p className="text-white/50 text-xs mt-4">{user?.department ?? ''}</p>
        </div>
      </div>

      {/* Mes évaluations en cours */}
      <div className="col-span-12 lg:col-span-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 h-full">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Mes évaluations en cours</h2>
            <Link to="/evaluations" className="text-sm text-primary-600 hover:underline">
              Tout voir →
            </Link>
          </div>

          {evaluations.isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-slate-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (evaluations.data?.data?.length ?? 0) === 0 ? (
            <div className="text-center py-8">
              <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">Aucune évaluation en cours</p>
            </div>
          ) : (
            <div className="space-y-3">
              {evaluations.data?.data?.map((evaluation) => (
                <div
                  key={evaluation.id}
                  className={`border-l-4 ${evalBorderColor(evaluation.status)} bg-slate-50 rounded-lg p-4 flex items-center justify-between`}
                >
                  <div>
                    <p className="font-medium text-slate-900 text-sm">
                      Campagne : {getCampaignName(evaluation.campaignId)}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <EvalStatusBadge status={evaluation.status} />
                    </div>
                  </div>
                  <Link
                    to={`/evaluations/${evaluation.id}`}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium hover:underline flex-shrink-0 ml-4"
                  >
                    {evaluation.status === 'assigned' ? 'Commencer →' : 'Continuer →'}
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Row 2 ─────────────────────────────────────────────────────── */}

      {/* Progression onboarding (uniquement si nouvel arrivant) */}
      {showOnboarding && (
        <div className="col-span-12 lg:col-span-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-3">Mon intégration</h2>
            <div className="space-y-2">
              {['Profil complété', 'Premier entretien planifié', 'Documents signés'].map(
                (step, i) => (
                  <div key={step} className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                        i < 1 ? 'bg-success-500' : 'bg-slate-200'
                      }`}
                    >
                      {i < 1 ? <Check className="w-3 h-3 text-white" /> : null}
                    </div>
                    <span
                      className={`text-sm ${
                        i < 1 ? 'text-slate-700 line-through' : 'text-slate-500'
                      }`}
                    >
                      {step}
                    </span>
                  </div>
                )
              )}
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Progression</span>
                <span>33%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-primary-500 h-2 rounded-full" style={{ width: '33%' }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Prochains événements */}
      <div className={`col-span-12 ${showOnboarding ? 'lg:col-span-4' : 'lg:col-span-6'}`}>
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-slate-900">Prochains événements</h2>
            <Link to="/events" className="text-xs text-primary-600 hover:underline">
              Voir tout →
            </Link>
          </div>
          {upcomingEvents.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">Aucun événement à venir.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {upcomingEvents.map(ev => (
                <li key={ev.id} className="flex items-center gap-3 py-2">
                  <Calendar size={14} className="text-primary-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{ev.title}</p>
                    {(ev.startDate ?? ev.date) && (
                      <p className="text-xs text-slate-400">{new Date(ev.startDate ?? ev.date!).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Ressources récentes */}
      <div className={`col-span-12 ${showOnboarding ? 'lg:col-span-4' : 'lg:col-span-6'}`}>
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-slate-900">Ressources récentes</h2>
            <Link to="/resources" className="text-xs text-primary-600 hover:underline">
              Voir tout →
            </Link>
          </div>
          {recentResources.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">Aucune ressource disponible.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentResources.map(r => (
                <li key={r.id} className="flex items-center gap-3 py-2">
                  <BookOpen size={14} className="text-slate-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{r.title}</p>
                    {r.category && <p className="text-xs text-slate-400">{r.category}</p>}
                  </div>
                  <Link to={`/resources/${r.id}`} className="text-xs text-primary-600 hover:underline flex-shrink-0">Voir</Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ── Row 3 ─────────────────────────────────────────────────────── */}

      {/* Mon historique */}
      <div className="col-span-12">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Mon historique</h2>
            <Link to="/evaluations/history" className="text-sm text-primary-600 hover:underline">
              Tout l'historique →
            </Link>
          </div>

          {history.isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-slate-100 rounded animate-pulse" />
              ))}
            </div>
          ) : (history.data?.data?.length ?? 0) === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">
              Aucune évaluation validée pour l'instant
            </p>
          ) : (
            <div className="divide-y divide-slate-50">
              {history.data?.data?.map((evaluation) => (
                <div key={evaluation.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      Campagne : {getCampaignName(evaluation.campaignId)}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Validée le{' '}
                      {evaluation.signedByHrAt
                        ? new Date(evaluation.signedByHrAt).toLocaleDateString('fr-FR')
                        : '—'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {evaluation.reviewerScore !== undefined &&
                      evaluation.reviewerScore !== null && (
                        <span className="text-sm font-semibold text-slate-900 bg-slate-100 px-3 py-1 rounded-full">
                          {evaluation.reviewerScore}/10
                        </span>
                      )}
                    <Link
                      to={`/evaluations/${evaluation.id}`}
                      className="text-sm text-primary-600 hover:underline"
                    >
                      Voir PDF →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
