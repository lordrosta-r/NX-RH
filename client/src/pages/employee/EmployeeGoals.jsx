// =============================================================================
// EmployeeGoals — Mes objectifs (/employee/goals)
//
// Contenu de page uniquement — shell fourni par AuthedLayout.
// Affiche les objectifs de l'évaluation validée la plus récente.
// =============================================================================

import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../contexts/AuthContext'
import { useTranslate, useLocaleCtx } from '../../contexts/LocaleContext'
import { t as pageT } from './i18n'
import { Target, TrendingUp, CheckCircle2, Circle, Edit2 } from 'lucide-react'
import './employee-goals.css'

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
        <button
          type="button"
          className="eg-goal__edit"
          onClick={() => onEdit(goal)}
          aria-label="Mettre à jour"
        >
          <Edit2 size={15} />
        </button>
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

  const [editingGoal, setEditingGoal] = useState(null)
  const [localProgress, setLocalProgress] = useState({})

  const { data: evaluations = [], isLoading } = useQuery({
    queryKey: ['my-evaluations-validated', user?._id],
    queryFn: () =>
      fetch(`/api/evaluations?evaluateeId=${user._id}&status=validated`, { credentials: 'include' })
        .then(r => r.ok ? r.json() : [])
        .then(d => Array.isArray(d) ? d : (d.data || [])),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  })

  // Évaluation validée la plus récente
  const latestEval = useMemo(() =>
    [...evaluations]
      .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))[0],
    [evaluations]
  )

  const objectives = useMemo(() => {
    if (!latestEval?.objectives) return []
    return Array.isArray(latestEval.objectives) ? latestEval.objectives : []
  }, [latestEval])

  // Objectifs proposés (sans ID validé = status draft)
  const draftObjectives = useMemo(() => {
    if (!latestEval?.draftObjectives) return []
    return Array.isArray(latestEval.draftObjectives) ? latestEval.draftObjectives : []
  }, [latestEval])

  function handleSaveProgress(id, pct) {
    setLocalProgress(prev => ({ ...prev, [id]: pct }))
  }

  return (
    <div className="eg-page">

      {/* ── Hero ──────────────────────────────────────── */}
      <header className="eg-hero">
        <p className="eg-hero__eyebrow">OBJECTIFS</p>
        <h1 className="eg-hero__headline">
          Mes <span className="eg-hero__accent">objectifs</span>
        </h1>
        <p className="eg-hero__sub">Suivi de progression</p>
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
              {objectives.filter((g, i) => (localProgress[g._id || g.title] ?? g.progressPct ?? 0) >= 100).length}
            </span>
            <span className="eg-stat__label">Atteints</span>
          </div>
          <div className="eg-stat">
            <span className="eg-stat__value">
              {Math.round(objectives.reduce((acc, g) => acc + (localProgress[g._id || g.title] ?? g.progressPct ?? 0), 0) / objectives.length)}%
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
          <p>Aucun objectif actif. Vos objectifs apparaîtront après votre première évaluation.</p>
        </div>
      ) : (
        <section className="eg-section">
          <h2 className="eg-section__title">
            <TrendingUp size={16} aria-hidden="true" />
            Objectifs en cours
          </h2>
          <div className="eg-goals-list">
            {objectives.map((goal, i) => (
              <GoalCard
                key={goal._id || i}
                goal={goal}
                localPct={localProgress[goal._id || goal.title]}
                onEdit={setEditingGoal}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Objectifs proposés ────────────────────────── */}
      {draftObjectives.length > 0 && (
        <section className="eg-section">
          <h2 className="eg-section__title eg-section__title--draft">
            <Circle size={16} aria-hidden="true" />
            Objectifs proposés
          </h2>
          <div className="eg-goals-list">
            {draftObjectives.map((goal, i) => (
              <GoalCard
                key={goal._id || i}
                goal={goal}
                localPct={localProgress[goal._id || goal.title]}
                onEdit={setEditingGoal}
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
