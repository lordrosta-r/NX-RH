// =============================================================================
// HRRequests — Demandes & Contestations (/hr/requests)
//
// Contenu de page uniquement — shell fourni par AuthedLayout.
// 3 onglets : Contestations | Mobilité | Augmentations
// =============================================================================

import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../contexts/AuthContext'
import { useTranslate, useLocaleCtx } from '../../contexts/LocaleContext'
import { t as pageT } from './i18n'
import {
  Inbox, AlertTriangle, ArrowRight, Check, X,
  AlertCircle, ChevronRight, CheckSquare,
} from 'lucide-react'
import { apiFetch } from '../../lib/apiFetch'
import { showToast } from '../../components/ui/Toast'
import './hr-requests.css'

const TABS = ['contested', 'mobility', 'salary', 'all_evals']

function fmtDate(d, locale) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString(
    locale === 'fr' ? 'fr-FR' : 'en-US',
    { day: '2-digit', month: 'short', year: 'numeric' }
  )
}

// ── Drawer évaluation ─────────────────────────────────────────────────────────
function EvalDrawer({ ev, onClose, locale }) {
  if (!ev) return null
  return (
    <>
      <div className="hrr-drawer-backdrop" onClick={onClose} aria-hidden="true" />
      <aside className="hrr-drawer" role="dialog">
        <div className="hrr-drawer__header">
          <p className="hrr-drawer__title">
            {ev.campaignName || ev.campaign?.name || '—'}
          </p>
          <button type="button" className="hrr-drawer__close" onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </button>
        </div>
        <div className="hrr-drawer__body">
          <div className="hrr-drawer__row">
            <span className="hrr-drawer__label">Employé</span>
            <span>{ev.evaluateeName || ev.evaluatee?.name || '—'}</span>
          </div>
          <div className="hrr-drawer__row">
            <span className="hrr-drawer__label">Manager</span>
            <span>{ev.evaluatorName || ev.evaluator?.name || '—'}</span>
          </div>
          <div className="hrr-drawer__row">
            <span className="hrr-drawer__label">Statut</span>
            <span className="hr-badge hr-badge--error">{ev.status}</span>
          </div>
          <div className="hrr-drawer__row">
            <span className="hrr-drawer__label">Date</span>
            <span>{fmtDate(ev.updatedAt || ev.createdAt, locale)}</span>
          </div>
          {(ev.evaluateeComment || ev.contestReason) && (
            <div className="hrr-drawer__comment">
              <p className="hrr-drawer__label">Motif de contestation</p>
              <p>{ev.evaluateeComment || ev.contestReason}</p>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}

// ── Ligne d'action avec feedback optimiste ────────────────────────────────────
function ActionButton({ label, variant, onClick, done }) {
  if (done) return (
    <span className={`hrr-action-done hrr-action-done--${variant}`}>
      <Check size={13} /> {label}
    </span>
  )
  return (
    <button type="button" className={`hrr-btn hrr-btn--${variant}`} onClick={onClick}>
      {label}
    </button>
  )
}

// ── Onglet Contestations ──────────────────────────────────────────────────────
function ContestationsTab({ evals, t, locale, onSelectEval }) {
  const queryClient = useQueryClient()
  const [actions, setActions] = useState({})

  // Statuts depuis lesquels HR peut transitionner vers signed_hr (bypass intentionnel)
  const HR_CAN_SIGN = ['reviewed', 'signed_evaluatee', 'signed_manager']

  const actionMutation = useMutation({
    mutationFn: ({ id, body }) =>
      apiFetch(`/api/evaluations/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      }),
    onSuccess: (_, { id, action }) => {
      setActions(prev => ({ ...prev, [id]: action }))
      queryClient.invalidateQueries({ queryKey: ['hr-evaluations-all'] })
      showToast({ message: 'Action effectuée', type: 'success' })
    },
    onError: (err) => showToast({ message: err.message, type: 'error' }),
  })

  function doAction(ev, action) {
    let body = {}
    if (action === 'process') {
      body = HR_CAN_SIGN.includes(ev.status)
        ? { status: 'signed_hr', reviewerComment: 'Contestation traitée par RH' }
        : { reviewerComment: 'Contestation traitée par RH — signature en attente des étapes précédentes' }
    } else if (action === 'ignore') {
      body = { reviewerComment: 'Contestation archivée sans suite' }
    } else if (action === 'escalate') {
      body = { reviewerComment: 'Contestation escaladée à la direction' }
    }
    actionMutation.mutate({ id: ev._id, body, action })
  }

  if (evals.length === 0) return <p className="hrr-empty">{t('hrr.empty')}</p>

  return (
    <div className="hrr-table-wrap">
      <table className="hrr-table">
        <thead>
          <tr>
            <th>{t('hrr.contested.employee')}</th>
            <th>{t('hrr.contested.manager')}</th>
            <th>{t('hrr.contested.campaign')}</th>
            <th>{t('hrr.contested.date')}</th>
            <th>{t('hrr.contested.comment')}</th>
            <th>{t('hrr.contested.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {evals.map((ev, i) => (
            <tr key={ev._id || i} className="hrr-table__row" onClick={() => onSelectEval(ev)}>
              <td>{ev.evaluateeName || ev.evaluatee?.name || '—'}</td>
              <td>{ev.evaluatorName || ev.evaluator?.name || '—'}</td>
              <td>{ev.campaignName || ev.campaign?.name || '—'}</td>
              <td>{fmtDate(ev.updatedAt || ev.createdAt, locale)}</td>
              <td className="hrr-comment">{ev.evaluateeComment || ev.contestReason || '—'}</td>
              <td className="hrr-actions" onClick={e => e.stopPropagation()}>
                <ActionButton
                  label={t('hrr.action.process')}
                  variant="process"
                  onClick={() => doAction(ev, 'process')}
                  done={actions[ev._id] === 'process'}
                />
                <ActionButton
                  label={t('hrr.action.ignore')}
                  variant="ignore"
                  onClick={() => doAction(ev, 'ignore')}
                  done={actions[ev._id] === 'ignore'}
                />
                <ActionButton
                  label={t('hrr.action.escalate')}
                  variant="escalate"
                  onClick={() => doAction(ev, 'escalate')}
                  done={actions[ev._id] === 'escalate'}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Onglet Mobilité ───────────────────────────────────────────────────────────
function MobilityTab({ evals, t, locale, onSelectEval }) {
  const queryClient = useQueryClient()
  const [done, setDone] = useState({})

  const interviewMutation = useMutation({
    mutationFn: (id) =>
      apiFetch(`/api/evaluations/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ reviewerComment: 'Demande de mobilité prise en compte par RH' }),
      }),
    onSuccess: (_, id) => {
      setDone(p => ({ ...p, [id]: true }))
      queryClient.invalidateQueries({ queryKey: ['hr-evaluations-all'] })
      showToast({ message: 'Demande de mobilité traitée', type: 'success' })
    },
    onError: (err) => showToast({ message: err.message, type: 'error' }),
  })

  const mobilityEvals = evals.filter(ev =>
    ev.answers && JSON.stringify(ev.answers).toLowerCase().match(/mobil|mutation|transfert|détach/)
  )

  if (mobilityEvals.length === 0) return <p className="hrr-empty">{t('hrr.empty')}</p>

  return (
    <div className="hrr-table-wrap">
      <table className="hrr-table">
        <thead>
          <tr>
            <th>{t('hrr.mobility.employee')}</th>
            <th>{t('hrr.mobility.dept')}</th>
            <th>{t('hrr.mobility.type')}</th>
            <th>{t('hrr.mobility.date')}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {mobilityEvals.map((ev, i) => (
            <tr key={ev._id || i} className="hrr-table__row" onClick={() => onSelectEval(ev)}>
              <td>{ev.evaluateeName || ev.evaluatee?.name || '—'}</td>
              <td>{ev.department || ev.evaluateeDepartment || '—'}</td>
              <td>Interne</td>
              <td>{fmtDate(ev.updatedAt || ev.createdAt, locale)}</td>
              <td onClick={e => e.stopPropagation()}>
                <ActionButton
                  label={t('hrr.action.interview')}
                  variant="process"
                  onClick={() => interviewMutation.mutate(ev._id)}
                  done={!!done[ev._id]}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Onglet Augmentations ──────────────────────────────────────────────────────
function SalaryTab({ evals, t, locale, onSelectEval }) {
  const queryClient = useQueryClient()
  const [done, setDone] = useState({})

  const salaryMutation = useMutation({
    mutationFn: (id) =>
      apiFetch(`/api/evaluations/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ reviewerComment: 'Demande de revalorisation prise en compte par RH' }),
      }),
    onSuccess: (_, id) => {
      setDone(p => ({ ...p, [id]: true }))
      queryClient.invalidateQueries({ queryKey: ['hr-evaluations-all'] })
      showToast({ message: 'Demande de revalorisation traitée', type: 'success' })
    },
    onError: (err) => showToast({ message: err.message, type: 'error' }),
  })

  const salaryEvals = evals.filter(ev =>
    ev.answers && JSON.stringify(ev.answers).toLowerCase().match(/augment|salaire|remuner|revaloris|salary/)
  )

  if (salaryEvals.length === 0) return <p className="hrr-empty">{t('hrr.empty')}</p>

  return (
    <div className="hrr-table-wrap">
      <table className="hrr-table">
        <thead>
          <tr>
            <th>{t('hrr.salary.employee')}</th>
            <th>{t('hrr.salary.manager')}</th>
            <th>{t('hrr.salary.performance')}</th>
            <th>{t('hrr.salary.request')}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {salaryEvals.map((ev, i) => (
            <tr key={ev._id || i} className="hrr-table__row" onClick={() => onSelectEval(ev)}>
              <td>{ev.evaluateeName || ev.evaluatee?.name || '—'}</td>
              <td>{ev.evaluatorName || ev.evaluator?.name || '—'}</td>
              <td>—</td>
              <td>—</td>
              <td onClick={e => e.stopPropagation()}>
                <ActionButton
                  label={t('hrr.action.process')}
                  variant="process"
                  onClick={() => salaryMutation.mutate(ev._id)}
                  done={!!done[ev._id]}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Onglet Toutes les évaluations (avec actions en masse) ─────────────────────
const EVAL_STATUSES = [
  'assigned', 'in_progress', 'submitted', 'reviewed',
  'signed_evaluatee', 'signed_manager', 'signed_hr', 'validated',
]

function AllEvalsTab({ evals, t, locale }) {
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState(new Set())
  const [statusFilter, setStatusFilter] = useState('all')
  const [bulkResult, setBulkResult] = useState(null)

  const bulkMutation = useMutation({
    mutationFn: ({ ids, action }) =>
      apiFetch('/api/evaluations/bulk', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ids, action }),
      }),
    onSuccess: (result) => {
      queryClient.invalidateQueries()
      setSelected(new Set())
      setBulkResult(result)
      showToast({ message: 'Action groupée effectuée', type: 'success' })
    },
    onError: (err) => {
      setBulkResult({ error: err.message || t('hrr.bulk.error') })
      showToast({ message: err.message || t('hrr.bulk.error'), type: 'error' })
    },
  })

  const filtered = useMemo(() =>
    statusFilter === 'all' ? evals : evals.filter(ev => ev.status === statusFilter),
    [evals, statusFilter]
  )

  const allSelected = filtered.length > 0 && filtered.every(ev => selected.has(ev._id))

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map(ev => ev._id)))
    }
  }

  function toggleOne(id) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function doBulkAction(action) {
    setBulkResult(null)
    bulkMutation.mutate({ ids: [...selected], action })
  }

  return (
    <div className="hrr-allevs">
      <div className="hrr-allevs__toolbar">
        <select
          className="hrr-filter-status"
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setSelected(new Set()) }}
          aria-label={t('hrr.allevs.filter.status')}
        >
          <option value="all">{t('hrr.allevs.filter.all')}</option>
          {EVAL_STATUSES.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <span className="hrr-allevs__count">
          {filtered.length} {t('hrr.allevs.count')}
        </span>
      </div>

      {selected.size > 0 && (
        <div className="hrr-bulk-bar" role="toolbar" aria-label={t('hrr.bulk.aria')}>
          <span className="hrr-bulk-bar__info">
            <CheckSquare size={15} aria-hidden="true" />
            {selected.size} {t('hrr.bulk.selected')}
          </span>
          <button
            type="button"
            className="hrr-btn hrr-btn--process"
            onClick={() => doBulkAction('sign_hr')}
            disabled={bulkMutation.isPending}
          >
            {t('hrr.bulk.sign_hr')}
          </button>
          <button
            type="button"
            className="hrr-btn hrr-btn--ignore"
            onClick={() => doBulkAction('archive')}
            disabled={bulkMutation.isPending}
          >
            {t('hrr.bulk.archive')}
          </button>
          <button
            type="button"
            className="hrr-btn hrr-btn--escalate"
            onClick={() => setSelected(new Set())}
            disabled={bulkMutation.isPending}
          >
            {t('hrr.bulk.deselect')}
          </button>
        </div>
      )}

      {bulkResult && !bulkResult.error && (
        <div className="hrr-bulk-result hrr-bulk-result--ok" role="status">
          <Check size={14} aria-hidden="true" />
          {bulkResult.success} {t('hrr.bulk.result.ok')} {bulkResult.skipped} {t('hrr.bulk.result.skipped')}
        </div>
      )}
      {bulkResult?.error && (
        <div className="hrr-bulk-result hrr-bulk-result--err" role="alert">
          {bulkResult.error}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="hrr-empty">{t('hrr.empty')}</p>
      ) : (
        <div className="hrr-table-wrap">
          <table className="hrr-table">
            <thead>
              <tr>
                <th className="hrr-th-check">
                  <input
                    type="checkbox"
                    className="hrr-checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label={t('hrr.bulk.select_all')}
                  />
                </th>
                <th>{t('hrr.contested.employee')}</th>
                <th>{t('hrr.contested.manager')}</th>
                <th>{t('hrr.contested.campaign')}</th>
                <th>{t('hrr.allevs.col.status')}</th>
                <th>{t('hrr.contested.date')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ev, i) => (
                <tr
                  key={ev._id || i}
                  className={`hrr-table__row${selected.has(ev._id) ? ' hrr-table__row--selected' : ''}`}
                  onClick={() => toggleOne(ev._id)}
                >
                  <td className="hrr-td-check" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      className="hrr-checkbox"
                      checked={selected.has(ev._id)}
                      onChange={() => toggleOne(ev._id)}
                      aria-label={`${t('hrr.bulk.select_one')} ${ev.evaluateeName || ev.evaluatee?.name || ev._id}`}
                    />
                  </td>
                  <td>{ev.evaluateeName || ev.evaluatee?.name || '—'}</td>
                  <td>{ev.evaluatorName || ev.evaluator?.name || '—'}</td>
                  <td>{ev.campaignName || ev.campaign?.name || '—'}</td>
                  <td>
                    <span className={`hr-badge hr-badge--${ev.status === 'validated' ? 'validated' : ev.status === 'in_progress' ? 'progress' : 'assigned'}`}>
                      {ev.status}
                    </span>
                  </td>
                  <td>{fmtDate(ev.updatedAt || ev.createdAt, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────
export default function HRRequests() {
  const { user } = useAuth()
  const { locale } = useLocaleCtx()
  const t = useTranslate(pageT)

  const [activeTab, setActiveTab] = useState('contested')
  const [selectedEval, setSelectedEval] = useState(null)

  const { data: evaluations = [], isLoading, error } = useQuery({
    queryKey: ['hr-evaluations-all'],
    queryFn: () =>
      apiFetch('/api/evaluations').then(d => Array.isArray(d) ? d : (d.data || [])),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  })

  // disagreementFlag === true est le seul indicateur de contestation dans le backend.
  // Il n'existe pas de status 'contested' dans EVALUATION_STATUSES.
  const contested = useMemo(() =>
    evaluations.filter(ev => ev.disagreementFlag === true),
    [evaluations]
  )
  const mobilityEvals = useMemo(() =>
    evaluations.filter(ev => ev.answers && JSON.stringify(ev.answers).toLowerCase().includes('mobili')),
    [evaluations]
  )
  const salaryEvals = useMemo(() =>
    evaluations.filter(ev => ev.answers && JSON.stringify(ev.answers).toLowerCase().includes('augment')),
    [evaluations]
  )

  const counts = { contested: contested.length, mobility: mobilityEvals.length, salary: salaryEvals.length, all_evals: evaluations.length }

  return (
    <div className="hrr-page">

      {/* ── Hero ──────────────────────────────────────── */}
      <header className="hrr-hero">
        <p className="hrr-hero__eyebrow">{t('hrr.hero.eyebrow')}</p>
        <h1 className="hrr-hero__headline">
          <span className="hrr-hero__accent">{t('hrr.hero.title')}</span>
        </h1>
        <p className="hrr-hero__sub">{t('hrr.hero.sub')}</p>
      </header>

      {/* ── Tabs ───────────────────────────────────────── */}
      <div className="hrr-tabs" role="tablist">
        {TABS.map(tab => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            className={`hrr-tab${activeTab === tab ? ' hrr-tab--active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {t(`hrr.tab.${tab}`)}
            {counts[tab] > 0 && (
              <span className="hrr-tab__badge">{counts[tab]}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Contenu ─────────────────────────────────────── */}
      {isLoading ? (
        <p className="hrr-loading">{t('hrr.loading')}</p>
      ) : error ? (
        <p className="hrr-loading" role="alert" style={{ color: 'var(--color-error)' }}>{error.message}</p>
      ) : activeTab === 'contested' ? (
        <ContestationsTab evals={contested} t={t} locale={locale} onSelectEval={setSelectedEval} />
      ) : activeTab === 'all_evals' ? (
        <AllEvalsTab evals={evaluations} t={t} locale={locale} />
      ) : activeTab === 'mobility' ? (
        <MobilityTab evals={evaluations} t={t} locale={locale} onSelectEval={setSelectedEval} />
      ) : (
        <SalaryTab evals={evaluations} t={t} locale={locale} onSelectEval={setSelectedEval} />
      )}

      {/* ── Drawer ──────────────────────────────────────── */}
      {selectedEval && (
        <EvalDrawer
          ev={selectedEval}
          onClose={() => setSelectedEval(null)}
          locale={locale}
        />
      )}
    </div>
  )
}
