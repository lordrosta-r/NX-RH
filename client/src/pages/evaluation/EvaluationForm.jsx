// =============================================================================
// EvaluationForm — Formulaire générique pour les 4 phases d'évaluation
// Routes : /evaluation/:evalId/self | /n-1 | /objectives | /aspirations
// La phase est passée via le prop `phase` dans App.jsx.
// Design ref : designs/employee/activeevalform.html
// =============================================================================

import React, { useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Save, ArrowRight } from 'lucide-react'
import EvaluationLayout from './EvaluationLayout'
import { t as pageT } from './i18n'
import { useLocale } from '../../hooks/useLocale'
import './evaluation.css'

// ── Données mock des phases ──────────────────────────────────────────────────
// TODO: remplacer par un fetch /api/forms/:formId filtré par phase
//       lorsque la structure multi-phase sera disponible côté API.
const MOCK_PHASES = {
  self: {
    title:   'Auto-évaluation',
    tagline: 'Cycle Annuel 2026',
    desc:    'Évaluez honnêtement vos compétences et réalisations de l\'année.',
    sections: [
      {
        id:       's1',
        label:    '01 / Compétences professionnelles',
        required: true,
        questions: [
          {
            id:   'self_q1',
            type: 'rating',
            label: 'Maîtrise technique',
            desc:  'Évaluez votre maîtrise des outils et méthodes de votre domaine.',
          },
          {
            id:   'self_q2',
            type: 'rating',
            label: 'Collaboration',
            desc:  'Votre efficacité dans la communication transversale et le partage de connaissances.',
          },
          {
            id:    'self_q3',
            type:  'yes_no',
            label: 'Avez-vous atteint vos objectifs de l\'année ?',
          },
        ],
      },
      {
        id:       's2',
        label:    '02 / Réflexion narrative',
        required: true,
        questions: [
          {
            id:   'self_q4',
            type: 'text',
            label: 'Réalisations clés',
            desc:  'Décrivez vos principales contributions cette année. Focalisez-vous sur le "Pourquoi" et le "Comment".',
          },
          {
            id:   'self_q5',
            type: 'text',
            label: 'Axes d\'amélioration',
            desc:  'Quels points souhaitez-vous développer lors du prochain cycle ?',
          },
        ],
      },
    ],
  },

  'n-1': {
    title:   'Bilan année N-1',
    tagline: 'Cycle Annuel 2026',
    desc:    'Dressez un bilan objectif de l\'atteinte de vos objectifs de l\'an passé.',
    sections: [
      {
        id:       's1',
        label:    '01 / Bilan des objectifs',
        required: true,
        questions: [
          {
            id:   'n1_q1',
            type: 'rating',
            label: 'Atteinte des objectifs fixés',
            desc:  'Dans quelle mesure avez-vous atteint les objectifs définis lors de l\'entretien précédent ?',
          },
          {
            id:   'n1_q2',
            type: 'text',
            label: 'Bilan qualitatif',
            desc:  'Décrivez les facteurs (contexte, ressources, blocages) qui ont influencé vos résultats.',
          },
          {
            id:      'n1_q3',
            type:    'choice',
            label:   'Niveau de satisfaction globale',
            options: ['Très satisfait(e)', 'Satisfait(e)', 'Neutre', 'Insatisfait(e)', 'Très insatisfait(e)'],
          },
        ],
      },
    ],
  },

  objectives: {
    title:   'Objectifs',
    tagline: 'Cycle Annuel 2026',
    desc:    'Définissez vos objectifs professionnels pour le cycle à venir.',
    sections: [
      {
        id:       's1',
        label:    '01 / Objectifs du prochain cycle',
        required: true,
        questions: [
          {
            id:   'obj_q1',
            type: 'text',
            label: 'Objectif prioritaire',
            desc:  'Décrivez votre objectif le plus important pour l\'année à venir.',
          },
          {
            id:   'obj_q2',
            type: 'text',
            label: 'Deuxième objectif',
            desc:  'Décrivez un second objectif complémentaire.',
          },
          {
            id:    'obj_q3',
            type:  'yes_no',
            label: 'Souhaitez-vous une formation pour atteindre ces objectifs ?',
          },
          {
            id:   'obj_q4',
            type: 'text',
            label: 'Compétences à développer (optionnel)',
            desc:  'Listez les compétences spécifiques à renforcer.',
          },
        ],
      },
    ],
  },

  aspirations: {
    title:   'Aspirations carrière',
    tagline: 'Cycle Annuel 2026',
    desc:    'Partagez vos ambitions et votre vision d\'évolution à moyen terme.',
    sections: [
      {
        id:       's1',
        label:    '01 / Évolution professionnelle',
        required: true,
        questions: [
          {
            id:      'asp_q1',
            type:    'choice',
            label:   'Horizon d\'évolution envisagé',
            options: ['Moins d\'un an', '1 à 2 ans', '3 à 5 ans', '5 ans et plus'],
          },
          {
            id:   'asp_q2',
            type: 'text',
            label: 'Aspirations à court terme',
            desc:  'Quelles compétences souhaitez-vous développer dans les 12 prochains mois ?',
          },
          {
            id:   'asp_q3',
            type: 'text',
            label: 'Vision à long terme',
            desc:  'Quel rôle ou domaine vous attire à moyen terme ? Qu\'est-ce qui vous motive ?',
          },
          {
            id:    'asp_q4',
            type:  'yes_no',
            label: 'Seriez-vous intéressé(e) par une mobilité interne ?',
          },
        ],
      },
    ],
  },
}

// Séquence pour naviguer vers la phase suivante
const PHASE_ORDER = ['self', 'n-1', 'objectives', 'aspirations', 'sign']

// Statuts où les réponses ne peuvent plus être modifiées
const LOCKED_STATUSES = ['submitted', 'reviewed', 'signed_evaluatee', 'signed_manager', 'signed_hr', 'validated']

// ── Champ de question ─────────────────────────────────────────────────────────
function QuestionField({ question, value, onChange, locked }) {
  if (question.type === 'rating') {
    return (
      <div className="ev-rating">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            className={`ev-rating__btn${value === n ? ' ev-rating__btn--active' : ''}`}
            onClick={() => !locked && onChange(n)}
            disabled={locked}
            aria-label={`Note ${n}`}
            aria-pressed={value === n}
          >
            {n}
          </button>
        ))}
      </div>
    )
  }

  if (question.type === 'text') {
    return (
      <textarea
        className="ev-textarea ev-textarea--form"
        rows={5}
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        placeholder="Votre réponse…"
        disabled={locked}
      />
    )
  }

  if (question.type === 'yes_no') {
    return (
      <div className="ev-yesno">
        {['yes', 'no'].map(opt => (
          <button
            key={opt}
            type="button"
            className={`ev-yesno__btn${value === opt ? ' ev-yesno__btn--active' : ''}`}
            onClick={() => !locked && onChange(opt)}
            disabled={locked}
            aria-pressed={value === opt}
          >
            {opt === 'yes' ? 'Oui' : 'Non'}
          </button>
        ))}
      </div>
    )
  }

  if (question.type === 'choice') {
    return (
      <div className="ev-choice">
        {question.options.map(opt => (
          <div
            key={opt}
            className={`ev-choice__option${value === opt ? ' ev-choice__option--selected' : ''}`}
            role="radio"
            aria-checked={value === opt}
            tabIndex={0}
            onClick={() => !locked && onChange(opt)}
            onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && !locked) onChange(opt) }}
          >
            <span className="ev-choice__radio" aria-hidden="true" />
            {opt}
          </div>
        ))}
      </div>
    )
  }

  return null
}

// ── Composant principal ───────────────────────────────────────────────────────
export default function EvaluationForm({ phase }) {
  const { evalId }  = useParams()
  const navigate    = useNavigate()
  const queryClient = useQueryClient()
  const { t }       = useLocale(pageT)

  // Charge l'évaluation pour récupérer les réponses existantes et le statut
  const { data: evaluation, isLoading } = useQuery({
    queryKey: ['eval', evalId],
    queryFn:  () =>
      fetch(`/api/evaluations/${evalId}`, { credentials: 'include' })
        .then(r => { if (!r.ok) throw new Error('Évaluation introuvable'); return r.json() }),
    enabled:   !!evalId,
    staleTime: 30_000,
  })

  // Réponses locales — initialisées depuis evaluation.answers au premier render
  const [localAnswers, setLocalAnswers] = useState(null)
  const [saveError,    setSaveError]    = useState(null)

  // Construit la map { questionId → value } depuis le tableau de réponses API
  const initAnswers = useCallback((answers = []) => {
    const map = {}
    answers.forEach(a => { map[a.questionId] = a.value })
    return map
  }, [])

  const answers  = localAnswers ?? (evaluation ? initAnswers(evaluation.answers ?? []) : {})
  const isLocked = LOCKED_STATUSES.includes(evaluation?.status)

  // Mutation PATCH pour sauvegarder les réponses
  const saveMutation = useMutation({
    mutationFn: payload =>
      fetch(`/api/evaluations/${evalId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ answers: payload, status: 'in_progress' }),
      }).then(r => { if (!r.ok) throw new Error('Sauvegarde échouée'); return r.json() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eval', evalId] })
      setSaveError(null)
    },
    onError: () => setSaveError(t('ev.error.save_failed') || 'Sauvegarde échouée'),
  })

  function handleChange(questionId, value) {
    setLocalAnswers(prev => ({ ...(prev ?? answers), [questionId]: value }))
  }

  // Construit le tableau de réponses pour le PATCH (uniquement les questions de cette phase)
  function buildAnswersPayload() {
    const phaseData    = MOCK_PHASES[phase]
    const allQuestions = phaseData?.sections.flatMap(s => s.questions) ?? []
    return allQuestions
      .filter(q => answers[q.id] !== undefined)
      .map(q => ({ questionId: q.id, questionLabel: q.label, value: answers[q.id] }))
  }

  function handleSaveDraft() {
    saveMutation.mutate(buildAnswersPayload())
  }

  function handleSubmitPhase() {
    const nextIdx   = PHASE_ORDER.indexOf(phase) + 1
    const nextPhase = PHASE_ORDER[nextIdx] ?? null
    saveMutation.mutate(buildAnswersPayload(), {
      onSuccess: () => {
        if (nextPhase) navigate(`/evaluation/${evalId}/${nextPhase}`)
        else navigate(`/evaluation/${evalId}`)
      },
    })
  }

  const phaseData    = MOCK_PHASES[phase]
  const isLastPhase  = PHASE_ORDER.indexOf(phase) === PHASE_ORDER.length - 2

  if (isLoading) {
    return (
      <div className="ev-layout">
        <p className="empty-state">{t('ev.form.loading')}</p>
      </div>
    )
  }

  if (!phaseData) {
    return (
      <div className="ev-layout">
        <p className="error-msg">Phase inconnue : {phase}</p>
      </div>
    )
  }

  return (
    <EvaluationLayout evalId={evalId} evaluation={evaluation} currentPhase={phase}>
      {/* En-tête de phase */}
      <div className="ev-form-hero">
        <div className="ev-form-hero__badges">
          <span className="ev-layout__campaign">
            {evaluation?.campaignId?.name ?? phaseData.tagline}
          </span>
          {isLocked && <span className="ev-phase-card__status">Verrouillé</span>}
        </div>
        <h2 className="ev-summary__headline ev-form-hero__title">{phaseData.title}</h2>
        <p className="ev-form-hero__desc">{phaseData.desc}</p>
      </div>

      {/* Carte du formulaire */}
      <div className="ev-form-card">
        {phaseData.sections.map(section => (
          <div key={section.id} className="ev-form-section">
            <div className="ev-form-section__header">
              <span className="ev-form-section__label">{section.label}</span>
              {section.required && (
                <span className="ev-form-section__required">
                  {t('ev.section.mandatory') || 'OBLIGATOIRE'}
                </span>
              )}
            </div>

            {section.questions.map(question => {
              const isFullWidth = question.type === 'text' || question.type === 'choice'
              return (
                <div
                  key={question.id}
                  className={`ev-qrow${isFullWidth ? ' ev-qrow--full' : ''}`}
                >
                  {/* Colonne texte (toujours présente) */}
                  <div>
                    <h4 className="ev-qrow__label">{question.label}</h4>
                    {question.desc && <p className="ev-qrow__desc">{question.desc}</p>}
                    {/* Pour les types pleine largeur, le champ est ici sous le texte */}
                    {isFullWidth && (
                      <QuestionField
                        question={question}
                        value={answers[question.id]}
                        onChange={val => handleChange(question.id, val)}
                        locked={isLocked}
                      />
                    )}
                  </div>

                  {/* Colonne champ (seulement pour les types 2 colonnes : rating, yes_no) */}
                  {!isFullWidth && (
                    <QuestionField
                      question={question}
                      value={answers[question.id]}
                      onChange={val => handleChange(question.id, val)}
                      locked={isLocked}
                    />
                  )}
                </div>
              )
            })}
          </div>
        ))}

        {/* Footer — masqué si l'évaluation est verrouillée */}
        {!isLocked && (
          <div className="ev-footer">
            <div className="ev-footer__left">
              <button
                type="button"
                className="ev-footer__ghost"
                onClick={() => navigate(`/evaluation/${evalId}`)}
              >
                {t('ev.footer.discard') || 'Annuler'}
              </button>
              <button
                type="button"
                className="ev-footer__ghost"
                onClick={handleSaveDraft}
                disabled={saveMutation.isPending}
              >
                <Save size={14} strokeWidth={1.5} aria-hidden="true" />
                {saveMutation.isPending
                  ? (t('ev.footer.saving') || 'Enregistrement…')
                  : (t('ev.footer.save')   || 'Enregistrer le brouillon')}
              </button>
            </div>

            <button
              type="button"
              className="ev-footer__submit"
              onClick={handleSubmitPhase}
              disabled={saveMutation.isPending}
            >
              {isLastPhase
                ? (t('ev.footer.submit') || 'Soumettre l\'évaluation')
                : 'Sauvegarder et continuer'}
              {!isLastPhase && (
                <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
              )}
            </button>
          </div>
        )}

        {saveError && <p className="error-msg ev-save-error">{saveError}</p>}
      </div>
    </EvaluationLayout>
  )
}
