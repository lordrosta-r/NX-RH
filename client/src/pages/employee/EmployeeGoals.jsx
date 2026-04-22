// =============================================================================
// EmployeeGoals — Mes objectifs (/employee/goals)
//
// Contenu de page uniquement — shell fourni par AuthedLayout.
// Affiche les objectifs de l'évaluation validée la plus récente.
// =============================================================================

import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../contexts/AuthContext'
import { useTranslate } from '../../contexts/LocaleContext'
import { t as pageT } from './i18n'
import { Target, TrendingUp, CheckCircle2, Circle, Edit2 } from 'lucide-react'
import './employee-goals.css'

const LOCKED_STATUSES = ['submitted', 'reviewed', 'signed_evaluatee', 'signed_manager', 'signed_hr', 'validated']

// ── Modal de mise à jour ──────────────────────────────────────────────────────
function UpdateModal({ goal, onClose, onSave }) {
  const [progress, setProgress] = useState(goal.progressPct ?? 0)
  const [comment, setComment] = useState('')

  function handleSave() {
    onSave(goal._id || goal.title, progress, comment)
    onClose()
  }

  return (
    <div className="eg-modal-backdrop" onClick={onClose}>
      <div className="eg-modal" role="dialog" onClick={e => e.stopPropagation()}>
        <h3 className="eg-modal__title">{goal.title}</h3>

        <label className="eg-modal__label">
          Progression : <strong>{progress}%</strong>
        </label>
        <input
          type="range"
          className="eg-slider"
          min={0}
          max={100}
          step={5}
          value={progress}
          onChange={e => setProgress(Number(e.target.value))}
        />

        <label className="eg-modal__label">
          Commentaire (optionnel)
        </label>
        <textarea
          className="eg-modal__textarea"
          rows={3}
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Décrivez votre avancement…"
        />

        <div className="eg-modal__actions">
          <button type="button" className="eg-btn" onClick={onClose}>
            Annuler
          </button>
          <button type="button" className="eg-btn eg-btn--primary" onClick={handleSave}>
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Carte objectif ────────────────────────────────────────────────────────────
function GoalCard({ goal, localPct, onEdit }) {
  const pct = localPct !== undefined ? localPct : (goal.progressPct ?? 0)
  const done = pct >= 100

  return (
    <article className={`eg-goal${done ? ' eg-goal--done' : ''}`}>
      <div className="eg-goal__head">
        <span className="eg-goal__icon" aria-hidden="true">
          {done ? <CheckCircle2 size={18} color="var(--color-success)" /> : <Circle size={18} color="var(--color-on-surface-variant)" />}
        </span>
        <h3 className="eg-goal__title">{goal.title}</h3>
        {onEdit && (
          <button
            type="button"
            className="eg-goal__edit"
            onClick={() => onEdit(goal)}
            aria-label="Mettre à jour"
          >
            <Edit2 size={15} />
          </button>
        )}
      </div>

      {goal.description && (
        <p className="eg-goal__kpi">{goal.description}</p>
      )}

      {goal.targetDate && (
        <p className="eg-goal__date">
          Échéance : {new Date(goal.targetDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
        </p>
      )}

      <div className="eg-progress-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="eg-progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="eg-goal__pct">{pct}%</span>
    </article>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────
export default function EmployeeGoals() {
  const { user } = useAuth()
  const t = useTranslate(pageT)
  const queryClient = useQueryClient()

  const [editingGoal, setEditingGoal] = useState(null)
  const [localProgress, setLocalProgress] = useState({})

  // Toutes les évaluations de l'utilisateur (en tant qu'évalué)
  const { data: myEvals = [], isLoading } = useQuery({
    queryKey: ['my-evals-goals', user?._id],
    queryFn: () =>
      fetch(`/api/evaluations?evaluateeId=${user._id}`, { credentials: 'include' })
        .then(r => r.ok ? r.json() : [])
        .then(d => Array.isArray(d) ? d : (d.data || [])),
    enabled: !!user,
    staleTime: 30_000,
  })

  // Auto-évaluation active la plus récente (évaluatee = évaluateur = user)
  const activeEval = useMemo(() => {
    return myEvals
      .filter(e => {
        const evaluatorId = e.evaluatorId?._id || e.evaluatorId
        return evaluatorId?.toString() === user?._id?.toString()
      })
      .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))[0] || null
  }, [myEvals, user])

  const isLocked = LOCKED_STATUSES.includes(activeEval?.status)

  // Dériver les objectifs depuis les réponses obj_q* (texte non vide)
  const objectives = useMemo(() => {
    if (!activeEval?.answers) return []
    return activeEval.answers
      .filter(a => a.questionId.startsWith('obj_q') && typeof a.value === 'string' && a.value.trim())
      .map(a => ({ id: a.questionId, title: a.value }))
  }, [activeEval])

  // Progression sauvegardée côté serveur (réponses obj_progress_*)
  const serverProgress = useMemo(() => {
    const map = {}
    if (activeEval?.answers) {
      activeEval.answers
        .filter(a => a.questionId.startsWith('obj_progress_'))
        .forEach(a => {
          const goalId = a.questionId.replace('obj_progress_', '')
          map[goalId] = typeof a.value === 'number' ? a.value : Number(a.value)
        })
    }
    return map
  }, [activeEval])

  // PATCH — sauvegarde la progression dans les réponses de l'évaluation
  const { mutate: patchProgress } = useMutation({
    mutationFn: ({ goalId, pct }) => {
      const progressQid = `obj_progress_${goalId}`
      const existing = activeEval?.answers || []
      const updated = [
        ...existing.filter(a => a.questionId !== progressQid),
        { questionId: progressQid, value: pct },
      ]
      return fetch(`/api/evaluations/${activeEval._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ answers: updated }),
      }).then(r => { if (!r.ok) throw new Error('Sauvegarde échouée'); return r.json() })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-evals-goals', user?._id] }),
  })

  function handleSaveProgress(id, pct) {
    setLocalProgress(prev => ({ ...prev, [id]: pct }))
    if (!isLocked && activeEval?._id) {
      patchProgress({ goalId: id, pct })
    }
  }

  return (
    <div className="eg-page">

      {/* ── Hero ──────────────────────────────────────── */}
      <header className="eg-hero">
        <div className="eg-hero__body">
          <p className="eg-hero__eyebrow">OBJECTIFS</p>
          <h1 className="eg-hero__headline">
            Mes <span className="eg-hero__accent">objectifs</span>
          </h1>
          <p className="eg-hero__sub">
            Fixez vos ambitions, mesurez votre avancement et suivez l'atteinte de vos objectifs tout au long de l'année.
          </p>
        </div>
        <img
          src="/assets/spotlight.jpg"
          alt=""
          aria-hidden="true"
          className="eg-hero__img"
          onError={e => { e.target.style.display = 'none' }}
        />
        <div className="eg-hero__glow" aria-hidden="true" />
      </header>

      {/* ── Statistiques rapides ──────────────────────── */}
      {objectives.length > 0 && (
        <div className="eg-stats">
          <div className="eg-stat">
            <span className="eg-stat__value">{objectives.length}</span>
            <span className="eg-stat__label">Objectifs</span>
          </div>
          <div className="eg-stat eg-stat--success">
            <span className="eg-stat__value">
              {objectives.filter(g => (localProgress[g.id] ?? serverProgress[g.id] ?? 0) >= 100).length}
            </span>
            <span className="eg-stat__label">Atteints</span>
          </div>
          <div className="eg-stat">
            <span className="eg-stat__value">
              {Math.round(objectives.reduce((acc, g) => acc + (localProgress[g.id] ?? serverProgress[g.id] ?? 0), 0) / objectives.length)}%
            </span>
            <span className="eg-stat__label">Progression moy.</span>
          </div>
        </div>
      )}

      {/* ── Objectifs actifs ──────────────────────────── */}
      {isLoading ? (
        <p className="eg-status">Chargement de vos objectifs…</p>
      ) : objectives.length === 0 ? (
        <div className="eg-empty">
          <Target size={40} color="var(--color-on-surface-variant)" />
          <p>Aucun objectif actif. Remplissez la section « Objectifs » de votre évaluation pour les voir apparaître ici.</p>
        </div>
      ) : (
        <section className="eg-section">
          <h2 className="eg-section__title">
            <TrendingUp size={16} aria-hidden="true" />
            Objectifs en cours {isLocked && <span className="eg-locked-badge">Verrouillé</span>}
          </h2>
          <div className="eg-goals-list">
            {objectives.map(goal => (
              <GoalCard
                key={goal.id}
                goal={goal}
                localPct={localProgress[goal.id] ?? serverProgress[goal.id]}
                onEdit={isLocked ? undefined : setEditingGoal}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Modal mise à jour ─────────────────────────── */}
      {editingGoal && (
        <UpdateModal
          goal={editingGoal}
          onClose={() => setEditingGoal(null)}
          onSave={handleSaveProgress}
        />
      )}
    </div>
  )
}
