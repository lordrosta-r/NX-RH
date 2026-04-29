// =============================================================================
// HRCampaignDetail.jsx — Détail d'une campagne, route /hr/campaigns/:id
//
// Pas de sidebar ni topbar : pris en charge par AuthedLayout.
// Sections :
//   1. Hero (nom + badge statut + actions : modifier, supprimer, transitions)
//   2. KPI strip (total, complétion, en attente, soumis, validés)
//   3. Barre de progression globale
//   4. Tableau des évaluations
//   5. Modal "Assigner des évaluations"
//   6. Modal "Modifier la campagne"
//   7. Modal "Confirmer la suppression"
// =============================================================================

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth }          from '../../contexts/AuthContext'
import { useTranslate }     from '../../contexts/LocaleContext'
import { t as pageT }       from './i18n'
import { ChevronLeft, UserPlus, Edit2, Trash2, ArrowLeftRight, X } from 'lucide-react'
import { Skeleton, SkeletonStat, SkeletonTable } from '../../components/ui/Skeleton'
import { apiFetch }         from '../../lib/apiFetch'
import { showToast }        from '../../components/ui/Toast'
import './hr-campaigns.css'

// ── Constants ─────────────────────────────────────────────────────────────────

const DEPARTMENTS = [
  'Engineering', 'Product', 'Design', 'Data', 'Security', 'Infrastructure',
  'Finance', 'Legal', 'HR', 'Sales', 'Marketing', 'Customer Success',
  'Operations', 'Executive',
]

// ── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CLS = {
  draft:    'cmp-badge--draft',
  active:   'cmp-badge--active',
  closed:   'cmp-badge--closed',
  archived: 'cmp-badge--archived',
}

const EVAL_STATUS_CLS = {
  assigned:    'cmp-badge--draft',
  in_progress: 'cmp-badge--active',
  submitted:   'cmp-badge--closed',
  reviewed:    'cmp-badge--closed',
  validated:   'cmp-badge--active',
}

function toInputDate(d) {
  if (!d) return ''
  return new Date(d).toISOString().slice(0, 10)
}

// ── EditModal ─────────────────────────────────────────────────────────────────

function EditModal({ campaignId, initialData, t, onClose }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    name:              initialData.name || '',
    description:       initialData.description || '',
    startDate:         toInputDate(initialData.startDate),
    endDate:           toInputDate(initialData.endDate),
    targetDepartments: initialData.targetDepartments || [],
    deadlineEmployee:  toInputDate(initialData.deadlineEmployee),
    deadlineManager:   toInputDate(initialData.deadlineManager),
  })
  const [error, setError] = useState(null)

  const updateMutation = useMutation({
    mutationFn: (data) =>
      fetch(`/api/campaigns/${campaignId}`, {
        method:      'PATCH',
        headers:     { 'Content-Type': 'application/json' },
        credentials: 'include',
        body:        JSON.stringify(data),
      }).then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e))),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr-campaign', campaignId] })
      qc.invalidateQueries({ queryKey: ['hr-campaigns-list'] })
      onClose()
    },
    onError: (e) => setError(e.error || t('cmp.detail.edit.error')),
  })

  function toggleDept(dept) {
    setForm(f => ({
      ...f,
      targetDepartments: f.targetDepartments.includes(dept)
        ? f.targetDepartments.filter(d => d !== dept)
        : [...f.targetDepartments, dept],
    }))
  }

  function handleSubmit() {
    if (form.endDate && form.startDate && new Date(form.endDate) < new Date(form.startDate)) {
      setError(t('cmp.detail.edit.date_error'))
      return
    }
    setError(null)
    updateMutation.mutate({
      name:              form.name.trim(),
      description:       form.description,
      startDate:         form.startDate,
      endDate:           form.endDate,
      targetDepartments: form.targetDepartments,
      deadlineEmployee:  form.deadlineEmployee || null,
      deadlineManager:   form.deadlineManager  || null,
    })
  }

  return (
    <div className="cmp-modal-backdrop" role="dialog" aria-modal="true">
      <div className="cmp-modal cmp-modal--wide">
        <h2 className="cmp-modal__title">{t('cmp.detail.edit.title')}</h2>

        {error && <p className="cmp-error-msg">{error}</p>}

        <div className="cmp-field">
          <label className="cmp-label">{t('cmp.detail.edit.name')} *</label>
          <input
            className="cmp-input"
            type="text"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          />
        </div>

        <div className="cmp-field">
          <label className="cmp-label">{t('cmp.detail.edit.desc')}</label>
          <textarea
            className="cmp-textarea"
            value={form.description}
            rows={3}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          />
        </div>

        <div className="cmp-field-row">
          <div className="cmp-field">
            <label className="cmp-label">{t('cmp.detail.edit.startDate')}</label>
            <input
              className="cmp-input"
              type="date"
              value={form.startDate}
              onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
            />
          </div>
          <div className="cmp-field">
            <label className="cmp-label">{t('cmp.detail.edit.endDate')}</label>
            <input
              className="cmp-input"
              type="date"
              value={form.endDate}
              onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
            />
          </div>
        </div>

        <div className="cmp-field">
          <label className="cmp-label">{t('cmp.detail.edit.depts')}</label>
          <div className="cmp-dept-list">
            {DEPARTMENTS.map(dept => (
              <button
                key={dept}
                type="button"
                className={`cmp-dept-chip${form.targetDepartments.includes(dept) ? ' cmp-dept-chip--selected' : ''}`}
                onClick={() => toggleDept(dept)}
              >
                {dept}
              </button>
            ))}
          </div>
        </div>

        <div className="cmp-field-row">
          <div className="cmp-field">
            <label className="cmp-label">{t('cmp.detail.edit.deadline_emp')}</label>
            <input
              className="cmp-input"
              type="date"
              value={form.deadlineEmployee}
              onChange={e => setForm(f => ({ ...f, deadlineEmployee: e.target.value }))}
            />
          </div>
          <div className="cmp-field">
            <label className="cmp-label">{t('cmp.detail.edit.deadline_mgr')}</label>
            <input
              className="cmp-input"
              type="date"
              value={form.deadlineManager}
              onChange={e => setForm(f => ({ ...f, deadlineManager: e.target.value }))}
            />
          </div>
        </div>

        <div className="cmp-modal__actions">
          <button
            type="button"
            className="cmp-btn"
            onClick={onClose}
            disabled={updateMutation.isPending}
          >
            {t('cmp.detail.edit.cancel')}
          </button>
          <button
            type="button"
            className="cmp-btn cmp-btn--primary"
            onClick={handleSubmit}
            disabled={!form.name.trim() || updateMutation.isPending}
          >
            {t('cmp.detail.edit.save')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── DeleteConfirmModal ────────────────────────────────────────────────────────

function DeleteConfirmModal({ campaignId, t, onClose }) {
  const navigate = useNavigate()
  const qc       = useQueryClient()
  const [error, setError] = useState(null)

  const deleteMutation = useMutation({
    mutationFn: () =>
      fetch(`/api/campaigns/${campaignId}`, {
        method:      'DELETE',
        credentials: 'include',
      }).then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e))),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr-campaigns-list'] })
      navigate('/hr/campaigns')
    },
    onError: (e) => setError(e.error || t('cmp.detail.delete.error')),
  })

  return (
    <div className="cmp-modal-backdrop" role="dialog" aria-modal="true">
      <div className="cmp-modal">
        <h2 className="cmp-modal__title">{t('cmp.detail.delete.title')}</h2>
        <p className="cmp-modal__body">{t('cmp.confirm.delete')}</p>
        {error && <p className="cmp-error-msg">{error}</p>}
        <div className="cmp-modal__actions">
          <button
            type="button"
            className="cmp-btn"
            onClick={onClose}
            disabled={deleteMutation.isPending}
          >
            {t('cmp.detail.edit.cancel')}
          </button>
          <button
            type="button"
            className="cmp-btn cmp-btn--danger"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
          >
            <Trash2 size={13} /> {t('cmp.detail.delete.confirm_btn')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── CmpReassignModal ──────────────────────────────────────────────────────────

function CmpReassignModal({ evaluation, campaignId, onClose }) {
  const qc = useQueryClient()
  const [newEvaluatorId, setNewEvaluatorId] = useState('')
  const [reason, setReason]                 = useState('')

  const TERMINAL = ['signed_hr', 'validated']
  const isTerminal = TERMINAL.includes(evaluation.status)

  const currentEvaluatorId =
    evaluation.evaluatorId?._id?.toString() ||
    evaluation.evaluatorId?.toString() || ''

  const currentEvaluatorName =
    evaluation.evaluatorId?.firstName
      ? `${evaluation.evaluatorId.firstName} ${evaluation.evaluatorId.lastName}`
      : '—'

  const employeeName = evaluation.evaluateeId?.firstName
    ? `${evaluation.evaluateeId.firstName} ${evaluation.evaluateeId.lastName}`
    : '—'

  const { data: managers = [] } = useQuery({
    queryKey: ['managers-list'],
    queryFn: () =>
      apiFetch('/api/users?role=manager&isActive=true')
        .then(d => Array.isArray(d) ? d : (d.data || [])),
    enabled: !isTerminal,
    staleTime: 60 * 1000,
  })

  const reassignMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/evaluations/${evaluation._id}/reassign`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          newEvaluatorId,
          reason: reason.trim() || undefined,
        }),
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['hr-campaign-evals', campaignId] })
      showToast({ message: `Évaluation réaffectée à ${data.evaluatorName}`, type: 'success' })
      onClose()
    },
    onError: (err) => showToast({ message: err.message, type: 'error' }),
  })

  return (
    <div className="cmp-modal-backdrop" role="dialog" aria-modal="true">
      <div className="cmp-modal">

        <div className="cmp-reassign-modal__header">
          <h2 className="cmp-modal__title">Réaffecter l'évaluation de {employeeName}</h2>
          <button
            type="button"
            className="cmp-btn cmp-btn--ghost cmp-reassign-modal__close"
            onClick={onClose}
            aria-label="Fermer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="cmp-reassign-modal__info">
          <div className="cmp-reassign-modal__info-row">
            <span className="cmp-label cmp-reassign-modal__info-label">Évaluateur actuel</span>
            <span>{currentEvaluatorName}</span>
          </div>
          <div className="cmp-reassign-modal__info-row">
            <span className="cmp-label cmp-reassign-modal__info-label">Statut</span>
            <span className={`cmp-badge ${EVAL_STATUS_CLS[evaluation.status] ?? 'cmp-badge--draft'}`}>
              {evaluation.status}
            </span>
          </div>
        </div>

        {isTerminal ? (
          <p className="cmp-reassign-modal__blocked">
            Non autorisé — statut terminal ({evaluation.status})
          </p>
        ) : (
          <>
            <div className="cmp-field">
              <label className="cmp-label">Nouveau manager</label>
              <select
                className="cmp-input cmp-reassign-modal__select"
                value={newEvaluatorId}
                onChange={e => setNewEvaluatorId(e.target.value)}
              >
                <option value="">— Sélectionner un manager —</option>
                {managers.map(m => (
                  <option key={m._id} value={m._id}>
                    {m.firstName} {m.lastName}{m.department ? ` (${m.department})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="cmp-field">
              <label className="cmp-label">Raison (optionnelle)</label>
              <textarea
                className="cmp-textarea"
                value={reason}
                rows={3}
                placeholder="Ex : départ du manager, erreur d'affectation…"
                onChange={e => setReason(e.target.value)}
                maxLength={500}
              />
            </div>
          </>
        )}

        <div className="cmp-modal__actions">
          <button type="button" className="cmp-btn" onClick={onClose}>
            Annuler
          </button>
          {!isTerminal && (
            <button
              type="button"
              className="cmp-btn cmp-btn--primary"
              disabled={
                !newEvaluatorId ||
                newEvaluatorId === currentEvaluatorId ||
                reassignMutation.isPending
              }
              onClick={() => reassignMutation.mutate()}
            >
              {reassignMutation.isPending ? 'En cours…' : 'Réaffecter'}
            </button>
          )}
        </div>

      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function AssignModal({ campaignId, t, onClose }) {
  const qc = useQueryClient()
  const [formId, setFormId]         = useState('')
  const [evaluateeIds, setEvaluateeIds] = useState([])

  const { data: forms = [] } = useQuery({
    queryKey: ['hr-forms'],
    queryFn:  () =>
      fetch('/api/forms', { credentials: 'include' })
        .then(r => r.ok ? r.json() : { data: [] })
        .then(d => Array.isArray(d) ? d : (d.data || [])),
    staleTime: 60 * 1000,
  })

  const { data: users = [] } = useQuery({
    queryKey: ['hr-users-active'],
    queryFn:  () =>
      fetch('/api/users?isActive=true', { credentials: 'include' })
        .then(r => r.ok ? r.json() : { data: [] })
        .then(d => Array.isArray(d) ? d : (d.data || [])),
    staleTime: 60 * 1000,
  })

  const assignMutation = useMutation({
    mutationFn: (evaluations) =>
      fetch('/api/evaluations/bulk', {
        method:      'POST',
        headers:     { 'Content-Type': 'application/json' },
        credentials: 'include',
        body:        JSON.stringify({ evaluations }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr-campaign', campaignId] })
      onClose()
    },
  })

  function handleToggleUser(id) {
    setEvaluateeIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  function handleSubmit() {
    if (!formId || evaluateeIds.length === 0) return
    const evaluations = evaluateeIds.map(evaluateeId => ({
      campaignId,
      formId,
      evaluateeId,
      evaluatorId: evaluateeId, // self-assign as fallback
    }))
    assignMutation.mutate(evaluations)
  }

  return (
    <div className="cmp-modal-backdrop" role="dialog" aria-modal="true">
      <div className="cmp-modal">
        <h2 className="cmp-modal__title">{t('cmp.detail.assign')}</h2>

        <div>
          <label className="cmp-label" style={{ display: 'block', marginBottom: '0.375rem' }}>
            {t('cmp.detail.assign.form')}
          </label>
          <select
            className="cmp-input"
            value={formId}
            onChange={e => setFormId(e.target.value)}
            style={{ width: '100%' }}
          >
            <option value="">—</option>
            {forms.map(f => (
              <option key={f._id} value={f._id}>{f.title}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="cmp-label" style={{ display: 'block', marginBottom: '0.5rem' }}>
            {t('cmp.detail.assign.evaluatees')}
          </label>
          <div style={{ maxHeight: '12rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            {users.map(u => (
              <label key={u._id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={evaluateeIds.includes(u._id)}
                  onChange={() => handleToggleUser(u._id)}
                />
                {u.name || u.email}
              </label>
            ))}
          </div>
        </div>

        <div className="cmp-modal__actions">
          <button type="button" className="cmp-btn" onClick={onClose}>
            {t('cmp.detail.assign.cancel')}
          </button>
          <button
            type="button"
            className="cmp-btn cmp-btn--primary"
            onClick={handleSubmit}
            disabled={!formId || evaluateeIds.length === 0 || assignMutation.isPending}
          >
            {t('cmp.detail.assign.save')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function HRCampaignDetail() {
  const { id }   = useParams()
  const { user } = useAuth()
  const t        = useTranslate(pageT)
  const qc       = useQueryClient()
  const [showAssign, setShowAssign]               = useState(false)
  const [showEdit, setShowEdit]                   = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [reassignTarget, setReassignTarget]       = useState(null)

  const { data: campaign, isLoading, isError } = useQuery({
    queryKey: ['hr-campaign', id],
    queryFn:  () =>
      fetch(`/api/campaigns/${id}`, { credentials: 'include' }).then(r => r.json()),
    enabled:   !!user && !!id,
    staleTime: 30 * 1000,
  })

  const { data: campaignEvals = [] } = useQuery({
    queryKey: ['hr-campaign-evals', id],
    queryFn:  () =>
      apiFetch(`/api/evaluations?campaignId=${id}`)
        .then(d => Array.isArray(d) ? d : (d.data || [])),
    enabled: !!user && !!id,
    staleTime: 30 * 1000,
  })

  const patchMutation = useMutation({
    mutationFn: (status) =>
      fetch(`/api/campaigns/${id}`, {
        method:      'PATCH',
        headers:     { 'Content-Type': 'application/json' },
        credentials: 'include',
        body:        JSON.stringify({ status }),
      }).then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(new Error(e.error || 'Erreur serveur')))),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hr-campaign', id] }),
    onError: (err) => showToast({ message: err.message, type: 'error' }),
  })

  function handleStatusChange(action) {
    const confirmMsg = {
      activate: t('cmp.confirm.activate'),
      close:    t('cmp.confirm.close'),
      archive:  t('cmp.confirm.archive'),
    }[action]
    if (!window.confirm(confirmMsg)) return
    const statusMap = { activate: 'active', close: 'closed', archive: 'archived' }
    patchMutation.mutate(statusMap[action])
  }

  if (isLoading) return (
    <div className="cmp-det">
      <div className="sk-hero">
        <Skeleton className="sk-hero__eyebrow" />
        <Skeleton className="sk-hero__title" />
      </div>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {Array.from({ length: 5 }, (_, i) => <SkeletonStat key={i} />)}
      </div>
      <SkeletonTable rows={5} cols={5} />
    </div>
  )
  if (isError || !campaign) return <p className="cmp-state-msg">{t('cmp.error.load')}</p>

  const { name, status, stats = {} } = campaign
  const { total = 0, started = 0, submitted = 0, validated = 0 } = stats
  const completionRate = total > 0 ? Math.round(started / total * 100) : 0
  const pending = total - started

  const canDelete = status === 'draft' || status === 'archived'

  return (
    <div className="cmp-det">

      {/* ── Back link ─────────────────────────────────────── */}
      <Link to="/hr/campaigns" className="cmp-det__back">
        <ChevronLeft size={14} /> Campagnes
      </Link>

      {/* ── Hero ──────────────────────────────────────────── */}
      <header className="cmp-hero">
        <p className="cmp-hero__eyebrow">{t('cmp.hero.eyebrow')}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', flexWrap: 'wrap' }}>
          <h1 className="cmp-hero__headline" style={{ margin: 0 }}>{name}</h1>
          <span className={`cmp-badge ${STATUS_CLS[status] ?? 'cmp-badge--draft'}`}>
            {t(`cmp.status.${status}`) || status}
          </span>
          {status === 'draft' && (
            <button type="button" className="cmp-btn cmp-btn--primary" onClick={() => handleStatusChange('activate')}>
              {t('cmp.card.activate')}
            </button>
          )}
          {status === 'active' && (
            <button type="button" className="cmp-btn" onClick={() => handleStatusChange('close')}>
              {t('cmp.card.close')}
            </button>
          )}
          {status === 'closed' && (
            <button type="button" className="cmp-btn" onClick={() => handleStatusChange('archive')}>
              {t('cmp.card.archive')}
            </button>
          )}
          <button type="button" className="cmp-btn cmp-btn--ghost" onClick={() => setShowEdit(true)}>
            <Edit2 size={13} /> {t('cmp.detail.edit')}
          </button>
          {canDelete && (
            <button type="button" className="cmp-btn cmp-btn--danger" onClick={() => setShowDeleteConfirm(true)}>
              <Trash2 size={13} /> {t('cmp.detail.delete')}
            </button>
          )}
        </div>
      </header>

      {/* ── KPI strip ─────────────────────────────────────── */}
      <div className="cmp-det__kpis">
        <div className="cmp-det__kpi">
          <p className="cmp-det__kpi-val">{total}</p>
          <p className="cmp-det__kpi-label">{t('cmp.detail.kpi.total')}</p>
        </div>
        <div className="cmp-det__kpi">
          <p className="cmp-det__kpi-val">{completionRate}%</p>
          <p className="cmp-det__kpi-label">{t('cmp.detail.kpi.completion')}</p>
        </div>
        <div className="cmp-det__kpi">
          <p className="cmp-det__kpi-val">{pending}</p>
          <p className="cmp-det__kpi-label">{t('cmp.detail.kpi.pending')}</p>
        </div>
        <div className="cmp-det__kpi">
          <p className="cmp-det__kpi-val">{submitted}</p>
          <p className="cmp-det__kpi-label">{t('cmp.detail.kpi.submitted')}</p>
        </div>
        <div className="cmp-det__kpi">
          <p className="cmp-det__kpi-val">{validated}</p>
          <p className="cmp-det__kpi-label">{t('cmp.detail.kpi.validated')}</p>
        </div>
      </div>

      {/* ── Global progress ───────────────────────────────── */}
      <div className="cmp-det__progress">
        <div className="cmp-det__progress-label">
          <span>{t('cmp.detail.kpi.completion')}</span>
          <span>{completionRate}%</span>
        </div>
        <div className="cmp-det__progress-track">
          <div className="cmp-det__progress-fill" style={{ width: `${completionRate}%` }} />
        </div>
      </div>

      {/* ── Evaluations table ─────────────────────────────── */}
      <section className="cmp-det__section">
        <div className="cmp-det__section-head">
          <h2 className="cmp-det__section-title">ÉVALUATIONS</h2>
          <button
            type="button"
            className="cmp-btn cmp-btn--primary"
            onClick={() => setShowAssign(true)}
          >
            <UserPlus size={13} /> {t('cmp.detail.assign')}
          </button>
        </div>

        {campaignEvals.length === 0 ? (
          <p className="cmp-state-msg">{t('cmp.detail.empty')}</p>
        ) : (
          <div className="cmp-det__table-wrap">
            <table className="cmp-det__table">
              <thead>
                <tr>
                  <th>{t('cmp.detail.table.evaluatee')}</th>
                  <th>{t('cmp.detail.table.evaluator')}</th>
                  <th>{t('cmp.detail.table.status')}</th>
                  <th>{t('cmp.detail.table.score')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {campaignEvals.map((ev, i) => {
                  const evaluatorName = ev.evaluatorId?.firstName
                    ? `${ev.evaluatorId.firstName} ${ev.evaluatorId.lastName}`
                    : (ev.evaluatorName ?? '—')
                  const evaluateeName = ev.evaluateeId?.firstName
                    ? `${ev.evaluateeId.firstName} ${ev.evaluateeId.lastName}`
                    : (ev.evaluateeName ?? '—')
                  return (
                    <tr key={ev._id ?? i}>
                      <td>{evaluateeName}</td>
                      <td>{evaluatorName}</td>
                      <td>
                        <span className={`cmp-badge ${EVAL_STATUS_CLS[ev.status] ?? 'cmp-badge--draft'}`}>
                          {ev.status}
                        </span>
                      </td>
                      <td>{ev.score != null ? ev.score : '—'}</td>
                      <td>
                        <button
                          type="button"
                          className="cmp-reassign-btn"
                          onClick={() => setReassignTarget(ev)}
                          title="Réaffecter l'évaluateur"
                          aria-label="Réaffecter l'évaluateur"
                        >
                          <ArrowLeftRight size={16} strokeWidth={1.5} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Edit modal ────────────────────────────────────── */}
      {showEdit && (
        <EditModal
          campaignId={id}
          initialData={campaign}
          t={t}
          onClose={() => setShowEdit(false)}
        />
      )}

      {/* ── Delete confirm modal ───────────────────────────── */}
      {showDeleteConfirm && (
        <DeleteConfirmModal
          campaignId={id}
          t={t}
          onClose={() => setShowDeleteConfirm(false)}
        />
      )}

      {/* ── Assign modal ──────────────────────────────────── */}
      {showAssign && (
        <AssignModal
          campaignId={id}
          t={t}
          onClose={() => setShowAssign(false)}
        />
      )}

      {/* ── Reassign evaluator modal ───────────────────────── */}
      {reassignTarget && (
        <CmpReassignModal
          evaluation={reassignTarget}
          campaignId={id}
          onClose={() => setReassignTarget(null)}
        />
      )}

    </div>
  )
}
