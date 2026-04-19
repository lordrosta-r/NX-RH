// =============================================================================
// Director — Strategic overview portal
// Aggregated KPIs across the director's entire sub-tree.
// =============================================================================

import React, { useState, useEffect } from 'react'
import './director.css'
import DirectorSidebar from './DirectorSidebar'
import AppTopbar       from '../../components/ui/AppTopbar'
import { t as pageT }  from './i18n'
import { useLocale }   from '../../hooks/useLocale'
import { useTheme }    from '../../hooks/useTheme'
import { useAuthUser } from '../../hooks/useAuthUser'

export default function Director() {
  const { t, locale, setLocale } = useLocale(pageT)
  const { theme, cycleTheme } = useTheme()
  const { user, loading: authLoading } = useAuthUser()

  const [evals, setEvals]    = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]    = useState(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/evaluations', { credentials: 'include' })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(data => { if (!cancelled) setEvals(Array.isArray(data) ? data : []) })
      .catch(() => { if (!cancelled) setError(t('director.error.load')) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [t])

  useEffect(() => {
    if (!authLoading && user && !['director', 'admin'].includes(user.role)) {
      window.location.href = '/employee'
    }
  }, [authLoading, user])

  if (authLoading) return null
  if (!user) return null
  if (!['director', 'admin'].includes(user.role)) return null

  async function handleLogout() {
    try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }) } catch { /* ignore */ }
    sessionStorage.clear()
    window.location.href = '/'
  }

  // ── Stats agrégées sur la sous-arborescence ──────────────────────────────
  const total      = evals.length
  const submitted  = evals.filter(e => e.status === 'submitted').length
  const reviewed   = evals.filter(e => e.status === 'reviewed').length
  const inProgress = evals.filter(e => ['assigned', 'in_progress'].includes(e.status)).length
  const signed     = evals.filter(e => ['signed_evaluatee', 'signed_manager', 'signed_hr', 'validated'].includes(e.status)).length
  const completion = total === 0 ? 0 : Math.round((signed / total) * 100)

  // Groupement par manager
  const byManager = evals.reduce((acc, e) => {
    const key = e.evaluatorId?.toString?.() || 'unknown'
    acc[key] = acc[key] || { total: 0, submitted: 0, reviewed: 0, signed: 0 }
    acc[key].total++
    if (e.status === 'submitted') acc[key].submitted++
    if (e.status === 'reviewed')  acc[key].reviewed++
    if (['signed_evaluatee', 'signed_manager', 'signed_hr', 'validated'].includes(e.status)) acc[key].signed++
    return acc
  }, {})
  const managerCount = Object.keys(byManager).length

  return (
    <div className="db">
      <DirectorSidebar t={t} activeItem="overview" />

      <div className="db-main">
        <AppTopbar
          t={t}
          theme={theme}
          cycleTheme={cycleTheme}
          locale={locale}
          setLocale={setLocale}
          user={user}
          onLogout={handleLogout}
          searchPlaceholder={t('director.search.placeholder')}
          tKeys={{
            help:   { aria: 'director.help.aria',   title: 'director.help.title' },
            theme:  { to_light: 'director.theme.to_light', to_sidebar: 'director.theme.to_sidebar', to_dark: 'director.theme.to_dark' },
            logout: { aria: 'director.logout.aria', title: 'director.logout.title' },
            bell:   'director.notifications.aria_bell',
          }}
        />

        <main id="main-content" className="db-content dir">
          {/* Hero */}
          <section className="dir-hero">
            <p className="dir-hero__eyebrow">{t('director.hero.eyebrow')}</p>
            <h1 className="dir-hero__title">{t('director.hero.title')}</h1>
            <p className="dir-hero__sub">{t('director.hero.sub')}</p>
          </section>

          {error && <p className="dir-error" role="alert">{error}</p>}
          {loading && <p className="dir-loading">{t('director.loading')}</p>}

          {!loading && !error && (
            <>
              {/* Completion globale */}
              <section className="dir-card" aria-labelledby="dir-comp">
                <h2 id="dir-comp" className="dir-card__title">{t('director.completion.heading')}</h2>
                <div className="dir-completion">
                  <div className="dir-completion__bar">
                    <div className="dir-completion__fill" style={{ width: `${completion}%` }} />
                  </div>
                  <span className="dir-completion__pct">{completion}%</span>
                </div>
                <p className="dir-completion__hint">
                  {signed} / {total} {t('director.completion.hint')}
                </p>
              </section>

              {/* KPIs */}
              <section className="dir-kpis" aria-label={t('director.kpis.label')}>
                <div className="dir-kpi">
                  <span className="dir-kpi__value">{total}</span>
                  <span className="dir-kpi__label">{t('director.kpi.total')}</span>
                </div>
                <div className="dir-kpi">
                  <span className="dir-kpi__value">{managerCount}</span>
                  <span className="dir-kpi__label">{t('director.kpi.managers')}</span>
                </div>
                <div className="dir-kpi">
                  <span className="dir-kpi__value">{inProgress}</span>
                  <span className="dir-kpi__label">{t('director.kpi.in_progress')}</span>
                </div>
                <div className="dir-kpi">
                  <span className="dir-kpi__value">{submitted}</span>
                  <span className="dir-kpi__label">{t('director.kpi.submitted')}</span>
                </div>
                <div className="dir-kpi">
                  <span className="dir-kpi__value">{reviewed}</span>
                  <span className="dir-kpi__label">{t('director.kpi.reviewed')}</span>
                </div>
                <div className="dir-kpi">
                  <span className="dir-kpi__value">{signed}</span>
                  <span className="dir-kpi__label">{t('director.kpi.signed')}</span>
                </div>
              </section>

              {/* Drill-down liste */}
              <section className="dir-card" aria-labelledby="dir-list">
                <h2 id="dir-list" className="dir-card__title">{t('director.list.heading')}</h2>
                <p className="dir-card__sub">{t('director.list.subtitle')}</p>

                <div className="dir-actions">
                  <a className="dir-action" href="/manager">
                    <span className="dir-action__name">{t('director.actions.manager')}</span>
                    <span className="dir-action__desc">{t('director.actions.manager.desc')}</span>
                  </a>
                  <a className="dir-action" href="/evaluation">
                    <span className="dir-action__name">{t('director.actions.evaluation')}</span>
                    <span className="dir-action__desc">{t('director.actions.evaluation.desc')}</span>
                  </a>
                  <a className="dir-action" href="/settings">
                    <span className="dir-action__name">{t('director.actions.settings')}</span>
                    <span className="dir-action__desc">{t('director.actions.settings.desc')}</span>
                  </a>
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
