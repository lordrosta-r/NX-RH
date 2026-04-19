// =============================================================================
// HRDashboard — HR portal home page
// Sections: Welcome hero · KPIs · Campaign status · Alerts ·
//           Calendar (entretiens) · Form Editor · Resources · Dept table · Actions
// Data: all fetched from /api/* endpoints (cookie auth).
// Design: docs/design/dashboard/DESIGN.md
// =============================================================================

import React, { useState, useEffect } from 'react'
import './hr.css'
import HRSidebar        from './HRSidebar'
import HRWelcomeBanner  from './HRWelcomeBanner'
import CalendarWidget   from '../../components/ui/CalendarWidget'
import AppTopbar        from '../../components/ui/AppTopbar'
import { t as pageT }  from './i18n'
import { useLocale }   from '../../hooks/useLocale'
import { useTheme }    from '../../hooks/useTheme'
import { useAuthUser } from '../../hooks/useAuthUser'
import { DocumentIcon, BellIcon } from '../../components/ui/icons'

// ── Helpers ──────────────────────────────────────────────────────────────────

const EVENT_COLORS = {
  deadline:  'var(--color-error)',
  interview: 'var(--color-secondary)',
  meeting:   'var(--color-tertiary)',
  report:    'var(--color-outline)',
}

function deptColor(pct) {
  if (pct >= 80) return 'var(--color-secondary)'
  if (pct >= 60) return 'var(--color-primary)'
  return 'var(--color-error)'
}

function alertColor(level) {
  if (level === 'error')   return 'var(--color-error)'
  if (level === 'warning') return 'var(--color-tertiary)'
  return 'var(--color-secondary)'
}

function ResourceTypeIcon({ type }) {
  const color = type === 'pdf'
    ? 'var(--color-error)'
    : type === 'xlsx'
    ? 'var(--color-secondary)'
    : 'var(--color-outline)'
  return <DocumentIcon size={16} color={color} strokeWidth={1.5} />
}

/** Derive actionable alerts from evaluation + campaign data. */
function deriveAlerts(evaluations, campaigns, t) {
  const alerts = []
  const now = new Date()

  // Overdue: assigned evaluations whose campaign endDate has passed
  const overdueCount = evaluations.filter(e => {
    if (e.status !== 'assigned') return false
    const camp = campaigns.find(c => (c._id || c.id) === e.campaignId)
    return camp && new Date(camp.endDate) < now
  }).length
  if (overdueCount > 0) {
    alerts.push({
      id: 'overdue', level: 'error',
      text: `${overdueCount} ${t('hr.alert.overdue')}`,
      meta: t('hr.alert.meta.urgent'),
    })
  }

  // Campaigns closing within 7 days
  campaigns.forEach(c => {
    const end = new Date(c.endDate)
    const days = Math.round((end - now) / (1000 * 60 * 60 * 24))
    if (days > 0 && days <= 7) {
      alerts.push({
        id: `closing-${c._id || c.id}`, level: 'warning',
        text: `${t('hr.alert.closing')} ${days} ${t('hr.alert.days')}`,
        meta: c.name || '',
      })
    }
  })

  // Not-started evaluations (only if no overdue alert)
  if (!overdueCount) {
    const notStarted = evaluations.filter(e => e.status === 'assigned').length
    if (notStarted > 0) {
      alerts.push({
        id: 'not-started', level: 'warning',
        text: `${notStarted} ${t('hr.alert.notStarted')}`,
        meta: t('hr.alert.meta.followup'),
      })
    }
  }

  return alerts
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function HRDashboard() {
  const { t, locale, setLocale } = useLocale(pageT)
  const { theme, cycleTheme } = useTheme()
  const { user, loading: authLoading } = useAuthUser()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  // ── Event modal state (must be declared before any early return) ───────────
  const [eventModalOpen, setEventModalOpen] = useState(false)
  const [eventForm, setEventForm]           = useState({ title: '', date: '', type: 'meeting' })
  const [eventEditing, setEventEditing]     = useState(null)
  const [eventSaving, setEventSaving]       = useState(false)

  // ── Fetch all HR data in parallel ─────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    async function loadAll() {
      try {
        const [evalRes, campRes, formRes, userRes, resRes, evtRes] = await Promise.all([
          fetch('/api/evaluations?limit=500', { credentials: 'include' }),
          fetch('/api/campaigns?status=active&limit=50', { credentials: 'include' }),
          fetch('/api/forms?limit=100', { credentials: 'include' }),
          fetch('/api/users?isActive=true', { credentials: 'include' }),
          fetch('/api/resources', { credentials: 'include' }),
          fetch('/api/events', { credentials: 'include' }),
        ])
        if (cancelled) return
        if (!evalRes.ok || !campRes.ok || !formRes.ok || !userRes.ok || !resRes.ok || !evtRes.ok) {
          throw new Error('API error')
        }
        const [evals, camps, forms, users, resources, events] = await Promise.all([
          evalRes.json(), campRes.json(), formRes.json(),
          userRes.json(), resRes.json(), evtRes.json(),
        ])
        if (!cancelled) setData({ evals, camps, forms, users, resources, events })
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    if (user) loadAll()
    return () => { cancelled = true }
  }, [user])

  // ── Auth guards ───────────────────────────────────────────────────────────
  if (authLoading) return null
  if (!user)       return null
  if (!['admin', 'hr'].includes(user.role)) {
    window.location.href = '/employee'
    return null
  }

  async function handleLogout() {
    try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }) } catch { /* ignore */ }
    sessionStorage.clear()
    window.location.href = '/'
  }

  // ── Derived data ──────────────────────────────────────────────────────────
  const first       = user?.firstName ?? 'RH'
  const evaluations = data?.evals?.data ?? []
  const campaigns   = data?.camps?.data ?? []
  const forms       = data?.forms?.data ?? []
  const users       = data?.users?.data ?? []
  const resources   = data?.resources?.data ?? []
  const events      = data?.events?.data ?? []
  const isLoading   = loading && !data
  const hasError    = !!error && !data

  // HR-actionable evaluations (those HR can sign or validate)
  const hrActionable = evaluations.filter(e =>
    ['signed_manager', 'signed_evaluatee', 'reviewed'].includes(e.status)
  )
  const hrValidatable = evaluations.filter(e => e.status === 'signed_hr')

  async function handleHRSign(id) {
    try {
      const r = await fetch(`/api/evaluations/${id}`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'signed_hr' }),
      })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      // refresh data
      const evalRes = await fetch('/api/evaluations?limit=500', { credentials: 'include' })
      if (evalRes.ok) {
        const evals = await evalRes.json()
        setData(prev => ({ ...prev, evals }))
      }
    } catch (err) { setError(err.message) }
  }

  async function handleValidate(id) {
    try {
      const r = await fetch(`/api/evaluations/${id}`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'validated' }),
      })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const evalRes = await fetch('/api/evaluations?limit=500', { credentials: 'include' })
      if (evalRes.ok) {
        const evals = await evalRes.json()
        setData(prev => ({ ...prev, evals }))
      }
    } catch (err) { setError(err.message) }
  }

  // KPIs
  const inProgressCount = evaluations.filter(e => e.status === 'in_progress').length
  const activeCampCount = campaigns.length
  const formsCount      = data?.forms?.total ?? forms.length
  const completedEvals  = evaluations.filter(e => ['submitted', 'validated'].includes(e.status)).length
  const totalEvals      = data?.evals?.total ?? evaluations.length
  const completionPct   = totalEvals > 0 ? Math.round((completedEvals / totalEvals) * 100) : 0

  const kpis = [
    { id: 'evaluations', value: String(inProgressCount), accent: false },
    { id: 'campaigns',   value: String(activeCampCount), accent: false },
    { id: 'forms',       value: String(formsCount),      accent: false },
    { id: 'completion',  value: `${completionPct}%`,     accent: false },
  ]

  // Active campaign + phases
  const activeCampaign = campaigns[0] ?? null
  const campEvals = activeCampaign
    ? evaluations.filter(e => e.campaignId === (activeCampaign._id || activeCampaign.id))
    : evaluations
  const campTotal   = campEvals.length || 1
  const selfDone    = campEvals.filter(e => e.status !== 'assigned').length
  const reviewDone  = campEvals.filter(e => ['in_progress', 'submitted', 'validated'].includes(e.status)).length
  const interviewDn = campEvals.filter(e => ['submitted', 'validated'].includes(e.status)).length

  const phases = [
    { id: 'self',      pct: Math.round((selfDone / campTotal) * 100),    done: selfDone,    total: campTotal },
    { id: 'review',    pct: Math.round((reviewDone / campTotal) * 100),  done: reviewDone,  total: campTotal },
    { id: 'interview', pct: Math.round((interviewDn / campTotal) * 100), done: interviewDn, total: campTotal },
  ]

  const campDates = activeCampaign
    ? `${new Date(activeCampaign.startDate).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'long' })} — ${new Date(activeCampaign.endDate).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })}`
    : ''

  // Alerts
  const alerts = data ? deriveAlerts(evaluations, campaigns, t) : []

  const notifItems = alerts.map(a => ({
    id: a.id, color: alertColor(a.level), text: a.text, meta: a.meta,
  }))

  // Department stats
  const deptMap = {}
  users.forEach(u => {
    const dept = u.department || t('hr.depts.unknown')
    if (!deptMap[dept]) deptMap[dept] = { total: 0, completed: 0 }
    deptMap[dept].total += 1
  })
  evaluations.forEach(e => {
    if (['submitted', 'validated'].includes(e.status)) {
      const u = users.find(usr => (usr._id || usr.id) === e.userId)
      if (u) {
        const dept = u.department || t('hr.depts.unknown')
        if (deptMap[dept]) deptMap[dept].completed += 1
      }
    }
  })
  const departments = Object.entries(deptMap)
    .map(([name, { total, completed }]) => ({
      name, total, pct: total > 0 ? Math.round((completed / total) * 100) : 0,
    }))
    .sort((a, b) => b.pct - a.pct)

  // Calendar events
  const calendarEvents = events.map(evt => ({
    date: evt.date || (evt.startDate ? evt.startDate.slice(0, 10) : ''),
    type: evt.type || 'meeting',
    label: evt.title || evt.label || evt.name || '',
    typeLabel: t(`hr.calendar.type.${evt.type || 'meeting'}`),
    color: EVENT_COLORS[evt.type] || 'var(--color-outline)',
  }))

  // Event modal state
  function openCreateEvent() {
    setEventEditing(null)
    setEventForm({ title: '', date: '', type: 'meeting' })
    setEventModalOpen(true)
  }

  function openEditEvent(evt) {
    setEventEditing(evt)
    setEventForm({ title: evt.title || '', date: (evt.date || '').slice(0, 10), type: evt.type || 'meeting' })
    setEventModalOpen(true)
  }

  async function handleSaveEvent(e) {
    e.preventDefault()
    setEventSaving(true)
    try {
      const url = eventEditing ? `/api/events/${eventEditing._id || eventEditing.id}` : '/api/events'
      const method = eventEditing ? 'PATCH' : 'POST'
      const r = await fetch(url, {
        method, credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventForm),
      })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      setEventModalOpen(false)
      // Refresh events
      const evtRes = await fetch('/api/events', { credentials: 'include' })
      if (evtRes.ok) {
        const newEvents = await evtRes.json()
        setData(prev => ({ ...prev, events: newEvents }))
      }
    } catch (err) { setError(err.message) }
    finally { setEventSaving(false) }
  }

  async function handleDeleteEvent(id) {
    try {
      const r = await fetch(`/api/events/${id}`, { method: 'DELETE', credentials: 'include' })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const evtRes = await fetch('/api/events', { credentials: 'include' })
      if (evtRes.ok) {
        const newEvents = await evtRes.json()
        setData(prev => ({ ...prev, events: newEvents }))
      }
    } catch (err) { setError(err.message) }
  }

  // Welcome banner stats
  const totalUsers = data?.users?.total ?? users.length
  const deptCount  = Object.keys(deptMap).length

  return (
    <div className="hr">
      <HRSidebar t={t} activeItem="overview" sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="hr-main">

        <AppTopbar
          searchPlaceholder={t('hr.search.placeholder')}
          locale={locale} setLocale={setLocale}
          theme={theme} cycleTheme={cycleTheme}
          notifItems={notifItems}
          user={user} onLogout={handleLogout}
          onMenuToggle={() => setSidebarOpen(o => !o)}
        />

        {/* ── Page content ────────────────────────────────────────────── */}
        <main className="hr-content" id="main-content">

          {/* ── Welcome banner ────────────────────────────────────────── */}
          <HRWelcomeBanner
            t={t} userName={first}
            employees={totalUsers} departments={deptCount} completion={completionPct}
          />

          {/* ── Error banner ──────────────────────────────────────────── */}
          {hasError && <div className="hr-error">{t('hr.error.load')}</div>}

          {/* ── KPI strip ─────────────────────────────────────────────── */}
          {isLoading ? (
            <div className="hr-loading">{t('hr.loading')}</div>
          ) : (
            <div className="hr-kpis">
              {kpis.map(({ id, value, accent }) => (
                <div key={id} className={`hr-kpi${accent ? ' hr-kpi--alert' : ''}`}>
                  <span className="hr-kpi__value">{value}</span>
                  <span className="hr-kpi__label">{t(`hr.kpi.${id}.label`)}</span>
                  <span className="hr-kpi__sub">{t(`hr.kpi.${id}.sub`)}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── Bento ─────────────────────────────────────────────────── */}
          <div className="hr-bento">

            {/* Row 1 — Campaign status + Alerts */}
            <article className="hr-camp">
              {isLoading ? (
                <div className="hr-loading">{t('hr.loading')}</div>
              ) : activeCampaign ? (
                <>
                  <div className="hr-camp__head">
                    <div className="hr-camp__badge">
                      <BellIcon size={10} color="var(--color-error)" strokeWidth={2} />
                      {t('hr.camp.badge').toUpperCase()}
                    </div>
                    <h2 className="hr-camp__title">{activeCampaign.name || t('hr.camp.fallbackTitle')}</h2>
                    <p className="hr-camp__dates">{campDates}</p>
                  </div>
                  <div className="hr-camp__phases">
                    {phases.map(({ id, pct, done, total }) => (
                      <div key={id} className="hr-phase">
                        <div className="hr-phase__meta">
                          <span className="hr-phase__name">{t(`hr.camp.phase.${id}`)}</span>
                          <span className="hr-phase__count">{done}/{total}</span>
                        </div>
                        <div className="hr-phase__track"
                          role="progressbar"
                          aria-valuenow={pct}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`${t(`hr.camp.phase.${id}`)}: ${pct}%`}
                        >
                          <div className="hr-phase__bar" style={{ width: `${pct}%` }} aria-hidden="true" />
                        </div>
                        <span className="hr-phase__pct">{pct}%</span>
                      </div>
                    ))}
                  </div>
                  <div className="hr-camp__actions">
                    <button type="button" className="hr-camp__btn hr-camp__btn--secondary"
                      onClick={() => { window.location.href = `/campaigns` }}>
                      {t('hr.camp.cta.view')}
                    </button>
                    <button type="button" className="hr-camp__btn hr-camp__btn--danger"
                      onClick={async () => {
                        const id = activeCampaign._id || activeCampaign.id
                        try {
                          const r = await fetch(`/api/campaigns/${id}`, {
                            method: 'PATCH', credentials: 'include',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ status: 'closed' }),
                          })
                          if (!r.ok) throw new Error(`HTTP ${r.status}`)
                          // Refresh campaigns
                          const campRes = await fetch('/api/campaigns?status=active&limit=50', { credentials: 'include' })
                          if (campRes.ok) {
                            const camps = await campRes.json()
                            setData(prev => ({ ...prev, camps }))
                          }
                        } catch (err) { setError(err.message) }
                      }}>
                      {t('hr.camp.cta.close')}
                    </button>
                  </div>
                </>
              ) : (
                <p className="hr-empty">{t('hr.camp.empty')}</p>
              )}
            </article>

            <aside className="hr-alerts">
              <div className="hr-alerts__header">
                <h3 className="hr-alerts__title">{t('hr.alerts.title').toUpperCase()}</h3>
                <span className="hr-alerts__badge">{alerts.length}</span>
              </div>
              {isLoading ? (
                <div className="hr-loading">{t('hr.loading')}</div>
              ) : alerts.length === 0 ? (
                <p className="hr-empty">{t('hr.alerts.empty')}</p>
              ) : (
                <ul className="hr-alerts__list">
                  {alerts.map((a, idx) => (
                    <li key={a.id} className={`hr-alert${idx < alerts.length - 1 ? ' hr-alert--sep' : ''}`}>
                      <span className="hr-alert__dot" style={{ background: alertColor(a.level) }} aria-hidden="true" />
                      <div>
                        <p className="hr-alert__text">{a.text}</p>
                        <p className="hr-alert__meta">{a.meta}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </aside>

            {/* Row 1b — HR Signing queue */}
            {(hrActionable.length > 0 || hrValidatable.length > 0) && (
              <article className="hr-signing">
                <h3 className="hr-signing__title">{t('hr.signing.title').toUpperCase()}</h3>
                {hrActionable.length > 0 && (
                  <>
                    <p className="hr-signing__sub">{t('hr.signing.pending')} ({hrActionable.length})</p>
                    <div className="hr-signing__list">
                      {hrActionable.slice(0, 10).map(ev => (
                        <div key={ev._id} className="hr-signing__row">
                          <span className="hr-signing__name">
                            {ev.evaluateeId?.firstName} {ev.evaluateeId?.lastName}
                          </span>
                          <span className={`mgr-badge mgr-badge--${ev.status}`}>{ev.status}</span>
                          <button type="button" className="hr-camp__btn hr-camp__btn--secondary"
                            onClick={() => handleHRSign(ev._id)}>
                            {t('hr.signing.sign')}
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                {hrValidatable.length > 0 && (
                  <>
                    <p className="hr-signing__sub">{t('hr.signing.toValidate')} ({hrValidatable.length})</p>
                    <div className="hr-signing__list">
                      {hrValidatable.slice(0, 10).map(ev => (
                        <div key={ev._id} className="hr-signing__row">
                          <span className="hr-signing__name">
                            {ev.evaluateeId?.firstName} {ev.evaluateeId?.lastName}
                          </span>
                          <span className="mgr-badge mgr-badge--signed_hr">signed_hr</span>
                          <button type="button" className="hr-camp__btn hr-camp__btn--primary"
                            onClick={() => handleValidate(ev._id)}>
                            {t('hr.signing.validate')}
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </article>
            )}

            {/* Row 2 — Department completion + Quick actions */}
            <article className="hr-depts">
              <div className="hr-depts__header">
                <h3 className="hr-depts__title">{t('hr.depts.title').toUpperCase()}</h3>
              </div>
              {isLoading ? (
                <div className="hr-loading">{t('hr.loading')}</div>
              ) : departments.length === 0 ? (
                <p className="hr-empty">{t('hr.depts.empty')}</p>
              ) : (
                <table className="hr-depts__table">
                  <thead>
                    <tr>
                      <th scope="col">{t('hr.depts.col.name')}</th>
                      <th scope="col">{t('hr.depts.col.total')}</th>
                      <th scope="col">{t('hr.depts.col.progress')}</th>
                      <th scope="col">{t('hr.depts.col.pct')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departments.map(({ name, total, pct }) => (
                      <tr key={name}>
                        <td className="hr-dept-row__name">{name}</td>
                        <td className="hr-dept-row__total">{total}</td>
                        <td>
                          <div className="hr-dept-row__track"
                            role="progressbar"
                            aria-valuenow={pct}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`${name}: ${pct}%`}
                          >
                            <div className="hr-dept-row__bar" style={{ width: `${pct}%`, background: deptColor(pct) }} aria-hidden="true" />
                          </div>
                        </td>
                        <td className="hr-dept-row__pct" style={{ color: deptColor(pct) }}>{pct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <button type="button" className="hr-depts__viewall"
                onClick={() => { window.location.href = '/users?deptFilter=all' }}>
                {t('hr.depts.viewall')}
              </button>
            </article>

            <article className="hr-actions">
              <h3 className="hr-actions__title">{t('hr.actions.title').toUpperCase()}</h3>
              <div className="hr-actions__list">
                <button type="button" className="hr-action-btn hr-action-btn--primary"
                  onClick={() => { window.location.href = '/campaigns' }}>
                  <span className="hr-action-btn__icon">+</span>
                  {t('hr.actions.campaign')}
                </button>
                <button type="button" className="hr-action-btn"
                  onClick={() => { window.location.href = '/formeditor' }}>
                  <span className="hr-action-btn__icon">+</span>
                  {t('hr.actions.template')}
                </button>
                <button type="button" className="hr-action-btn"
                  onClick={() => { window.location.href = '/resources' }}>
                  <span className="hr-action-btn__icon">↓</span>
                  {t('hr.actions.export')}
                </button>
                <button type="button" className="hr-action-btn hr-action-btn--danger"
                  onClick={() => { window.location.href = '/campaigns' }}>
                  <span className="hr-action-btn__icon">○</span>
                  {t('hr.actions.close')}
                </button>
              </div>
            </article>

            {/* Row 3 — Calendar + Form Editor */}
            <div className="hr-calendar-wrap">
              <div className="hr-calendar-head">
                <CalendarWidget
                  title={t('hr.calendar.title')}
                  events={calendarEvents}
                  locale={locale}
                  labelPrevMonth={t('hr.calendar.prev_month')}
                  labelNextMonth={t('hr.calendar.next_month')}
                />
                <button type="button" className="hr-camp__btn hr-camp__btn--secondary" onClick={openCreateEvent}>
                  + {t('hr.event.add')}
                </button>
              </div>
              {/* Event list for editing/deleting */}
              {events.length > 0 && (
                <ul className="hr-event-list">
                  {events.slice(0, 8).map(evt => (
                    <li key={evt._id || evt.id} className="hr-event-item">
                      <span className="hr-event-item__dot" style={{ background: EVENT_COLORS[evt.type] || 'var(--color-outline)' }} />
                      <span className="hr-event-item__title">{evt.title}</span>
                      <span className="hr-event-item__date">{(evt.date || '').slice(0, 10)}</span>
                      <button type="button" className="hr-tpl__edit" onClick={() => openEditEvent(evt)}>✎</button>
                      <button type="button" className="hr-tpl__edit" onClick={() => handleDeleteEvent(evt._id || evt.id)}>×</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <article className="hr-form-editor">
              <div className="hr-form-editor__header">
                <h3 className="hr-form-editor__title">{t('hr.form.title').toUpperCase()}</h3>
                <button type="button" className="hr-form-editor__new"
                  onClick={() => { window.location.href = '/formeditor' }}>
                  + {t('hr.form.new')}
                </button>
              </div>
              {isLoading ? (
                <div className="hr-loading">{t('hr.loading')}</div>
              ) : forms.length === 0 ? (
                <p className="hr-empty">{t('hr.form.empty')}</p>
              ) : (
                <ul className="hr-form-editor__list">
                  {forms.map(f => (
                    <li key={f._id || f.id} className="hr-tpl">
                      <div className="hr-tpl__icon">
                        <DocumentIcon size={16} color="var(--color-secondary)" strokeWidth={1.5} />
                      </div>
                      <div className="hr-tpl__info">
                        <p className="hr-tpl__name">{f.title || f.name}</p>
                        <p className="hr-tpl__type">{f.type || ''}</p>
                      </div>
                      <div className="hr-tpl__right">
                        <span className={`hr-tpl__status hr-tpl__status--${f.status || 'draft'}`}>
                          {t(`hr.form.status.${f.status || 'draft'}`)}
                        </span>
                      </div>
                      <button type="button" className="hr-tpl__edit" aria-label={t('hr.actions.edit')}
                        onClick={() => { window.location.href = `/formeditor?edit=${f._id || f.id}` }}>
                        ✎
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <button type="button" className="hr-form-editor__viewall"
                onClick={() => { window.location.href = '/formeditor' }}>
                {t('hr.form.viewall')}
              </button>
            </article>

            {/* Row 4 — Resources (full width) */}
            <article className="hr-resources">
              <div className="hr-resources__header">
                <div>
                  <h3 className="hr-resources__title">{t('hr.res.title').toUpperCase()}</h3>
                  <p className="hr-resources__sub">{t('hr.res.sub')}</p>
                </div>
                <button type="button" className="hr-resources__publish"
                  onClick={() => { window.location.href = '/resources' }}>
                  + {t('hr.res.publish')}
                </button>
              </div>
              {isLoading ? (
                <div className="hr-loading">{t('hr.loading')}</div>
              ) : resources.length === 0 ? (
                <p className="hr-empty">{t('hr.res.empty')}</p>
              ) : (
                <div className="hr-resources__grid">
                  {resources.map(r => (
                    <div key={r._id || r.id} className="hr-resource">
                      <div className="hr-resource__icon">
                        <ResourceTypeIcon type={r.type || 'pdf'} />
                      </div>
                      <div className="hr-resource__info">
                        <p className="hr-resource__name">{r.name || r.title}</p>
                        <p className="hr-resource__date">
                          {r.updatedAt
                            ? new Date(r.updatedAt).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })
                            : ''}
                        </p>
                      </div>
                      <span className={`hr-resource__status hr-resource__status--${r.status || 'draft'}`}>
                        {t(`hr.res.status.${r.status || 'draft'}`)}
                      </span>
                      <button type="button" className="hr-resource__dl" aria-label={t('hr.actions.download')}
                        onClick={() => { window.location.href = `/api/resources/${r._id || r.id}` }}>
                        ↓
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </article>

          </div>

          {/* Event modal */}
          {eventModalOpen && (
            <div className="hr-modal-backdrop" onClick={() => setEventModalOpen(false)}>
              <div className="hr-modal" role="dialog" aria-labelledby="hr-event-title" onClick={e => e.stopPropagation()}>
                <h3 id="hr-event-title" className="hr-modal__title">
                  {eventEditing ? t('hr.event.edit') : t('hr.event.add')}
                </h3>
                <form onSubmit={handleSaveEvent} className="hr-event-form">
                  <label className="hr-event-field">
                    <span>{t('hr.event.title_label')}</span>
                    <input type="text" required value={eventForm.title}
                      onChange={e => setEventForm(p => ({ ...p, title: e.target.value }))} />
                  </label>
                  <label className="hr-event-field">
                    <span>{t('hr.event.date')}</span>
                    <input type="date" required value={eventForm.date}
                      onChange={e => setEventForm(p => ({ ...p, date: e.target.value }))} />
                  </label>
                  <label className="hr-event-field">
                    <span>{t('hr.event.type')}</span>
                    <select value={eventForm.type}
                      onChange={e => setEventForm(p => ({ ...p, type: e.target.value }))}>
                      <option value="meeting">Meeting</option>
                      <option value="interview">Interview</option>
                      <option value="deadline">Deadline</option>
                      <option value="report">Report</option>
                    </select>
                  </label>
                  <div className="hr-modal__actions">
                    <button type="button" className="hr-camp__btn" onClick={() => setEventModalOpen(false)}>
                      {t('hr.event.cancel')}
                    </button>
                    <button type="submit" className="hr-camp__btn hr-camp__btn--primary" disabled={eventSaving}>
                      {t('hr.event.save')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  )
}
