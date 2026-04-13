// =============================================================================
// Manager — Team overview + review/validate evaluations
// Layout: fixed sidebar (256px) + scrollable main content
// Design: Editorial Enterprise — docs/design/dashboard/DESIGN.md
// =============================================================================

import React, { useState, useEffect } from 'react'
import './manager.css'
import ManagerSidebar from './ManagerSidebar.jsx'
import { t as pageT } from './i18n/index.js'
import { useLocale } from '../../hooks/useLocale.js'
import { useAuthUser } from '../../hooks/useAuthUser.js'
import { GlobeIcon, SearchIcon } from '../../components/ui/icons/index.js'
import ThemeToggle from '../../components/ui/ThemeToggle.jsx'

const PAGE_SIZE = 25

export default function Manager() {
  const { t, locale, setLocale } = useLocale(pageT)
  const { user, loading: authLoading } = useAuthUser()
  const [evaluations, setEvaluations] = useState([])
  const [evLoading, setEvLoading]     = useState(true)
  const [error, setError]             = useState(null)
  const [page, setPage]               = useState(1)

  useEffect(() => {
    let cancelled = false
    fetch('/api/evaluations', { credentials: 'include' })
      .then(r => {
        if (!r.ok) {
          if (r.status === 401 || r.status === 403) { window.location.href = '/'; return null }
          throw new Error(`HTTP ${r.status}`)
        }
        return r.json()
      })
      .then(data => { if (!cancelled && data) setEvaluations(data) })
      .catch(() => { if (!cancelled) setError(t('manager.error.load')) })
      .finally(() => { if (!cancelled) setEvLoading(false) })
    return () => { cancelled = true }
  }, [])

  if (authLoading) return null
  if (!user)       return null
  if (!['admin', 'director', 'manager'].includes(user.role)) {
    window.location.href = '/dashboard'
    return null
  }

  async function handleAction(id, action) {
    const statusMap = { review: 'reviewed', cosign: 'signed_manager' }
    const newStatus = statusMap[action]
    if (!newStatus) return
    try {
      const r = await fetch(`/api/evaluations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      })
      if (!r.ok) throw new Error()
      setEvaluations(prev => prev.map(e => e._id === id ? { ...e, status: newStatus } : e))
    } catch {
      setError(t('manager.error.update_failed'))
    }
  }

  async function handleLogout() {
    try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }) } catch { /* ignore logout network errors */ }
    sessionStorage.clear()
    window.location.href = '/'
  }

  // KPI counts
  const kpis = {
    pending:   evaluations.filter(e => ['assigned', 'in_progress'].includes(e.status)).length,
    submitted: evaluations.filter(e => e.status === 'submitted').length,
    signed:    evaluations.filter(e => e.status === 'signed_manager').length,
  }

  // User info
  const first    = user?.firstName ?? ''
  const last     = user?.lastName  ?? ''
  const initials = `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase() || 'M'
  const fullName = first || last ? `${first} ${last}`.trim() : 'Manager'

  return (
    <div className="mgr">

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <ManagerSidebar t={t} activeItem="evaluations" />

      {/* ── Main area ───────────────────────────────────────────────────── */}
      <div className="mgr-main">

        {/* ── Topbar ──────────────────────────────────────────────────── */}
        <header className="mgr-topbar">

          {/* Search pill */}
          <div className="mgr-search" role="search">
            <SearchIcon size={15} color="var(--color-outline)" />
            <input
              type="text"
              className="mgr-search__input"
              placeholder={t('manager.search.placeholder')}
              aria-label={t('manager.search.placeholder')}
            />
          </div>

          {/* Right cluster */}
          <div className="mgr-topbar__right">

            {/* Theme cycle */}
            <ThemeToggle size={17}
              labelLight={t('manager.theme.to_dark')}
              labelDark={t('manager.theme.to_light')}
            />

            {/* Language toggle */}
            <button
              type="button"
              className="mgr-icon-btn"
              onClick={() => setLocale(locale === 'fr' ? 'en' : 'fr')}
              aria-label={t('manager.lang.aria')}
              title={t('manager.lang.aria')}
            >
              <GlobeIcon size={17} color="var(--color-on-surface-variant)" />
            </button>

            <div className="mgr-topbar__sep" aria-hidden="true" />

            {/* User profile */}
            <div className="mgr-topbar__user">
              <div className="mgr-topbar__user-info">
                <p className="mgr-topbar__user-name">{fullName}</p>
                <p className="mgr-topbar__user-role">{user?.role ?? 'manager'}</p>
              </div>
              <div className="mgr-topbar__avatar" aria-hidden="true">{initials}</div>
              <button
                type="button"
                className="mgr-icon-btn"
                onClick={handleLogout}
                aria-label={t('manager.logout')}
                title={t('manager.logout')}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
                  stroke="var(--color-on-surface-variant)" strokeWidth="1.5"
                  strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </button>
            </div>

          </div>
        </header>

        {/* ── Page content ────────────────────────────────────────────── */}
        <main className="mgr-content" id="main-content">

          {/* Welcome heading */}
          <div className="mgr-welcome">
            <h1 className="mgr-welcome__title">{t('manager.welcome.title')}</h1>
            <p  className="mgr-welcome__sub">{t('manager.welcome.subtitle')}</p>
          </div>

          {/* ── KPI strip ───────────────────────────────────────────── */}
          <div className="mgr-kpis">
            {(['pending', 'submitted', 'signed']).map(k => (
              <div key={k} className={`mgr-kpi mgr-kpi--${k}`}>
                <span className="mgr-kpi__value">{kpis[k]}</span>
                <span className="mgr-kpi__label">{t(`manager.kpi.${k}`)}</span>
              </div>
            ))}
          </div>

          {/* ── Evaluations table ───────────────────────────────────── */}
          {evLoading && <p className="mgr-loading">{t('manager.loading')}</p>}
          {error     && <p className="mgr-error" role="alert">{error}</p>}

          {!evLoading && !error && (
            <div className="mgr-table-wrap">
              <table className="mgr-table">
                <thead>
                  <tr>
                    <th scope="col">{t('manager.table.evaluatee')}</th>
                    <th scope="col">{t('manager.table.evaluator')}</th>
                    <th scope="col">{t('manager.table.status')}</th>
                    <th scope="col">{t('manager.table.score')}</th>
                    <th scope="col">{t('manager.table.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {evaluations.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="mgr-table__empty">
                        {t('manager.table.empty')}
                      </td>
                    </tr>
                  ) : evaluations.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(ev => (
                    <tr key={ev._id}>
                      <td>{ev.evaluateeId?.firstName} {ev.evaluateeId?.lastName}</td>
                      <td>
                        {ev.formId?.isAnonymous
                          ? t('manager.table.anonymous')
                          : `${ev.evaluatorId?.firstName ?? ''} ${ev.evaluatorId?.lastName ?? ''}`.trim() || '—'}
                      </td>
                      <td>
                        <span className={`mgr-badge mgr-badge--${ev.status}`}>
                          {t(`manager.status.${ev.status}`) || ev.status}
                        </span>
                      </td>
                      <td>{ev.score !== null ? `${ev.score}/100` : '—'}</td>
                      <td className="mgr-table__actions">
                        {ev.status === 'submitted' && (
                          <button
                            type="button"
                            className="mgr-btn mgr-btn--sm"
                            onClick={() => handleAction(ev._id, 'review')}
                          >
                            {t('manager.action.review')}
                          </button>
                        )}
                        {ev.status === 'signed_evaluatee' && (
                          <button
                            type="button"
                            className="mgr-btn mgr-btn--sm mgr-btn--primary"
                            onClick={() => handleAction(ev._id, 'cosign')}
                          >
                            {t('manager.action.cosign')}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {evaluations.length > PAGE_SIZE && (
                <div className="mgr-pagination">
                  <button
                    type="button"
                    className="mgr-btn mgr-btn--sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    {t('manager.pagination.prev')}
                  </button>
                  <span className="mgr-pagination__info">
                    {page} / {Math.ceil(evaluations.length / PAGE_SIZE)}
                  </span>
                  <button
                    type="button"
                    className="mgr-btn mgr-btn--sm"
                    onClick={() => setPage(p => Math.min(Math.ceil(evaluations.length / PAGE_SIZE), p + 1))}
                    disabled={page === Math.ceil(evaluations.length / PAGE_SIZE)}
                  >
                    {t('manager.pagination.next')}
                  </button>
                </div>
              )}
            </div>
          )}

        </main>
      </div>
    </div>
  )
}
