// =============================================================================
// EvaluationSummary — Récapitulatif /evaluation/:evalId
// Layout : colonne gauche (KPI + métadonnées) + colonne droite (liste des phases)
// =============================================================================

import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Check, ChevronRight, Lock } from 'lucide-react'
import EvaluationLayout from './EvaluationLayout'
import { t as pageT } from './i18n'
import { useTranslate } from '../../contexts/LocaleContext'

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
    label: 'Bilan N-1',
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
    label: 'Aspirations',
    desc:  'Partagez votre vision d\'évolution professionnelle.',
  },
  {
    id:   'sign',
    path: 'sign',
    label: 'Signature',
    desc:  'Contresignez ou contestez l\'évaluation finalisée.',
    locked: true,
  },
]

const EDITABLE_STATUSES = ['assigned', 'in_progress']

function computeDonePhases(answers = []) {
  const phaseIds  = ['self', 'n-1', 'objectives', 'aspirations']
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

function computeProgress(answers = []) {
  return Math.round((computeDonePhases(answers).length / 4) * 100)
}

// Étiquettes statut lisibles
const STATUS_LABELS = {
  assigned:          'Assignée',
  in_progress:       'En cours',
  submitted:         'Soumise',
  reviewed:          'Révisée',
  signed_evaluatee:  'Signée (vous)',
  signed_manager:    'Signée (manager)',
  signed_hr:         'Signée (RH)',
  validated:         'Validée',
}

export default function EvaluationSummary() {
  const { evalId } = useParams()
  const navigate   = useNavigate()
  const t          = useTranslate(pageT)

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
  const statusLabel = STATUS_LABELS[status] ?? status

  if (isLoading) {
    return (
      <div className="ev-layout">
        <p className="empty-state">Chargement…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="ev-layout">
        <p className="error-msg">Évaluation introuvable.</p>
      </div>
    )
  }

  return (
    <EvaluationLayout
      evalId={evalId}
      evaluation={evaluation}
      currentPhase={null}
    >
      {/* ── Hero banner ── */}
      <div className="ev-hero">
        <div className="ev-hero__body">
          <p className="ev-hero__eyebrow">Gestion de la performance</p>
          <h2 className="ev-hero__title">
            Mon <span className="ev-hero__accent">évaluation</span>
          </h2>
          <p className="ev-hero__sub">
            Complétez chaque phase à votre rythme. Vos réponses sont sauvegardées automatiquement à chaque étape.
          </p>
          <span className={`ev-sum-hd__chip ev-sum-hd__chip--${status}`}>
            {statusLabel}
          </span>
        </div>
        <img
          src="/assets/spotlight.jpg"
          alt=""
          aria-hidden="true"
          className="ev-hero__img"
          onError={e => { e.target.style.display = 'none' }}
        />
        <div className="ev-hero__glow" aria-hidden="true" />
      </div>

      {/* Grid 2 colonnes */}
      <div className="ev-sum-grid">

        {/* ── Colonne gauche : KPI + métadonnées ─── */}
        <aside className="ev-sum-aside">

          {/* Score */}
          <div className="ev-sum-kpi">
            <div className="ev-sum-kpi__top">
              <span className="ev-sum-kpi__pct">{progress}%</span>
              <span className="ev-sum-kpi__sub">{donePhases.length} / 4 phases</span>
            </div>
            <div
              className="ev-sum-kpi__bar"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className="ev-sum-kpi__fill" style={{ width: `${progress}%` }} />
            </div>
            <div className="ev-sum-kpi__dots">
              {PHASES.filter(p => p.id !== 'sign').map(p => (
                <span
                  key={p.id}
                  className={`ev-sum-kpi__dot${donePhases.includes(p.id) ? ' ev-sum-kpi__dot--done' : ''}`}
                  title={p.label}
                />
              ))}
            </div>
          </div>

          {/* Métadonnées */}
          <dl className="ev-sum-meta">
            <div className="ev-sum-meta__row">
              <dt>Campagne</dt>
              <dd>{evaluation?.campaignId?.name ?? 'Cycle Annuel 2026'}</dd>
            </div>
            <div className="ev-sum-meta__row">
              <dt>Statut</dt>
              <dd>
                <span className={`ev-sum-hd__chip ev-sum-hd__chip--${status} ev-sum-hd__chip--sm`}>
                  {statusLabel}
                </span>
              </dd>
            </div>
            <div className="ev-sum-meta__row">
              <dt>Complété</dt>
              <dd>{donePhases.length} phase{donePhases.length > 1 ? 's' : ''} sur 4</dd>
            </div>
          </dl>
        </aside>

        {/* ── Colonne droite : liste des phases ─────── */}
        <main className="ev-sum-main">
          <p className="ev-sum-main__label">Phases de l'évaluation</p>

          <div className="ev-phase-list">
            {PHASES.map((phase, idx) => {
              const isDone       = donePhases.includes(phase.id) || (phase.id === 'sign' && !canEdit)
              const isSignLocked = phase.id === 'sign' && canEdit

              return (
                <div
                  key={phase.id}
                  className={[
                    'ev-phase-row',
                    isDone        ? 'ev-phase-row--done'   : '',
                    isSignLocked  ? 'ev-phase-row--locked' : '',
                  ].filter(Boolean).join(' ')}
                >
                  <div className="ev-phase-row__num" aria-hidden="true">
                    {isDone
                      ? <Check size={10} strokeWidth={3} />
                      : isSignLocked
                        ? <Lock size={10} strokeWidth={2} />
                        : idx + 1}
                  </div>

                  <div className="ev-phase-row__body">
                    <p className="ev-phase-row__name">{phase.label}</p>
                    <p className="ev-phase-row__desc">{phase.desc}</p>
                  </div>

                  {!isSignLocked && (
                    <button
                      type="button"
                      className={`ev-phase-row__cta${isDone ? ' ev-phase-row__cta--ghost' : ''}`}
                      onClick={() => navigate(`/evaluation/${evalId}/${phase.path}`)}
                    >
                      {isDone ? 'Consulter' : 'Commencer'}
                      <ChevronRight size={12} strokeWidth={2.5} aria-hidden="true" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </main>

      </div>
    </EvaluationLayout>
  )
}

