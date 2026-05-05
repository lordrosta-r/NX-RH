import { useState } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { LogOut, MoreVertical, X } from 'lucide-react'
import { offboardingApi, type OffboardingRecord, type OffboardingFilters } from '../api/offboarding'
import { usersApi } from '../api/users'
import type { User } from '../types'
import { useAuth } from '../contexts/AuthContext'
import { cn } from '../utils/cn'
import { formatDate } from '../utils/formatDate'

const REASON_LABELS: Record<OffboardingRecord['reason'], string> = {
  resignation: 'Démission',
  termination: 'Licenciement',
  retirement: 'Retraite',
  other: 'Autre',
}

const REASON_BADGE: Record<OffboardingRecord['reason'], string> = {
  resignation: 'bg-warning-50 text-warning-600',
  termination: 'bg-error-50 text-error-600',
  retirement: 'bg-info-50 text-info-600',
  other: 'bg-slate-100 text-slate-600',
}

const STATUS_BADGE: Record<OffboardingRecord['status'], string> = {
  pending: 'bg-yellow-50 text-yellow-700',
  in_progress: 'bg-blue-50 text-blue-700',
  completed: 'bg-green-50 text-green-700',
}

const STATUS_LABELS: Record<OffboardingRecord['status'], string> = {
  pending: 'En attente',
  in_progress: 'En cours',
  completed: 'Terminé',
}

const DEFAULT_CHECKLIST_ITEMS = [
  'Récupération du matériel informatique',
  'Révocation des accès systèmes',
  'Transfert des dossiers',
  'Entretien de départ effectué',
  'Solde de tout compte établi',
]

function ReasonBadge({ reason }: { reason: OffboardingRecord['reason'] }) {
  return (
    <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium', REASON_BADGE[reason])}>
      {REASON_LABELS[reason]}
    </span>
  )
}

function StatusBadge({ status }: { status: OffboardingRecord['status'] }) {
  return (
    <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium', STATUS_BADGE[status])}>
      {STATUS_LABELS[status]}
    </span>
  )
}

interface CreateFormData {
  userId: string
  reason: OffboardingRecord['reason']
  lastDay: string
}

function SlideOverForm({
  users,
  onClose,
  onSubmit,
  isPending,
}: {
  users: User[]
  onClose: () => void
  onSubmit: (data: Partial<OffboardingRecord>) => void
  isPending: boolean
}) {
  const [form, setForm] = useState<CreateFormData>({
    userId: '',
    reason: 'resignation',
    lastDay: '',
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit({
      userId: form.userId,
      reason: form.reason,
      lastDay: form.lastDay,
      checklist: DEFAULT_CHECKLIST_ITEMS.map((label) => ({ label, done: false })),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md h-full overflow-y-auto shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">Nouvelle demande de départ</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Collaborateur</label>
            <select
              required
              value={form.userId}
              onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            >
              <option value="">Sélectionner…</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.firstName} {u.lastName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Motif</label>
            <select
              value={form.reason}
              onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value as OffboardingRecord['reason'] }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            >
              {(Object.entries(REASON_LABELS) as [OffboardingRecord['reason'], string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Dernier jour</label>
            <input
              required
              type="date"
              value={form.lastDay}
              onChange={(e) => setForm((f) => ({ ...f, lastDay: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>
          <div className="pt-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Checklist par défaut</p>
            <ul className="space-y-1">
              {DEFAULT_CHECKLIST_ITEMS.map((item, i) => (
                <li key={i} className="text-sm text-slate-600 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 px-4 py-2 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 disabled:opacity-50 transition-colors"
            >
              {isPending ? 'Création…' : 'Créer la demande'}
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2 border border-slate-300 text-sm font-medium rounded-lg text-slate-700 hover:bg-slate-50 transition-colors">
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function OffboardingPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState<OffboardingFilters>({ page: 1, limit: 20 })
  const [showForm, setShowForm] = useState(false)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [statusTarget, setStatusTarget] = useState<{ id: string; current: string } | null>(null)
  const [newStatus, setNewStatus] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['offboardings', filters],
    queryFn: () => offboardingApi.getOffboardings(filters).then((r) => r.data),
    placeholderData: keepPreviousData,
  })

  const { data: usersData } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => usersApi.getUsers({ limit: 200 }).then((r) => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (d: Partial<OffboardingRecord>) => offboardingApi.createOffboarding(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offboardings'] })
      setShowForm(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => offboardingApi.deleteOffboarding(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offboardings'] })
      setDeleteConfirm(null)
    },
  })

  const changeStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      offboardingApi.changeStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offboardings'] })
      setStatusTarget(null)
      setNewStatus('')
    },
  })

  const records = data?.data ?? []
  const isAdmin = user?.role === 'admin'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Offboarding</h1>
          <p className="text-sm text-slate-500 mt-0.5">Gestion des départs de collaborateurs</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white text-sm font-semibold rounded-xl hover:bg-primary-600 transition-colors"
        >
          + Nouvelle demande
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow p-4 flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Rechercher un collaborateur…"
          value={filters.q ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value, page: 1 }))}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm flex-1 min-w-40 focus:outline-none focus:ring-2 focus:ring-primary-400"
        />
        <select
          value={filters.status ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value || undefined, page: 1 }))}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
        >
          <option value="">Tous les statuts</option>
          <option value="pending">En attente</option>
          <option value="in_progress">En cours</option>
          <option value="completed">Terminé</option>
        </select>
        <select
          value={filters.reason ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, reason: e.target.value || undefined, page: 1 }))}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
        >
          <option value="">Tous les motifs</option>
          <option value="resignation">Démission</option>
          <option value="termination">Licenciement</option>
          <option value="retirement">Retraite</option>
          <option value="other">Autre</option>
        </select>
      </div>

      {/* Table — desktop */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : records.length === 0 ? (
        <div className="bg-white rounded-2xl shadow p-12 flex flex-col items-center gap-3 text-slate-400">
          <LogOut className="w-12 h-12 opacity-30" />
          <p className="text-base font-medium">Aucune demande de départ en cours.</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-2xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-5 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Collaborateur</th>
                  <th className="text-left px-5 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Motif</th>
                  <th className="text-left px-5 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Dernier jour</th>
                  <th className="text-left px-5 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Statut</th>
                  <th className="text-left px-5 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Checklist</th>
                  <th className="px-5 py-4" />
                </tr>
              </thead>
              <tbody>
                {records.map((rec) => {
                  const done = rec.checklist.filter((c) => c.done).length
                  const total = rec.checklist.length
                  return (
                    <tr key={rec.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold shrink-0">
                            {(rec.userName ?? '?')[0]}
                          </div>
                          <Link to={`/offboarding/${rec.id}`} className="font-medium text-slate-800 hover:text-primary-600">
                            {rec.userName ?? rec.userId}
                          </Link>
                        </div>
                      </td>
                      <td className="px-5 py-4"><ReasonBadge reason={rec.reason} /></td>
                      <td className="px-5 py-4 text-slate-600">{formatDate(rec.lastDay)}</td>
                      <td className="px-5 py-4"><StatusBadge status={rec.status} /></td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary-400 rounded-full"
                              style={{ width: total ? `${(done / total) * 100}%` : '0%' }}
                            />
                          </div>
                          <span className="text-xs text-slate-500">{done}/{total}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="relative inline-block">
                          <button
                            onClick={() => setOpenMenu(openMenu === rec.id ? null : rec.id)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          {openMenu === rec.id && (
                            <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-10">
                              <Link
                                to={`/offboarding/${rec.id}`}
                                onClick={() => setOpenMenu(null)}
                                className="block px-4 py-2 text-sm text-slate-700 hover:bg-primary-50 hover:text-primary-700"
                              >
                                Voir le détail
                              </Link>
                              {(isAdmin || user?.role === 'hr') && (
                                <button
                                  onClick={() => { setOpenMenu(null); setStatusTarget({ id: rec.id, current: rec.status }); setNewStatus(rec.status) }}
                                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-primary-50"
                                >
                                  Modifier statut
                                </button>
                              )}
                              {isAdmin && (
                                <button
                                  onClick={() => { setOpenMenu(null); setDeleteConfirm(rec.id) }}
                                  className="w-full text-left px-4 py-2 text-sm text-error-600 hover:bg-error-50"
                                >
                                  Supprimer
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {records.map((rec) => {
              const done = rec.checklist.filter((c) => c.done).length
              const total = rec.checklist.length
              return (
                <div key={rec.id} className="bg-white rounded-2xl shadow p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <Link to={`/offboarding/${rec.id}`} className="font-semibold text-slate-800 hover:text-primary-600">
                        {rec.userName ?? rec.userId}
                      </Link>
                      <div className="flex items-center gap-2 mt-1">
                        <StatusBadge status={rec.status} />
                        <ReasonBadge reason={rec.reason} />
                      </div>
                    </div>
                    <Link to={`/offboarding/${rec.id}`} className="text-xs text-primary-600 hover:underline">
                      Voir →
                    </Link>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs text-slate-500">Checklist</span>
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-400 rounded-full"
                        style={{ width: total ? `${(done / total) * 100}%` : '0%' }}
                      />
                    </div>
                    <span className="text-xs text-slate-500">{done}/{total}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Create slide-over */}
      {showForm && (
        <SlideOverForm
          users={usersData?.data ?? []}
          onClose={() => setShowForm(false)}
          onSubmit={(d) => createMutation.mutate(d)}
          isPending={createMutation.isPending}
        />
      )}

      {/* Delete confirm modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-base font-semibold text-slate-900 mb-2">Confirmer la suppression</h3>
            <p className="text-sm text-slate-600 mb-5">
              Cette action est irréversible. Êtes-vous sûr de vouloir supprimer cette demande ?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => deleteMutation.mutate(deleteConfirm)}
                disabled={deleteMutation.isPending}
                className="flex-1 px-4 py-2 bg-error-600 text-white text-sm font-medium rounded-lg hover:bg-error-700 disabled:opacity-50 transition-colors"
              >
                {deleteMutation.isPending ? 'Suppression…' : 'Supprimer'}
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 border border-slate-300 text-sm font-medium rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modifier statut modal */}
      {statusTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setStatusTarget(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-base font-semibold text-slate-900 mb-4">Modifier le statut</h3>
            <select
              value={newStatus}
              onChange={e => setNewStatus(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-200 mb-4"
            >
              <option value="pending">En attente</option>
              <option value="in_progress">En cours</option>
              <option value="completed">Terminé</option>
            </select>
            <div className="flex gap-3">
              <button
                onClick={() => changeStatusMutation.mutate({ id: statusTarget.id, status: newStatus })}
                disabled={changeStatusMutation.isPending || newStatus === statusTarget.current}
                className="flex-1 px-4 py-2 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 disabled:opacity-50 transition-colors"
              >
                {changeStatusMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
              </button>
              <button
                onClick={() => setStatusTarget(null)}
                className="px-4 py-2 border border-slate-300 text-sm font-medium rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close menus on outside click */}
      {openMenu && (
        <div className="fixed inset-0 z-0" onClick={() => setOpenMenu(null)} />
      )}
    </div>
  )
}

