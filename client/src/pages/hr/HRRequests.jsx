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
  AlertCircle, ChevronRight,
} from 'lucide-react'
import './hr-requests.css'

const TABS = ['contested', 'mobility', 'salary']

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
          {ev.contestReason && (
            <div className="hrr-drawer__comment">
              <p className="hrr-drawer__label">Motif de contestation</p>
              <p>{ev.contestReason}</p>
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
  const [actions, setActions] = useState({})

  function doAction(id, action) {
    setActions(prev => ({ ...prev, [id]: action }))
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
              <td className="hrr-comment">{ev.contestReason || '—'}</td>
              <td className="hrr-actions" onClick={e => e.stopPropagation()}>
                <ActionButton
                  label={t('hrr.action.process')}
                  variant="process"
                  onClick={() => doAction(ev._id, 'process')}
                  done={actions[ev._id] === 'process'}
                />
                <ActionButton
                  label={t('hrr.action.ignore')}
                  variant="ignore"
                  onClick={() => doAction(ev._id, 'ignore')}
                  done={actions[ev._id] === 'ignore'}
                />
                <ActionButton
                  label={t('hrr.action.escalate')}
                  variant="escalate"
                  onClick={() => doAction(ev._id, 'escalate')}
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
  const [done, setDone] = useState({})

  const mobilityEvals = evals.filter(ev =>
    ev.answers && JSON.stringify(ev.answers).toLowerCase().includes('mobili')
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
                  onClick={() => setDone(p => ({ ...p, [ev._id]: true }))}
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
  const [done, setDone] = useState({})

  const salaryEvals = evals.filter(ev =>
    ev.answers && JSON.stringify(ev.answers).toLowerCase().includes('augment')
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
                  onClick={() => setDone(p => ({ ...p, [ev._id]: true }))}
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

// ── Composant principal ───────────────────────────────────────────────────────
export default function HRRequests() {
  const { user } = useAuth()
  const { locale } = useLocaleCtx()
  const t = useTranslate(pageT)

  const [activeTab, setActiveTab] = useState('contested')
  const [selectedEval, setSelectedEval] = useState(null)

  const { data: evaluations = [], isLoading } = useQuery({
    queryKey: ['hr-evaluations-all'],
    queryFn: () =>
      fetch('/api/evaluations', { credentials: 'include' })
        .then(r => r.ok ? r.json() : [])
        .then(d => Array.isArray(d) ? d : (d.data || [])),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  })

  const contested = useMemo(() =>
    evaluations.filter(ev => ev.status === 'contested'),
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

  const counts = { contested: contested.length, mobility: mobilityEvals.length, salary: salaryEvals.length }

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
      ) : activeTab === 'contested' ? (
        <ContestationsTab evals={contested} t={t} locale={locale} onSelectEval={setSelectedEval} />
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
