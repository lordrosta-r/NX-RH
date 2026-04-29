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
import { Target, Edit2, X } from 'lucide-react'
import { showToast } from '../../components/ui/Toast'
import './employee-goals.css'

const LOCKED_STATUSES = ['submitted', 'reviewed', 'signed_evaluatee', 'signed_manager', 'signed_hr', 'validated']

// ── Modal de mise à jour ──────────────────────────────────────────────────────
function UpdateModal({ goal, currentPct, onClose, onSave }) {
  const [progress, setProgress] = useState(currentPct ?? 0)
  const [comment, setComment]   = useState('')

  function handleSave() {
    onSave(goal.id, progress, comment)
    onClose()
  }

  return (
    <div className="eg-modal-backdrop" onClick={onClose}>
      <div className="eg-modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="eg-modal__head">
          <h3 className="eg-modal__title">Mettre à jour la progression</h3>
          <button type="button" className="eg-modal__close" onClick={onClose} aria-label="Fermer">
            <X size={16} />
          </button>
        </div>

        <p className="eg-modal__goal-name">{goal.title}</p>

        <div className="eg-modal__pct-row">
          <span className="eg-modal__pct-label">Progression</span>
          <span className="eg-modal__pct-value">{progress}%</span>
        </div>
        <input
          type="range"
          className="eg-slider"
          min={0} max={100} step={5}
          value={progress}
          onChange={e => setProgress(Number(e.target.value))}
        />
        <div className="eg-slider__track-labels">
          <span>0%</span><span>50%</span><span>100%</span>
        </div>

        <label className="eg-modal__label">Commentaire <span className="eg-modal__optional">(optionnel)</span></label>
        <textarea
          className="eg-modal__textarea"
          rows={3}
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Décrivez votre avancement…"
        />

        <div className="eg-modal__actions">
          <button type="button" className="eg-btn" onClick={onClose}>Annuler</button>
          <button type="button" className="eg-btn eg-btn--primary" onClick={handleSave}>Enregistrer</button>
        </div>
      </div>
    </div>
  )
}

// ── Ligne objectif ────────────────────────────────────────────────────────────
function GoalRow({ goal, index, pct, onEdit }) {
  const done    = pct >= 100
  const started = pct > 0 && pct < 100
  const status  = done ? 'done' : started ? 'progress' : 'idle'
  const statusLabel = done ? 'Atteint' : started ? 'En cours' : 'Non démarré'

  return (
    <div className={`eg-row eg-row--${status}`}>
      <span className="eg-row__index">{String(index + 1).padStart(2, '0')}</span>

      <div className="eg-row__body">
        <p className="eg-row__title">{goal.title}</p>
      </div>

      <div className="eg-row__meter">
        <div
          className="eg-row__bar"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="eg-row__fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="eg-row__pct">{pct}%</span>
      </div>

      <span className={`eg-row__chip eg-row__chip--${status}`}>
        <span className="eg-row__chip-dot" />
        {statusLabel}
      </span>

      {onEdit && (
        <button
          type="button"
          className="eg-row__edit"
          onClick={() => onEdit(goal, pct)}
          aria-label="Mettre à jour"
        >
          <Edit2 size={13} strokeWidth={2} />
        </button>
      )}
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────
export default function EmployeeGoals() {
  const { user }        = useAuth()
  const t               = useTranslate(pageT)
  const queryClient     = useQueryClient()
  const [editing, setEditing]         = useState(null) // { goal, pct }
  const [localProgress, setLocalProgress] = useState({})

  const { data: myEvals = [], isLoading } = useQuery({
    queryKey: ['my-evals-goals', user?._id],
    queryFn:  () =>
      fetch(`/api/evaluations?evaluateeId=${user._id}`, { credentials: 'include' })
        .then(r => r.ok ? r.json() : [])
        .then(d => Array.isArray(d) ? d : (d.data || [])),
    enabled:   !!user,
    staleTime: 30_000,
  })

  const activeEval = useMemo(() => {
    return myEvals
      .filter(e => {
        const eid = e.evaluatorId?._id || e.evaluatorId
        return eid?.toString() === user?._id?.toString()
      })
      .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))[0] || null
  }, [myEvals, user])

  const isLocked = LOCKED_STATUSES.includes(activeEval?.status)

  const objectives = useMemo(() => {
    if (!activeEval?.answers) return []
    return activeEval.answers
      .filter(a => a.questionId.startsWith('obj_q') && typeof a.value === 'string' && a.value.trim())
      .map(a => ({ id: a.questionId, title: a.value }))
  }, [activeEval])

  const serverProgress = useMemo(() => {
    const map = {}
    if (activeEval?.answers) {
      activeEval.answers
        .filter(a => a.questionId.startsWith('obj_progress_'))
        .forEach(a => {
          const gid = a.questionId.replace('obj_progress_', '')
          map[gid] = typeof a.value === 'number' ? a.value : Number(a.value)
        })
    }
    return map
  }, [activeEval])

  const { mutate: patchProgress } = useMutation({
    mutationFn: ({ goalId, pct, comment }) => {
      const qid      = `obj_progress_${goalId}`
      const cid      = `obj_comment_${goalId}`
      const existing = activeEval?.answers || []
      const updated  = [
        ...existing.filter(a => a.questionId !== qid && a.questionId !== cid),
        { questionId: qid, value: pct },
        ...(comment?.trim() ? [{ questionId: cid, value: comment.trim() }] : []),
      ]
      return fetch(`/api/evaluations/${activeEval._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ answers: updated }),
      }).then(r => { if (!r.ok) throw new Error('Sauvegarde échouée'); return r.json() })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-evals-goals', user?._id] }),
    onError: () => showToast({ message: 'Sauvegarde échouée', type: 'error' }),
  })

  function handleSaveProgress(goalId, pct, comment) {
    setLocalProgress(prev => ({ ...prev, [goalId]: pct }))
    if (!isLocked && activeEval?._id) patchProgress({ goalId, pct, comment })
  }

  // KPIs globaux
  const getPct = g => localProgress[g.id] ?? serverProgress[g.id] ?? 0
  const doneCount  = objectives.filter(g => getPct(g) >= 100).length
  const avgPct     = objectives.length
    ? Math.round(objectives.reduce((s, g) => s + getPct(g), 0) / objectives.length)
    : 0

  return (
    <div className="eg-page">

      {/* ── Hero ─────────────────────────────────────────── */}
      <header className="eg-hero">
        <div className="eg-hero__body">
          <p className="eg-hero__eyebrow">OBJECTIFS</p>
          <h1 className="eg-hero__headline">
            Mes <span className="eg-hero__accent">objectifs</span>
          </h1>
          <p className="eg-hero__sub">
            Suivez vos ambitions et mesurez votre avancement tout au long de l'année.
          </p>
        </div>

        {objectives.length > 0 && (
          <div className="eg-hero__kpis">
            <div className="eg-hero__kpi">
              <span className="eg-hero__kpi-val">{objectives.length}</span>
              <span className="eg-hero__kpi-lbl">Total</span>
            </div>
            <div className="eg-hero__kpi-sep" />
            <div className="eg-hero__kpi">
              <span className="eg-hero__kpi-val eg-hero__kpi-val--red">{doneCount}</span>
              <span className="eg-hero__kpi-lbl">Atteints</span>
            </div>
            <div className="eg-hero__kpi-sep" />
            <div className="eg-hero__kpi">
              <span className="eg-hero__kpi-val">{avgPct}%</span>
              <span className="eg-hero__kpi-lbl">Progression moy.</span>
            </div>
          </div>
        )}

        <div className="eg-hero__glow" aria-hidden="true" />
      </header>

      {/* ── Contenu ──────────────────────────────────────── */}
      {isLoading ? (
        <p className="eg-status">Chargement de vos objectifs…</p>
      ) : objectives.length === 0 ? (
        <div className="eg-empty">
          <div className="eg-empty__icon"><Target size={32} strokeWidth={1.5} /></div>
          <p className="eg-empty__title">Aucun objectif défini</p>
          <p className="eg-empty__sub">Remplissez la section <strong>Objectifs</strong> de votre évaluation pour les voir apparaître ici.</p>
        </div>
      ) : (
        <section className="eg-section">
          <div className="eg-section__head">
            <h2 className="eg-section__title">Objectifs en cours</h2>
            {isLocked && <span className="eg-locked-badge">Verrouillé</span>}
            <span className="eg-section__count">{objectives.length}</span>
          </div>

          <div className="eg-table">
            <div className="eg-table__header">
              <span className="eg-th eg-th--num">#</span>
              <span className="eg-th eg-th--name">Objectif</span>
              <span className="eg-th eg-th--bar">Progression</span>
              <span className="eg-th eg-th--status">Statut</span>
              <span className="eg-th eg-th--action" />
            </div>
            {objectives.map((goal, i) => (
              <GoalRow
                key={goal.id}
                goal={goal}
                index={i}
                pct={getPct(goal)}
                onEdit={isLocked ? undefined : (g, p) => setEditing({ goal: g, pct: p })}
              />
            ))}
          </div>
        </section>
      )}

      {editing && (
        <UpdateModal
          goal={editing.goal}
          currentPct={editing.pct}
          onClose={() => setEditing(null)}
          onSave={handleSaveProgress}
        />
      )}
    </div>
  )
}


