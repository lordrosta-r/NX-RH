// =============================================================================
// EvaluationLayout — En-tête partagé entre EvaluationSummary, EvaluationForm
// et EvaluationSign. Affiche titre, badge campagne et indicateur d'étapes.
// =============================================================================

import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle } from 'lucide-react'
import './evaluation.css'

// Ordre canonique des phases dans le parcours d'évaluation
const PHASES = [
  { id: 'self',        label: 'Auto-évaluation', path: 'self'        },
  { id: 'n-1',         label: 'Bilan N-1',        path: 'n-1'         },
  { id: 'objectives',  label: 'Objectifs',        path: 'objectives'  },
  { id: 'aspirations', label: 'Aspirations',      path: 'aspirations' },
  { id: 'sign',        label: 'Signature',        path: 'sign'        },
]

/**
 * @param {string}   evalId       — ID MongoDB de l'évaluation
 * @param {object}   evaluation   — objet évaluation (peut être null pendant le chargement)
 * @param {string}   currentPhase — 'self'|'n-1'|'objectives'|'aspirations'|'sign'|null
 * @param {string[]} donePhases   — liste des IDs de phases complétées
 * @param {ReactNode} children
 */
export default function EvaluationLayout({
  evalId,
  evaluation,
  currentPhase = null,
  donePhases   = [],
  children,
}) {
  const navigate = useNavigate()

  const campaignName = evaluation?.campaignId?.name ?? 'Cycle Annuel 2026'
  const title        = evaluation?.formId?.title    ?? 'Évaluation annuelle'

  return (
    <div className="ev-layout">
      {/* En-tête éditorial */}
      <div className="ev-layout__header">
        {/* Bouton retour — absent sur le récapitulatif lui-même */}
        {currentPhase !== null && (
          <button
            className="ev-layout__back"
            onClick={() => navigate(`/evaluation/${evalId}`)}
          >
            <ArrowLeft size={14} strokeWidth={2} aria-hidden="true" />
            Récapitulatif
          </button>
        )}

        <span className="ev-layout__campaign">{campaignName}</span>
        <h1 className="ev-layout__title">{title}</h1>

        {/* Indicateur d'étapes */}
        <nav className="ev-stepper" aria-label="Étapes de l'évaluation">
          {PHASES.map((phase, idx) => {
            const isCurrent   = phase.id === currentPhase
            const isCompleted = donePhases.includes(phase.id)
            return (
              <button
                key={phase.id}
                className={[
                  'ev-stepper__step',
                  isCurrent   ? 'ev-stepper__step--active' : '',
                  isCompleted ? 'ev-stepper__step--done'   : '',
                ].filter(Boolean).join(' ')}
                onClick={() => navigate(`/evaluation/${evalId}/${phase.path}`)}
                aria-current={isCurrent ? 'step' : undefined}
              >
                <span className="ev-stepper__num">
                  {isCompleted
                    ? <CheckCircle size={12} strokeWidth={2.5} aria-hidden="true" />
                    : idx + 1}
                </span>
                <span className="ev-stepper__label">{phase.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Contenu de la vue enfant */}
      {children}
    </div>
  )
}
