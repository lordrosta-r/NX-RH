// =============================================================================
// EvaluationSign — Signature / contestation  /evaluation/:evalId/sign
// Affiche un résumé de l'évaluation et propose deux actions :
//   - Contresigner  → PATCH /api/evaluations/:id { status: 'signed_evaluatee' }
//   - Contester     → TODO: endpoint /api/evaluations/:id/contest (non implémenté)
//                     En attendant : PATCH avec evaluateeComment + note TODO.
// =============================================================================

import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, AlertTriangle, ArrowLeft } from 'lucide-react'
import EvaluationLayout from './EvaluationLayout'
import { t as pageT } from './i18n'
import { useLocale } from '../../hooks/useLocale'
import './evaluation.css'

// Statuts qui indiquent que l'évaluation est déjà signée ou finalisée
const ALREADY_SIGNED = ['signed_evaluatee', 'signed_manager', 'signed_hr', 'validated']

export default function EvaluationSign() {
  const { evalId }  = useParams()
  const navigate    = useNavigate()
  const queryClient = useQueryClient()
  const { t }       = useLocale(pageT)

  const [contestOpen,   setContestOpen]   = useState(false)
  const [contestReason, setContestReason] = useState('')
  const [fieldError,    setFieldError]    = useState('')
  const [successMsg,    setSuccessMsg]    = useState('')

  // Charge l'évaluation
  const { data: evaluation, isLoading, error } = useQuery({
    queryKey: ['eval', evalId],
    queryFn:  () =>
      fetch(`/api/evaluations/${evalId}`, { credentials: 'include' })
        .then(r => { if (!r.ok) throw new Error('Évaluation introuvable'); return r.json() }),
    enabled:   !!evalId,
    staleTime: 30_000,
  })

  // Mutation : contresigner — transition de statut vers signed_evaluatee
  const signMutation = useMutation({
    mutationFn: () =>
      fetch(`/api/evaluations/${evalId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'signed_evaluatee' }),
      }).then(r => { if (!r.ok) throw new Error('Signature échouée'); return r.json() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eval', evalId] })
      setSuccessMsg('Évaluation contresignée avec succès.')
      setFieldError('')
    },
    onError: () => setFieldError('Une erreur est survenue lors de la signature.'),
  })

  // Mutation : contester
  // TODO: utiliser POST /api/evaluations/:id/contest quand l'endpoint sera disponible.
  //       Pour l'instant, on persiste le motif dans evaluateeComment via PATCH.
  const contestMutation = useMutation({
    mutationFn: comment =>
      fetch(`/api/evaluations/${evalId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ evaluateeComment: comment }),
      }).then(r => { if (!r.ok) throw new Error('Contestation échouée'); return r.json() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eval', evalId] })
      setSuccessMsg('Contestation enregistrée. Un membre de l\'équipe RH prendra contact avec vous.')
      setContestOpen(false)
      setFieldError('')
    },
    onError: () => setFieldError('Une erreur est survenue lors de la contestation.'),
  })

  function handleSign() {
    setFieldError('')
    if (answersCount === 0) {
      setFieldError('Vous n\'avez pas encore rempli les phases de l\'évaluation. Veuillez compléter au moins une phase avant de signer.')
      return
    }
    signMutation.mutate()
  }

  function handleContest() {
    setFieldError('')
    if (!contestReason.trim()) {
      setFieldError('Un motif est obligatoire pour contester.')
      return
    }
    contestMutation.mutate(contestReason.trim())
  }

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

  const status        = evaluation?.status ?? 'assigned'
  const alreadySigned = ALREADY_SIGNED.includes(status)
  const campaignName  = evaluation?.campaignId?.name ?? 'Cycle Annuel 2026'
  const formTitle     = evaluation?.formId?.title    ?? 'Évaluation annuelle'
  const evaluateeName = evaluation?.evaluateeId
    ? `${evaluation.evaluateeId.firstName ?? ''} ${evaluation.evaluateeId.lastName ?? ''}`.trim()
    : 'N/A'
  const evaluatorName = evaluation?.evaluatorId
    ? `${evaluation.evaluatorId.firstName ?? ''} ${evaluation.evaluatorId.lastName ?? ''}`.trim()
    : 'N/A'
  const answersCount  = evaluation?.answers?.length ?? 0

  return (
    <EvaluationLayout evalId={evalId} evaluation={evaluation} currentPhase="sign">
      {/* Message de succès */}
      {successMsg && (
        <div className="ev-sign__success">
          <CheckCircle size={16} strokeWidth={2} aria-hidden="true" />
          {successMsg}
        </div>
      )}

      {/* Récapitulatif de l'évaluation */}
      <div className="ev-sign__summary-card">
        <h2 className="ev-sign__summary-title">Résumé de l'évaluation</h2>

        <div className="ev-sign__row">
          <span className="ev-sign__row-label">Campagne</span>
          <span className="ev-sign__row-value">{campaignName}</span>
        </div>
        <div className="ev-sign__row">
          <span className="ev-sign__row-label">Formulaire</span>
          <span className="ev-sign__row-value">{formTitle}</span>
        </div>
        <div className="ev-sign__row">
          <span className="ev-sign__row-label">Évalué(e)</span>
          <span className="ev-sign__row-value">{evaluateeName}</span>
        </div>
        <div className="ev-sign__row">
          <span className="ev-sign__row-label">Évaluateur</span>
          <span className="ev-sign__row-value">{evaluatorName}</span>
        </div>
        <div className="ev-sign__row">
          <span className="ev-sign__row-label">Réponses renseignées</span>
          <span className="ev-sign__row-value">{answersCount}</span>
        </div>
        <div className="ev-sign__row">
          <span className="ev-sign__row-label">Statut actuel</span>
          <span className={`badge badge--${status}`}>
            {t(`ev.status.${status}`) || status}
          </span>
        </div>
        {evaluation?.score != null && (
          <div className="ev-sign__row">
            <span className="ev-sign__row-label">{t('ev.comment.score') || 'Score'}</span>
            <span className="ev-sign__row-value">{evaluation.score}</span>
          </div>
        )}
        {evaluation?.reviewerComment && (
          <div className="ev-sign__reviewer-comment">
            <p className="ev-sign__row-label">{t('ev.comment.reviewer') || 'Commentaire du réviseur'}</p>
            <p className="ev-sign__reviewer-comment__text">{evaluation.reviewerComment}</p>
          </div>
        )}
      </div>

      {/* Actions — uniquement si non encore signé et pas de message de succès */}
      {!alreadySigned && !successMsg && (
        <div className="ev-sign__actions">
          {/* Contresigner */}
          <div className="ev-sign__action-card">
            <CheckCircle
              size={20}
              color="var(--color-secondary)"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <h3 className="ev-sign__action-title">Contresigner</h3>
            <p className="ev-sign__action-desc">
              Vous confirmez avoir pris connaissance de l'évaluation et en acceptez le contenu.
              Cette action est définitive.
            </p>
            <button
              type="button"
              className="ev-footer__submit ev-sign__action-btn"
              onClick={handleSign}
              disabled={signMutation.isPending}
            >
              {signMutation.isPending ? 'Signature en cours…' : 'Contresigner'}
            </button>
          </div>

          {/* Contester */}
          <div className="ev-sign__action-card">
            <AlertTriangle
              size={20}
              color="var(--color-tertiary)"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <h3 className="ev-sign__action-title">Contester</h3>
            <p className="ev-sign__action-desc">
              Si vous n'êtes pas en accord avec le contenu, vous pouvez contester l'évaluation
              en motivant votre refus.
            </p>
            <button
              type="button"
              className="ev-footer__ghost ev-sign__action-btn"
              onClick={() => setContestOpen(o => !o)}
            >
              {contestOpen ? 'Fermer' : 'Contester'}
            </button>
          </div>
        </div>
      )}

      {/* Zone de contestation — visible si contestOpen */}
      {contestOpen && !alreadySigned && !successMsg && (
        <div className="ev-sign__contest-area">
          <h3 className="ev-sign__contest-title">Motif de contestation</h3>
          <textarea
            className="ev-textarea"
            rows={5}
            value={contestReason}
            onChange={e => setContestReason(e.target.value)}
            placeholder="Expliquez les raisons de votre contestation de façon précise et factuelle…"
          />
          {fieldError && <p className="ev-sign__error">{fieldError}</p>}
          <div className="ev-sign__contest-footer">
            <button
              type="button"
              className="ev-footer__ghost"
              onClick={() => { setContestOpen(false); setFieldError('') }}
            >
              Annuler
            </button>
            <button
              type="button"
              className="ev-footer__submit"
              onClick={handleContest}
              disabled={contestMutation.isPending}
            >
              {contestMutation.isPending ? 'Envoi en cours…' : 'Envoyer la contestation'}
            </button>
          </div>
        </div>
      )}

      {/* Erreur hors zone contest (ex. erreur de signature) */}
      {fieldError && !contestOpen && (
        <p className="ev-sign__error">{fieldError}</p>
      )}

      {/* Banner si déjà signé */}
      {alreadySigned && !successMsg && (
        <div className="ev-sign__success">
          <CheckCircle size={16} strokeWidth={2} aria-hidden="true" />
          Évaluation déjà signée — statut : {t(`ev.status.${status}`) || status}.
        </div>
      )}

      {/* Retour au récapitulatif */}
      <button
        type="button"
        className="ev-layout__back ev-sign__back"
        onClick={() => navigate(`/evaluation/${evalId}`)}
      >
        <ArrowLeft size={14} strokeWidth={2} aria-hidden="true" />
        Retour au récapitulatif
      </button>
    </EvaluationLayout>
  )
}
