// EvaluationRedirect — Route /employee/evaluation
// Fetch la première évaluation active de l'user et redirige vers /evaluation/:id
// Si aucune évaluation en cours, affiche un message dans le shell authentifié.

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../contexts/AuthContext'
import { ClipboardCheck } from 'lucide-react'

export default function EvaluationRedirect() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const { data: evaluations = [], isLoading } = useQuery({
    queryKey: ['evaluations-me-active', user?._id],
    queryFn: () =>
      fetch(`/api/evaluations?evaluateeId=${user._id}`, { credentials: 'include' })
        .then(r => r.ok ? r.json() : { data: [] })
        .then(j => j.data ?? j),
    enabled: !!user,
    staleTime: 30 * 1000,
  })

  useEffect(() => {
    if (isLoading) return
    const inProgress = evaluations.filter(e => ['assigned', 'in_progress'].includes(e.status))
    // Préférer les auto-évaluations aux upward feedback
    const active =
      inProgress.find(e => e.formId?.formType === 'self_evaluation') ??
      inProgress[0]
    if (active) navigate(`/evaluation/${active._id}`, { replace: true })
  }, [isLoading, evaluations, navigate])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-on-surface-variant">
        <p>Chargement…</p>
      </div>
    )
  }

  const hasActive = evaluations.some(e => ['assigned', 'in_progress'].includes(e.status))
  if (hasActive) return null // redirection en cours

  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
      <ClipboardCheck size={40} strokeWidth={1.2} className="text-on-surface-variant" />
      <p className="text-on-surface font-medium">Aucune évaluation en cours</p>
      <p className="text-sm text-on-surface-variant">
        Vous serez notifié dès qu'une campagne vous sera assignée.
      </p>
    </div>
  )
}
