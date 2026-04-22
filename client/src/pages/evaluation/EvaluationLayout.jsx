// =============================================================================
// EvaluationLayout — En-tête partagé entre EvaluationSummary, EvaluationForm
// et EvaluationSign. Stepper horizontal minimaliste, pas de badge campagne.
// =============================================================================

import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check } from 'lucide-react'
import './evaluation.css'

const PHASES = [
  { id: 'self',        label: 'Auto-évaluation', path: 'self'        },
  { id: 'n-1',         label: 'Bilan N-1',        path: 'n-1'         },
  { id: 'objectives',  label: 'Objectifs',        path: 'objectives'  },
  { id: 'aspirations', label: 'Aspirations',      path: 'aspirations' },
  { id: 'sign',        label: 'Signature',        path: 'sign'        },
]

export default function EvaluationLayout({
  evalId,
  evaluation,
  currentPhase = null,
  donePhases   = [],
  children,
}) {
  const navigate = useNavigate()

  return (
    <div className="ev-layout">
      {/* En-tête */}
      <div className="ev-layout__header">
        {currentPhase !== null && (
          <button
            className="ev-layout__back"
            onClick={() => navigate(`/evaluation/${evalId}`)}
          >
            <ArrowLeft size={13} strokeWidth={2} aria-hidden="true" />
            Récapitulatif
          </button>
        )}

        {/* Stepper horizontal avec connecteurs */}
        <nav className="ev-stepper" aria-label="Étapes de l'évaluation">
          {PHASES.map((phase, idx) => {
            const isCurrent   = phase.id === currentPhase
            const isCompleted = donePhases.includes(phase.id)
            return (
              <React.Fragment key={phase.id}>
                {idx > 0 && <span className="ev-stepper__connector" aria-hidden="true" />}
                <button
                  className={[
                    'ev-stepper__step',
                    isCurrent   ? 'ev-stepper__step--active' : '',
                    isCompleted ? 'ev-stepper__step--done'   : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() => navigate(`/evaluation/${evalId}/${phase.path}`)}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  <span className="ev-stepper__num" title={phase.label}>
                    {isCompleted
                      ? <Check size={9} strokeWidth={3} aria-hidden="true" />
                      : idx + 1}
                  </span>
                </button>
              </React.Fragment>
            )
          })}
        </nav>
      </div>

      {children}
    </div>
  )
}
