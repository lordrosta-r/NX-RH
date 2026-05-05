import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { History, Download } from 'lucide-react'
import { evaluationsApi } from '../api/evaluations'

const EVAL_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  assigned:         { label: 'Assignée',         color: 'bg-slate-100 text-slate-600' },
  in_progress:      { label: 'En cours',          color: 'bg-primary-50 text-primary-700' },
  submitted:        { label: 'Soumise',           color: 'bg-warning-50 text-warning-700' },
  reviewed:         { label: 'Révisée',           color: 'bg-info-50 text-info-700' },
  signed_evaluatee: { label: 'Signée (évalué)',   color: 'bg-purple-50 text-purple-700' },
  signed_manager:   { label: 'Signée (mgr)',      color: 'bg-indigo-50 text-indigo-700' },
  signed_hr:        { label: 'Signée (RH)',       color: 'bg-teal-50 text-teal-700' },
  validated:        { label: 'Validée ✓',         color: 'bg-success-50 text-success-700' },
  expired:          { label: 'Expirée',           color: 'bg-error-50 text-error-600' },
  archived:         { label: 'Archivée',          color: 'bg-slate-50 text-slate-400' },
}

export default function EvaluationHistoryPage() {
  const [yearFilter, setYearFilter] = useState('')
  const [campaignFilter, setCampaignFilter] = useState('')

  const { data: evaluations = [], isLoading } = useQuery({
    queryKey: ['evaluations-history', yearFilter, campaignFilter],
    queryFn: () =>
      evaluationsApi
        .getMyEvaluations({ status: 'validated', year: yearFilter || undefined, campaignId: campaignFilter || undefined })
        .then(r => r.data.data),
  })

  const years = [...new Set(evaluations.map(e => e.createdAt?.slice(0, 4)).filter(Boolean))].sort().reverse() as string[]

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <nav className="text-sm text-slate-500 mb-1">
            <Link to="/" className="hover:text-slate-700">Accueil</Link>
            {' › '}
            <Link to="/evaluations" className="hover:text-slate-700">Évaluations</Link>
            {' › '}
            <span className="text-slate-900">Historique</span>
          </nav>
          <h1 className="text-2xl font-bold text-slate-900">Mon historique d'entretiens</h1>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex gap-3 mb-6">
        <select
          value={yearFilter}
          onChange={e => setYearFilter(e.target.value)}
          className="h-9 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
        >
          <option value="">Toutes les années</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select
          value={campaignFilter}
          onChange={e => setCampaignFilter(e.target.value)}
          className="h-9 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
        >
          <option value="">Toutes les campagnes</option>
          {[...new Set(evaluations.map(e => e.campaign?.name).filter(Boolean))].map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </div>

      {/* Grille */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-36 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : evaluations.length === 0 ? (
        <div className="text-center py-16">
          <History className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Aucun entretien terminé pour l'instant.</p>
          <p className="text-sm text-slate-400 mt-1">Vos évaluations validées apparaîtront ici.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {evaluations.map(ev => (
            <div key={ev.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-slate-900">{ev.campaign?.name ?? ev.campaignId}</p>
                  <p className="text-sm text-slate-500 mt-0.5">{ev.form?.title ?? ev.formId}</p>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${EVAL_STATUS_CONFIG[ev.status]?.color ?? 'bg-slate-100 text-slate-600'}`}>
                  {EVAL_STATUS_CONFIG[ev.status]?.label ?? ev.status}
                </span>
              </div>

              {ev.reviewerScore !== undefined && (
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full bg-primary-500" style={{ width: `${ev.reviewerScore}%` }} />
                  </div>
                  <span className="text-sm font-medium text-slate-700">{ev.reviewerScore}/100</span>
                </div>
              )}

              <p className="text-xs text-slate-400 mb-4">
                Validée le {ev.signedByHrAt ? new Date(ev.signedByHrAt).toLocaleDateString('fr-FR') : '—'}
              </p>

              <div className="flex items-center gap-2">
                <Link
                  to={`/evaluations/${ev.id}`}
                  className="flex-1 text-center px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 font-medium"
                >
                  Voir le compte-rendu
                </Link>
                <button
                  onClick={() => window.open(`/api/evaluations/${ev.id}/pdf`, '_blank')}
                  className="p-1.5 text-slate-400 hover:text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
                  title="Télécharger PDF"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
