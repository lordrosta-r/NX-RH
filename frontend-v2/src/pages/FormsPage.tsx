import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Copy, Trash2, FileText } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { formsApi } from '../api/forms'
import { campaignsApi } from '../api/campaigns'
import { toast } from '../hooks/useToast'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import type { Form } from '../types'

const FORM_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  self_evaluation:      { label: 'Auto-évaluation',        color: 'bg-primary-50 text-primary-700' },
  manager_evaluation:   { label: 'Évaluation manager',     color: 'bg-warning-50 text-warning-700' },
  upward_feedback:      { label: 'Feedback ascendant',     color: 'bg-purple-50 text-purple-700' },
  director_evaluation:  { label: 'Évaluation directeur',   color: 'bg-error-50 text-error-700' },
  peer_review:          { label: 'Peer review',            color: 'bg-cyan-50 text-cyan-700' },
  objectives:           { label: 'Objectifs',              color: 'bg-success-50 text-success-700' },
  mobility_request:     { label: 'Demande mobilité',       color: 'bg-orange-50 text-orange-700' },
  salary_raise_request: { label: 'Demande augmentation',   color: 'bg-emerald-50 text-emerald-700' },
  promotion_request:    { label: 'Demande promotion',      color: 'bg-indigo-50 text-indigo-700' },
  training_request:     { label: 'Demande formation',      color: 'bg-teal-50 text-teal-700' },
}

export default function FormsPage() {
  const [typeFilter, setTypeFilter] = useState('')
  const [campaignFilter, setCampaignFilter] = useState('')
  const [search, setSearch] = useState('')
  const { user } = useAuth()
  const [cloneTarget, setCloneTarget] = useState<Form | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const isAdminOrHr = user?.role === 'admin' || user?.role === 'hr'

  const { data: campaignsData } = useQuery({
    queryKey: ['campaigns', 'active'],
    queryFn: () => campaignsApi.getCampaigns({ status: 'active', limit: 100 }).then(r => r.data),
  })
  const campaigns = campaignsData?.data ?? []

  const { data, isLoading } = useQuery({
    queryKey: ['forms', typeFilter, campaignFilter, search],
    queryFn: () =>
      formsApi
        .getForms({ formType: typeFilter || undefined, campaignId: campaignFilter || undefined, q: search || undefined, limit: 50 })
        .then(r => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => formsApi.deleteForm(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['forms'] }),
    onError: () => toast.error('Erreur lors de la suppression', 'Veuillez réessayer.'),
  })

  const cloneMutation = useMutation({
    mutationFn: (id: string) => formsApi.cloneForm(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms'] })
      setCloneTarget(null)
    },
    onError: () => toast.error('Erreur lors de la duplication', 'Veuillez réessayer.'),
  })

  function handleDelete(id: string) {
    setDeleteConfirmId(id)
  }

  const forms = data?.data ?? []

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Formulaires</h1>
        {isAdminOrHr && (
          <Link
            to="/forms/new"
            className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Nouveau formulaire
          </Link>
        )}
      </div>

      {/* Filtres */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <select
          aria-label="Filtrer par type"
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
        >
          <option value="">Tous les types</option>
          {Object.entries(FORM_TYPE_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <select
          value={campaignFilter}
          onChange={e => setCampaignFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
        >
          <option value="">Toutes les campagnes</option>
          {campaigns.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <input
          className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
          placeholder="Rechercher un formulaire..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="text-center py-12 text-slate-400 text-sm">Chargement…</div>
      )}

      {/* Empty state */}
      {!isLoading && forms.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-xl">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm mb-2">Aucun formulaire</p>
          {isAdminOrHr && (
            <Link to="/forms/new" className="text-sm text-primary-600 hover:underline">
              + Créer le premier formulaire
            </Link>
          )}
        </div>
      )}

      {/* Grille */}
      {!isLoading && forms.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {forms.map(form => {
            const typeConfig = FORM_TYPE_CONFIG[form.formType] ?? {
              label: form.formType,
              color: 'bg-slate-100 text-slate-700',
            }
            return (
              <div
                key={form.id}
                className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${typeConfig.color}`}>
                    {typeConfig.label}
                  </div>
                  {form.isFrozen && (
                    <span className="flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-500 border border-slate-200 rounded-full text-xs">
                      🔒 Gelé
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-slate-900 mb-1">{form.title}</h3>
                <p className="text-xs text-slate-500 mb-3">
                  {form.questions?.length ?? 0} question
                  {(form.questions?.length ?? 0) !== 1 ? 's' : ''}
                </p>
                <div className="flex items-center justify-between">
                  <Link
                    to={`/forms/${form.id}`}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium hover:underline"
                  >
                    Voir →
                  </Link>
                  {isAdminOrHr && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => setCloneTarget(form)}
                        className="p-1.5 hover:bg-slate-50 rounded text-slate-400 hover:text-slate-600"
                        title="Dupliquer"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      {!form.isFrozen && (
                        <button
                          onClick={() => handleDelete(form.id)}
                          className="p-1.5 hover:bg-error-50 rounded text-slate-400 hover:text-error-600"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal clone */}
      {cloneTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Dupliquer — {cloneTarget.title}
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Une copie sera créée avec le titre « Copie de {cloneTarget.title} », non gelée et sans
              campagne associée.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setCloneTarget(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                onClick={() => cloneMutation.mutate(cloneTarget.id)}
                disabled={cloneMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 disabled:opacity-50 rounded-lg"
              >
                {cloneMutation.isPending ? 'Duplication…' : 'Dupliquer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete */}
      <ConfirmDialog
        isOpen={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => {
          if (deleteConfirmId) deleteMutation.mutate(deleteConfirmId)
          setDeleteConfirmId(null)
        }}
        title="Supprimer le formulaire"
        description="Cette action est irréversible. Le formulaire sera définitivement supprimé."
        confirmLabel="Supprimer"
        loading={deleteMutation.isPending}
      />
    </div>
  )
}

