import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BarChart2, Copy, Trash2, MoreVertical } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { campaignsApi } from '../api/campaigns'
import { formatDate } from '../utils/formatDate'
import { StatusBadge } from '../components/ui/StatusBadge'
import type { Campaign } from '../types'

type Tab = 'overview' | 'evaluations' | 'forms'

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview',    label: 'Aperçu' },
  { id: 'evaluations', label: 'Évaluations' },
  { id: 'forms',       label: 'Formulaires' },
]

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [tab, setTab]                   = useState<Tab>('overview')
  const [actionsOpen, setActionsOpen]   = useState(false)
  const [cloneModal, setCloneModal]     = useState(false)
  const [deleteModal, setDeleteModal]   = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')

  const queryClient = useQueryClient()
  const invalidate  = () => queryClient.invalidateQueries({ queryKey: ['campaign', id] })

  const { data: campaign, isLoading } = useQuery({
    queryKey: ['campaign', id],
    queryFn:  () => campaignsApi.getCampaign(id!).then(r => r.data),
    enabled:  !!id,
  })

  const activateMutation = useMutation({
    mutationFn: () => campaignsApi.activateCampaign(id!),
    onSuccess:  invalidate,
  })
  const closeMutation = useMutation({
    mutationFn: () => campaignsApi.closeCampaign(id!),
    onSuccess:  invalidate,
  })
  const archiveMutation = useMutation({
    mutationFn: () => campaignsApi.archiveCampaign(id!),
    onSuccess:  invalidate,
  })
  const deleteMutation = useMutation({
    mutationFn: () => campaignsApi.deleteCampaign(id!),
    onSuccess:  () => navigate('/campaigns'),
  })
  const cloneMutation = useMutation({
    mutationFn: () => campaignsApi.cloneCampaign(id!).then(r => r.data),
    onSuccess:  (newCampaign: Campaign) => navigate(`/campaigns/${newCampaign.id}`),
  })

  const isAdminOrHr = user?.role === 'admin' || user?.role === 'hr'

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // KPI placeholders (S5 — données réelles en S6)
  const kpiTotal      = 0
  const kpiInProgress = 0
  const kpiSubmitted  = 0
  const kpiValidated  = 0

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Fil d'Ariane */}
      <nav className="text-sm text-slate-500 mb-4 flex items-center gap-1">
        <Link to="/" className="hover:text-slate-700">Accueil</Link>
        <span>›</span>
        <Link to="/campaigns" className="hover:text-slate-700">Campagnes</Link>
        <span>›</span>
        <span className="text-slate-700">{campaign?.name ?? '…'}</span>
      </nav>

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900 truncate">{campaign?.name}</h1>
              <StatusBadge status={campaign?.status} />
            </div>
            <p className="text-sm text-slate-500">
              {formatDate(campaign?.startDate)} – {formatDate(campaign?.endDate)}
              {campaign?.createdAt && ` · Créée le ${formatDate(campaign.createdAt)}`}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
            {isAdminOrHr && campaign?.status === 'draft' && (
              <button
                onClick={() => activateMutation.mutate()}
                disabled={activateMutation.isPending}
                className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {activateMutation.isPending ? 'Activation…' : 'Activer la campagne'}
              </button>
            )}
            {isAdminOrHr && campaign?.status === 'active' && (
              <button
                onClick={() => closeMutation.mutate()}
                disabled={closeMutation.isPending}
                className="border border-slate-200 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {closeMutation.isPending ? 'Clôture…' : 'Clôturer la campagne'}
              </button>
            )}
            {isAdminOrHr && campaign?.status === 'closed' && (
              <button
                onClick={() => archiveMutation.mutate()}
                disabled={archiveMutation.isPending}
                className="border border-slate-200 hover:bg-slate-50 text-slate-500 px-4 py-2 rounded-lg text-xs font-medium disabled:opacity-50"
              >
                {archiveMutation.isPending ? 'Archivage…' : 'Archiver'}
              </button>
            )}
            {isAdminOrHr && (
              <Link
                to={`/campaigns/${id}/edit`}
                className="border border-slate-200 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-medium"
              >
                Modifier
              </Link>
            )}

            {/* Menu ⋮ */}
            <div className="relative">
              <button
                onClick={() => setActionsOpen(o => !o)}
                className="p-2 hover:bg-slate-50 rounded-lg border border-slate-200"
                aria-label="Actions"
              >
                <MoreVertical className="w-4 h-4 text-slate-500" />
              </button>
              {actionsOpen && (
                <div
                  className="absolute right-0 top-10 bg-white rounded-xl shadow-lg border border-slate-100 w-48 z-10"
                  onMouseLeave={() => setActionsOpen(false)}
                >
                  <button
                    onClick={() => { setCloneModal(true); setActionsOpen(false) }}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 w-full text-left"
                  >
                    <Copy className="w-4 h-4" /> Cloner
                  </button>
                  <Link
                    to={`/campaigns/${id}/analytics`}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                    onClick={() => setActionsOpen(false)}
                  >
                    <BarChart2 className="w-4 h-4" /> Voir les analytics
                  </Link>
                  {isAdminOrHr && (campaign?.status === 'draft' || campaign?.status === 'archived') && (
                    <button
                      onClick={() => { setDeleteModal(true); setActionsOpen(false) }}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-error-600 hover:bg-error-50 w-full text-left border-t border-slate-100"
                    >
                      <Trash2 className="w-4 h-4" /> Supprimer
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Onglets */}
      <div className="flex gap-1 border-b border-slate-200 mb-6 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
              tab === t.id
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Onglet Aperçu */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* KPI cards */}
          <div className="grid grid-cols-12 gap-4">
            {[
              { label: 'Total',     value: kpiTotal },
              { label: 'En cours',  value: kpiInProgress },
              { label: 'Soumis',    value: kpiSubmitted },
              { label: 'Validés',   value: kpiValidated },
            ].map(kpi => (
              <div
                key={kpi.label}
                className="col-span-6 sm:col-span-3 bg-white rounded-xl shadow-sm border border-slate-100 p-6 text-center"
              >
                <p className="text-3xl font-bold text-slate-900">{kpi.value}</p>
                <p className="text-sm text-slate-500 mt-1">{kpi.label}</p>
              </div>
            ))}
          </div>

          {/* Progression + répartition */}
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 sm:col-span-8 bg-white rounded-xl shadow-sm border border-slate-100 p-6">
              <p className="text-sm font-medium text-slate-700 mb-3">Progression globale</p>
              <div className="h-2.5 rounded-full overflow-hidden flex bg-slate-100">
                {kpiTotal > 0 ? (
                  <>
                    <div className="bg-blue-500"    style={{ width: `${(kpiInProgress / kpiTotal) * 100}%` }} />
                    <div className="bg-amber-500"   style={{ width: `${(kpiSubmitted  / kpiTotal) * 100}%` }} />
                    <div className="bg-green-500"   style={{ width: `${(kpiValidated  / kpiTotal) * 100}%` }} />
                  </>
                ) : (
                  <div className="w-full bg-slate-100" />
                )}
              </div>
              <div className="flex items-center gap-4 mt-3 flex-wrap">
                {[
                  { color: 'bg-blue-500',  label: 'En cours' },
                  { color: 'bg-amber-500', label: 'Soumis' },
                  { color: 'bg-green-500', label: 'Validés' },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-1.5 text-xs text-slate-500">
                    <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                    {item.label}
                  </div>
                ))}
              </div>
            </div>

            <div className="col-span-12 sm:col-span-4 bg-white rounded-xl shadow-sm border border-slate-100 p-6">
              <p className="text-sm font-medium text-slate-700 mb-3">Répartition</p>
              <div className="space-y-2 text-sm">
                {[
                  { label: 'En cours', value: kpiInProgress, total: kpiTotal },
                  { label: 'Soumis',   value: kpiSubmitted,  total: kpiTotal },
                  { label: 'Validés',  value: kpiValidated,  total: kpiTotal },
                ].map(item => (
                  <div key={item.label} className="flex justify-between text-slate-600">
                    <span>{item.label}</span>
                    <span className="font-medium text-slate-900">
                      {item.total > 0 ? `${Math.round((item.value / item.total) * 100)}%` : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Départements ciblés */}
          {(campaign?.targetDepartments ?? []).length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
              <p className="text-sm font-medium text-slate-700 mb-3">Départements ciblés</p>
              <div className="flex flex-wrap gap-2">
                {campaign!.targetDepartments!.map(dept => (
                  <span key={dept} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm">
                    {dept}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Onglet Évaluations */}
      {tab === 'evaluations' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 text-center">
          <p className="text-slate-500 mb-4">Consultez les évaluations associées à cette campagne.</p>
          <Link
            to={`/evaluations?campaign=${id}`}
            className="inline-flex items-center gap-1 text-primary-600 font-medium hover:text-primary-700"
          >
            Voir les évaluations de cette campagne →
          </Link>
        </div>
      )}

      {/* Onglet Formulaires */}
      {tab === 'forms' && (
        <div>
          {campaign?.formId ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
              <p className="text-xs text-slate-400 uppercase font-medium mb-1">Formulaire principal</p>
              <Link
                to={`/forms/${campaign.formId}`}
                className="flex items-center justify-between hover:bg-slate-50 rounded-lg p-3 -mx-3 group"
              >
                <span className="font-medium text-slate-700 group-hover:text-slate-900">
                  Formulaire #{campaign.formId}
                </span>
                <span className="text-primary-500 text-sm">Consulter →</span>
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 text-center text-slate-400 text-sm">
              Aucun formulaire associé à cette campagne.
            </div>
          )}
        </div>
      )}

      {/* Modal Clonage */}
      {cloneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl mx-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Cloner la campagne</h3>
            <p className="text-sm text-slate-600 mb-4">
              Une copie de « {campaign?.name} » sera créée avec une nouvelle année.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setCloneModal(false)}
                className="border border-slate-200 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-medium"
              >
                Annuler
              </button>
              <button
                onClick={() => cloneMutation.mutate()}
                disabled={cloneMutation.isPending}
                className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {cloneMutation.isPending ? 'Clonage…' : 'Cloner'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Suppression */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl mx-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Supprimer la campagne</h3>
            <p className="text-sm text-slate-600 mb-3">⚠️ Cette action est irréversible.</p>
            <p className="text-sm text-slate-600 mb-2">Saisissez le nom de la campagne pour confirmer :</p>
            <p className="font-mono text-sm bg-slate-50 px-3 py-2 rounded mb-3">{campaign?.name}</p>
            <input
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-error-500"
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
              placeholder={campaign?.name}
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setDeleteModal(false); setDeleteConfirm('') }}
                className="border border-slate-200 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-medium"
              >
                Annuler
              </button>
              <button
                disabled={!campaign?.name || deleteConfirm !== campaign.name || deleteMutation.isPending}
                onClick={() => deleteMutation.mutate()}
                className="bg-error-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-error-600 disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Suppression…' : 'Supprimer définitivement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
