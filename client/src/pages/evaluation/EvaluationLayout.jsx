// =============================================================================
// EvaluationLayout — Shell partagé entre EvaluationSummary, EvaluationForm
// et EvaluationSign. Bouton retour uniquement (stepper supprimé).
// =============================================================================

import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function EvaluationLayout({
  evalId,
  evaluation,
  currentPhase = null,
  children,
}) {
  const navigate = useNavigate()

  return (
    <div className="ev-layout">
      {currentPhase !== null && (
        <div className="ev-layout__header">
          <button
            type="button"
            className="ev-layout__back"
            onClick={() => navigate(`/evaluation/${evalId}`)}
          >
            <ArrowLeft size={13} strokeWidth={2} aria-hidden="true" />
            Récapitulatif
          </button>
        </div>
      )}

      {children}
    </div>
  )
}
