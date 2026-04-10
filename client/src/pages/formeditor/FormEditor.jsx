// =============================================================================
// FormEditor — HR Form Editor page
// Two views:
//   'list'   — overview: banner + filters + form cards
//   'create' — form builder: fields palette + live preview
// =============================================================================
import React, { useState, useRef } from 'react'
import './formeditor.css'
import { t as pageT } from './i18n'
import { useLocale } from '../../hooks/useLocale'
import { useTheme } from '../../hooks/useTheme'
import FormEditorSidebar from './FormEditorSidebar'
import FormEditorBanner from './FormEditorBanner'
import {
  SearchIcon, BellIcon, HelpIcon, PaletteIcon,
  PlusIcon, TrashIcon, DocumentIcon,
} from '../../components/ui/icons'

// ── Mock data ──────────────────────────────────────────────────────────────
const MOCK_FORMS = [
  {
    id: 'f1',
    title: 'Auto-évaluation annuelle 2026',
    description: "Formulaire d'auto-évaluation pour la campagne annuelle.",
    status: 'active',
    tags: ['Annuel', 'Auto-éval'],
    team: 'Tous',
    questions: 12,
    responses: 43,
    updatedAt: '28 mars 2026',
  },
  {
    id: 'f2',
    title: 'Évaluation manager → équipe',
    description: 'Formulaire descendant — évaluation par le manager.',
    status: 'active',
    tags: ['Évaluation', 'Manager'],
    team: 'Direction',
    questions: 18,
    responses: 8,
    updatedAt: '2 avr. 2026',
  },
  {
    id: 'f3',
    title: 'Bilan de mi-année',
    description: 'Formulaire de bilan intermédiaire — R&D.',
    status: 'draft',
    tags: ['Mi-année'],
    team: 'R&D',
    questions: 10,
    responses: 0,
    updatedAt: '8 avr. 2026',
  },
  {
    id: 'f4',
    title: 'Enquête satisfaction RH',
    description: 'Mesure de la satisfaction des collaborateurs vis-à-vis du service RH.',
    status: 'archived',
    tags: ['Satisfaction', 'RH'],
    team: 'Tous',
    questions: 6,
    responses: 128,
    updatedAt: '15 déc. 2025',
  },
]

const STATUS_FILTER = ['all', 'active', 'draft', 'archived']

const IFACE_OPTS = [
  { type: 'scale',  label: 'Échelle',        d: 'M5 12h14M12 5l7 7-7 7'                                                          },
  { type: 'text',   label: 'Texte',          d: 'M3 6h18M3 12h12'                                                                 },
  { type: 'slider', label: 'Curseur',        d: 'M3 12h18M8 12a4 4 0 100-1 4 4 0 000 1'                                          },
  { type: 'choice', label: 'Choix multiple', d: 'M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11'           },
]

// ── Inline question preview (inside question card) ─────────────────────────
function QuestionPreview({ field }) {
  if (field.type === 'scale') {
    return (
      <div className="fe-qcard__preview">
        {[1,2,3,4,5].map(n => (
          <span key={n} className="fe-qcard__scale-btn">{n}</span>
        ))}
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
  if (field.type === 'slider') {
    return (
      <div className="fe-qcard__preview fe-qcard__preview--slider">
        <span className="fe-qcard__slider-lbl">0%</span>
        <div className="fe-qcard__slider-track">
          <div className="fe-qcard__slider-thumb" style={{ left: '50%' }} />
        </div>
        <span className="fe-qcard__slider-lbl">100%</span>
      </div>
    )
  }
  if (field.type === 'choice') {
    const opts = field.options?.length > 0
      ? field.options
      : [{ id: 'a', label: 'Option A' }, { id: 'b', label: 'Option B' }]
    return (
      <div className="fe-qcard__preview">
        {opts.slice(0, 3).map((o, i) => (
          <div key={o.id || i} className="fe-qcard__choice-row">
            <span className="fe-qcard__radio" />
            <span className="fe-qcard__choice-txt">{o.label || `Option ${i + 1}`}</span>
          </div>
        ))}
        {opts.length > 3 && (
          <span className="fe-qcard__choice-more">+{opts.length - 3} autres</span>
        )}
      </div>
    )
  }
  return null
}

// ── Main component ─────────────────────────────────────────────────────────
export default function FormEditor() {
  const { t, locale, setLocale } = useLocale(pageT)
  const { cycleTheme } = useTheme()

  // Views: 'list' | 'create'
  const [view, setView]         = useState('list')
  const [filter, setFilter]     = useState('all')
  const [editingId, setEditingId] = useState(null)

  // Creator state
  const [formTitle, setFormTitle]   = useState('')
  const [formDesc, setFormDesc]     = useState('')
  const [formTeam, setFormTeam]     = useState('Tous')
  const [formTags, setFormTags]     = useState('')
  const [fields, setFields]         = useState([])
  const [activeField, setActiveField] = useState(null)
  const [dragIdx, setDragIdx]         = useState(null)
  const fieldCounter                  = useRef(0)
  const optCounter                    = useRef(0)

  // Filter forms
  const filteredForms = MOCK_FORMS.filter(f =>
    filter === 'all' ? true : f.status === filter
  )

  // ── Handlers ──────────────────────────────────────────────────────────────
  function openCreate() {
    setFormTitle(''); setFormDesc(''); setFormTeam('Tous')
    setFormTags(''); setFields([]); setEditingId(null)
    setView('create')
  }

  function openEdit(form) {
    setFormTitle(form.title); setFormDesc(form.description)
    setFormTeam(form.team); setFormTags(form.tags.join(', '))
    setFields([]); setEditingId(form.id)
    setView('create')
  }

  function makeDefaultOptions() {
    return ['A', 'B', 'C'].map(l => {
      optCounter.current += 1
      return { id: `opt-${optCounter.current}`, label: `Option ${l}`, value: '' }
    })
  }

  function addField(type) {
    fieldCounter.current += 1
    const newField = {
      id: `field-${fieldCounter.current}`,
      type,
      label: '',
      description: '',
      required: false,
      weightage: false,
      anonymous: false,
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
        <FormEditorBanner t={t} />

        {/* Filters + Create CTA */}
        <div className="fe-toolbar">
          <div className="fe-filters">
            {STATUS_FILTER.map(f => (
              <button
                key={f}
                className={`fe-filter-btn${filter === f ? ' fe-filter-btn--active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {t(`fe.filter.${f}`)}
              </button>
            ))}
          </div>
          <button className="fe-create-btn btn btn--md" onClick={openCreate}>
            <PlusIcon size={15} color="currentColor" strokeWidth={2.5} />
            {t('fe.banner.cta')}
          </button>
        </div>

        {/* Form cards grid */}
        {filteredForms.length === 0 ? (
          <p className="fe-empty">{t('fe.section.empty')}</p>
        ) : (
          <div className="fe-grid">
            {filteredForms.map(form => (
              <article key={form.id} className="fe-card">
                {/* Header */}
                <div className="fe-card__head">
                  <div className="fe-card__icon-wrap">
                    <DocumentIcon size={18} color="var(--color-primary)" strokeWidth={1.5} />
                  </div>
                  <span className={`fe-tag ${statusClass(form.status)}`}>
                    {statusLabel(form.status)}
                  </span>
                </div>

                {/* Title & description */}
                <h3 className="fe-card__title">{form.title}</h3>
                <p className="fe-card__desc">{form.description}</p>

                {/* Tags */}
                <div className="fe-card__tags">
                  {form.tags.map(tag => (
                    <span key={tag} className="fe-card__tag">{tag}</span>
                  ))}
                </div>

                {/* Meta */}
                <div className="fe-card__meta">
                  <span className="fe-card__meta-item">
                    <strong>{form.questions}</strong> {t('fe.card.questions')}
                  </span>
                  <span className="fe-card__meta-sep">·</span>
                  <span className="fe-card__meta-item">
                    <strong>{form.responses}</strong> {t('fe.card.responses')}
                  </span>
                  <span className="fe-card__meta-sep">·</span>
                  <span className="fe-card__meta-item fe-card__team">{form.team}</span>
                </div>

                {/* Footer */}
                <div className="fe-card__footer">
                  <span className="fe-card__updated">
                    {t('fe.card.updated')} {form.updatedAt}
                  </span>
                  <div className="fe-card__actions">
                    <button className="fe-card__action" onClick={() => openEdit(form)}>
                      {t('fe.card.edit')}
                    </button>
                    <button className="fe-card__action">
                      {t('fe.card.duplicate')}
                    </button>
                  </div>
                </div>
              </article>
            ))}
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
        <button className="fe-builder__back" onClick={() => setView('list')}>
          {t('fe.create.back')}
        </button>

        <div className="fe-builder__layout">

          {/* ── LEFT: form structure ──────────────────────────────────────── */}
          <div className="fe-builder__left">

            {/* Form header — metadata */}
            <div className="fe-fheader">
              <span className="fe-fheader__arch">ARCHITECTURE DU FORMULAIRE</span>
              <input
                className="fe-fheader__title"
                placeholder={t('fe.create.title.ph')}
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
              />
              <textarea
                className="fe-fheader__desc"
                placeholder={t('fe.create.desc.ph')}
                value={formDesc}
                onChange={e => setFormDesc(e.target.value)}
                rows={2}
              />
              <div className="fe-fheader__meta">
                <select
                  className="fe-fheader__select"
                  value={formTeam}
                  onChange={e => setFormTeam(e.target.value)}
                >
                  <option>Tous</option>
                  <option>Direction</option>
                  <option>R&D</option>
                  <option>Marketing</option>
                  <option>Opérations</option>
                </select>
                <input
                  className="fe-fheader__tags"
                  placeholder="Tags : Annuel, Auto-éval…"
                  value={formTags}
                  onChange={e => setFormTags(e.target.value)}
                />
              </div>
            </div>

            {/* Question cards */}
            <div className="fe-questions">
              {fields.length === 0 && (
                <p className="fe-questions__empty">Aucune question pour l'instant — ajoutez-en une avec le bouton ci-dessous.</p>
              )}
              {fields.map((field, idx) => (
                <div
                  key={field.id}
                  className={`fe-qcard${activeField === field.id ? ' fe-qcard--active' : ''}${dragIdx === idx ? ' fe-qcard--dragging' : ''}`}
                  onClick={() => setActiveField(field.id)}
                  draggable
                  onDragStart={e => onDragStart(e, idx)}
                  onDragOver={onDragOver}
                  onDrop={e => onDrop(e, idx)}
                  onDragEnd={onDragEnd}
                >
                  <div className="fe-qcard__head">
                    <span className="fe-qcard__badge">
                      QUESTION {String(idx + 1).padStart(2, '0')}
                      {field.required && <span className="fe-qcard__req"> *</span>}
                    </span>
                    <div className="fe-qcard__btns">
                      <button
                        className="fe-qcard__btn"
                        onClick={e => { e.stopPropagation(); setActiveField(field.id) }}
                        aria-label="Configurer"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" strokeWidth="2"
                          strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <button
                        className="fe-qcard__btn fe-qcard__btn--danger"
                        onClick={e => { e.stopPropagation(); removeField(field.id) }}
                        aria-label="Supprimer"
                      >
                        <TrashIcon size={13} color="currentColor" strokeWidth={2} />
                      </button>
                    </div>
                  </div>
                  <h4 className="fe-qcard__title">
                    {field.label || <span className="fe-qcard__ph">{t('fe.create.placeholder')}</span>}
                  </h4>
                  {field.description && <p className="fe-qcard__desc">{field.description}</p>}
                  <QuestionPreview field={field} />
                </div>
              ))}

              {/* Add card — default type scale, changed via config panel */}
              <button className="fe-qcard fe-qcard--add" onClick={() => addField('scale')}>
                <PlusIcon size={22} color="var(--color-on-surface-variant)" strokeWidth={1.5} />
                <span>Ajouter une question</span>
              </button>
            </div>

          </div>

          {/* ── RIGHT: component configuration ───────────────────────────── */}
          <div className="fe-builder__right">
            {activeFieldObj ? (
              <div className="fe-config">
                <span className="fe-config__title">COMPONENT CONFIGURATION</span>

                <div className="fe-config__block">
                  <label className="fe-config__lbl">QUESTION TITLE</label>
                  <input
                    className="fe-config__input"
                    value={activeFieldObj.label}
                    placeholder="Ex. Compétences techniques"
                    onChange={e => updateField(activeFieldObj.id, 'label', e.target.value)}
                  />
                </div>

                <div className="fe-config__block">
                  <label className="fe-config__lbl">QUESTION DESCRIPTION</label>
                  <textarea
                    className="fe-config__input fe-config__input--area"
                    value={activeFieldObj.description || ''}
                    placeholder="Décrivez ce que vous évaluez…"
                    rows={3}
                    onChange={e => updateField(activeFieldObj.id, 'description', e.target.value)}
                  />
                </div>

                <div className="fe-config__block">
                  <span className="fe-config__lbl">VALIDATION LOGIC</span>
                  <div className="fe-config__toggles">
                    {[
                      { key: 'required',  label: 'Champ obligatoire' },
                      { key: 'weightage', label: 'Coefficient de pondération' },
                      { key: 'anonymous', label: 'Réponse anonyme' },
                    ].map(({ key, label }) => (
                      <div key={key} className="fe-config__toggle-row">
                        <span className="fe-config__toggle-lbl">{label}</span>
                        <button
                          className={`fe-toggle${activeFieldObj[key] ? ' fe-toggle--on' : ''}`}
                          onClick={() => updateField(activeFieldObj.id, key, !activeFieldObj[key])}
                          role="switch"
                          aria-checked={!!activeFieldObj[key]}
                        >
                          <span className="fe-toggle__thumb" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="fe-config__block">
                  <span className="fe-config__lbl">INTERFACE OPTIONS</span>
                  <div className="fe-config__opts">
                    {IFACE_OPTS.map(({ type, label, d }) => (
                      <button
                        key={type}
                        className={`fe-config__opt${activeFieldObj.type === type ? ' fe-config__opt--active' : ''}`}
                        onClick={() => updateField(activeFieldObj.id, 'type', type)}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" strokeWidth="2"
                          strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d={d} />
                        </svg>
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Options — only for choice type */}
                {activeFieldObj.type === 'choice' && (
                  <div className="fe-config__block">
                    <span className="fe-config__lbl">OPTIONS</span>
                    <div className="fe-opts-list">
                      {activeFieldObj.options.map((opt, i) => (
                        <div key={opt.id} className="fe-opt-row">
                          <input
                            className="fe-opt-row__label"
                            placeholder={`Option ${i + 1}`}
                            value={opt.label}
                            onChange={e => updateOption(activeFieldObj.id, opt.id, 'label', e.target.value)}
                          />
                          <input
                            className="fe-opt-row__value"
                            placeholder="Valeur"
                            value={opt.value}
                            onChange={e => updateOption(activeFieldObj.id, opt.id, 'value', e.target.value)}
                          />
                          <button
                            className="fe-opt-row__remove"
                            onClick={() => removeOption(activeFieldObj.id, opt.id)}
                            aria-label="Supprimer"
                          >
                            <TrashIcon size={13} color="currentColor" strokeWidth={2} />
                          </button>
                        </div>
                      ))}
                      <button
                        className="fe-opts-add"
                        onClick={() => addOption(activeFieldObj.id)}
                      >
                        <PlusIcon size={12} color="var(--color-secondary)" strokeWidth={2.5} />
                        Ajouter une option
                      </button>
                    </div>
                  </div>
                )}

                <div className="fe-config__footer">
                  <button className="fe-config__discard" onClick={() => setActiveField(null)}>
                    Annuler
                  </button>
                  <button className="btn btn--md">Enregistrer</button>
                </div>
              </div>
            ) : (
              <div className="fe-config fe-config--idle">
                <span className="fe-config__title">COMPONENT CONFIGURATION</span>
                <p className="fe-config__hint">
                  Sélectionnez une question pour la configurer.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Bottom actions */}
        <div className="fe-builder__actions">
          <button className="btn btn--md" onClick={() => setView('list')}>
            {t('fe.create.publish')}
          </button>
          <button className="fe-builder__ghost" onClick={() => setView('list')}>
            {t('fe.create.save')}
          </button>
          <button className="fe-builder__ghost fe-builder__ghost--muted" onClick={() => setView('list')}>
            {t('fe.create.cancel')}
          </button>
        </div>
      </div>
    )
  }

  // ── Shell ──────────────────────────────────────────────────────────────────
  return (
    <div className="fe">
      <FormEditorSidebar t={t} />
      <div className="fe-main">

        {/* Topbar */}
        <header className="fe-topbar">
          <div className="fe-topbar__search">
            <SearchIcon size={15} color="var(--color-on-surface-variant)" strokeWidth={1.5} />
            <input
              className="fe-topbar__input"
              type="text"
              placeholder={t('fe.topbar.search')}
            />
          </div>
          <div className="fe-topbar__right">
            <span className="fe-topbar__date">{t('fe.topbar.date')}</span>
            <button className="fe-topbar__icon-btn" onClick={cycleTheme} aria-label="Thème">
              <PaletteIcon size={18} color="var(--color-on-surface-variant)" />
            </button>
            <button className="fe-topbar__icon-btn" aria-label="Aide">
              <HelpIcon size={18} color="var(--color-on-surface-variant)" />
            </button>
            <button className="fe-topbar__icon-btn" aria-label="Notifications">
              <BellIcon size={18} color="var(--color-on-surface-variant)" />
            </button>
            <button className="fe-topbar__locale" onClick={() => setLocale(locale === 'fr' ? 'en' : 'fr')}>
              {locale.toUpperCase()}
            </button>
            <div className="fe-topbar__avatar">RH</div>
          </div>
        </header>

        {/* Content */}
        <main className="fe-content">
          {view === 'list' ? renderList() : renderCreate()}
        </main>
      </div>
    </div>
  )
}
