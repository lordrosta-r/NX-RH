// =============================================================================
// AdminAudit.jsx — Piste d'audit, route /admin/audit
// Accessible aux rôles : admin | hr
// =============================================================================

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLocale } from '../../hooks/useLocale'
import { t as pageT } from './i18n'
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react'
import './admin.css'
import './admin-audit.css'

const ACTION_TYPES = [
  'status_change',
  'evaluation_update',
  'campaign_create',
  'campaign_activate',
  'campaign_update',
  'campaign_delete',
  'bulk_action',
]

const TARGET_TYPES = ['Evaluation', 'Campaign', 'User']

const PAGE_SIZE = 20

function buildUrl(filters, page) {
  const params = new URLSearchParams()
  params.set('page', page)
  params.set('limit', PAGE_SIZE)
  if (filters.action)     params.set('action',     filters.action)
  if (filters.targetType) params.set('targetType', filters.targetType)
  if (filters.from)       params.set('from',       filters.from)
  if (filters.to)         params.set('to',         filters.to)
  return `/api/admin/audit?${params}`
}

function ActionBadge({ action, label }) {
  const cls = ACTION_TYPES.includes(action)
    ? `audit-badge audit-badge--${action}`
    : 'audit-badge audit-badge--default'
  return <span className={cls}>{label}</span>
}

function MetaDetail({ action, meta }) {
  if (!meta) return <span className="audit-meta">—</span>

  if (action === 'status_change') {
    return (
      <span className="audit-meta audit-meta__arrow">
        <span className="audit-meta__from">{meta.from ?? '?'}</span>
        <ArrowRight size={12} strokeWidth={2} aria-hidden="true" />
        <span className="audit-meta__to">{meta.to ?? '?'}</span>
      </span>
    )
  }

  if (action === 'campaign_activate' || action === 'campaign_update') {
    return (
      <span className="audit-meta audit-meta__arrow">
        <span className="audit-meta__from">{meta.from ?? '?'}</span>
        <ArrowRight size={12} strokeWidth={2} aria-hidden="true" />
        <span className="audit-meta__to">{meta.to ?? '?'}</span>
      </span>
    )
  }

  if (action === 'bulk_action') {
    return (
      <span className="audit-meta">
        {meta.action} — {meta.success}/{meta.count}
      </span>
    )
  }

  if (action === 'campaign_create' || action === 'campaign_delete') {
    return <span className="audit-meta">{meta.name ?? '—'}</span>
  }

  if (action === 'evaluation_update' && Array.isArray(meta.fields) && meta.fields.length) {
    return <span className="audit-meta">{meta.fields.join(', ')}</span>
  }

  return <span className="audit-meta">—</span>
}

export default function AdminAudit() {
  const { t } = useLocale(pageT)

  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({
    action:     '',
    targetType: '',
    from:       '',
    to:         '',
  })
  const [draftFilters, setDraftFilters] = useState(filters)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-audit', filters, page],
    queryFn: () =>
      fetch(buildUrl(filters, page), { credentials: 'include' })
        .then(r => { if (!r.ok) throw new Error('fetch_failed'); return r.json() }),
    placeholderData: (prev) => prev,
  })

  const total   = data?.total ?? 0
  const entries = data?.data  ?? []
  const from    = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const to      = Math.min(page * PAGE_SIZE, total)
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE))

  function applyFilters() {
    setFilters({ ...draftFilters })
    setPage(1)
  }

  function resetFilters() {
    const empty = { action: '', targetType: '', from: '', to: '' }
    setDraftFilters(empty)
    setFilters(empty)
    setPage(1)
  }

  return (
    <div className="adm">
      <header className="adm-hero">
        <p className="adm-hero__eyebrow">{t('admin.audit.hero.eyebrow')}</p>
        <h1 className="adm-hero__title">
          <span className="adm-hero__accent">{t('admin.audit.hero.title')}</span>
        </h1>
        <p className="adm-hero__sub">{t('admin.audit.hero.sub')}</p>
      </header>

      <section className="adm-card">
        {/* ── Filtres ──────────────────────────────────────────────────────── */}
        <div className="audit-filters">
          <div className="audit-filter-group">
            <label className="audit-filter-label">{t('admin.audit.filter.action')}</label>
            <select
              className="adm-select"
              value={draftFilters.action}
              onChange={e => setDraftFilters(f => ({ ...f, action: e.target.value }))}
            >
              <option value="">{t('admin.audit.filter.action.all')}</option>
              {ACTION_TYPES.map(a => (
                <option key={a} value={a}>{t(`admin.audit.action.${a}`)}</option>
              ))}
            </select>
          </div>

          <div className="audit-filter-group">
            <label className="audit-filter-label">{t('admin.audit.filter.target')}</label>
            <select
              className="adm-select"
              value={draftFilters.targetType}
              onChange={e => setDraftFilters(f => ({ ...f, targetType: e.target.value }))}
            >
              <option value="">{t('admin.audit.filter.target.all')}</option>
              {TARGET_TYPES.map(tt => (
                <option key={tt} value={tt}>{tt}</option>
              ))}
            </select>
          </div>

          <div className="audit-filter-group">
            <label className="audit-filter-label">{t('admin.audit.filter.from')}</label>
            <input
              type="date"
              className="adm-input"
              value={draftFilters.from}
              onChange={e => setDraftFilters(f => ({ ...f, from: e.target.value }))}
            />
          </div>

          <div className="audit-filter-group">
            <label className="audit-filter-label">{t('admin.audit.filter.to')}</label>
            <input
              type="date"
              className="adm-input"
              value={draftFilters.to}
              onChange={e => setDraftFilters(f => ({ ...f, to: e.target.value }))}
            />
          </div>

          <div className="audit-filter-group" style={{ justifyContent: 'flex-end' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="adm-btn adm-btn--primary" onClick={applyFilters}>
                {t('admin.search')}
              </button>
              <button type="button" className="adm-btn adm-btn--ghost" onClick={resetFilters}>
                {t('admin.cancel')}
              </button>
            </div>
          </div>
        </div>

        {/* ── Table ────────────────────────────────────────────────────────── */}
        {isLoading && (
          <p className="adm-empty">{t('admin.audit.loading')}</p>
        )}
        {isError && (
          <p className="adm-empty" style={{ color: 'var(--color-error)' }}>
            {t('admin.audit.error')}
          </p>
        )}
        {!isLoading && !isError && (
          <div className="audit-table-wrap">
            <table className="audit-table">
              <thead>
                <tr>
                  <th>{t('admin.audit.table.date')}</th>
                  <th>{t('admin.audit.table.user')}</th>
                  <th>{t('admin.audit.table.role')}</th>
                  <th>{t('admin.audit.table.action')}</th>
                  <th>{t('admin.audit.table.target')}</th>
                  <th>{t('admin.audit.table.details')}</th>
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="adm-empty">{t('admin.audit.empty')}</td>
                  </tr>
                ) : entries.map(entry => {
                  const u = entry.userId
                  const userName = u
                    ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || '—'
                    : '—'
                  const actionKey = `admin.audit.action.${entry.action}`
                  const actionLabel = t(actionKey) !== actionKey ? t(actionKey) : entry.action

                  return (
                    <tr key={entry._id}>
                      <td style={{ whiteSpace: 'nowrap', fontSize: '0.8125rem' }}>
                        {new Date(entry.createdAt).toLocaleString('fr-FR')}
                      </td>
                      <td>{userName}</td>
                      <td>
                        <span className="adm-badge">{entry.userRole ?? u?.role ?? '—'}</span>
                      </td>
                      <td>
                        <ActionBadge action={entry.action} label={actionLabel} />
                      </td>
                      <td style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}>
                        {entry.targetType}
                      </td>
                      <td>
                        <MetaDetail action={entry.action} meta={entry.meta} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination ───────────────────────────────────────────────────── */}
        {total > 0 && (
          <div className="audit-pagination">
            <span className="audit-pagination__info">
              {from}–{to} / {total}
            </span>
            <div className="audit-pagination__nav">
              <button
                type="button"
                className="adm-btn adm-btn--ghost"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                aria-label={t('admin.audit.prev')}
              >
                <ChevronLeft size={16} strokeWidth={2} aria-hidden="true" />
                {t('admin.audit.prev')}
              </button>
              <button
                type="button"
                className="adm-btn adm-btn--ghost"
                disabled={page >= lastPage}
                onClick={() => setPage(p => p + 1)}
                aria-label={t('admin.audit.next')}
              >
                {t('admin.audit.next')}
                <ChevronRight size={16} strokeWidth={2} aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
