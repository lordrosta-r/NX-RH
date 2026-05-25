import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, MoreVertical, CheckSquare, Square, X } from 'lucide-react'
import { offboardingApi, type OffboardingRecord } from '../api/offboarding'
import { useAuth } from '../contexts/AuthContext'
import { cn } from '../utils/cn'
import { formatDate, formatDateTime } from '../utils/formatDate'

const REASON_LABELS: Record<OffboardingRecord['reason'], string> = {
  resignation: 'Démission',
  termination: 'Licenciement',
  retirement: 'Retraite',
  other: 'Autre',
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

export default function OffboardingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [menuOpen, setMenuOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [statusConfirm, setStatusConfirm] = useState(false)
  const [notes, setNotes] = useState<string>('')
  const [notesReady, setNotesReady] = useState(false)

  const { data: record, isLoading } = useQuery({
    queryKey: ['offboarding', id],
    queryFn: () => offboardingApi.getOffboarding(id!).then((r) => r.data),
    enabled: !!id,
    select: (d) => {
      if (!notesReady) {
        setNotes(d.notes ?? '')
        setNotesReady(true)
      }
      return d
    },
  })

  const toggleMutation = useMutation({
    mutationFn: (index: number) => offboardingApi.toggleChecklistItem(id!, index),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['offboarding', id] }),
  })

  const notesMutation = useMutation({
    mutationFn: () => offboardingApi.updateNotes(id!, notes),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['offboarding', id] }),
  })

  const statusMutation = useMutation({
    mutationFn: (newStatus: string) => offboardingApi.changeStatus(id!, newStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offboarding', id] })
      queryClient.invalidateQueries({ queryKey: ['offboardings'] })
      setStatusConfirm(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => offboardingApi.deleteOffboarding(id!),
    onSuccess: () => navigate('/offboarding'),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!record) return <p className="text-slate-500">Enregistrement introuvable.</p>

  const done = record.checklist.filter((c) => c.done).length
  const total = record.checklist.length
  const isAdmin = user?.role === 'admin'

  const nextStatus: Record<OffboardingRecord['status'], OffboardingRecord['status'] | null> = {
    pending: 'in_progress',
    in_progress: 'completed',
    completed: null,
  }
  const nextStatusLabel: Record<OffboardingRecord['status'], string> = {
    pending: 'Marquer En cours',
    in_progress: 'Marquer Complété',
    completed: '',
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <Link to="/offboarding" className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-slate-900">
              Départ — {record.userName ?? record.userId}
            </h1>
            <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium', STATUS_BADGE[record.status])}>
              {STATUS_LABELS[record.status]}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            {REASON_LABELS[record.reason]} · Dernier jour : {formatDate(record.lastDay)}
          </p>
        </div>
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 rounded-md hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-10">
              {isAdmin && (
                <button
                  onClick={() => { setMenuOpen(false); setDeleteConfirm(true) }}
                  className="w-full text-left px-4 py-2 text-sm text-error-600 hover:bg-error-50"
                >
                  Supprimer
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Col gauche */}
        <div className="lg:col-span-2 space-y-6">
          {/* Checklist */}
          <div className="bg-white rounded-2xl shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-800">Checklist de départ</h2>
              <span className="text-sm text-slate-500">{done}/{total} complétés</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full mb-5">
              <div
                className="h-full bg-primary-500 rounded-full transition-all"
                style={{ width: total ? `${(done / total) * 100}%` : '0%' }}
              />
            </div>
            <div className="space-y-3">
              {record.checklist.map((item, i) => (
                <div key={item.label} className="group relative">
                  <button
                    onClick={() => toggleMutation.mutate(i)}
                    disabled={toggleMutation.isPending}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 rounded-md border transition-colors text-left',
                      item.done
                        ? 'border-success-500/30 bg-success-50'
                        : 'border-slate-100 bg-slate-50 hover:border-slate-200',
                    )}
                  >
                    {item.done ? (
                      <CheckSquare className="w-5 h-5 text-success-600 shrink-0" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-300 shrink-0" />
                    )}
                    <span className={cn('text-sm', item.done ? 'text-slate-500 line-through' : 'text-slate-800')}>
                      {item.label}
                    </span>
                    {item.done && item.doneAt && (
                      <span className="ml-auto text-xs text-slate-400 hidden group-hover:block whitespace-nowrap">
                        {item.doneBy ? `${item.doneBy} · ` : ''}{formatDateTime(item.doneAt)}
                      </span>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Col droite */}
        <div className="space-y-4">
          {/* Infos */}
          <div className="bg-white rounded-2xl shadow p-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-700">Informations</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Collaborateur</span>
                <Link to={`/users/${record.userId}`} className="text-primary-600 hover:underline font-medium">
                  {record.userName ?? record.userId}
                </Link>
              </div>
              {record.department && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Département</span>
                  <span className="text-slate-700">{record.department}</span>
                </div>
              )}
              {record.managerName && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Responsable</span>
                  <span className="text-slate-700">{record.managerName}</span>
                </div>
              )}
              {record.createdBy && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Créé par</span>
                  <span className="text-slate-700">{record.createdBy}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Créé le</span>
                <span className="text-slate-700">{formatDate(record.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Notes RH */}
          <div className="bg-white rounded-2xl shadow p-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-700">Notes RH</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
              placeholder="Ajouter des notes RH confidentielles…"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
            <button
              onClick={() => notesMutation.mutate()}
              disabled={notesMutation.isPending}
              className="w-full px-4 py-2 bg-primary-500 text-white text-sm font-medium rounded-md hover:bg-primary-600 disabled:opacity-50 transition-colors"
            >
              {notesMutation.isPending ? 'Sauvegarde…' : 'Sauvegarder les notes'}
            </button>
          </div>
        </div>
      </div>

      {/* Footer: change status */}
      {nextStatus[record.status] && (
        <div className="bg-white rounded-2xl shadow p-4 flex justify-end">
          <button
            onClick={() => {
              if (record.status === 'in_progress') {
                setStatusConfirm(true)
              } else {
                const ns = nextStatus[record.status]
                if (ns) statusMutation.mutate(ns)
              }
            }}
            disabled={statusMutation.isPending}
            className="px-5 py-2.5 bg-primary-500 text-white text-sm font-semibold rounded-md hover:bg-primary-600 disabled:opacity-50 transition-colors"
          >
            {nextStatusLabel[record.status]}
          </button>
        </div>
      )}

      {/* Status confirm modal (in_progress → completed) */}
      {statusConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setStatusConfirm(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <button onClick={() => setStatusConfirm(false)} className="absolute top-4 right-4 p-1 rounded-md hover:bg-slate-100 text-slate-400">
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-base font-semibold text-slate-900 mb-2">Confirmer la clôture</h3>
            <p className="text-sm text-slate-600 mb-5">
              L'utilisateur sera désactivé dans le système. Cette action est définitive.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => statusMutation.mutate('completed')}
                disabled={statusMutation.isPending}
                className="flex-1 px-4 py-2 bg-primary-500 text-white text-sm font-medium rounded-md hover:bg-primary-600 disabled:opacity-50 transition-colors"
              >
                {statusMutation.isPending ? 'En cours…' : 'Confirmer'}
              </button>
              <button
                onClick={() => setStatusConfirm(false)}
                className="px-4 py-2 border border-slate-300 text-sm font-medium rounded-md text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDeleteConfirm(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-base font-semibold text-slate-900 mb-2">Confirmer la suppression</h3>
            <p className="text-sm text-slate-600 mb-5">
              Cette action est irréversible.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="flex-1 px-4 py-2 bg-error-600 text-white text-sm font-medium rounded-md hover:bg-error-700 disabled:opacity-50 transition-colors"
              >
                {deleteMutation.isPending ? 'Suppression…' : 'Supprimer'}
              </button>
              <button
                onClick={() => setDeleteConfirm(false)}
                className="px-4 py-2 border border-slate-300 text-sm font-medium rounded-md text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close menu */}
      {menuOpen && <div className="fixed inset-0 z-0" onClick={() => setMenuOpen(false)} />}
    </div>
  )
}

