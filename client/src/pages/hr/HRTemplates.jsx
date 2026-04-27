// =============================================================================
// HRTemplates.jsx — Bibliothèque de modèles de formulaires, route /hr/templates
//
// Pas de sidebar ni topbar : pris en charge par AuthedLayout.
// Sections :
//   1. Hero + CTA (modal création)
//   2. Grille de cartes template
// =============================================================================

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuth }     from '../../contexts/AuthContext'
import { useTranslate } from '../../contexts/LocaleContext'
import { t as pageT }  from './i18n'
import { PlusCircle, Pencil, Trash2, Copy, Lock, Unlock } from 'lucide-react'
import { apiFetch } from '../../lib/apiFetch'
import { showToast } from '../../components/ui/Toast'
import './hr-campaigns.css'

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString(undefined, {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

// ── Sub-components ────────────────────────────────────────────────────────────

function TemplateCard({ tpl, t, onEdit, onDelete, onDuplicate }) {
  const isLocked = !!tpl.frozenAt
  const qCount   = tpl.questions?.length ?? 0

  return (
    <article className="tpl-card">
      <div className="tpl-card__head">
        <h2 className="tpl-card__title">{tpl.title}</h2>
        <span className={`tpl-badge ${isLocked ? 'tpl-badge--locked' : 'tpl-badge--free'}`}>
          {isLocked ? <><Lock size={10} /> {t('tpl.card.locked')}</> : <><Unlock size={10} /> {t('tpl.card.free')}</>}
        </span>
      </div>

      {tpl.description && <p className="tpl-card__desc">{tpl.description}</p>}

      <div className="tpl-card__meta">
        <span>{qCount} {t('tpl.card.questions')}</span>
        <span>·</span>
        <span>{fmtDate(tpl.createdAt)}</span>
      </div>

      <div className="tpl-card__actions">
        <button type="button" className="tpl-btn tpl-btn--primary" onClick={() => onEdit(tpl._id)}>
          <Pencil size={13} /> {t('tpl.card.edit')}
        </button>
        <button type="button" className="tpl-btn" onClick={() => onDuplicate(tpl)}>
          <Copy size={13} /> {t('tpl.card.duplicate')}
        </button>
        {!isLocked && (
          <button type="button" className="tpl-btn tpl-btn--danger" onClick={() => onDelete(tpl._id)}>
            <Trash2 size={13} /> {t('tpl.card.delete')}
          </button>
        )}
      </div>
    </article>
  )
}

const FORM_TYPE_OPTIONS = [
  { value: 'self_evaluation',    label: 'Auto-évaluation' },
  { value: 'manager_evaluation', label: 'Évaluation manager' },
  { value: 'upward_feedback',    label: 'Feedback ascendant (anonyme)' },
  { value: 'peer_review',        label: 'Revue par les pairs' },
]

function NewTemplateModal({ t, onClose, onCreated }) {
  const [title,    setTitle]    = useState('')
  const [desc,     setDesc]     = useState('')
  const [formType, setFormType] = useState('self_evaluation')
  const [error,    setError]    = useState('')
  const navigate                = useNavigate()

  const createMutation = useMutation({
    mutationFn: (payload) =>
      apiFetch('/api/forms', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      }),
    onSuccess: (data) => {
      const id = data._id ?? data.id
      if (id) navigate(`/hr/templates/${id}/builder`)
      else onCreated()
    },
    onError: (err) => setError(err.message || t('tpl.error.create')),
  })

  return (
    <div className="tpl-modal-backdrop" role="dialog" aria-modal="true">
      <div className="tpl-modal">
        <h2 className="tpl-modal__title">{t('tpl.cta.new')}</h2>

        <div className="cmp-field">
          <label className="cmp-label">{t('tpl.modal.title')} *</label>
          <input
            className="cmp-input"
            type="text"
            value={title}
            placeholder={t('tpl.modal.title.ph')}
            onChange={e => setTitle(e.target.value)}
          />
        </div>
        <div className="cmp-field">
          <label className="cmp-label">Type de formulaire *</label>
          <select
            className="cmp-input"
            value={formType}
            onChange={e => setFormType(e.target.value)}
          >
            {FORM_TYPE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="cmp-field">
          <label className="cmp-label">{t('tpl.modal.desc')}</label>
          <textarea
            className="cmp-textarea"
            value={desc}
            placeholder={t('tpl.modal.desc.ph')}
            rows={3}
            onChange={e => setDesc(e.target.value)}
          />
        </div>

        {error && <p className="tpl-modal__error">{error}</p>}

        <div className="tpl-modal__actions">
          <button type="button" className="tpl-btn" onClick={onClose}>
            {t('tpl.modal.cancel')}
          </button>
          <button
            type="button"
            className="tpl-btn tpl-btn--primary"
            onClick={() => createMutation.mutate({ title, description: desc, formType, questions: [] })}
            disabled={!title || createMutation.isPending}
          >
            {t('tpl.modal.create')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function HRTemplates() {
  const { user }    = useAuth()
  const t           = useTranslate(pageT)
  const navigate    = useNavigate()
  const qc          = useQueryClient()
  const [showModal, setShowModal] = useState(false)

  const { data: rawData, isLoading, isError, error } = useQuery({
    queryKey: ['hr-forms'],
    queryFn:  () =>
      apiFetch('/api/forms').then(d => Array.isArray(d) ? d : (d.data || [])),
    enabled:   !!user,
    staleTime: 30 * 1000,
  })

  const deleteMutation = useMutation({
    mutationFn: (id) =>
      apiFetch(`/api/forms/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr-forms'] })
      showToast({ message: 'Modèle supprimé', type: 'success' })
    },
    onError: (err) => showToast({ message: err.message || t('tpl.error.delete'), type: 'error' }),
  })

  const duplicateMutation = useMutation({
    mutationFn: (tpl) =>
      apiFetch('/api/forms', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          title:       `${tpl.title} (copie)`,
          description: tpl.description,
          formType:    tpl.formType ?? 'self_evaluation',
          questions:   tpl.questions ?? [],
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr-forms'] })
      showToast({ message: 'Modèle dupliqué', type: 'success' })
    },
    onError: (err) => showToast({ message: err.message, type: 'error' }),
  })

  function handleDelete(id) {
    if (!window.confirm(t('tpl.confirm.delete'))) return
    deleteMutation.mutate(id)
  }

  const templates = rawData ?? []

  return (
    <div className="tpl-page">

      {/* ── Hero ──────────────────────────────────────────── */}
      <header className="tpl-hero">
        <p className="tpl-hero__eyebrow">{t('tpl.hero.eyebrow')}</p>
        <h1 className="tpl-hero__headline">{t('tpl.hero.title')}</h1>
        <p className="tpl-hero__sub">{t('tpl.hero.sub')}</p>
      </header>

      {/* ── Toolbar ───────────────────────────────────────── */}
      <div className="tpl-toolbar">
        <span />
        <button
          type="button"
          className="tpl-cta"
          onClick={() => setShowModal(true)}
        >
          <PlusCircle size={16} />
          {t('tpl.cta.new')}
        </button>
      </div>

      {/* ── Content ───────────────────────────────────────── */}
      {isLoading ? (
        <p className="tpl-state-msg">{t('tpl.loading')}</p>
      ) : isError ? (
        <p className="tpl-state-msg" role="alert" style={{ color: 'var(--color-error)' }}>
          {error?.message || t('tpl.error.create')}
        </p>
      ) : templates.length === 0 ? (
        <div className="tpl-empty">
          <p className="tpl-empty__title">{t('tpl.empty.title')}</p>
          <p className="tpl-empty__sub">{t('tpl.empty.sub')}</p>
        </div>
      ) : (
        <div className="tpl-grid">
          {templates.map(tpl => (
            <TemplateCard
              key={tpl._id}
              tpl={tpl}
              t={t}
              onEdit={(id) => navigate(`/hr/templates/${id}/builder`)}
              onDelete={handleDelete}
              onDuplicate={(tplData) => duplicateMutation.mutate(tplData)}
            />
          ))}
        </div>
      )}

      {/* ── New template modal ────────────────────────────── */}
      {showModal && (
        <NewTemplateModal
          t={t}
          onClose={() => setShowModal(false)}
          onCreated={() => {
            setShowModal(false)
            qc.invalidateQueries({ queryKey: ['hr-forms'] })
          }}
        />
      )}

    </div>
  )
}
