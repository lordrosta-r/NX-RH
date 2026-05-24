import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { evaluationsApi } from '../api/evaluations'
import { useAuth } from '../contexts/AuthContext'
import type { EvaluationSignature } from '../types'

interface SignatureSectionProps {
  evaluationId: string
  signatures: EvaluationSignature[]
  status: string
  evaluatorId?: string
  evaluateeId?: string
  onSigned?: () => void
}

const SIGNING_STATUSES = ['reviewed', 'signed_evaluatee', 'signed_manager']

export function SignatureSection({
  evaluationId,
  signatures,
  status,
  evaluatorId,
  evaluateeId,
  onSigned,
}: SignatureSectionProps) {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [confirmed, setConfirmed] = useState(false)

  const canSign =
    SIGNING_STATUSES.includes(status) &&
    !!user &&
    (user.id === evaluatorId || user.id === evaluateeId) &&
    !signatures.some(s => s.userId === user.id)

  const signMutation = useMutation({
    mutationFn: () => evaluationsApi.signEvaluation(evaluationId).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['evaluation', evaluationId] })
      onSigned?.()
    },
  })

  const evaluateeSig = signatures.find(s => s.role === 'evaluatee')
  const evaluatorSig = signatures.find(s => s.role === 'evaluator')
  const hrSig        = signatures.find(s => s.role === 'hr')

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })

  const SignedBadge = ({ label, sig }: { label: string; sig?: EvaluationSignature }) =>
    sig ? (
      <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg border border-green-200">
        <span className="text-green-600 text-sm">&#10003;</span>
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-xs text-gray-500 ml-auto">{formatDate(sig.signedAt)}</span>
      </div>
    ) : (
      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-dashed border-gray-300">
        <span className="text-gray-400 text-sm">&#9201;</span>
        <span className="text-sm text-gray-500">{label} — En attente</span>
      </div>
    )

  const allSigned = evaluateeSig && evaluatorSig

  return (
    <div className="mt-6 p-5 bg-white rounded-xl border border-gray-200 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">Signatures électroniques</h3>
        {allSigned && (
          <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
            Complètes
          </span>
        )}
      </div>

      <div className="space-y-2">
        <SignedBadge label="Évalué" sig={evaluateeSig} />
        <SignedBadge label="Évaluateur" sig={evaluatorSig} />
        {hrSig && <SignedBadge label="RH" sig={hrSig} />}
      </div>

      {canSign && (
        <div className="pt-3 border-t border-gray-100 space-y-3">
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={e => setConfirmed(e.target.checked)}
              className="mt-1"
            />
            <span className="text-sm text-gray-600">
              Je confirme avoir pris connaissance de cette évaluation et je la signe électroniquement.
              Cette action est définitive et horodatée.
            </span>
          </label>
          <button
            onClick={() => signMutation.mutate()}
            disabled={!confirmed || signMutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {signMutation.isPending ? 'Signature en cours…' : '\u270D Signer cette évaluation'}
          </button>
          {signMutation.isError && (
            <p className="text-sm text-red-600">Erreur lors de la signature. Veuillez réessayer.</p>
          )}
        </div>
      )}
    </div>
  )
}
