import { useState, useRef, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  MoreVertical, Edit, LogOut, Download, Trash2, CheckSquare, Square, AlertTriangle,
} from 'lucide-react'
import { usersApi } from '../api/users'
import client from '../api/client'
import type { User, Evaluation, PaginatedResponse } from '../types'
import { getCampaignName } from '../types'
import { useAuth } from '../contexts/AuthContext'
import Breadcrumbs from '../components/ui/Breadcrumbs'

// ── Helpers ───────────────────────────────────────────────────────────────────
const ROLE_BADGES: Record<string, string> = {
  admin:    'bg-error-50 text-error-700',
  hr:       'bg-warning-50 text-warning-700',
  manager:  'bg-primary-50 text-primary-700',
  employee: 'bg-slate-100 text-slate-700',
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin', hr: 'RH', manager: 'Manager', employee: 'Employé',
}

const EVAL_STATUS_LABELS: Record<string, string> = {
  assigned: 'Assignée', in_progress: 'En cours', submitted: 'Soumise',
  reviewed: 'Révisée', signed_evaluatee: 'Signée (évalué)',
  signed_manager: 'Signée (manager)', signed_hr: 'Signée (RH)',
  validated: 'Validée', expired: 'Expirée', archived: 'Archivée',
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

function useToast() {
  const [message, setMessage] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const show = (msg: string) => {
    setMessage(msg)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setMessage(null), 2500)
  }
  return { message, show }
}

// ── Onboarding steps ──────────────────────────────────────────────────────────
const ONBOARDING_STEPS = [
  'Compte créé et accès configuré',
  'Présentation à l\'équipe',
  'Formation sur les outils internes',
  'Signature du contrat et documents RH',
  'Entretien d\'intégration (J+30)',
]

// ── Component ─────────────────────────────────────────────────────────────────
export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user: currentUser } = useAuth()
  const queryClient = useQueryClient()
  const toast = useToast()

  const [activeTab, setActiveTab]       = useState<'profile' | 'evaluations' | 'onboarding'>('profile')
  const [actionsOpen, setActionsOpen]   = useState(false)
  const [offboardModal, setOffboardModal] = useState(false)
  const [anonymizeModal, setAnonymizeModal] = useState(false)
  const [confirmText, setConfirmText]   = useState('')
  const [checkedSteps, setCheckedSteps] = useState<boolean[]>(ONBOARDING_STEPS.map(() => false))

  // Close dropdown on outside click
  const dropdownRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setActionsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Fetch user
  const { data: userData, isLoading } = useQuery({
    queryKey: ['user', id],
    queryFn: () => usersApi.getUser(id!).then(r => r.data.data),
    enabled: !!id,
  })

  // Fetch manager
  const { data: managerData } = useQuery({
    queryKey: ['user', userData?.managerId],
    queryFn: () => usersApi.getUser(userData!.managerId!).then(r => r.data.data),
    enabled: !!userData?.managerId,
  })

  // Fetch direct reports
  const { data: reportsData } = useQuery({
    queryKey: ['users-reports', id],
    queryFn: () => usersApi.getUsers({ limit: 100 }).then(r =>
      r.data.data?.filter((u: User) => u.managerId === id) ?? []
    ),
    enabled: !!id,
  })

  // Fetch evaluations
  const { data: evaluationsData } = useQuery({
    queryKey: ['evaluations-user', id],
    queryFn: () => client.get<PaginatedResponse<Evaluation>>('/api/evaluations', { params: { evaluateeId: id, limit: 50 } }).then(r => r.data),
    enabled: activeTab === 'evaluations' && !!id,
  })

  // Offboard mutation
  const offboardMutation = useMutation({
    mutationFn: () => usersApi.offboard(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', id] })
      setOffboardModal(false)
      toast.show('Offboarding déclenché avec succès.')
    },
    onError: () => toast.show('Erreur lors du déclenchement de l\'offboarding.'),
  })

  // Anonymize mutation
  const anonymizeMutation = useMutation({
    mutationFn: () => usersApi.anonymize(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', id] })
      setAnonymizeModal(false)
      toast.show('Données anonymisées.')
    },
    onError: () => toast.show('Erreur lors de l\'anonymisation.'),
  })

  const canManage = currentUser?.role === 'admin' || currentUser?.role === 'hr'
  const completedSteps = checkedSteps.filter(Boolean).length
  const progressPct = Math.round((completedSteps / ONBOARDING_STEPS.length) * 100)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (!userData) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-500">Utilisateur introuvable.</p>
        <Link to="/users" className="text-primary-600 hover:underline text-sm mt-2 inline-block">
          Retour à la liste
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <Breadcrumbs
        items={[
          { label: 'Utilisateurs', href: '/users' },
          { label: `${userData.firstName} ${userData.lastName}` },
        ]}
      />

      {/* Offboarding banner */}
      {userData.offboardingStatus === 'offboarding' && (
        <div className="border-l-4 border-warning-500 bg-warning-50 p-4 rounded-lg mb-6">
          <p className="text-sm font-medium text-warning-700">
            <AlertTriangle className="inline w-4 h-4 mr-1 shrink-0" />
            Cet utilisateur est en cours d&apos;offboarding
          </p>
        </div>
      )}

      {/* Profile header card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-primary-100 text-primary-700 text-2xl font-bold flex items-center justify-center shrink-0">
              {userData.firstName?.[0]}{userData.lastName?.[0]}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {userData.firstName} {userData.lastName}
              </h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_BADGES[userData.role] ?? 'bg-slate-100 text-slate-700'}`}>
                  {ROLE_LABELS[userData.role] ?? userData.role}
                </span>
                {userData.department && (
                  <span className="text-sm text-slate-500">{userData.department}</span>
                )}
                {userData.position && (
                  <span className="text-sm text-slate-500">· {userData.position}</span>
                )}
              </div>
              <p className="text-sm text-slate-500 mt-1">{userData.email}</p>
              {userData.authSource === 'ldap' && (
                <span className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                  LDAP
                </span>
              )}
            </div>
          </div>

          {/* Actions menu */}
          {canManage && (
            <div className="relative" ref={dropdownRef}>
              <div className="flex items-center gap-2">
                <Link
                  to={`/users/${id}/edit`}
                  className="inline-flex items-center gap-2 border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium"
                >
                  <Edit className="w-4 h-4" /> Modifier
                </Link>
                <button
                  onClick={() => setActionsOpen(!actionsOpen)}
                  className="p-2 hover:bg-slate-50 rounded-lg"
                  aria-label="Plus d'actions"
                >
                  <MoreVertical className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              {actionsOpen && (
                <div className="absolute right-0 top-12 bg-white rounded-xl shadow-lg border border-slate-100 w-56 z-10">
                  <button
                    onClick={() => { setOffboardModal(true); setActionsOpen(false) }}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-warning-600 hover:bg-warning-50 w-full text-left"
                  >
                    <LogOut className="w-4 h-4" /> Déclencher l&apos;offboarding
                  </button>
                  <button
                    onClick={() => {
                      usersApi.gdprExport(id!).then(r => downloadBlob(r.data as Blob, 'export-rgpd.json'))
                      setActionsOpen(false)
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 w-full text-left"
                  >
                    <Download className="w-4 h-4" /> Exporter données RGPD
                  </button>
                  {currentUser?.role === 'admin' && (
                    <button
                      onClick={() => { setAnonymizeModal(true); setActionsOpen(false) }}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-error-600 hover:bg-error-50 w-full text-left border-t border-slate-100"
                    >
                      <Trash2 className="w-4 h-4" /> Anonymiser
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-6 gap-6">
        {(['profile', 'evaluations', 'onboarding'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 text-sm ${
              activeTab === tab
                ? 'border-b-2 border-primary-500 text-primary-600 font-medium'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab === 'profile' ? 'Profil' : tab === 'evaluations' ? 'Évaluations' : 'Onboarding'}
          </button>
        ))}
      </div>

      {/* ── Tab: Profil ─────────────────────────────────────────────────── */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Informations */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4">Informations</h2>
            <dl className="space-y-3 text-sm">
              {[
                ['Prénom', userData.firstName],
                ['Nom', userData.lastName],
                ['E-mail', userData.email],
                ['Rôle', ROLE_LABELS[userData.role] ?? userData.role],
                ['Département', userData.department ?? '—'],
                ['Poste', userData.position ?? '—'],
                ['Statut', userData.isActive ? 'Actif' : 'Inactif'],
                ['Source auth.', userData.authSource],
                ['Créé le', userData.createdAt ? new Date(userData.createdAt).toLocaleDateString('fr-FR') : '—'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <dt className="text-slate-500">{label}</dt>
                  <dd className="text-slate-900 font-medium text-right">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Hiérarchie */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4">Hiérarchie</h2>
            <div className="mb-5">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Manager direct</p>
              {managerData ? (
                <Link
                  to={`/users/${managerData.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 text-sm font-bold flex items-center justify-center shrink-0">
                    {managerData.firstName?.[0]}{managerData.lastName?.[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{managerData.firstName} {managerData.lastName}</p>
                    <p className="text-xs text-slate-500">{ROLE_LABELS[managerData.role] ?? managerData.role}</p>
                  </div>
                </Link>
              ) : (
                <p className="text-sm text-slate-600 italic">Aucun manager assigné</p>
              )}
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                Subordonnés directs ({reportsData?.length ?? 0})
              </p>
              {reportsData && reportsData.length > 0 ? (
                <ul className="space-y-1">
                  {reportsData.map((u: User) => (
                    <li key={u.id}>
                      <Link
                        to={`/users/${u.id}`}
                        className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-50 text-sm text-slate-700"
                      >
                        <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center shrink-0">
                          {u.firstName?.[0]}{u.lastName?.[0]}
                        </div>
                        {u.firstName} {u.lastName}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-600 italic">Aucun subordonné</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Évaluations ────────────────────────────────────────────── */}
      {activeTab === 'evaluations' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Évaluations</h2>
          {evaluationsData?.data?.length === 0 ? (
            <p className="text-sm text-slate-600 italic">Aucune évaluation.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-2 text-slate-500 font-medium">Campagne</th>
                    <th className="text-left py-2 text-slate-500 font-medium">Évaluateur</th>
                    <th className="text-left py-2 text-slate-500 font-medium">Statut</th>
                    <th className="text-left py-2 text-slate-500 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {evaluationsData?.data?.map((ev: Evaluation) => (
                    <tr key={ev.id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="py-2 text-slate-900">{ev.campaign?.name ?? getCampaignName(ev.campaignId)}</td>
                      <td className="py-2 text-slate-600">
                        {ev.evaluator ? `${ev.evaluator.firstName} ${ev.evaluator.lastName}` : ev.evaluatorId}
                      </td>
                      <td className="py-2">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full text-xs">
                          {EVAL_STATUS_LABELS[ev.status] ?? ev.status}
                        </span>
                      </td>
                      <td className="py-2 text-slate-500">
                        {ev.createdAt ? new Date(ev.createdAt).toLocaleDateString('fr-FR') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Onboarding ─────────────────────────────────────────────── */}
      {activeTab === 'onboarding' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-900">Onboarding</h2>
            <span className="text-sm text-slate-500">{completedSteps}/{ONBOARDING_STEPS.length} étapes</span>
          </div>
          {/* Progress bar */}
          <div className="h-2 bg-slate-100 rounded-full mb-6">
            <div
              className="h-2 bg-primary-500 rounded-full transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          {/* Steps */}
          <ul className="space-y-3 mb-6">
            {ONBOARDING_STEPS.map((step, i) => (
              <li key={step} className="flex items-center gap-3">
                <button
                  onClick={() => setCheckedSteps(prev => prev.map((v, j) => j === i ? !v : v))}
                  className="shrink-0 text-primary-500 hover:text-primary-600"
                >
                  {checkedSteps[i]
                    ? <CheckSquare className="w-5 h-5" />
                    : <Square className="w-5 h-5 text-slate-300" />
                  }
                </button>
                <span className={`text-sm ${checkedSteps[i] ? 'line-through text-slate-500' : 'text-slate-700'}`}>
                  {step}
                </span>
              </li>
            ))}
          </ul>
          {completedSteps === ONBOARDING_STEPS.length ? (
            <p className="text-sm text-success-600 font-medium">✓ Onboarding terminé</p>
          ) : (
            <button
              onClick={() => setCheckedSteps(ONBOARDING_STEPS.map(() => true))}
              className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              Marquer tout comme terminé
            </button>
          )}
        </div>
      )}

      {/* ── Toast ────────────────────────────────────────────────────────── */}
      {toast.message && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg">
          {toast.message}
        </div>
      )}

      {/* ── Modal offboarding (S-06-M1) ──────────────────────────────────── */}
      {offboardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Déclencher le départ de {userData.firstName}
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Les évaluations actives de cet utilisateur seront archivées.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setOffboardModal(false)}
                className="inline-flex items-center gap-2 border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium"
              >
                Annuler
              </button>
              <button
                onClick={() => offboardMutation.mutate()}
                disabled={offboardMutation.isPending}
                className="inline-flex items-center gap-2 bg-error-500 hover:bg-error-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60"
              >
                {offboardMutation.isPending ? 'Traitement…' : 'Confirmer le départ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal anonymisation (S-06-M2) ────────────────────────────────── */}
      {anonymizeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Anonymiser les données</h3>
            <div className="border-l-4 border-warning-500 bg-warning-50 p-4 rounded-lg mb-4">
              <p className="text-sm text-warning-700">
                <AlertTriangle className="inline w-4 h-4 mr-1 shrink-0" />
                Cette action est irréversible. Toutes les données personnelles de cet utilisateur
                seront définitivement anonymisées conformément au RGPD.
              </p>
            </div>
            <p className="text-sm text-slate-600 mb-2">
              Saisissez <strong>CONFIRMER</strong> pour valider :
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-error-500 focus:border-error-500 mb-4"
              placeholder="CONFIRMER"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setAnonymizeModal(false); setConfirmText('') }}
                className="inline-flex items-center gap-2 border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium"
              >
                Annuler
              </button>
              <button
                onClick={() => anonymizeMutation.mutate()}
                disabled={confirmText !== 'CONFIRMER' || anonymizeMutation.isPending}
                className="inline-flex items-center gap-2 bg-error-500 hover:bg-error-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40"
              >
                {anonymizeMutation.isPending ? 'Anonymisation…' : 'Anonymiser définitivement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
