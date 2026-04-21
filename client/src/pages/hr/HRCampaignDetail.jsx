// =============================================================================
// HRCampaignDetail.jsx — Détail d'une campagne, route /hr/campaigns/:id
//
// Pas de sidebar ni topbar : pris en charge par AuthedLayout.
// Sections :
//   1. Hero (nom + badge statut + actions)
//   2. KPI strip (total, complétion, en attente, soumis, validés)
//   3. Barre de progression globale
//   4. Tableau des évaluations
//   5. Modal "Assigner des évaluations"
// =============================================================================

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, Link }  from 'react-router-dom'
import { useAuth }          from '../../contexts/AuthContext'
import { useTranslate }     from '../../contexts/LocaleContext'
import { t as pageT }       from './i18n'
import { ChevronLeft, UserPlus } from 'lucide-react'
import './hr-campaigns.css'

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
  const [showAssign, setShowAssign] = useState(false)

  const { data: campaign, isLoading, isError } = useQuery({
    queryKey: ['hr-campaign', id],
    queryFn:  () =>
      fetch(`/api/campaigns/${id}`, { credentials: 'include' }).then(r => r.json()),
    enabled:   !!user && !!id,
    staleTime: 30 * 1000,
  })

  const patchMutation = useMutation({
    mutationFn: (status) =>
      fetch(`/api/campaigns/${id}`, {
        method:      'PATCH',
        headers:     { 'Content-Type': 'application/json' },
        credentials: 'include',
        body:        JSON.stringify({ status }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hr-campaign', id] }),
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

  if (isLoading) return <p className="cmp-state-msg">{t('cmp.loading')}</p>
  if (isError || !campaign) return <p className="cmp-state-msg">{t('cmp.error.load')}</p>

  const { name, status, stats = {}, evaluations = [] } = campaign
  const { completionRate = 0, total = 0, pending = 0, submitted = 0, validated = 0 } = stats

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

        {evaluations.length === 0 ? (
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
                </tr>
              </thead>
              <tbody>
                {evaluations.map((ev, i) => (
                  <tr key={ev._id ?? i}>
                    <td>{ev.evaluateeName ?? ev.evaluatee?.name ?? '—'}</td>
                    <td>{ev.evaluatorName ?? ev.evaluator?.name ?? '—'}</td>
                    <td>
                      <span className={`cmp-badge ${EVAL_STATUS_CLS[ev.status] ?? 'cmp-badge--draft'}`}>
                        {ev.status}
                      </span>
                    </td>
                    <td>{ev.score != null ? ev.score : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Assign modal ──────────────────────────────────── */}
      {showAssign && (
        <AssignModal
          campaignId={id}
          t={t}
          onClose={() => setShowAssign(false)}
        />
      )}

    </div>
  )
}
