// =============================================================================
// FormBuilder.jsx — Éditeur de formulaire, route /hr/templates/:id/builder
//
// Pas de sidebar ni topbar : pris en charge par AuthedLayout.
// Sections :
//   1. Header (titre éditable + bouton Enregistrer)
//   2. Banner "verrouillé" si frozenAt présent
//   3. Layout : liste des blocs (gauche) + panneau config (droite)
//   4. Palette "Ajouter un bloc" en bas de la liste
// =============================================================================

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, Link }  from 'react-router-dom'
import { useAuth }          from '../../contexts/AuthContext'
import { useTranslate }     from '../../contexts/LocaleContext'
import { t as pageT }       from './i18n'
import {
  ChevronLeft, Save, AlertTriangle, GripVertical, Trash2,
  MessageSquare, Star, ToggleLeft, List, CloudSun, MapPin, Import, Plus,
} from 'lucide-react'
import './formbuilder.css'

// ── Constants ─────────────────────────────────────────────────────────────────

const BLOCK_TYPES = [
  { type: 'text',      icon: MessageSquare, labelKey: 'fb.block.text' },
  { type: 'rating',    icon: Star,          labelKey: 'fb.block.rating' },
  { type: 'yes_no',    icon: ToggleLeft,    labelKey: 'fb.block.yes_no' },
  { type: 'choice',    icon: List,          labelKey: 'fb.block.choice' },
  { type: 'weather',   icon: CloudSun,      labelKey: 'fb.block.weather' },
  { type: 'mobility',  icon: MapPin,        labelKey: 'fb.block.mobility' },
  { type: 'n1_import', icon: Import,        labelKey: 'fb.block.n1_import' },
]

const BLOCK_DESCRIPTIONS = {
  weather:   'Curseur Météo 1-10',
  mobility:  'Demande de mobilité',
  n1_import: 'Import objectifs N-1',
}

function makeBlock(type) {
  return {
    _id:      `block-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    label:    '',
    required: false,
    options:  type === 'choice' ? ['Option 1', 'Option 2'] : undefined,
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function BlockTypeIcon({ type }) {
  const found = BLOCK_TYPES.find(b => b.type === type)
  if (!found) return <MessageSquare size={14} />
  const Icon = found.icon
  return <Icon size={14} />
}

function BlockItem({ block, index, selected, onSelect, onDelete, onDragStart, onDragOver, onDrop, t }) {
  const desc = BLOCK_DESCRIPTIONS[block.type]
  const label = block.label || `(${t(`fb.block.${block.type}`) || block.type})`

  return (
    <div
      className={`fb-block${selected ? ' fb-block--selected' : ''}`}
      draggable
      onClick={() => onSelect(block._id)}
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => { e.preventDefault(); onDragOver(e, index) }}
      onDrop={(e) => onDrop(e, index)}
    >
      <span className="fb-block__drag" aria-hidden="true">
        <GripVertical size={14} />
      </span>
      <span className="fb-block__icon">
        <BlockTypeIcon type={block.type} />
      </span>
      <div className="fb-block__body">
        <p className="fb-block__label">{label}</p>
        <p className="fb-block__type">{desc || t(`fb.block.${block.type}`) || block.type}</p>
      </div>
      <button
        type="button"
        className="fb-block__delete"
        aria-label="Supprimer"
        onClick={(e) => { e.stopPropagation(); onDelete(block._id) }}
      >
        <Trash2 size={13} />
      </button>
    </div>
  )
}

function ConfigPanel({ block, onChange, t }) {
  if (!block) {
    return (
      <div className="fb-config-panel">
        <p className="fb-config-panel__title">{t('fb.config.label').toUpperCase()}</p>
        <p className="fb-config-panel__idle">Sélectionnez un bloc pour le configurer.</p>
      </div>
    )
  }

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

  return (
    <div className="fb-config-panel">
      <p className="fb-config-panel__title">CONFIGURATION</p>

      <div className="fb-field">
        <label className="fb-label">{t('fb.config.label')}</label>
        <textarea
          className="fb-textarea"
          value={block.label}
          placeholder={t('fb.config.label.ph')}
          onChange={e => onChange({ ...block, label: e.target.value })}
        />
      </div>

      <div className="fb-required-row">
        <span className="fb-required-label">{t('fb.config.required')}</span>
        <label className="fb-toggle">
          <input
            type="checkbox"
            checked={block.required}
            onChange={e => onChange({ ...block, required: e.target.checked })}
          />
          <span className="fb-toggle__track" />
          <span className="fb-toggle__thumb" />
        </label>
      </div>

      {block.type === 'choice' && (
        <div className="fb-field">
          <label className="fb-label">{t('fb.config.options')}</label>
          <div className="fb-options">
            {(block.options ?? []).map((opt, i) => (
              <div key={i} className="fb-option-row">
                <input
                  className="fb-option-input"
                  type="text"
                  value={opt}
                  onChange={e => handleOptionChange(i, e.target.value)}
                />
                <button type="button" className="fb-option-del" onClick={() => removeOption(i)}>
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            <button type="button" className="fb-add-option" onClick={addOption}>
              <Plus size={13} /> {t('fb.config.add_option')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function FormBuilder() {
  const { id }   = useParams()
  const { user } = useAuth()
  const t        = useTranslate(pageT)
  const qc       = useQueryClient()

  const [blocks, setBlocks]         = useState(null)
  const [formTitle, setFormTitle]   = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [saveStatus, setSaveStatus] = useState('idle')
  const [dragIdx, setDragIdx]       = useState(null)

  const { data: form, isLoading, isError } = useQuery({
    queryKey: ['hr-form', id],
    queryFn:  () =>
      fetch(`/api/forms/${id}`, { credentials: 'include' }).then(r => r.json()),
    enabled:  !!user && !!id,
    staleTime: 30 * 1000,
    onSuccess: (data) => {
      if (blocks === null) {
        setBlocks(data.questions ?? [])
        setFormTitle(data.title ?? '')
      }
    },
  })

  // Initialise blocks from query data if not yet set
  if (form && blocks === null) {
    setBlocks(form.questions ?? [])
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
    onMutate: () => setSaveStatus('saving'),
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
    saveMutation.mutate({ title: formTitle, questions: blocks ?? [] })
  }, [formTitle, blocks, saveMutation])

  function handleAddBlock(type) {
    const b = makeBlock(type)
    setBlocks(prev => [...(prev ?? []), b])
    setSelectedId(b._id)
  }

  function handleDeleteBlock(blockId) {
    setBlocks(prev => (prev ?? []).filter(b => b._id !== blockId))
    if (selectedId === blockId) setSelectedId(null)
  }

  function handleUpdateBlock(updated) {
    setBlocks(prev => (prev ?? []).map(b => b._id === updated._id ? updated : b))
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

  if (isLoading) return <p className="fb-page" style={{ padding: '2rem' }}>{t('fb.save')}</p>
  if (isError || !form) return <p className="fb-page" style={{ padding: '2rem' }}>{t('fb.error.load')}</p>

  const isLocked     = !!form.frozenAt
  const displayBlocks = blocks ?? []
  const selectedBlock = displayBlocks.find(b => b._id === selectedId) ?? null

  const saveLabel = saveStatus === 'saving' ? t('fb.saving')
    : saveStatus === 'saved' ? t('fb.saved')
    : t('fb.save')

  return (
    <div className="fb-page">

      {/* ── Header ────────────────────────────────────────── */}
      <header className="fb-header">
        <Link to="/hr/templates" className="fb-header__back">
          <ChevronLeft size={14} /> {t('tpl.hero.title') !== 'tpl.hero.title' ? 'Modèles' : 'Templates'}
        </Link>
        <div className="fb-header__title-wrap">
          <input
            className="fb-title-input"
            type="text"
            value={formTitle}
            onChange={e => setFormTitle(e.target.value)}
            disabled={isLocked}
            aria-label="Titre du formulaire"
          />
        </div>
        <div className="fb-header__actions">
          {saveStatus !== 'idle' && (
            <span className="fb-save-status">{saveLabel}</span>
          )}
          <button
            type="button"
            className="fb-save-btn"
            onClick={handleSave}
            disabled={isLocked || saveStatus === 'saving'}
          >
            <Save size={15} /> {t('fb.save')}
          </button>
        </div>
      </header>

      {/* ── Locked banner ─────────────────────────────────── */}
      {isLocked && (
        <div className="fb-locked-banner">
          <AlertTriangle size={16} />
          {t('fb.locked')}
        </div>
      )}

      {/* ── Builder layout ────────────────────────────────── */}
      <div className="fb-layout">

        {/* Left: question list + palette */}
        <div className="fb-list-panel">
          <p className="fb-list-panel__title">BLOCS DU FORMULAIRE</p>

          {displayBlocks.length === 0 ? (
            <p className="fb-empty-msg">{t('fb.empty')}</p>
          ) : (
            displayBlocks.map((block, idx) => (
              <BlockItem
                key={block._id}
                block={block}
                index={idx}
                selected={block._id === selectedId}
                onSelect={setSelectedId}
                onDelete={handleDeleteBlock}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                t={t}
              />
            ))
          )}

          {/* Palette */}
          {!isLocked && (
            <div className="fb-palette">
              <p className="fb-palette__title">{t('fb.add_block').toUpperCase()}</p>
              <div className="fb-palette__grid">
                {BLOCK_TYPES.map(({ type, icon: Icon, labelKey }) => (
                  <button
                    key={type}
                    type="button"
                    className="fb-palette__btn"
                    onClick={() => handleAddBlock(type)}
                  >
                    <Icon size={16} />
                    {t(labelKey)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: config panel */}
        <ConfigPanel
          block={isLocked ? null : selectedBlock}
          onChange={handleUpdateBlock}
          t={t}
        />

      </div>

    </div>
  )
}
