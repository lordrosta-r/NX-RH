// =============================================================================
// FormEditor — HR Form Editor page
// Two views:
//   'list'   — overview: banner + filters + form cards
//   'create' — form builder: fields palette + live preview
// =============================================================================
import React, { useState, useRef, useEffect } from 'react'
import './formeditor.css'
import '../../components/ui/Button.css'
import { t as pageT } from './i18n'
import { useLocale } from '../../hooks/useLocale'
import { useTheme } from '../../hooks/useTheme'
import { useAuthUser } from '../../hooks/useAuthUser'
import HRSidebar from '../hr/HRSidebar'
import AppTopbar from '../../components/ui/AppTopbar'
import FormEditorBanner from './FormEditorBanner'
import {
  PlusIcon, TrashIcon, DocumentIcon,
} from '../../components/ui/icons'

const STATUS_FILTER = ['all', 'active', 'archived']

// Form types are now defined inside the component using t() — see below

const IFACE_OPTS = [
  { type: 'rating',  key: 'fe.field.iface.rating', d: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2' },
  { type: 'yes_no',  key: 'fe.field.iface.yes_no', d: 'M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0'                                                 },
  { type: 'text',    key: 'fe.field.iface.text',   d: 'M3 6h18M3 12h12'                                                                                 },
  { type: 'choice',  key: 'fe.field.iface.choice', d: 'M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 012-2h11'                                           },
]

// ── Inline question preview (inside question card) ─────────────────────────
function QuestionPreview({ field, t }) {
  if (field.type === 'rating') {
    const max = field.scale || 5
    return (
      <div className="fe-qcard__preview">
        {Array.from({ length: max }, (_, i) => i + 1).map(n => (
          <span key={n} className="fe-qcard__scale-btn">{n}</span>
        ))}
      </div>
    )
  }
  if (field.type === 'yes_no') {
    return (
      <div className="fe-qcard__yesno-preview">
        <span className="fe-qcard__yesno-btn">{t('fe.field.yes')}</span>
        <span className="fe-qcard__yesno-btn">{t('fe.field.no')}</span>
      </div>
    )
  }
  if (field.type === 'text') {
    return (
      <div className="fe-qcard__preview">
        <div className="fe-qcard__text-preview" />
        <div className="fe-qcard__text-preview fe-qcard__text-preview--sm" />
      </div>
    )
  }
  if (field.type === 'choice') {
    const opts = field.options?.length > 0
      ? field.options
      : [
          { id: 'a', label: t('fe.create.option_default').replace('{n}', '1') },
          { id: 'b', label: t('fe.create.option_default').replace('{n}', '2') },
        ]
    return (
      <div className="fe-qcard__preview">
        {opts.slice(0, 3).map((o, i) => (
          <div key={o.id || i} className="fe-qcard__choice-row">
            <span className="fe-qcard__radio" />
            <span className="fe-qcard__choice-txt">
              {o.label || t('fe.create.option_default').replace('{n}', String(i + 1))}
            </span>
          </div>
        ))}
        {opts.length > 3 && (
          <span className="fe-qcard__choice-more">
            {t('fe.qcard.choice_more').replace('{n}', String(opts.length - 3))}
          </span>
        )}
      </div>
    )
  }
  return null
}

// ── Main component ─────────────────────────────────────────────────────────
export default function FormEditor() {
  const { user, loading: authLoading } = useAuthUser()
  const { t, locale, setLocale } = useLocale(pageT)
  const { theme, cycleTheme } = useTheme()

  // Views: 'list' | 'create'
  const [view, setView]         = useState('list')
  const [filter, setFilter]     = useState('all')
  const [editingId, setEditingId] = useState(null)
  const [validationErrors, setValidationErrors] = useState([])

  // Creator state
  const [formTitle, setFormTitle]   = useState('')
  const [formDesc, setFormDesc]     = useState('')
  const [formType, setFormType]     = useState('self_evaluation')
  const [formTeam, setFormTeam]     = useState('Tous')
  const [formTags, setFormTags]     = useState('')
  const [fields, setFields]         = useState([])
  const [activeField, setActiveField] = useState(null)
  const [dragIdx, setDragIdx]         = useState(null)
  const [frozen, setFrozen]           = useState(false)
  const fieldCounter                  = useRef(0)
  const optCounter                    = useRef(0)

  // API state
  const [forms, setForms]                       = useState([])
  const [campaigns, setCampaigns]               = useState([])
  const [saving, setSaving]                     = useState(false)
  const [error, setError]                       = useState(null)
  const [selectedCampaign, setSelectedCampaign] = useState('')
  const [isAnonymous, setIsAnonymous]           = useState(false)
  const [initialLoading, setInitialLoading]     = useState(true)
  const [loadError, setLoadError]               = useState(false)
  const [confirmDialog, setConfirmDialog]       = useState(null)

  // ── Beforeunload warning ───────────────────────────────────────────────────
  useEffect(() => {
    if (view !== 'create') return
    const isDirty = formTitle.trim() || formDesc.trim() || fields.length > 0
    if (!isDirty) return
    const handler = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [view, formTitle, formDesc, fields])

  // ── Load campaigns + forms on mount ────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    const normalize = (res) => Array.isArray(res) ? res : (res?.data ?? [])
    Promise.all([
      fetch('/api/campaigns?status=active', { credentials: 'include' })
        .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json() })
        .then(normalize),
      fetch('/api/forms', { credentials: 'include' })
        .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json() })
        .then(normalize),
    ])
      .then(([c, f]) => {
        if (cancelled) return
        setCampaigns(c)
        setForms(f)
      })
      .catch(() => {
        if (!cancelled) setLoadError(true)
      })
      .finally(() => {
        if (!cancelled) setInitialLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  if (authLoading) return null
  if (!user)       return null
  if (!['admin', 'hr'].includes(user.role)) { window.location.href = '/employee'; return null }

  // Form types aligned with MongoDB enum
  const FORM_TYPES = [
    { value: 'self_evaluation',     label: t('fe.type.self_evaluation')     },
    { value: 'manager_evaluation',  label: t('fe.type.manager_evaluation')  },
    { value: 'peer_review',         label: t('fe.type.peer_review')         },
    { value: 'upward_feedback',     label: t('fe.type.upward_feedback')     },
    { value: 'director_evaluation', label: t('fe.type.director_evaluation') },
  ]

  // Filter forms — derive status from frozenAt (active | archived)
  const filteredForms = forms.filter(f => {
    const s = f.frozenAt ? 'archived' : 'active'
    return filter === 'all' ? true : s === filter
  })

  // ── Handlers ──────────────────────────────────────────────────────────────
  function openCreate() {
    setFormTitle(''); setFormDesc(''); setFormType('self_evaluation')
    setFormTeam('Tous'); setFormTags(''); setFields([]); setEditingId(null)
    setFrozen(false); setSelectedCampaign(''); setIsAnonymous(false); setError(null)
    setView('create')
  }

  async function handleEdit(formId) {
    const r = await fetch(`/api/forms/${formId}`, { credentials: 'include' })
    if (!r.ok) {
      if (r.status === 401 || r.status === 403) { window.location.href = '/'; return }
      setError(t('fe.error.load_failed'))
      return
    }
    const form = await r.json()
    setEditingId(form._id)
    setFormTitle(form.title)
    setFormDesc(form.description)
    setFormType(form.formType || 'self_evaluation')
    setIsAnonymous(form.isAnonymous)
    setSelectedCampaign(form.campaignId?._id || form.campaignId || '')
    setFormTeam('Tous'); setFormTags('')
    setFrozen(!!form.frozenAt)
    setError(null)
    setFields(form.questions.map(q => ({
      id:       q.id,
      type:     q.type,
      label:    q.label,
      required: q.required,
      scale:    q.scale || 5,
      options:  (q.options || []).map((label, i) => ({ id: `opt-${i}`, label, value: '' })),
    })))
    setView('create')
  }

  function makeDefaultOptions() {
    return ['A', 'B', 'C'].map(l => {
      optCounter.current += 1
      return { id: `opt-${optCounter.current}`, label: t('fe.create.option_default').replace('{n}', l), value: '' }
    })
  }

  function addField(type) {
    if (frozen) return
    fieldCounter.current += 1
    const newField = {
      id: `field-${fieldCounter.current}`,
      type,
      label: '',
      description: '',
      required: false,
      weightage: false,
      anonymous: formType === 'upward_feedback',
      scale: 5,  // default scale for rating questions (2-10)
      options: type === 'choice' ? makeDefaultOptions() : [],
    }
    setFields(prev => [...prev, newField])
    setActiveField(newField.id)
  }

  function removeField(id) {
    setFields(prev => prev.filter(f => f.id !== id))
    if (activeField === id) setActiveField(null)
  }

  function updateField(id, key, value) {
    setFields(prev => prev.map(f => {
      if (f.id !== id) return f
      // When switching TO choice type, seed default options if empty
      if (key === 'type' && value === 'choice' && f.options.length === 0) {
        return { ...f, [key]: value, options: makeDefaultOptions() }
      }
      // When switching away from choice/rating, reset options/scale
      if (key === 'type' && value !== 'choice') {
        return { ...f, [key]: value, options: [] }
      }
      return { ...f, [key]: value }
    }))
  }

  function addOption(fieldId) {
    optCounter.current += 1
    setFields(prev => prev.map(f => f.id !== fieldId ? f : {
      ...f,
      options: [...f.options, { id: `opt-${optCounter.current}`, label: '', value: '' }],
    }))
  }

  function removeOption(fieldId, optId) {
    setFields(prev => prev.map(f => f.id !== fieldId ? f : {
      ...f,
      options: f.options.filter(o => o.id !== optId),
    }))
  }

  function updateOption(fieldId, optId, key, value) {
    setFields(prev => prev.map(f => f.id !== fieldId ? f : {
      ...f,
      options: f.options.map(o => o.id === optId ? { ...o, [key]: value } : o),
    }))
  }

  // ── Drag & drop reorder (reorder on drop, not on hover) ───────────────────
  function onDragStart(e, idx) {
    setDragIdx(idx)
    e.dataTransfer.effectAllowed = 'move'
  }
  function onDragOver(e) { e.preventDefault() }
  function onDrop(e, idx) {
    e.preventDefault()
    if (dragIdx === null || dragIdx === idx) return
    setFields(prev => {
      const next = [...prev]
      const [removed] = next.splice(dragIdx, 1)
      next.splice(idx, 0, removed)
      return next
    })
    setDragIdx(null)
  }
  function onDragEnd() { setDragIdx(null) }

  // ── Publish / Save / Back handlers ────────────────────────────────────────
  function handlePublish() {
    const errors = []
    if (!formTitle.trim()) errors.push(t('fe.error.title_required'))
    if (fields.length === 0) errors.push(t('fe.error.min_one_question'))
    if (fields.some(f => !f.label.trim())) errors.push(t('fe.error.question_labels'))
    if (!selectedCampaign) errors.push(t('fe.error.campaign_required'))

    // Valider que les questions de type choice ont au moins 1 option non vide
    const invalidChoiceFields = fields.filter(f =>
      f.type === 'choice' &&
      (!f.options || f.options.length === 0 || f.options.every(o => !o.label?.trim()))
    )
    if (invalidChoiceFields.length > 0) {
      setValidationErrors([t('fe.error.choice_needs_option')])
      return
    }
    if (errors.length > 0) {
      setValidationErrors(errors)
      return
    }
    setValidationErrors([])
    handleSave()
  }

  function transformQuestionsForApi(f) {
    return f.map(q => ({
      id:       q.id,
      type:     q.type,
      label:    q.label,
      required: q.required !== false,
      ...(q.type === 'rating' && { scale: q.scale || 5 }),
      ...(q.type === 'choice' && { options: (q.options || []).map(o =>
        typeof o === 'string' ? o : (o.label || o.value || String(o))
      )}),
    }))
  }

  async function handleSave() {
    if (!formTitle) {
      setError(t('fe.error.title_required'))
      return
    }
    if (!selectedCampaign) {
      setError(t('fe.error.campaign_required'))
      return
    }
    setSaving(true)
    try {
      const payload = {
        campaignId:  selectedCampaign,
        title:       formTitle,
        description: formDesc || '',
        formType:    formType,
        isAnonymous: isAnonymous,
        questions:   transformQuestionsForApi(fields),
      }
      const url    = editingId ? `/api/forms/${editingId}` : '/api/forms'
      const method = editingId ? 'PATCH' : 'POST'
      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      if (r.status === 409) {
        let detail = null
        try { detail = await r.json() } catch { detail = null }
        const dateStr = detail?.frozenAt
          ? new Date(detail.frozenAt).toLocaleDateString('fr-FR')
          : ''
        setError(t('fe.error.frozen_since').replace('{date}', dateStr))
        return
      }
      if (!r.ok) throw new Error(t('fe.error.save_failed'))
      const data = await r.json()
      if (!editingId) setEditingId(data.id)
      const normalize = (res) => Array.isArray(res) ? res : (res?.data ?? [])
      const updated = await fetch('/api/forms', { credentials: 'include' })
        .then(res => { if (!res.ok) throw new Error(); return res.json() })
        .then(normalize)
        .catch(() => null)
      if (updated) setForms(updated)
      setView('list')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  function handleBack() {
    const isDirty = formTitle.trim() || formDesc.trim() || fields.length > 0
    if (isDirty) {
      setConfirmDialog({
        message: t('fe.confirm.unsaved_changes'),
        onConfirm() { setConfirmDialog(null); setError(null); setView('list') },
      })
      return
    }
    setError(null)
    setView('list')
  }

  // ── Status helpers ─────────────────────────────────────────────────────────
  function statusClass(s) {
    return { active: 'fe-tag--active', draft: 'fe-tag--draft', archived: 'fe-tag--archived' }[s] || ''
  }

  function statusLabel(s) {
    return t(`fe.status.${s}`)
  }

  // ── List view ─────────────────────────────────────────────────────────────
  function renderList() {
    return (
      <>
        <FormEditorBanner
          t={t}
          formCount={forms.length}
          activeCount={forms.filter(f => !f.frozenAt).length}
          responseCount={0}
        />

        {/* Filters + Create CTA */}
        <div className="fe-toolbar">
          <div className="fe-filters">
            {STATUS_FILTER.map(f => (
              <button
                type="button"
                key={f}
                className={`fe-filter-btn${filter === f ? ' fe-filter-btn--active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {t(`fe.filter.${f}`)}
              </button>
            ))}
          </div>
          <button type="button" className="fe-create-btn btn btn--md" onClick={openCreate}>
            <PlusIcon size={15} color="currentColor" strokeWidth={2.5} />
            {t('fe.banner.cta')}
          </button>
        </div>

        {/* Form cards grid */}
        {initialLoading ? (
          <div className="fe-loading" aria-live="polite">{t('fe.loading')}</div>
        ) : loadError ? (
          <div className="fe-error" role="alert">{t('fe.error.load')}</div>
        ) : forms.length === 0 ? (
          <div className="fe-empty-state">
            <DocumentIcon size={48} color="var(--color-on-surface-variant)" strokeWidth={1} />
            <h3 className="fe-empty-state__title">{t('fe.empty.title')}</h3>
            <p className="fe-empty-state__desc">{t('fe.empty.desc')}</p>
            <button type="button" className="btn btn--md" onClick={openCreate}>
              <PlusIcon size={15} color="currentColor" strokeWidth={2.5} />
              {t('fe.banner.cta')}
            </button>
          </div>
        ) : filteredForms.length === 0 ? (
          <p className="fe-empty">{t('fe.section.empty')}</p>
        ) : (
          <div className="fe-grid">
            {filteredForms.map(form => {
              const s = form.frozenAt ? 'archived' : 'active'
              return (
              <article key={form._id} className="fe-card">
                {/* Header */}
                <div className="fe-card__head">
                  <div className="fe-card__icon-wrap">
                    <DocumentIcon size={18} color="var(--color-primary)" strokeWidth={1.5} />
                  </div>
                  <span className={`fe-tag ${statusClass(s)}`}>
                    {statusLabel(s)}
                  </span>
                </div>

                {/* Title & description */}
                <h3 className="fe-card__title">{form.title}</h3>
                <p className="fe-card__desc">{form.description}</p>

                {/* Tags — formType as tag */}
                <div className="fe-card__tags">
                  <span className="fe-card__tag">{t(`fe.type.${form.formType}`) || form.formType}</span>
                </div>

                {/* Meta */}
                <div className="fe-card__meta">
                  <span className="fe-card__meta-item">
                    <strong>{form.questions?.length || 0}</strong> {t('fe.card.questions')}
                  </span>
                  <span className="fe-card__meta-sep">·</span>
                  <span className="fe-card__meta-item">
                    <strong>0</strong> {t('fe.card.responses')}
                  </span>
                  <span className="fe-card__meta-sep">·</span>
                  <span className="fe-card__meta-item fe-card__team">{form.isAnonymous ? '🔒' : t('fe.create.team.all')}</span>
                </div>

                {/* Footer */}
                <div className="fe-card__footer">
                  <span className="fe-card__updated">
                    {t('fe.card.updated')} {form.updatedAt ? new Date(form.updatedAt).toLocaleDateString('fr-FR') : '-'}
                  </span>
                  <div className="fe-card__actions">
                    <button type="button" className="fe-card__action" onClick={() => handleEdit(form._id)}>
                      {t('fe.card.edit')}
                    </button>
                    <button type="button" className="fe-card__action">
                      {t('fe.card.duplicate')}
                    </button>
                  </div>
                </div>
              </article>
              )
            })}
          </div>
        )}
      </>
    )
  }

  // ── Create / Edit view ────────────────────────────────────────────────────
  function renderCreate() {
    const activeFieldObj = fields.find(f => f.id === activeField) || null

    return (
      <div className="fe-builder">
        <button type="button" className="fe-builder__back" onClick={handleBack}>
          {t('fe.create.back')}
        </button>

        {frozen && (
          <div className="fe-frozen-banner" role="alert">
            {t('fe.frozen.warning')}
          </div>
        )}

        {error && (
          <div className="fe-validation-errors fe-validation-errors--api" role="alert">
            <p>{error}</p>
          </div>
        )}

        {validationErrors.length > 0 && (
          <div className="fe-validation-errors" role="alert">
            {validationErrors.map((e, i) => <p key={i}>{e}</p>)}
          </div>
        )}

        <div className="fe-builder__layout">

          {/* ── LEFT: form structure ──────────────────────────────────────── */}
          <div className="fe-builder__left">

            {/* Form header — metadata */}
            <div className="fe-fheader">
              <span className="fe-fheader__arch">{t('fe.fheader.arch')}</span>
              <label htmlFor="fe-form-title" className="sr-only">{t('fe.create.title')}</label>
              <input
                id="fe-form-title"
                className="fe-fheader__title"
                placeholder={t('fe.create.title.ph')}
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
              />
              <label htmlFor="fe-form-desc" className="sr-only">{t('fe.create.desc')}</label>
              <textarea
                id="fe-form-desc"
                className="fe-fheader__desc"
                placeholder={t('fe.create.desc.ph')}
                value={formDesc}
                onChange={e => setFormDesc(e.target.value)}
                rows={2}
              />
              <div className="fe-fheader__meta">
                <select
                  className="fe-fheader__select"
                  value={selectedCampaign}
                  onChange={e => setSelectedCampaign(e.target.value)}
                  aria-label={t('fe.select.campaign')}
                  required
                >
                  <option value="">{t('fe.select.campaign_placeholder')}</option>
                  {campaigns.map(c => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
                <select
                  className="fe-fheader__select"
                  value={formType}
                  onChange={e => { setFormType(e.target.value); if (e.target.value === 'upward_feedback') setIsAnonymous(true) }}
                  aria-label={t('fe.select.form_type')}
                >
                  {FORM_TYPES.map(ft => (
                    <option key={ft.value} value={ft.value}>{ft.label}</option>
                  ))}
                </select>
                <select
                  className="fe-fheader__select"
                  aria-label={t('fe.create.team')}
                  value={formTeam}
                  onChange={e => setFormTeam(e.target.value)}
                >
                  <option value="Tous">{t('fe.create.team.all')}</option>
                  <option value="Direction">{t('fe.create.team.direction')}</option>
                  <option value="R&D">{t('fe.create.team.rd')}</option>
                  <option value="Marketing">{t('fe.create.team.marketing')}</option>
                  <option value="Opérations">{t('fe.create.team.operations')}</option>
                </select>
                <input
                  className="fe-fheader__tags"
                  aria-label={t('fe.tags.title')}
                  placeholder={t('fe.create.tags_ph')}
                  value={formTags}
                  onChange={e => setFormTags(e.target.value)}
                />
              </div>
            </div>

            {/* Question cards */}
            <div className="fe-questions">
              {fields.length === 0 && (
                <p className="fe-questions__empty">{t('fe.questions.empty')}</p>
              )}
              {fields.map((field, idx) => (
                <div
                  key={field.id}
                  className={`fe-qcard${activeField === field.id ? ' fe-qcard--active' : ''}${dragIdx === idx ? ' fe-qcard--dragging' : ''}`}
                  onClick={() => setActiveField(field.id)}
                  draggable={!frozen}
                  onDragStart={frozen ? undefined : e => onDragStart(e, idx)}
                  onDragOver={onDragOver}
                  onDrop={frozen ? undefined : e => onDrop(e, idx)}
                  onDragEnd={onDragEnd}
                >
                  <div className="fe-qcard__head">
                    <span className="fe-qcard__badge">
                      {t('fe.qcard.badge')} {String(idx + 1).padStart(2, '0')}
                      {field.required && <span className="fe-qcard__req"> *</span>}
                    </span>
                    <div className="fe-qcard__btns">
                      <button
                        type="button"
                        className="fe-qcard__btn"
                        onClick={e => { e.stopPropagation(); setActiveField(field.id) }}
                        aria-label={t('fe.btn.configure')}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" strokeWidth="2"
                          strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="fe-qcard__btn fe-qcard__btn--danger"
                        onClick={e => { e.stopPropagation(); removeField(field.id) }}
                        aria-label={t('fe.btn.delete_question')}
                        disabled={frozen}
                      >
                        <TrashIcon size={13} color="currentColor" strokeWidth={2} />
                      </button>
                    </div>
                  </div>
                  <h4 className="fe-qcard__title">
                    {field.label || <span className="fe-qcard__ph">{t('fe.create.placeholder')}</span>}
                  </h4>
                  {field.description && <p className="fe-qcard__desc">{field.description}</p>}
                  <QuestionPreview field={field} t={t} />
                </div>
              ))}

              {/* Add card — default type rating, changed via config panel */}
              <button type="button" className="fe-qcard fe-qcard--add" onClick={() => addField('rating')} disabled={frozen}>
                <PlusIcon size={22} color="var(--color-on-surface-variant)" strokeWidth={1.5} />
                <span>{t('fe.create.add_question')}</span>
              </button>
            </div>

          </div>

          {/* ── RIGHT: component configuration ───────────────────────────── */}
          <div className="fe-builder__right">
            {activeFieldObj ? (
              <div className="fe-config">
                <span className="fe-config__title">{t('fe.config.title')}</span>

                <div className="fe-config__block">
                  <label className="fe-config__lbl" htmlFor={`fe-q-label-${activeFieldObj.id}`}>
                    {t('fe.config.question_title')}
                  </label>
                  <input
                    id={`fe-q-label-${activeFieldObj.id}`}
                    className="fe-config__input"
                    value={activeFieldObj.label}
                    placeholder={t('fe.create.question_title_ph')}
                    onChange={e => updateField(activeFieldObj.id, 'label', e.target.value)}
                  />
                </div>

                <div className="fe-config__block">
                  <label className="fe-config__lbl" htmlFor={`fe-q-desc-${activeFieldObj.id}`}>
                    {t('fe.config.question_desc')}
                  </label>
                  <textarea
                    id={`fe-q-desc-${activeFieldObj.id}`}
                    className="fe-config__input fe-config__input--area"
                    value={activeFieldObj.description || ''}
                    placeholder={t('fe.create.question_desc_ph')}
                    rows={3}
                    onChange={e => updateField(activeFieldObj.id, 'description', e.target.value)}
                  />
                </div>

                <div className="fe-config__block">
                  <span className="fe-config__lbl">{t('fe.config.validation_logic')}</span>
                  <div className="fe-config__toggles">
                    {[
                      { key: 'required',  label: t('fe.config.toggle_required')  },
                      { key: 'weightage', label: t('fe.config.toggle_weightage') },
                      { key: 'anonymous', label: t('fe.config.toggle_anonymous') },
                    ].map(({ key, label }) => {
                      const isAnonymousForced = key === 'anonymous' && formType === 'upward_feedback'
                      const checked = isAnonymousForced ? true : !!activeFieldObj[key]
                      return (
                        <div key={key} className="fe-config__toggle-row">
                          <span className="fe-config__toggle-lbl">{label}</span>
                           <button
                            type="button"
                            className={`fe-toggle${checked ? ' fe-toggle--on' : ''}`}
                            onClick={() => { if (!isAnonymousForced) updateField(activeFieldObj.id, key, !activeFieldObj[key]) }}
                            role="switch"
                            aria-checked={checked}
                            disabled={isAnonymousForced}
                          >
                            <span className="fe-toggle__thumb" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Rating config — only for rating type */}
                {activeFieldObj.type === 'rating' && (
                  <div className="fe-config__block">
                    <label className="fe-config__lbl">{t('fe.config.scale_range')}</label>
                    <div className="fe-config__scale-row">
                      {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                        <button
                          type="button"
                          key={n}
                          className={`fe-scale-opt${activeFieldObj.scale === n ? ' fe-scale-opt--active' : ''}`}
                          onClick={() => updateField(activeFieldObj.id, 'scale', n)}
                          aria-label={t('fe.scale.range').replace('{max}', String(n))}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="fe-config__block">
                  <span className="fe-config__lbl">{t('fe.config.interface_opts')}</span>
                  <div className="fe-config__opts">
                    {IFACE_OPTS.map(({ type, key, d }) => (
                      <button
                        type="button"
                        key={type}
                        className={`fe-config__opt${activeFieldObj.type === type ? ' fe-config__opt--active' : ''}`}
                        onClick={() => updateField(activeFieldObj.id, 'type', type)}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" strokeWidth="2"
                          strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d={d} />
                        </svg>
                        <span>{t(key)}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Options — only for choice type */}
                {activeFieldObj.type === 'choice' && (
                  <div className="fe-config__block">
                    <span className="fe-config__lbl">{t('fe.config.options')}</span>
                    <div className="fe-opts-list">
                      {activeFieldObj.options.map((opt, i) => (
                        <div key={opt.id} className="fe-opt-row">
                          <input
                            className="fe-opt-row__label"
                           placeholder={t('fe.create.option_label_ph').replace('{n}', String(i + 1))}
                            value={opt.label}
                            onChange={e => updateOption(activeFieldObj.id, opt.id, 'label', e.target.value)}
                          />
                          <input
                            className="fe-opt-row__value"
                            placeholder={t('fe.create.option_value_ph')}
                            value={opt.value}
                            onChange={e => updateOption(activeFieldObj.id, opt.id, 'value', e.target.value)}
                          />
                          <button
                            type="button"
                            className="fe-opt-row__remove"
                            onClick={() => removeOption(activeFieldObj.id, opt.id)}
                            aria-label={t('fe.config.remove_option')}
                          >
                            <TrashIcon size={13} color="currentColor" strokeWidth={2} />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        className="fe-opts-add"
                        onClick={() => addOption(activeFieldObj.id)}
                      >
                        <PlusIcon size={12} color="var(--color-secondary)" strokeWidth={2.5} />
                        {t('fe.create.add_option')}
                      </button>
                    </div>
                  </div>
                )}

                <div className="fe-config__footer">
                  <button type="button" className="fe-config__discard" onClick={() => setActiveField(null)}>
                    {t('fe.create.cancel')}
                  </button>
                  <button type="button" className="btn btn--md">{t('fe.config.save')}</button>
                </div>
              </div>
            ) : (
              <div className="fe-config fe-config--idle">
                <span className="fe-config__title">{t('fe.config.title')}</span>
                <p className="fe-config__hint">
                  {t('fe.config.idle_hint')}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Bottom actions */}
        <div className="fe-builder__actions">
          <button type="button" className="btn btn--md" onClick={handlePublish} disabled={saving}>
            {t('fe.create.publish')}
          </button>
          <button type="button" className="fe-builder__ghost" onClick={handleSave} disabled={saving}>
            {saving ? '…' : t('fe.create.save')}
          </button>
          <button type="button" className="fe-builder__ghost fe-builder__ghost--muted" onClick={handleBack}>
            {t('fe.create.cancel')}
          </button>
        </div>
      </div>
    )
  }

  // ── Shell ──────────────────────────────────────────────────────────────────
  const hrT = (key) => t(key.replace('hr.nav.', 'fe.nav.'))

  async function handleLogout() {
    try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }) } catch { /* ignore */ }
    sessionStorage.clear()
    window.location.href = '/'
  }

  return (
    <div className="fe">
      <HRSidebar t={hrT} activeItem="formeditor" />
      <div className="fe-main">

        <AppTopbar
          searchPlaceholder={t('fe.topbar.search')}
          locale={locale} setLocale={setLocale}
          theme={theme} cycleTheme={cycleTheme}
          user={user} onLogout={handleLogout}
        />

        {/* Content */}
        <main className="fe-content" id="main-content">
          {view === 'list' ? renderList() : renderCreate()}
        </main>
      </div>

      {/* Confirm dialog (replaces window.confirm) */}
      {confirmDialog && (
        <div className="fe-confirm-overlay" onClick={() => setConfirmDialog(null)}>
          <div
            className="fe-confirm-dialog"
            role="alertdialog"
            aria-modal="true"
            onClick={e => e.stopPropagation()}
          >
            <p className="fe-confirm-msg">{confirmDialog.message}</p>
            <div className="fe-confirm-actions">
              <button
                type="button"
                className="fe-confirm-cancel"
                onClick={() => setConfirmDialog(null)}
              >
                {t('fe.confirm.cancel')}
              </button>
              <button
                type="button"
                className="btn btn--md"
                onClick={confirmDialog.onConfirm}
              >
                {t('fe.confirm.leave')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
