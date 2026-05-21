import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Download, AlertTriangle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { evaluationsApi } from '../api/evaluations'
import Breadcrumbs from '../components/ui/Breadcrumbs'

export default function EvaluationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const { data: evaluation, isLoading } = useQuery({
    queryKey: ['evaluation', id],
    queryFn: () => evaluationsApi.getEvaluation(id!).then(r => r.data),
    enabled: !!id,
  })

  const isEvaluator = evaluation?.evaluatorId === user?.id
  const isEvaluatee = evaluation?.evaluateeId === user?.id
  const isAdminOrHr = user?.role === 'admin' || user?.role === 'hr'
  const isManager = user?.role === 'manager'
  const status = evaluation?.status ?? 'assigned'

  const mode = useMemo(() => {
    if (['assigned', 'in_progress'].includes(status) && isEvaluator) return 'fill'
    if (status === 'submitted' && (isAdminOrHr || isManager)) return 'review'
    if (['reviewed', 'signed_evaluatee', 'signed_manager', 'signed_hr'].includes(status)) return 'sign'
    return 'readonly'
  }, [status, isEvaluator, isAdminOrHr, isManager])

  const [answers, setAnswers] = useState<Record<string, unknown>>({})
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0)
  const [currentPhase, setCurrentPhase] = useState<string | null>(null)
  const [submitModal, setSubmitModal] = useState(false)

  const [reviewerScore, setReviewerScore] = useState<number | ''>('')
  const [reviewerComment, setReviewerComment] = useState('')
  const [nextYearObjectives, setNextYearObjectives] = useState('')

  const [evaluateeComment, setEvaluateeComment] = useState('')
  const [disagreementFlag, setDisagreementFlag] = useState(false)

  useEffect(() => {
    if (evaluation) {
      setAnswers(evaluation.answers ?? {})
      setReviewerScore(evaluation.reviewerScore ?? '')
      setReviewerComment(evaluation.reviewerComment ?? '')
      setNextYearObjectives(evaluation.nextYearObjectives ?? '')
      setEvaluateeComment(evaluation.evaluateeComment ?? '')
      setDisagreementFlag(evaluation.disagreementFlag ?? false)
    }
  }, [evaluation])

  const questions = evaluation?.form?.questions ?? []
  const phases = [...new Set(questions.map(q => q.phase).filter(Boolean))] as string[]
  const filteredQuestions = currentPhase ? questions.filter(q => q.phase === currentPhase) : questions
  const currentQuestion = filteredQuestions[currentQuestionIdx]
  const answeredCount = questions.filter(q => answers[q.id] !== undefined && answers[q.id] !== '').length
  const progress = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0

  // Auto-save (debounce 2s)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)

  const autoSave = useCallback((updatedAnswers: Record<string, unknown>) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await evaluationsApi.updateEvaluation(id!, { answers: updatedAnswers, status: 'in_progress' })
        setLastSavedAt(new Date())
      } catch {}
    }, 2000)
  }, [id])

  function setAnswer(questionId: string, value: unknown) {
    const updated = { ...answers, [questionId]: value }
    setAnswers(updated)
    autoSave(updated)
  }

  const submitMutation = useMutation({
    mutationFn: () => evaluationsApi.submitEvaluation(id!),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['evaluation', id] }); setSubmitModal(false) },
  })

  const reviewMutation = useMutation({
    mutationFn: () => evaluationsApi.updateEvaluation(id!, {
      reviewerScore: Number(reviewerScore),
      reviewerComment,
      nextYearObjectives,
    }).then(() => evaluationsApi.transitionEvaluation(id!, 'review')),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['evaluation', id] }),
  })

  const signMutation = useMutation({
    mutationFn: () => evaluationsApi.signEvaluation(id!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['evaluation', id] }),
  })

  const validateMutation = useMutation({
    mutationFn: () => evaluationsApi.validateEvaluation(id!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['evaluation', id] }),
  })

  const signWithCommentMutation = useMutation({
    mutationFn: () => evaluationsApi.updateEvaluation(id!, { evaluateeComment, disagreementFlag }).then(() => evaluationsApi.signEvaluation(id!)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['evaluation', id] }),
  })

  if (isLoading) return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />)}
    </div>
  )

  if (!evaluation) return (
    <div className="text-center py-16">
      <p className="text-slate-500">Évaluation introuvable ou accès refusé.</p>
      <Link to="/evaluations" className="text-primary-600 hover:underline text-sm mt-2 inline-block">← Retour aux évaluations</Link>
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto py-6 px-4">
      {/* Fil d'ariane */}
      <Breadcrumbs
        items={[
          { label: 'Évaluations', href: '/evaluations' },
          { label: `${evaluation.evaluatee?.firstName ?? ''} ${evaluation.evaluatee?.lastName ?? ''}`.trim() || '…' },
        ]}
      />

      {/* Contexte */}
      <div className="flex items-center gap-4 mb-4 text-sm text-slate-600 flex-wrap">
        <span>Évalué : <strong className="text-slate-900">{evaluation.evaluatee?.firstName} {evaluation.evaluatee?.lastName}</strong></span>
        <span>Campagne : <strong className="text-slate-900">{evaluation.campaign?.name}</strong></span>
        {evaluation.deadline && (
          <span>Deadline : <strong className="text-slate-900">{new Date(evaluation.deadline).toLocaleDateString('fr-FR')}</strong></span>
        )}
        {evaluation.disagreementFlag && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-warning-50 text-warning-700 border border-warning-200 rounded-full text-xs font-medium">
            <AlertTriangle className="w-3.5 h-3.5" /> Désaccord signalé
          </span>
        )}
      </div>

      {/* ── Mode FILL (A) ── */}
      {mode === 'fill' && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold text-slate-900">Remplir l'évaluation</h1>
            {lastSavedAt && (
              <span className="text-xs text-slate-400">Sauvegardé à {lastSavedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
            )}
          </div>

          {/* Barre de progression */}
          <div className="mb-6">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>{answeredCount}/{questions.length} questions répondues</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="bg-slate-100 rounded-full h-2">
              <div className="h-2 rounded-full bg-primary-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {/* Navigation phases */}
          {phases.length > 1 && (
            <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
              <button
                onClick={() => { setCurrentPhase(null); setCurrentQuestionIdx(0) }}
                className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap ${!currentPhase ? 'bg-primary-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                Toutes
              </button>
              {phases.map(phase => (
                <button
                  key={phase}
                  onClick={() => { setCurrentPhase(phase); setCurrentQuestionIdx(0) }}
                  className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap ${currentPhase === phase ? 'bg-primary-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {phase}
                </button>
              ))}
            </div>
          )}

          {/* Question card */}
          {currentQuestion && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 mb-4">
              <p className="text-xs text-slate-400 mb-2">Question {currentQuestionIdx + 1} / {filteredQuestions.length}</p>
              <p className="text-base font-medium text-slate-900 mb-4">{currentQuestion.text}</p>

              {currentQuestion.type === 'rating' && (
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(v => (
                    <button
                      key={v}
                      onClick={() => setAnswer(currentQuestion.id, v)}
                      className={`w-10 h-10 rounded-full border-2 font-semibold text-sm transition-all ${answers[currentQuestion.id] === v ? 'border-primary-500 bg-primary-500 text-white' : 'border-slate-200 text-slate-600 hover:border-primary-300'}`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              )}

              {(currentQuestion.type === 'text' || currentQuestion.type === 'textarea') && (
                <textarea
                  rows={4}
                  value={String(answers[currentQuestion.id] ?? '')}
                  onChange={e => setAnswer(currentQuestion.id, e.target.value)}
                  placeholder="Votre réponse…"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-200 resize-none"
                />
              )}

              {currentQuestion.type === 'yes_no' && (
                <div className="flex gap-3">
                  {['Oui', 'Non'].map(opt => (
                    <button
                      key={opt}
                      onClick={() => setAnswer(currentQuestion.id, opt)}
                      className={`px-6 py-2 rounded-md border-2 font-medium text-sm transition-all ${answers[currentQuestion.id] === opt ? 'border-primary-500 bg-primary-500 text-white' : 'border-slate-200 text-slate-600 hover:border-primary-300'}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {currentQuestion.type === 'choice' && currentQuestion.options && (
                <div className="space-y-2">
                  {currentQuestion.options.map(opt => (
                    <button
                      key={opt}
                      onClick={() => setAnswer(currentQuestion.id, opt)}
                      className={`w-full text-left px-4 py-3 rounded-md border-2 text-sm transition-all ${answers[currentQuestion.id] === opt ? 'border-primary-500 bg-primary-50 text-primary-700 font-medium' : 'border-slate-200 text-slate-700 hover:border-slate-300'}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {currentQuestion.type === 'rating' && (
                <div className="mt-4">
                  <label className="block text-xs text-slate-500 mb-1">Note (optionnelle)</label>
                  <input
                    type="text"
                    value={String(answers[`${currentQuestion.id}_note`] ?? '')}
                    onChange={e => setAnswer(`${currentQuestion.id}_note`, e.target.value)}
                    placeholder="Commentaire…"
                    className="w-full h-9 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
                  />
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              disabled={currentQuestionIdx === 0}
              onClick={() => setCurrentQuestionIdx(i => i - 1)}
              className="px-4 py-2 border border-slate-200 rounded-md text-sm font-medium hover:bg-slate-50 disabled:opacity-40"
            >
              ← Précédent
            </button>
            {currentQuestionIdx < filteredQuestions.length - 1 ? (
              <button
                onClick={() => setCurrentQuestionIdx(i => i + 1)}
                className="px-4 py-2 bg-primary-500 text-white rounded-md text-sm font-medium hover:bg-primary-600"
              >
                Suivant →
              </button>
            ) : (
              <button
                onClick={() => setSubmitModal(true)}
                className="px-6 py-2 bg-success-500 text-white rounded-md text-sm font-semibold hover:bg-success-600"
              >
                Soumettre l'évaluation
              </button>
            )}
          </div>

          {/* Modal soumission */}
          {submitModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Confirmer la soumission ?</h3>
                <p className="text-sm text-slate-600 mb-4">
                  Vous ne pourrez plus modifier vos réponses après soumission.{' '}
                  {answeredCount < questions.length && (
                    <span className="text-warning-600 font-medium">{questions.length - answeredCount} question(s) non répondue(s).</span>
                  )}
                </p>
                <div className="flex gap-3 justify-end">
                  <button onClick={() => setSubmitModal(false)} className="px-4 py-2 text-sm border border-slate-200 rounded-md hover:bg-slate-50">Annuler</button>
                  <button
                    onClick={() => submitMutation.mutate()}
                    disabled={submitMutation.isPending}
                    className="px-4 py-2 text-sm bg-success-500 text-white rounded-md hover:bg-success-600 disabled:opacity-50"
                  >
                    {submitMutation.isPending ? 'Soumission…' : 'Confirmer la soumission'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Mode REVIEW (B) ── */}
      {mode === 'review' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-slate-900">Révision de l'évaluation</h1>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-warning-50 text-warning-700">Soumise</span>
              <button
                onClick={() => window.open(`/api/evaluations/${id}/pdf`, '_blank')}
                className="inline-flex items-center gap-2 border border-slate-200 hover:bg-slate-50 px-3 py-1.5 rounded-md text-sm"
              >
                <Download className="w-4 h-4" /> PDF
              </button>
              {(isAdminOrHr || isManager) && (
                <button
                  onClick={() => reviewMutation.mutate()}
                  disabled={reviewMutation.isPending}
                  className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-3 py-1.5 rounded-md text-sm font-medium disabled:opacity-50"
                >
                  {reviewMutation.isPending ? 'Traitement…' : 'Revoir →'}
                </button>
              )}
            </div>
          </div>

          {/* Réponses en lecture seule */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">Réponses de l'évalué</h2>
            <div className="space-y-4">
              {questions.map((q, idx) => (
                <div key={q.id} className="pb-4 border-b border-slate-100 last:border-0">
                  <p className="text-xs text-slate-400 mb-1">Q{idx + 1} · {q.type}</p>
                  <p className="text-sm font-medium text-slate-800 mb-2">{q.text}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-primary-600 text-sm">➤</span>
                    {q.type === 'rating' && answers[q.id] !== undefined ? (
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(v => (
                          <div key={v} className={`w-7 h-7 rounded-full text-xs font-semibold flex items-center justify-center ${Number(answers[q.id]) >= v ? 'bg-primary-500 text-white' : 'bg-slate-100 text-slate-400'}`}>{v}</div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-700 italic">{String(answers[q.id] ?? '—')}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section reviewer */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">Votre révision</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Score global <span className="text-error-500">*</span></label>
                <div className="flex items-center gap-3">
                  <input
                    type="number" min={0} max={100}
                    value={reviewerScore}
                    onChange={e => setReviewerScore(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-24 h-10 px-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
                  />
                  <span className="text-sm text-slate-500">/ 100</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Commentaire</label>
                <textarea rows={3} value={reviewerComment} onChange={e => setReviewerComment(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-200 resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Objectifs N+1</label>
                <textarea rows={3} value={nextYearObjectives} onChange={e => setNextYearObjectives(e.target.value)} placeholder="Objectifs pour l'année prochaine…" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-200 resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => navigate('/evaluations')} className="px-4 py-2 text-sm border border-slate-200 rounded-md hover:bg-slate-50">Annuler</button>
              <button
                onClick={() => reviewMutation.mutate()}
                disabled={reviewMutation.isPending || reviewerScore === ''}
                className="px-4 py-2 text-sm bg-primary-500 text-white rounded-md hover:bg-primary-600 disabled:opacity-50"
              >
                {reviewMutation.isPending ? 'Enregistrement…' : 'Enregistrer la révision'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Mode SIGN (C) ── */}
      {mode === 'sign' && (
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-6">Compte-rendu d'entretien</h1>

          {/* Bandeau progression signatures */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 overflow-x-auto">
            <div className="flex items-center gap-2 min-w-max">
              {[
                { key: 'submitted', label: 'Soumis' },
                { key: 'reviewed', label: 'Révisé' },
                { key: 'signed_evaluatee', label: 'Signé (évalué)' },
                { key: 'signed_manager', label: 'Signé (manager)' },
                { key: 'signed_hr', label: 'Signé (RH)' },
              ].map((step, idx, arr) => {
                const statuses = ['submitted', 'reviewed', 'signed_evaluatee', 'signed_manager', 'signed_hr']
                const currentIdx = statuses.indexOf(status)
                const stepIdx = statuses.indexOf(step.key)
                const isDone = stepIdx < currentIdx
                const isCurrent = stepIdx === currentIdx
                return (
                  <div key={step.key} className="flex items-center gap-2">
                    <div className={`flex items-center gap-1 text-sm ${isDone ? 'text-success-600' : isCurrent ? 'text-primary-600 font-semibold' : 'text-slate-400'}`}>
                      {isDone ? '✓' : isCurrent ? '→' : '○'} {step.label}
                    </div>
                    {idx < arr.length - 1 && <span className="text-slate-300 mx-1">─</span>}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Bandeau désaccord */}
          {evaluation.disagreementFlag && (
            <div className="border-l-4 border-warning-500 bg-warning-50 p-4 rounded-lg mb-4 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-warning-600 flex-shrink-0" />
              <p className="text-sm text-warning-700 font-medium">L'évalué a signalé un désaccord avec cette évaluation.</p>
            </div>
          )}

          {/* Résumé révision */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
            <div className="grid grid-cols-2 gap-6">
              {evaluation.reviewerScore !== undefined && (
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Score</p>
                  <p className="text-2xl font-bold text-slate-900">{evaluation.reviewerScore}<span className="text-base font-normal text-slate-400">/100</span></p>
                </div>
              )}
              {evaluation.reviewerComment && (
                <div className="col-span-2">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Commentaire reviewer</p>
                  <p className="text-sm text-slate-700 italic">« {evaluation.reviewerComment} »</p>
                </div>
              )}
              {evaluation.nextYearObjectives && (
                <div className="col-span-2">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Objectifs N+1</p>
                  <p className="text-sm text-slate-700">{evaluation.nextYearObjectives}</p>
                </div>
              )}
            </div>
          </div>

          {/* Zone évalué : signer si statut reviewed */}
          {status === 'reviewed' && isEvaluatee && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">Votre prise de connaissance</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Mon commentaire (facultatif)</label>
                  <textarea rows={3} value={evaluateeComment} onChange={e => setEvaluateeComment(e.target.value)} placeholder="Votre commentaire sur cette évaluation…" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-200 resize-none" />
                </div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={disagreementFlag} onChange={e => setDisagreementFlag(e.target.checked)} className="mt-0.5 rounded border-slate-300 text-warning-500" />
                  <span className="text-sm text-slate-700">Je signale un désaccord avec cette évaluation</span>
                </label>
              </div>
              <div className="mt-4">
                <button
                  onClick={() => signWithCommentMutation.mutate()}
                  disabled={signWithCommentMutation.isPending}
                  className="px-6 py-2 bg-primary-500 text-white rounded-md text-sm font-semibold hover:bg-primary-600 disabled:opacity-50"
                >
                  {signWithCommentMutation.isPending ? 'Signature…' : 'Signer et valider la prise de connaissance'}
                </button>
              </div>
            </div>
          )}

          {/* Bouton signer manager */}
          {status === 'signed_evaluatee' && (isManager || isAdminOrHr) && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
              <p className="text-sm text-slate-600 mb-4">L'évalué a signé. Votre signature est maintenant requise.</p>
              <button
                onClick={() => signMutation.mutate()}
                disabled={signMutation.isPending}
                className="px-6 py-2 bg-primary-500 text-white rounded-md text-sm font-semibold hover:bg-primary-600 disabled:opacity-50"
              >
                {signMutation.isPending ? 'Signature…' : 'Signer'}
              </button>
            </div>
          )}

          {/* Bouton signer RH */}
          {status === 'signed_manager' && isAdminOrHr && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
              <p className="text-sm text-slate-600 mb-4">Le manager a signé. La signature RH est requise.</p>
              <button
                onClick={() => signMutation.mutate()}
                disabled={signMutation.isPending}
                className="px-6 py-2 bg-primary-500 text-white rounded-md text-sm font-semibold hover:bg-primary-600 disabled:opacity-50"
              >
                {signMutation.isPending ? 'Signature RH…' : 'Signer (RH)'}
              </button>
            </div>
          )}

          {/* Bouton valider définitivement */}
          {status === 'signed_hr' && isAdminOrHr && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
              <p className="text-sm text-slate-600 mb-4">Toutes les signatures sont collectées. Vous pouvez valider définitivement.</p>
              <button
                onClick={() => validateMutation.mutate()}
                disabled={validateMutation.isPending}
                className="px-6 py-2 bg-success-500 text-white rounded-md text-sm font-semibold hover:bg-success-600 disabled:opacity-50"
              >
                {validateMutation.isPending ? 'Validation…' : 'Valider définitivement'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Mode READONLY (D) ── */}
      {mode === 'readonly' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-slate-900">
              Compte-rendu — {evaluation.evaluatee?.firstName} {evaluation.evaluatee?.lastName}
            </h1>
            <button
              onClick={() => window.open(`/api/evaluations/${id}/pdf`, '_blank')}
              className="inline-flex items-center gap-2 border border-slate-200 hover:bg-slate-50 px-4 py-2 rounded-md text-sm font-medium"
            >
              <Download className="w-4 h-4" /> Télécharger PDF
            </button>
          </div>

          <div className="space-y-6">
            {/* Réponses */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">Réponses</h2>
              <div className="space-y-4">
                {questions.map((q, idx) => (
                  <div key={q.id} className="pb-4 border-b border-slate-100 last:border-0">
                    <p className="text-sm font-medium text-slate-800 mb-1">Q{idx + 1}. {q.text}</p>
                    <p className="text-sm text-slate-600 pl-4">➤ {String(answers[q.id] ?? '—')}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Résumé révision */}
            {evaluation.reviewerScore !== undefined && (
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">Révision</h2>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-500">Score :</span>
                    <span className="text-lg font-bold text-slate-900">{evaluation.reviewerScore}/100</span>
                  </div>
                  {evaluation.reviewerComment && (
                    <div>
                      <p className="text-sm text-slate-500 mb-1">Commentaire reviewer :</p>
                      <p className="text-sm text-slate-700 italic pl-3 border-l-2 border-slate-200">« {evaluation.reviewerComment} »</p>
                    </div>
                  )}
                  {evaluation.nextYearObjectives && (
                    <div>
                      <p className="text-sm text-slate-500 mb-1">Objectifs N+1 :</p>
                      <p className="text-sm text-slate-700 pl-3 border-l-2 border-slate-200">{evaluation.nextYearObjectives}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Commentaire évalué */}
            {evaluation.evaluateeComment && (
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">Commentaire de l'évalué</h2>
                <p className="text-sm text-slate-700 italic">« {evaluation.evaluateeComment} »</p>
                {evaluation.disagreementFlag && (
                  <div className="mt-3 flex items-center gap-2 text-warning-600 text-sm font-medium">
                    <AlertTriangle className="w-4 h-4" /> Désaccord signalé
                  </div>
                )}
              </div>
            )}

            {/* Signatures */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">Signatures</h2>
              <div className="space-y-3 text-sm">
                {[
                  { label: 'Évalué', date: evaluation.signedByEvaluateeAt },
                  { label: 'Manager', date: evaluation.signedByManagerAt },
                  { label: 'RH', date: evaluation.signedByHrAt },
                ].map(sig => (
                  <div key={sig.label} className="flex items-center gap-2">
                    <span className={`text-sm ${sig.date ? 'text-success-600' : 'text-slate-400'}`}>{sig.date ? '✓' : '○'}</span>
                    <span className="text-slate-700 font-medium w-20">{sig.label}</span>
                    <span className="text-slate-500">{sig.date ? new Date(sig.date).toLocaleDateString('fr-FR') : 'En attente'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
