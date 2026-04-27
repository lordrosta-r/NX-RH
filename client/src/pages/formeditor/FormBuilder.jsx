// =============================================================================
// FormBuilder.jsx — Éditeur de formulaire, route /hr/templates/:id/builder
//
// Layout éditorial 2 colonnes :
//   - Gauche : canvas scrollable (header + question cards + palette)
//   - Droite (400px) : panneau propriétés (3 sections + footer sticky)
// =============================================================================

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth }        from '../../contexts/AuthContext'
import { useTranslate }   from '../../contexts/LocaleContext'
import { t as pageT }     from './i18n'
import {
  ChevronLeft, AlertTriangle, GripVertical, Trash2, Copy, Plus,
  BarChart2, List, AlignLeft, ToggleLeft, CloudSun, MapPin, Download,
} from 'lucide-react'
import './formbuilder.css'

// ── Constants ─────────────────────────────────────────────────────────────────

const BLOCK_TYPES = [
  { type: 'rating',    icon: BarChart2,  labelKey: 'fb.block.rating' },
  { type: 'choice',    icon: List,       labelKey: 'fb.block.choice' },
  { type: 'text',      icon: AlignLeft,  labelKey: 'fb.block.text' },
  { type: 'yes_no',    icon: ToggleLeft, labelKey: 'fb.block.yes_no' },
  { type: 'weather',   icon: CloudSun,   labelKey: 'fb.block.weather' },
  { type: 'mobility',  icon: MapPin,     labelKey: 'fb.block.mobility' },
  { type: 'n1_import', icon: Download,   labelKey: 'fb.block.n1_import' },
]

// Primary 2×2 grid in right panel
const MAIN_TYPE_TILES = [
  { type: 'rating',  icon: BarChart2,  labelKey: 'fb.block.rating' },
  { type: 'choice',  icon: List,       labelKey: 'fb.block.choice' },
  { type: 'text',    icon: AlignLeft,  labelKey: 'fb.block.text' },
  { type: 'yes_no',  icon: ToggleLeft, labelKey: 'fb.block.yes_no' },
]

// Secondary row (special types)
const SPECIAL_TYPE_TILES = [
  { type: 'weather',   icon: CloudSun,  labelKey: 'fb.block.weather' },
  { type: 'mobility',  icon: MapPin,    labelKey: 'fb.block.mobility' },
  { type: 'n1_import', icon: Download,  labelKey: 'fb.block.n1_import' },
]

const PHASE_OPTIONS = [
  { value: 'all',         labelKey: 'fb.config.phase.all' },
  { value: 'self',        labelKey: 'fb.config.phase.self' },
  { value: 'n-1',         labelKey: 'fb.config.phase.n1' },
  { value: 'objectives',  labelKey: 'fb.config.phase.objectives' },
  { value: 'aspirations', labelKey: 'fb.config.phase.aspirations' },
]

function makeBlock(type) {
  return {
    _id:         `block-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    label:       '',
    description: '',
    required:    false,
    anonymous:   false,
    phase:       'all',
    options:     type === 'choice' ? ['Option 1', 'Option 2'] : undefined,
  }
}

// Normalise a question coming from the API (has `id`, no `_id`) so the
// FormBuilder UI can use `block._id` uniformly for selection and keys.
function normalizeBlock(q) {
  if (q._id) return q
  return { ...q, _id: q.id }
}

// ── Question preview by type ──────────────────────────────────────────────────

function QuestionPreview({ type }) {
  switch (type) {
    case 'rating':
      return (
        <div className="fb-preview fb-preview--rating">
          {[1, 2, 3, 4, 5].map(n => (
            <div key={n} className={`fb-preview__box${n === 4 ? ' fb-preview__box--active' : ''}`}>
              {n}
            </div>
          ))}
        </div>
      )
    case 'text':
      return (
        <div className="fb-preview fb-preview--text">
          <span className="fb-preview__text-ph">Réponse libre…</span>
        </div>
      )
    case 'yes_no':
    case 'mobility':
      return (
        <div className="fb-preview fb-preview--yesno">
          <div className="fb-preview__yn-box">Oui</div>
          <div className="fb-preview__yn-box">Non</div>
        </div>
      )
    case 'choice':
      return (
        <div className="fb-preview fb-preview--choice">
          {[0, 1, 2].map(i => <div key={i} className="fb-preview__choice-bar" />)}
        </div>
      )
    case 'weather':
      return (
        <div className="fb-preview fb-preview--weather">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
            <div key={n} className={`fb-preview__box fb-preview__box--sm${n === 7 ? ' fb-preview__box--active' : ''}`}>
              {n}
            </div>
          ))}
        </div>
      )
    case 'n1_import':
      return (
        <div className="fb-preview fb-preview--import">
          <Download size={16} strokeWidth={1.5} />
          <span>Import N-1</span>
        </div>
      )
    default:
      return null
  }
}

// ── Question card ─────────────────────────────────────────────────────────────

function QuestionCard({ block, index, selected, onSelect, onDelete, onCopy, onDragStart, onDragOver, onDrop, t }) {
  const label = block.label || `(${t(`fb.block.${block.type}`) || block.type})`

  return (
    <div
      className={`fb-qcard${selected ? ' fb-qcard--active' : ''}`}
      draggable
      onClick={() => onSelect(block._id)}
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => { e.preventDefault(); onDragOver(e, index) }}
      onDrop={(e) => onDrop(e, index)}
    >
      {/* Drag handle — shown on hover, floats to the left */}
      <span className="fb-qcard__drag" aria-hidden="true">
        <GripVertical size={18} strokeWidth={1.5} />
      </span>

      {/* Top row: badge + required + actions */}
      <div className="fb-qcard__top">
        <div className="fb-qcard__badge-row">
          <span className={`fb-qcard__badge${selected ? ' fb-qcard__badge--active' : ''}`}>
            QUESTION {String(index + 1).padStart(2, '0')}
          </span>
          {block.required && <span className="fb-qcard__required" aria-label="Obligatoire">*</span>}
        </div>
        <div className="fb-qcard__actions">
          <button
            type="button"
            className="fb-qcard__action-btn"
            aria-label="Dupliquer"
            onClick={(e) => { e.stopPropagation(); onCopy(block._id) }}
          >
            <Copy size={14} strokeWidth={1.5} />
          </button>
          <button
            type="button"
            className="fb-qcard__action-btn fb-qcard__action-btn--delete"
            aria-label="Supprimer"
            onClick={(e) => { e.stopPropagation(); onDelete(block._id) }}
          >
            <Trash2 size={14} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* Question title */}
      <h3 className="fb-qcard__title">{label}</h3>

      {/* Optional description */}
      {block.description && (
        <p className="fb-qcard__desc">{block.description}</p>
      )}

      {/* Answer type preview */}
      <QuestionPreview type={block.type} />
    </div>
  )
}

// ── Reusable toggle ───────────────────────────────────────────────────────────

function Toggle({ checked, onChange, disabled }) {
  return (
    <label className={`fb-toggle${disabled ? ' fb-toggle--disabled' : ''}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      />
      <span className="fb-toggle__track" />
      <span className="fb-toggle__thumb" />
    </label>
  )
}

// ── Right properties panel ────────────────────────────────────────────────────

function PropertiesPanel({ block, onChange, onSave, onDiscard, saveStatus, isLocked, t }) {
  function handleOptionChange(i, val) {
    const opts = [...(block.options ?? [])]
    opts[i] = val
    onChange({ ...block, options: opts })
  }

  function addOption() {
    const opts = [...(block.options ?? []), `Option ${(block.options?.length ?? 0) + 1}`]
    onChange({ ...block, options: opts })
  }

  function removeOption(i) {
    const opts = (block.options ?? []).filter((_, idx) => idx !== i)
    onChange({ ...block, options: opts })
  }

  const saveLabel = saveStatus === 'saving' ? t('fb.saving')
    : saveStatus === 'saved' ? t('fb.saved')
    : t('fb.save')

  return (
    <aside className="fb-panel">
      <div className="fb-panel__scroll">
        {!block ? (
          <p className="fb-panel__idle">Sélectionnez une question pour la configurer.</p>
        ) : (
          <>
            {/* ── Section 1 : Configuration ─────────────────────────── */}
            <div className="fb-panel-section">
              <h4 className="fb-panel-section__title">CONFIGURATION DU COMPOSANT</h4>

              <div className="fb-field">
                <label className="fb-label fb-label--micro">INTITULÉ DE LA QUESTION</label>
                <input
                  className="fb-input fb-input--panel"
                  type="text"
                  value={block.label}
                  placeholder={t('fb.config.label.ph')}
                  onChange={e => onChange({ ...block, label: e.target.value })}
                  disabled={isLocked}
                />
              </div>

              <div className="fb-field">
                <label className="fb-label fb-label--micro">DESCRIPTION (OPTIONNEL)</label>
                <textarea
                  className="fb-textarea fb-textarea--panel"
                  value={block.description ?? ''}
                  placeholder="Décrivez ce que vous évaluez…"
                  onChange={e => onChange({ ...block, description: e.target.value })}
                  disabled={isLocked}
                  rows={3}
                />
              </div>

              <div className="fb-field">
                <label className="fb-label fb-label--micro">{t('fb.config.phase').toUpperCase()}</label>
                <select
                  className="fb-select fb-select--panel"
                  value={block.phase ?? 'all'}
                  onChange={e => onChange({ ...block, phase: e.target.value })}
                  disabled={isLocked}
                >
                  {PHASE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>
                  ))}
                </select>
              </div>

              {block.type === 'choice' && (
                <div className="fb-field">
                  <label className="fb-label fb-label--micro">{t('fb.config.options').toUpperCase()}</label>
                  <div className="fb-options">
                    {(block.options ?? []).map((opt, i) => (
                      <div key={i} className="fb-option-row">
                        <input
                          className="fb-option-input"
                          type="text"
                          value={opt}
                          onChange={e => handleOptionChange(i, e.target.value)}
                          disabled={isLocked}
                        />
                        <button
                          type="button"
                          className="fb-option-del"
                          onClick={() => removeOption(i)}
                          disabled={isLocked}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                    {!isLocked && (
                      <button type="button" className="fb-add-option" onClick={addOption}>
                        <Plus size={13} /> {t('fb.config.add_option')}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ── Section 2 : Validation ────────────────────────────── */}
            <div className="fb-panel-section">
              <h4 className="fb-panel-section__title">LOGIQUE DE VALIDATION</h4>
              <div className="fb-validation-box">
                <div className="fb-validation-row">
                  <span className="fb-validation-label">Champ obligatoire</span>
                  <Toggle
                    checked={block.required}
                    onChange={e => onChange({ ...block, required: e.target.checked })}
                    disabled={isLocked}
                  />
                </div>
                <div className="fb-validation-row fb-validation-row--disabled">
                  <span className="fb-validation-label">Pondération</span>
                  <Toggle checked={false} onChange={() => {}} disabled />
                </div>
                <div className="fb-validation-row">
                  <span className="fb-validation-label">Soumission anonyme</span>
                  <Toggle
                    checked={block.anonymous ?? false}
                    onChange={e => onChange({ ...block, anonymous: e.target.checked })}
                    disabled={isLocked}
                  />
                </div>
              </div>
            </div>

            {/* ── Section 3 : Type de champ ─────────────────────────── */}
            <div className="fb-panel-section">
              <h4 className="fb-panel-section__title">TYPE DE CHAMP</h4>

              {/* 2×2 primary types */}
              <div className="fb-type-grid">
                {MAIN_TYPE_TILES.map(({ type, icon: Icon, labelKey }) => (
                  <button
                    key={type}
                    type="button"
                    className={`fb-type-tile${block.type === type ? ' fb-type-tile--selected' : ''}`}
                    onClick={() => !isLocked && onChange({ ...block, type })}
                    disabled={isLocked}
                  >
                    <Icon size={20} strokeWidth={1.5} />
                    <span>{t(labelKey)}</span>
                  </button>
                ))}
              </div>

              {/* Special types row */}
              <div className="fb-type-special">
                {SPECIAL_TYPE_TILES.map(({ type, icon: Icon, labelKey }) => (
                  <button
                    key={type}
                    type="button"
                    className={`fb-type-tile fb-type-tile--sm${block.type === type ? ' fb-type-tile--selected' : ''}`}
                    onClick={() => !isLocked && onChange({ ...block, type })}
                    disabled={isLocked}
                  >
                    <Icon size={15} strokeWidth={1.5} />
                    <span>{t(labelKey)}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Sticky footer */}
      <footer className="fb-panel__footer">
        <button type="button" className="fb-panel__btn fb-panel__btn--outline" onClick={onDiscard}>
          Annuler
        </button>
        <button
          type="button"
          className="fb-panel__btn fb-panel__btn--filled"
          onClick={onSave}
          disabled={isLocked || saveStatus === 'saving'}
        >
          {saveLabel}
        </button>
      </footer>
    </aside>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function FormBuilder() {
  const { id }     = useParams()
  const { user }   = useAuth()
  const t          = useTranslate(pageT)
  const qc         = useQueryClient()
  const navigate   = useNavigate()

  const [blocks, setBlocks]               = useState(null)
  const [formTitle, setFormTitle]         = useState('')
  const [selectedId, setSelectedId]       = useState(null)
  const [originalBlock, setOriginalBlock] = useState(null)
  const [saveStatus, setSaveStatus]       = useState('idle')
  const [dragIdx, setDragIdx]             = useState(null)

  const { data: form, isLoading, isError } = useQuery({
    queryKey: ['hr-form', id],
    queryFn:  () =>
      fetch(`/api/forms/${id}`, { credentials: 'include' }).then(r => r.json()),
    enabled:  !!user && !!id,
    staleTime: 30 * 1000,
  })

  // Initialise blocks from query data once
  if (form && blocks === null) {
    setBlocks((form.questions ?? []).map(normalizeBlock))
    setFormTitle(form.title ?? '')
  }

  const saveMutation = useMutation({
    mutationFn: (payload) =>
      fetch(`/api/forms/${id}`, {
        method:      'PATCH',
        headers:     { 'Content-Type': 'application/json' },
        credentials: 'include',
        body:        JSON.stringify(payload),
      }).then(async r => {
        if (r.status === 409) throw Object.assign(new Error('conflict'), { status: 409 })
        if (!r.ok) throw new Error(await r.text())
        return r.json()
      }),
    onMutate:  () => setSaveStatus('saving'),
    onSuccess: () => {
      setSaveStatus('saved')
      qc.invalidateQueries({ queryKey: ['hr-form', id] })
      setTimeout(() => setSaveStatus('idle'), 2000)
    },
    onError: (err) => {
      setSaveStatus('idle')
      alert(err.status === 409 ? t('fb.error.conflict') : t('fb.error.save'))
    },
  })

  const handleSave = useCallback(() => {
    // Map local `_id` → API `id`; existing questions already have `id` set.
    const questions = (blocks ?? []).map(({ _id, ...rest }) => ({
      ...rest,
      id: rest.id ?? _id,
    }))
    saveMutation.mutate({ title: formTitle, questions })
  }, [formTitle, blocks, saveMutation])

  function handleSelect(blockId) {
    const block = (blocks ?? []).find(b => b._id === blockId)
    setSelectedId(blockId)
    setOriginalBlock(block ? { ...block } : null)
  }

  function handleAddBlock(type) {
    const b = makeBlock(type)
    setBlocks(prev => [...(prev ?? []), b])
    setSelectedId(b._id)
    setOriginalBlock({ ...b })
  }

  function handleDeleteBlock(blockId) {
    setBlocks(prev => (prev ?? []).filter(b => b._id !== blockId))
    if (selectedId === blockId) {
      setSelectedId(null)
      setOriginalBlock(null)
    }
  }

  function handleCopyBlock(blockId) {
    const block = (blocks ?? []).find(b => b._id === blockId)
    if (!block) return
    const copy = {
      ...block,
      _id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      id: undefined,
    }
    const idx = (blocks ?? []).findIndex(b => b._id === blockId)
    setBlocks(prev => {
      const arr = [...(prev ?? [])]
      arr.splice(idx + 1, 0, copy)
      return arr
    })
    setSelectedId(copy._id)
    setOriginalBlock({ ...copy })
  }

  function handleUpdateBlock(updated) {
    setBlocks(prev => (prev ?? []).map(b => b._id === updated._id ? updated : b))
  }

  // Discard: restore original block if one is selected, else navigate back
  function handleDiscard() {
    if (selectedId && originalBlock) {
      handleUpdateBlock(originalBlock)
    } else {
      navigate('/hr/templates')
    }
  }

  // HTML5 drag-and-drop reordering
  function handleDragStart(e, idx) {
    setDragIdx(idx)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e, idx) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  function handleDrop(e, dropIdx) {
    e.preventDefault()
    if (dragIdx === null || dragIdx === dropIdx) return
    setBlocks(prev => {
      const arr = [...(prev ?? [])]
      const [removed] = arr.splice(dragIdx, 1)
      arr.splice(dropIdx, 0, removed)
      return arr
    })
    setDragIdx(null)
  }

  if (isLoading) return <p className="fb-loading">{t('fb.saving')}</p>
  if (isError || !form) return <p className="fb-loading">{t('fb.error.load')}</p>

  const isLocked      = !!form.frozenAt
  const displayBlocks = blocks ?? []
  const selectedBlock = displayBlocks.find(b => b._id === selectedId) ?? null

  return (
    <div className="fb-page">

      {/* Locked banner */}
      {isLocked && (
        <div className="fb-locked-banner">
          <AlertTriangle size={15} strokeWidth={2} />
          {t('fb.locked')}
        </div>
      )}

      {/* 2-column layout */}
      <div className="fb-layout">

        {/* ── Left canvas ──────────────────────────────────────────── */}
        <section className="fb-canvas">
          <div className="fb-canvas__inner">

            {/* Back link */}
            <Link to="/hr/templates" className="fb-canvas__back">
              <ChevronLeft size={13} strokeWidth={2.5} />
              Modèles
            </Link>

            {/* Editorial header */}
            <header className="fb-canvas-header">
              <span className="fb-canvas-header__micro">ARCHITECTURE DE PERFORMANCE</span>
              <input
                className="fb-canvas-header__title"
                type="text"
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                placeholder="Formulaire d'évaluation"
                disabled={isLocked}
                aria-label="Titre du formulaire"
              />
              <p className="fb-canvas-header__sub">
                Structurez les cadres d'évaluation et les boucles de feedback
                pour accompagner la croissance des collaborateurs.
              </p>
            </header>

            {/* Question cards */}
            <div className="fb-canvas-body">
              {displayBlocks.length === 0 && (
                <p className="fb-empty-msg">{t('fb.empty')}</p>
              )}

              {displayBlocks.map((block, idx) => (
                <QuestionCard
                  key={block._id}
                  block={block}
                  index={idx}
                  selected={block._id === selectedId}
                  onSelect={handleSelect}
                  onDelete={handleDeleteBlock}
                  onCopy={handleCopyBlock}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  t={t}
                />
              ))}

              {/* Add question palette */}
              {!isLocked && (
                <div className="fb-add-section">
                  <p className="fb-add-section__label">{t('fb.add_block').toUpperCase()}</p>
                  <div className="fb-add-section__grid">
                    {BLOCK_TYPES.map(({ type, icon: Icon, labelKey }) => (
                      <button
                        key={type}
                        type="button"
                        className="fb-add-section__btn"
                        onClick={() => handleAddBlock(type)}
                      >
                        <Icon size={15} strokeWidth={1.5} />
                        {t(labelKey)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        </section>

        {/* ── Right properties panel ───────────────────────────────── */}
        <PropertiesPanel
          block={isLocked ? null : selectedBlock}
          onChange={handleUpdateBlock}
          onSave={handleSave}
          onDiscard={handleDiscard}
          saveStatus={saveStatus}
          isLocked={isLocked}
          t={t}
        />

      </div>
    </div>
  )
}
