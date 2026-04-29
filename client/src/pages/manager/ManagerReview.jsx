// =============================================================================
// ManagerReview — Split-view évaluation + carnet manager (/manager/review/:evalId)
// Layout: 60% (auto-éval, read-only) / 40% (notes manager, éditable)
// =============================================================================

import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../contexts/AuthContext'
import { useTranslate } from '../../contexts/LocaleContext'
import { t as pageT } from './i18n'
import { showToast } from '../../components/ui/Toast'
import './manager.css'

const RATINGS = ['achieved', 'partial', 'not_achieved']

export default function ManagerReview() {
  const { evalId } = useParams()
  const { user } = useAuth()
  const t = useTranslate(pageT)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [score, setScore] = useState('')
  const [reviewerComment, setReviewerComment] = useState('')
  const [nextObjectives, setNextObjectives] = useState('')
  const [objectiveRatings, setObjectiveRatings] = useState({})
  const [successMsg, setSuccessMsg] = useState('')

  // Statuts où le manager ne peut plus modifier ses notes
  const LOCKED_FOR_MANAGER = ['signed_manager', 'signed_hr', 'validated', 'expired', 'archived']

  const { data: evaluation, isLoading, isError } = useQuery({
    queryKey: ['eval-detail', evalId],
    queryFn: () =>
      fetch(`/api/evaluations/${evalId}`, { credentials: 'include' })
        .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
        .then(j => j.data ?? j),
    staleTime: 60 * 1000,
    enabled: !!evalId && !!user,
  })

  useEffect(() => {
    if (!evaluation) return
    setScore(evaluation.score ?? '')
    setReviewerComment(evaluation.reviewerComment ?? '')
    setNextObjectives(evaluation.nextObjectives ?? '')
    if (evaluation.objectiveRatings) {
      setObjectiveRatings(evaluation.objectiveRatings)
    }
  }, [evaluation])

  const mutation = useMutation({
    mutationFn: (body) =>
      fetch(`/api/evaluations/${evalId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eval-detail', evalId] })
      queryClient.invalidateQueries({ queryKey: ['manager-evals'] })
      setSuccessMsg('Enregistré avec succès')
      setTimeout(() => setSuccessMsg(''), 3000)
    },
    onError: () => showToast({ message: t('manager.error.update_failed'), type: 'error' }),
  })

  if (isLoading) return <div className="mgr"><p className="mgr-loading">{t('manager.loading')}</p></div>
  if (isError || !evaluation) return <div className="mgr"><p className="mgr-error">{t('manager.error.load')}</p></div>

  const status = evaluation.status
  const answers = evaluation.answers ?? []
  const questions = evaluation.formId?.questions ?? []
  const isEditable = !LOCKED_FOR_MANAGER.includes(status)

  const answersByPhase = (phase) => answers.filter(a => a.phase === phase)
  const objectives = answers.filter(a => a.phase === 'objectives')
  const hasPhases = answers.some(a => a.phase)

  function handleRatingChange(key, value) {
    setObjectiveRatings(prev => ({ ...prev, [key]: value }))
  }

  // Sauvegarde des notes manager SANS changer le statut (brouillon)
  function handleSaveDraft() {
    const body = {}
    if (score !== '' && score !== null) body.score = Number(score)
    if (reviewerComment) body.reviewerComment = reviewerComment
    if (nextObjectives) body.nextObjectives = nextObjectives
    if (Object.keys(objectiveRatings).length > 0) body.objectiveRatings = objectiveRatings
    if (Object.keys(body).length === 0) return
    mutation.mutate(body)
  }

  // Transition de statut + sauvegarde des notes
  function handleSubmit(actionStatus) {
    const body = { status: actionStatus }
    if (score !== '' && score !== null) body.score = Number(score)
    if (reviewerComment) body.reviewerComment = reviewerComment
    if (nextObjectives) body.nextObjectives = nextObjectives
    if (Object.keys(objectiveRatings).length > 0) body.objectiveRatings = objectiveRatings
    mutation.mutate(body)
  }

  const submitStatus = status === 'signed_evaluatee'
    ? 'signed_manager'
    : status === 'submitted'
      ? 'reviewed'
      : status

  const submitLabel = status === 'signed_evaluatee'
    ? t('manager.review.cosign')
    : status === 'submitted'
      ? t('manager.review.validate_sign')
      : t('manager.review.save_draft')

  return (
    <div className="mgr">
      {/* ── Back + status ──────────────────────────────────────────────────── */}
      <button type="button" className="mgr-back" onClick={() => navigate(-1)}>
        {t('manager.review.back')}
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1rem 0 1.5rem', flexWrap: 'wrap' }}>
        <span className={`mgr-badge mgr-badge--${status}`}>
          {t(`manager.eval_status.${status}`) || status}
        </span>
        {evaluation.evaluateeId && (
          <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-on-surface)' }}>
            {evaluation.evaluateeId.firstName ?? ''} {evaluation.evaluateeId.lastName ?? ''}
          </span>
        )}
        {evaluation.formId?.title && (
          <span style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
            — {evaluation.formId.title}
          </span>
        )}
      </div>

      {/* ── Split layout ──────────────────────────────────────────────────── */}
      <div className="mgr-split">

        {/* ── Left: Employee self-evaluation (read-only) ─────────────────── */}
        <div className="mgr-split__left">
          <div className="mgr-panel">
            <h2 className="mgr-panel__title">{t('manager.review.employee_panel')}</h2>

            {answers.length === 0 ? (
              <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.875rem' }}>
                {t('manager.review.no_answers')}
              </p>
            ) : hasPhases ? (
              <>
                {answersByPhase('n-1').length > 0 && (
                  <div className="mgr-panel__section">
                    <h3 className="mgr-panel__section-title">{t('manager.review.n1_section')}</h3>
                    {answersByPhase('n-1').map((ans, i) => {
                      const q = questions.find(qq => qq.id === ans.questionId)
                      return (
                        <div key={ans.questionId ?? i} className="mgr-answer">
                          <p className="mgr-answer__question">{q?.label ?? `Q${i + 1}`}</p>
                          <p className="mgr-answer__value">{String(ans.value ?? '—')}</p>
                        </div>
                      )
                    })}
                  </div>
                )}

                {answersByPhase('self').length > 0 && (
                  <div className="mgr-panel__section">
                    <h3 className="mgr-panel__section-title">{t('manager.review.employee_panel')}</h3>
                    {answersByPhase('self').map((ans, i) => {
                      const q = questions.find(qq => qq.id === ans.questionId)
                      return (
                        <div key={ans.questionId ?? i} className="mgr-answer">
                          <p className="mgr-answer__question">{q?.label ?? `Q${i + 1}`}</p>
                          <p className="mgr-answer__value">{String(ans.value ?? '—')}</p>
                        </div>
                      )
                    })}
                  </div>
                )}

                {answersByPhase('aspirations').length > 0 && (
                  <div className="mgr-panel__section">
                    <h3 className="mgr-panel__section-title">{t('manager.review.aspirations')}</h3>
                    {answersByPhase('aspirations').map((ans, i) => {
                      const q = questions.find(qq => qq.id === ans.questionId)
                      return (
                        <div key={ans.questionId ?? i} className="mgr-answer">
                          <p className="mgr-answer__question">{q?.label ?? `Q${i + 1}`}</p>
                          <p className="mgr-answer__value">{String(ans.value ?? '—')}</p>
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            ) : (
              <div className="mgr-panel__section">
                {answers.map((ans, i) => {
                  const q = questions.find(qq => qq.id === ans.questionId)
                  return (
                    <div key={ans.questionId ?? i} className="mgr-answer">
                      <p className="mgr-answer__question">{q?.label ?? `Q${i + 1}`}</p>
                      <p className="mgr-answer__value">{String(ans.value ?? '—')}</p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Manager notes ──────────────────────────────────────────── */}
        <div className="mgr-split__right">
          <div className="mgr-panel">
            <h2 className="mgr-panel__title">{t('manager.review.manager_panel')}</h2>

            {!isEditable && (
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', marginBottom: '1rem', fontStyle: 'italic' }}>
                {t(`manager.eval_status.${status}`) || status} — lecture seule
              </p>
            )}

            {/* Objectives evaluation */}
            {objectives.length > 0 && (
              <div className="mgr-panel__section">
                <h3 className="mgr-panel__section-title">{t('manager.review.objectives')}</h3>
                {objectives.map((ans, i) => {
                  const q = questions.find(qq => qq.id === ans.questionId)
                  const key = ans.questionId ?? `obj-${i}`
                  return (
                    <div key={key} style={{ marginBottom: '1rem' }}>
                      <p style={{ fontSize: '0.875rem', fontWeight: 600, margin: '0 0 0.4rem', color: 'var(--color-on-surface)' }}>
                        {q?.label ?? `Objectif ${i + 1}`}
                      </p>
                      <div className="mgr-field">
                        <span>{t('manager.review.objective_rating')}</span>
                        <select
                          value={objectiveRatings[key] ?? ''}
                          onChange={e => handleRatingChange(key, e.target.value)}
                          disabled={!isEditable}
                        >
                          <option value="">—</option>
                          {RATINGS.map(r => (
                            <option key={r} value={r}>{t(`manager.review.rating.${r}`)}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Global score */}
            <div className="mgr-panel__section">
              <div className="mgr-field">
                <label htmlFor="mgr-score">{t('manager.review.global_score')}</label>
                <input
                  id="mgr-score"
                  type="number"
                  min={0}
                  max={100}
                  value={score}
                  onChange={e => setScore(e.target.value)}
                  placeholder="0 – 100"
                  disabled={!isEditable}
                />
              </div>
            </div>

            {/* Synthesis comment */}
            <div className="mgr-panel__section">
              <div className="mgr-field">
                <label htmlFor="mgr-comment">{t('manager.review.synthesis')}</label>
                <textarea
                  id="mgr-comment"
                  rows={5}
                  maxLength={5000}
                  value={reviewerComment}
                  onChange={e => setReviewerComment(e.target.value)}
                  disabled={!isEditable}
                />
              </div>
            </div>

            {/* Next objectives */}
            <div className="mgr-panel__section">
              <div className="mgr-field">
                <label htmlFor="mgr-next-obj">{t('manager.review.next_objectives')}</label>
                <textarea
                  id="mgr-next-obj"
                  rows={3}
                  value={nextObjectives}
                  onChange={e => setNextObjectives(e.target.value)}
                  placeholder="Objectifs à valider pour N+1…"
                  disabled={!isEditable}
                />
              </div>
            </div>

            {/* Feedback */}
            {successMsg && (
              <p style={{ color: 'var(--color-success)', fontSize: '0.875rem', margin: '0 0 0.75rem' }}>
                {successMsg}
              </p>
            )}
            {mutation.isError && (
              <p className="mgr-error">{t('manager.error.update_failed')}</p>
            )}

            {/* Action buttons — masqués si lecture seule */}
            {isEditable && (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="mgr-btn mgr-btn--ghost"
                  onClick={handleSaveDraft}
                  disabled={mutation.isPending}
                >
                  {t('manager.review.save_draft')}
                </button>
                {['submitted', 'signed_evaluatee'].includes(status) && (
                  <button
                    type="button"
                    className="mgr-btn mgr-btn--primary"
                    onClick={() => handleSubmit(submitStatus)}
                    disabled={mutation.isPending}
                  >
                    {submitLabel}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
