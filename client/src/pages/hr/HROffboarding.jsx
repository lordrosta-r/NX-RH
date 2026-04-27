// =============================================================================
// HROffboarding — Tableau de bord des départs (/hr/offboarding)
//
// KPI tiles + tableau offboarding + drawer checklist interactif.
// =============================================================================

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../contexts/AuthContext'
import { useTranslate, useLocaleCtx } from '../../contexts/LocaleContext'
import { t as pageT } from './i18n'
import { apiFetch } from '../../lib/apiFetch'
import { X, Eye, CheckSquare, Square } from 'lucide-react'
import './hr-offboarding.css'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d, locale) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function userName(user) {
  if (!user) return '—'
  return `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email || '—'
}

// ── Drawer checklist ──────────────────────────────────────────────────────────

function OffboardingDrawer({ request, onClose, t, locale }) {
  const qc = useQueryClient()

  const toggleItem = useMutation({
    mutationFn: ({ id, idx, done }) =>
      apiFetch(`/api/offboarding/${id}/checklist/${idx}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ done }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['offboarding'] }),
  })

  const complete = useMutation({
    mutationFn: (id) =>
      apiFetch(`/api/offboarding/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status: 'completed' }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['offboarding'] })
      onClose()
    },
  })

  if (!request) return null

  const allDone = request.checklist?.every(c => c.done)

  return (
    <>
      <div className="hrob-backdrop" onClick={onClose} aria-hidden="true" />
      <aside className="hrob-drawer" role="dialog" aria-label={userName(request.userId)}>
        <div className="hrob-drawer__header">
          <div>
            <p className="hrob-drawer__name">{userName(request.userId)}</p>
            <p className="hrob-drawer__meta">
              {t(`hrob.reason.${request.reason}`)} — {fmtDate(request.lastDay, locale)}
            </p>
          </div>
          <button
            type="button"
            className="hrob-drawer__close"
            onClick={onClose}
            aria-label={t('hrob.drawer.close')}
          >
            <X size={18} />
          </button>
        </div>

        <div className="hrob-drawer__body">
          <p className="hrob-drawer__section-title">{t('hrob.drawer.checklist')}</p>
          <ul className="hrob-checklist">
            {(request.checklist ?? []).map((item, idx) => (
              <li key={idx} className="hrob-checklist__item">
                <button
                  type="button"
                  className={`hrob-checklist__check${item.done ? ' hrob-checklist__check--done' : ''}`}
                  onClick={() => toggleItem.mutate({ id: request._id, idx, done: !item.done })}
                  disabled={toggleItem.isPending || request.status === 'completed'}
                  aria-pressed={item.done}
                >
                  {item.done
                    ? <CheckSquare size={18} />
                    : <Square size={18} />
                  }
                  <span>{item.item}</span>
                </button>
              </li>
            ))}
          </ul>

          {request.notes && (
            <div className="hrob-drawer__notes">
              <p className="hrob-drawer__section-title">{t('hrob.drawer.notes')}</p>
              <p className="hrob-drawer__notes-text">{request.notes}</p>
            </div>
          )}

          {request.status !== 'completed' && (
            <button
              type="button"
              className="hrob-drawer__complete-btn"
              onClick={() => complete.mutate(request._id)}
              disabled={complete.isPending || !allDone}
            >
              {complete.isPending ? '…' : t('hrob.drawer.complete')}
            </button>
          )}

          {request.status === 'completed' && (
            <p className="hrob-drawer__completed-msg">✓ {t('hrob.status.completed')}</p>
          )}
        </div>
      </aside>
    </>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function HROffboarding() {
  const { user }    = useAuth()
  const { locale }  = useLocaleCtx()
  const t           = useTranslate(pageT)
  const [selected, setSelected] = useState(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['offboarding'],
    queryFn:  () => apiFetch('/api/offboarding'),
    enabled:  !!user,
    staleTime: 30 * 1000,
  })

  const requests = data?.data ?? []
  const total    = data?.total ?? 0

  const kpi = {
    pending:     requests.filter(r => r.status === 'pending').length,
    in_progress: requests.filter(r => r.status === 'in_progress').length,
    completed:   requests.filter(r => r.status === 'completed').length,
  }

  return (
    <div className="hrob-page">

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <header className="hrob-hero">
        <p className="hrob-hero__eyebrow">{t('hrob.hero.eyebrow')}</p>
        <h1 className="hrob-hero__headline">{t('hrob.hero.title')}</h1>
        <p className="hrob-hero__sub">{t('hrob.hero.sub')}</p>
      </header>

      {/* ── KPI tiles ───────────────────────────────────────────────────── */}
      <div className="hrob-kpis">
        <div className="hrob-kpi hrob-kpi--pending">
          <span className="hrob-kpi__value">{kpi.pending}</span>
          <span className="hrob-kpi__label">{t('hrob.kpi.pending')}</span>
        </div>
        <div className="hrob-kpi hrob-kpi--progress">
          <span className="hrob-kpi__value">{kpi.in_progress}</span>
          <span className="hrob-kpi__label">{t('hrob.kpi.in_progress')}</span>
        </div>
        <div className="hrob-kpi hrob-kpi--completed">
          <span className="hrob-kpi__value">{kpi.completed}</span>
          <span className="hrob-kpi__label">{t('hrob.kpi.completed')}</span>
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      {isLoading ? (
        <p className="hrob-status">{t('hrob.loading')}</p>
      ) : error ? (
        <p className="hrob-status hrob-status--error">{t('hrob.error')}</p>
      ) : requests.length === 0 ? (
        <p className="hrob-status">{t('hrob.empty')}</p>
      ) : (
        <div className="hrob-table-wrap">
          <table className="hrob-table">
            <thead>
              <tr>
                <th>{t('hrob.table.employee')}</th>
                <th>{t('hrob.table.reason')}</th>
                <th>{t('hrob.table.lastday')}</th>
                <th>{t('hrob.table.status')}</th>
                <th>{t('hrob.table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(r => (
                <tr key={r._id}>
                  <td className="hrob-table__employee">
                    {userName(r.userId)}
                    {r.userId?.department && (
                      <span className="hrob-table__dept">{r.userId.department}</span>
                    )}
                  </td>
                  <td>{t(`hrob.reason.${r.reason}`)}</td>
                  <td>{fmtDate(r.lastDay, locale)}</td>
                  <td>
                    <span className={`hrob-badge hrob-badge--${r.status}`}>
                      {t(`hrob.status.${r.status}`)}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="hrob-btn-view"
                      onClick={() => setSelected(r)}
                    >
                      <Eye size={14} />
                      {t('hrob.action.view')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Drawer ──────────────────────────────────────────────────────── */}
      {selected && (
        <OffboardingDrawer
          request={selected}
          onClose={() => setSelected(null)}
          t={t}
          locale={locale}
        />
      )}
    </div>
  )
}
