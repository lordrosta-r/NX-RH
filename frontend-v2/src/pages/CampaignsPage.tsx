import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BarChart2, Search, Plus, MoreVertical, Download } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { campaignsApi } from '../api/campaigns'
import { toast } from '../hooks/useToast'
import type { Campaign } from '../types'
import PageGuide from '../components/shared/PageGuide'
import { exportToCsv } from '../utils/export'

const STATUS_TABS = ['all', 'draft', 'active', 'closed', 'archived'] as const

const STATUS_LABELS: Record<string, string> = {
  all: 'Tous',
  draft: 'Brouillon',
  active: 'Active',
  closed: 'Clôturée',
  archived: 'Archivée',
}

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  active: 'bg-success-50 text-success-700',
  closed: 'bg-warning-50 text-warning-700',
  archived: 'bg-slate-50 text-slate-400',
}

const STATUS_DOT: Record<string, string> = {
  draft: 'bg-slate-400',
  active: 'bg-success-500',
  closed: 'bg-warning-500',
  archived: 'bg-slate-300',
}

function formatDateRange(start: string, end: string) {
  const s = new Date(start).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
  const e = new Date(end).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
  return `${s} – ${e}`
}

/** Backend returns `_id` from lean() queries — this helper normalises to a string id */
const cid = (c: Campaign): string => c.id ?? c._id ?? ''

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[status] ?? 'bg-slate-100 text-slate-700'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[status] ?? 'bg-slate-400'}`} />
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}

function ActionMenu({
  campaign,
  canManage,
  onClone,
  onArchive,
  onDelete,
}: {
  campaign: Campaign
  canManage: boolean
  onClone: (id: string) => void
  onArchive: (id: string) => void
  onDelete: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  if (!canManage) return null

  const canArchive = campaign.status === 'active' || campaign.status === 'closed'
  const canDelete = campaign.status === 'draft' || campaign.status === 'archived'

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="Actions campagne"
        className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-20 bg-white rounded-lg shadow-lg border border-slate-100 w-44 py-1">
          <Link
            to={`/campaigns/${cid(campaign)}`}
            className="flex items-center px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 w-full"
            onClick={() => setOpen(false)}
          >
            Voir
          </Link>
          <Link
            to={`/campaigns/${cid(campaign)}/edit`}
            className="flex items-center px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 w-full"
            onClick={() => setOpen(false)}
          >
            Modifier
          </Link>
          <button
            className="flex items-center px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 w-full"
            onClick={() => { onClone(cid(campaign)); setOpen(false) }}
          >
            Cloner
          </button>
          {canArchive && (
            <button
              className="flex items-center px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 w-full"
              onClick={() => { onArchive(cid(campaign)); setOpen(false) }}
            >
              Archiver
            </button>
          )}
          {canDelete && (
            <button
              className="flex items-center px-3 py-2 text-sm text-error-600 hover:bg-error-50 w-full"
              onClick={() => { onDelete(cid(campaign)); setOpen(false) }}
            >
              Supprimer
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function CampaignsPage() {
  const [statusTab, setStatusTab] = useState('all')
  const [search, setSearch] = useState('')
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const canManage = user?.role === 'admin' || user?.role === 'hr'

  const { data, isLoading } = useQuery({
    queryKey: ['campaigns', statusTab, search],
    queryFn: () =>
      campaignsApi
        .getCampaigns({
          status: statusTab === 'all' ? undefined : statusTab,
          q: search || undefined,
          limit: 50,
        })
        .then(r => r.data),
  })

  const cloneMutation = useMutation({
    mutationFn: (id: string) => campaignsApi.cloneCampaign(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
    onError: () => toast.error('Erreur lors du clonage', 'Veuillez réessayer.'),
  })

  const archiveMutation = useMutation({
    mutationFn: (id: string) => campaignsApi.archiveCampaign(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
    onError: () => toast.error('Erreur lors de l\'archivage', 'Veuillez réessayer.'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => campaignsApi.deleteCampaign(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
    onError: () => toast.error('Erreur lors de la suppression', 'Veuillez réessayer.'),
  })

  const campaigns = data?.data ?? []
  const isEmpty = !isLoading && campaigns.length === 0

  const handleExport = () => {
    exportToCsv('campagnes.csv', (campaigns ?? []).map(c => ({
      nom: c.name,
      statut: c.status,
      dateDebut: c.startDate,
      dateFin: c.endDate,
    })))
  }

  return (
    <div className="space-y-6">
      <PageGuide
        id="campaigns"
        title="Comment créer une campagne d'évaluation ?"
        color="blue"
        steps={[
          "Créez d'abord vos formulaires d'évaluation dans la section Formulaires",
          "Créez une campagne, définissez les dates et associez vos formulaires",
          "Définissez le public cible (tous les utilisateurs, département, secteur ou groupe)",
          "Activez la campagne — les évaluations sont générées automatiquement",
        ]}
      />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <nav className="text-sm text-slate-500 mb-1">
            <Link to="/" className="hover:text-slate-700">Accueil</Link>
            <span className="mx-1.5">›</span>
            <span>Campagnes</span>
          </nav>
          <h1 className="text-2xl font-bold text-slate-900">Campagnes</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 rounded-md text-sm hover:bg-slate-50">
            <Download size={16} /> Exporter
          </button>
          {canManage && (
            <Link
              to="/campaigns/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nouvelle campagne
            </Link>
          )}
        </div>
      </div>

      {/* Card with filters + content */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100">
        {/* Status tabs */}
        <div className="flex border-b border-slate-100 px-4 overflow-x-auto">
          {STATUS_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setStatusTab(tab)}
              className={`px-4 py-3 text-sm whitespace-nowrap transition-colors ${
                statusTab === tab
                  ? 'border-b-2 border-primary-500 text-primary-600 font-medium'
                  : 'text-slate-500 hover:text-slate-700 border-b-2 border-transparent'
              }`}
            >
              {STATUS_LABELS[tab]}
            </button>
          ))}
        </div>

        {/* Search bar */}
        <div className="p-4 border-b border-slate-50">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher une campagne…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="p-10 text-center text-slate-400 text-sm">Chargement…</div>
        ) : isEmpty ? (
          <div className="p-12 text-center">
            <BarChart2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium mb-2">Aucune campagne</p>
            {canManage && (
              <Link
                to="/campaigns/new"
                className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                <Plus className="w-4 h-4" />
                Créer la première campagne
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-500 font-medium uppercase tracking-wide border-b border-slate-100">
                    <th className="px-4 py-3 text-left">Nom</th>
                    <th className="px-4 py-3 text-left">Statut</th>
                    <th className="px-4 py-3 text-left">Période</th>
                    <th className="px-4 py-3 text-left w-44">Progression</th>
                    <th className="px-4 py-3 w-12" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {campaigns.map(campaign => {
                    const progress = campaign.completionPct ?? 0
                    return (
                      <tr key={cid(campaign)}>
                        <td className="px-4 py-3">
                          <Link
                            to={`/campaigns/${cid(campaign)}`}
                            className="font-medium text-slate-900 hover:text-primary-600 transition-colors"
                          >
                            {campaign.name}
                          </Link>
                          {campaign.description && (
                            <p className="text-xs text-slate-400 truncate max-w-xs mt-0.5">
                              {campaign.description}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={campaign.status} />
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {formatDateRange(campaign.startDate, campaign.endDate)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                              <div
                                className="bg-primary-500 h-1.5 rounded-full transition-all"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className="text-xs text-slate-500 w-8 text-right">{progress}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <ActionMenu
                            campaign={campaign}
                            canManage={canManage}
                            onClone={id => cloneMutation.mutate(id)}
                            onArchive={id => archiveMutation.mutate(id)}
                            onDelete={id => deleteMutation.mutate(id)}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-slate-100">
              {campaigns.map(campaign => {
                const progress = campaign.completionPct ?? 0
                return (
                  <div key={cid(campaign)} className="flex items-center justify-between p-4">
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/campaigns/${cid(campaign)}`}
                        className="font-medium text-slate-900 hover:text-primary-600 block mb-1"
                      >
                        {campaign.name}
                      </Link>
                      <div className="flex items-center gap-2 mb-2">
                        <StatusBadge status={campaign.status} />
                        <span className="text-xs text-slate-400">
                          {formatDateRange(campaign.startDate, campaign.endDate)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                          <div
                            className="bg-primary-500 h-1.5 rounded-full"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500">{progress}%</span>
                      </div>
                    </div>
                    <ActionMenu
                      campaign={campaign}
                      canManage={canManage}
                      onClone={id => cloneMutation.mutate(id)}
                      onArchive={id => archiveMutation.mutate(id)}
                      onDelete={id => deleteMutation.mutate(id)}
                    />
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
