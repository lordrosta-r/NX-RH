// =============================================================================
// EvaluationSummary — Récapitulatif /evaluation/:evalId
// Affiche la progression globale + les cartes de phase avec CTA "Continuer".
// Design ref : designs/employee/evalsummaryscreen.html
// =============================================================================

import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle, ChevronRight } from 'lucide-react'
import EvaluationLayout from './EvaluationLayout'
import { t as pageT } from './i18n'
import { useLocale } from '../../hooks/useLocale'
import './evaluation.css'

// Définition des phases du parcours avec leur description
const PHASES = [
  {
    id:   'self',
    path: 'self',
    label: 'Auto-évaluation',
    desc:  'Évaluez vos compétences et réalisations de l\'année.',
  },
  {
    id:   'n-1',
    path: 'n-1',
    label: 'Bilan année N-1',
    desc:  'Analysez l\'atteinte de vos objectifs de l\'an passé.',
  },
  {
    id:   'objectives',
    path: 'objectives',
    label: 'Objectifs',
    desc:  'Définissez vos objectifs pour l\'année à venir.',
  },
  {
    id:   'aspirations',
    path: 'aspirations',
    label: 'Aspirations carrière',
    desc:  'Partagez votre vision d\'évolution professionnelle.',
  },
  {
    id:   'sign',
    path: 'sign',
    label: 'Signature',
    desc:  'Contresignez ou contestez l\'évaluation finalisée.',
  },
]

// Statuts où les réponses sont encore modifiables
const EDITABLE_STATUSES = ['assigned', 'in_progress']

// Détermine les phases ayant au moins une réponse enregistrée.
// Heuristique : le questionId commence par le préfixe de la phase (ex. "self_q1").
function computeDonePhases(answers = []) {
  const phaseIds = ['self', 'n-1', 'objectives', 'aspirations']
  const prefixMap = { 'self': 'self_', 'n-1': 'n1_', 'objectives': 'obj_', 'aspirations': 'asp_' }
  const answeredPhases = new Set(
    answers
      .map(a => {
        const qid = a.questionId ?? ''
        return phaseIds.find(p => qid.startsWith(prefixMap[p] ?? p))
      })
      .filter(Boolean)
  )
  return [...answeredPhases]
}

// Calcule le pourcentage de complétion (4 phases hors signature)
function computeProgress(answers = []) {
  const done = computeDonePhases(answers)
  return Math.round((done.length / 4) * 100)
}

export default function EvaluationSummary() {
  const { evalId } = useParams()
  const navigate   = useNavigate()
  const { t }      = useLocale(pageT)

  const { data: evaluation, isLoading, error } = useQuery({
    queryKey: ['eval', evalId],
    queryFn:  () =>
      fetch(`/api/evaluations/${evalId}`, { credentials: 'include' })
        .then(r => { if (!r.ok) throw new Error('Évaluation introuvable'); return r.json() }),
    enabled:   !!evalId,
    staleTime: 30_000,
  })

  const answers    = evaluation?.answers ?? []
  const donePhases = computeDonePhases(answers)
  const progress   = computeProgress(answers)
  const status     = evaluation?.status ?? 'assigned'
  const canEdit    = EDITABLE_STATUSES.includes(status)

  if (isLoading) {
    return (
      <div className="ev-layout">
        <p className="empty-state">{t('ev.form.loading')}</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="ev-layout">
        <p className="error-msg">{t('ev.error.not_found')}</p>
      </div>
    )
  }

  return (
    <EvaluationLayout
      evalId={evalId}
      evaluation={evaluation}
      currentPhase={null}
      donePhases={donePhases}
    >
      {/* En-tête éditorial */}
      <div>
        <p className="ev-summary__tagline">Gestion de la performance</p>
        <h2 className="ev-summary__headline">Mon évaluation</h2>
      </div>

      {/* Carte de progression globale */}
      <div className="ev-progress-card">
        <div className="ev-progress-card__header">
          <div>
            <p className="ev-progress-card__title">Progression globale</p>
            <p className="ev-progress-card__meta">
              {evaluation?.campaignId?.name ?? 'Cycle Annuel 2026'}
              {' · '}Statut :{' '}
              <span className={`badge badge--${status}`}>
                {t(`ev.status.${status}`) || status}
              </span>
            </p>
          </div>
          <span className="ev-progress-card__pct">{progress}%</span>
        </div>

        {/* Barre de progression — width dynamique : seul cas justifiant un inline style */}
        <div
          className="ev-progress-bar"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="ev-progress-bar__fill" style={{ width: `${progress}%` }} />
        </div>

        <div className="ev-progress-legend">
          <span className="ev-progress-legend__item">
            <span className="ev-progress-legend__dot ev-progress-legend__dot--done" />
            Phases complétées
          </span>
          <span className="ev-progress-legend__item">
            <span className="ev-progress-legend__dot" />
            En attente
          </span>
        </div>
      </div>

      {/* Cartes de phase */}
      <div>
        {PHASES.map(phase => {
          const isDone = donePhases.includes(phase.id) || (phase.id === 'sign' && !canEdit)

          return (
            <div key={phase.id} className="ev-phase-card">
              <div className="ev-phase-card__info">
                <p className={`ev-phase-card__label${isDone ? ' ev-phase-card__label--done' : ''}`}>
                  {isDone && (
                    <CheckCircle
                      size={12}
                      strokeWidth={2.5}
                      aria-hidden="true"
                      className="ev-phase-card__label-icon"
                    />
                  )}
                  {phase.label}
                </p>
                <p className="ev-phase-card__title">{phase.label}</p>
                <p className="ev-phase-card__desc">{phase.desc}</p>
              </div>

              <div className="ev-phase-card__actions">
                <span className={`ev-phase-card__status${isDone ? ' ev-phase-card__status--done' : ''}`}>
                  {isDone ? 'Complété' : 'En attente'}
                </span>
                <button
                  className="ev-continue-btn"
                  onClick={() => navigate(`/evaluation/${evalId}/${phase.path}`)}
                >
                  {isDone ? 'Consulter' : 'Continuer'}
                  <ChevronRight size={14} strokeWidth={2} aria-hidden="true" />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </EvaluationLayout>
  )
}
