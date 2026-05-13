import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, User, Clock, FileText, CheckCircle, XCircle, RefreshCw, AlertCircle } from 'lucide-react'
import { hrApi } from '../api/hr'
import type { HrFlag, HrFlagStatus, HrFlagType } from '../types'

const TYPE_LABELS: Record<HrFlagType, string> = {
  mobility_request: 'Mobilité',
  salary_raise_request: 'Augmentation salariale',
  promotion_request: 'Promotion',
  training_request: 'Formation',
  other: 'Autre',
}
const TYPE_COLORS: Record<HrFlagType, string> = {
  mobility_request: 'bg-blue-100 text-blue-700',
  salary_raise_request: 'bg-green-100 text-green-700',
  promotion_request: 'bg-purple-100 text-purple-700',
  training_request: 'bg-amber-100 text-amber-700',
  other: 'bg-slate-100 text-slate-700',
}
const STATUS_LABELS: Record<HrFlagStatus, string> = {
  pending: 'En attente',
  in_progress: 'En cours',
  treated: 'Traité',
  rejected: 'Rejeté',
}
const STATUS_COLORS: Record<HrFlagStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  in_progress: 'bg-blue-100 text-blue-700',
  treated: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}
const STATUS_ICONS: Record<HrFlagStatus, React.ReactNode> = {
  pending: <AlertCircle className="w-4 h-4" />,
  in_progress: <RefreshCw className="w-4 h-4" />,
  treated: <CheckCircle className="w-4 h-4" />,
  rejected: <XCircle className="w-4 h-4" />,
}

const NEXT_STATUSES: Record<HrFlagStatus, HrFlagStatus[]> = {
  pending: ['in_progress', 'rejected'],
  in_progress: ['treated', 'rejected'],
  treated: [],
  rejected: [],
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function HrFlagDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [note, setNote] = useState('')
  const [targetStatus, setTargetStatus] = useState<HrFlagStatus | ''>('')

  const { data: flag, isLoading, isError } = useQuery<HrFlag>({
    queryKey: ['hr-flag', id],
    queryFn: () => hrApi.getFlag(id!).then(r => r.data),
    enabled: !!id,
  })

  const updateMut = useMutation({
    mutationFn: ({ status, note }: { status: string; note?: string }) =>
      hrApi.updateFlagStatus(id!, status, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr-flag', id] })
      qc.invalidateQueries({ queryKey: ['hr-flags'] })
      setNote('')
      setTargetStatus('')
    },
  })

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/3" />
          <div className="h-40 bg-slate-200 rounded" />
          <div className="h-24 bg-slate-200 rounded" />
        </div>
      </div>
    )
  }

  if (isError || !flag) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center">
        <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500">Signal introuvable.</p>
        <Link to="/hr/flags" className="text-primary-600 text-sm mt-2 inline-block hover:underline">
          Retour à la liste
        </Link>
      </div>
    )
  }

  const nextStatuses = NEXT_STATUSES[flag.status]
  const canUpdate = nextStatuses.length > 0

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
          aria-label="Retour"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Signal RH</h1>
          <p className="text-sm text-slate-400">#{id?.slice(-6).toUpperCase()}</p>
        </div>
      </div>

      {/* Main card */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-4">
        {/* Type + status */}
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${TYPE_COLORS[flag.type]}`}>
            {TYPE_LABELS[flag.type]}
          </span>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[flag.status]}`}>
            {STATUS_ICONS[flag.status]}
            {STATUS_LABELS[flag.status]}
          </span>
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="flex items-start gap-2 text-slate-600">
            <User className="w-4 h-4 mt-0.5 shrink-0 text-slate-400" />
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-0.5">Collaborateur</p>
              <p>{flag.userName ?? flag.userId}</p>
            </div>
          </div>
          <div className="flex items-start gap-2 text-slate-600">
            <Clock className="w-4 h-4 mt-0.5 shrink-0 text-slate-400" />
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-0.5">Créé le</p>
              <p>{formatDate(flag.createdAt)}</p>
            </div>
          </div>
          {flag.updatedAt && (
            <div className="flex items-start gap-2 text-slate-600">
              <RefreshCw className="w-4 h-4 mt-0.5 shrink-0 text-slate-400" />
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-0.5">Mis à jour</p>
                <p>{formatDate(flag.updatedAt)}</p>
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        {flag.description && (
          <div className="border-t border-slate-100 pt-4">
            <div className="flex items-start gap-2 text-sm text-slate-600">
              <FileText className="w-4 h-4 mt-0.5 shrink-0 text-slate-400" />
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-0.5">Description</p>
                <p className="whitespace-pre-wrap">{flag.description}</p>
              </div>
            </div>
          </div>
        )}

        {/* Note RH */}
        {flag.note && (
          <div className="border-t border-slate-100 pt-4">
            <div className="flex items-start gap-2 text-sm text-slate-600">
              <FileText className="w-4 h-4 mt-0.5 shrink-0 text-slate-400" />
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-0.5">Note RH</p>
                <p className="whitespace-pre-wrap">{flag.note}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Update status */}
      {canUpdate && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Mettre à jour le statut</h2>
          <div className="flex flex-wrap gap-2">
            {nextStatuses.map(s => (
              <button
                key={s}
                onClick={() => setTargetStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  targetStatus === s
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
          {targetStatus && (
            <>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Note (optionnel)…"
                rows={3}
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { setTargetStatus(''); setNote('') }}
                  className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  onClick={() => updateMut.mutate({ status: targetStatus, note: note || undefined })}
                  disabled={updateMut.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg disabled:opacity-50 hover:bg-primary-700 transition-colors"
                >
                  {updateMut.isPending ? 'Enregistrement…' : `Passer à "${STATUS_LABELS[targetStatus]}"`}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {!canUpdate && (
        <div className="bg-slate-50 rounded-xl border border-slate-200 px-6 py-4 text-sm text-slate-500 text-center">
          Ce signal est <span className="font-medium">{STATUS_LABELS[flag.status].toLowerCase()}</span> — aucune action supplémentaire possible.
        </div>
      )}
    </div>
  )
}

