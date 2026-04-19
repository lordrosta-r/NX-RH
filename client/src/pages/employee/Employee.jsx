// =============================================================================
// Employee — Employee home page (formerly /dashboard)
// Layout: dark violet sidebar + Editorial Enterprise main content.
// Design: docs/design/dashboard/DESIGN.md
// =============================================================================

import React, { useState, useEffect } from 'react'
import './employee.css'
import EmployeeSidebar from './EmployeeSidebar'
import CampaignBanner   from './CampaignBanner'
import CalendarWidget   from '../../components/ui/CalendarWidget'
import AppTopbar        from '../../components/ui/AppTopbar'
import { t as pageT }   from './i18n'
import { useLocale }    from '../../hooks/useLocale'
import { useTheme }     from '../../hooks/useTheme'
import { useAuthUser }  from '../../hooks/useAuthUser'
import {
  ArrowNEIcon, SparklesIcon, HeartIcon, ChevronRightIcon,
} from '../../components/ui/icons'

// ── Color mappings ───────────────────────────────────────────────────────────
const EVENT_COLORS = {
  deadline:  'var(--color-error)',
  interview: 'var(--color-secondary)',
  campaign:  'var(--color-primary)',
  feedback:  'var(--color-tertiary)',
}

const NOTIF_COLORS = [
  'var(--color-primary)',
  'var(--color-secondary)',
  'var(--color-tertiary)',
  'var(--color-secondary-container)',
]

// ── Spotlight image (office interior — replaceable with a local asset in /public)
const SPOTLIGHT_IMG = '/assets/spotlight.jpg'


// ── Component ────────────────────────────────────────────────────────────────
export default function Employee() {
  const { t, locale, setLocale } = useLocale(pageT)
  const { theme, cycleTheme }    = useTheme()
  const { user, loading: authLoading } = useAuthUser()

  // ── Calendar events ──────────────────────────────────────────────────────
  const [events, setEvents]               = useState([])
  const [eventsLoading, setEventsLoading] = useState(true)
  const [eventsError, setEventsError]     = useState(null)

  // ── Pending evaluations (notifications) ──────────────────────────────────
  const [evaluations, setEvaluations]   = useState([])
  const [evalsLoading, setEvalsLoading] = useState(true)
  const [evalsError, setEvalsError]     = useState(null)

  // ── Active campaign ──────────────────────────────────────────────────────
  const [campaign, setCampaign]               = useState(null)
  const [campaignLoading, setCampaignLoading] = useState(true)
  const [campaignError, setCampaignError]     = useState(null)

  // ── Quick stats ──────────────────────────────────────────────────────────
  const [stats, setStats] = useState({ total: 0, pending: 0, completed: 0 })

  // ── Resources ────────────────────────────────────────────────────────────
  const [resources, setResources] = useState([])

  // ── Mobile sidebar ───────────────────────────────────────────────────────
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/events', { credentials: 'include' })
        if (!res.ok) throw new Error(res.statusText)
        const json = await res.json()
        if (!cancelled) setEvents(json.data || json)
      } catch (err) {
        if (!cancelled) setEventsError(err.message)
      } finally {
        if (!cancelled) setEventsLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [user])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(
          `/api/evaluations?evaluateeId=${user._id}&status=assigned`,
          { credentials: 'include' },
        )
        if (!res.ok) throw new Error(res.statusText)
        const json = await res.json()
        if (!cancelled) setEvaluations(json.data || json)
      } catch (err) {
        if (!cancelled) setEvalsError(err.message)
      } finally {
        if (!cancelled) setEvalsLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [user])

  // Compute stats from evaluations
  useEffect(() => {
    if (!evaluations.length) return
    const pending   = evaluations.filter(e => ['assigned', 'in_progress'].includes(e.status)).length
    const completed = evaluations.filter(e => !['assigned', 'in_progress'].includes(e.status)).length
    setStats({ total: evaluations.length, pending, completed })
  }, [evaluations])

  // Fetch published resources
  useEffect(() => {
    if (!user) return
    let cancelled = false
    fetch('/api/resources', { credentials: 'include' })
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        const list = Array.isArray(data) ? data : (data.data || [])
        if (!cancelled) setResources(list.filter(r => r.status === 'published').slice(0, 3))
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [user])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/campaigns?status=active', { credentials: 'include' })
        if (!res.ok) throw new Error(res.statusText)
        const json = await res.json()
        const list = json.data || json
        if (!cancelled) setCampaign(Array.isArray(list) ? list[0] || null : list)
      } catch (err) {
        if (!cancelled) setCampaignError(err.message)
      } finally {
        if (!cancelled) setCampaignLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [user])

  if (authLoading) return null
  if (!user)       return null

  async function handleLogout() {
    try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }) } catch { /* ignore */ }
    sessionStorage.clear()
    window.location.href = '/'
  }

  // ── Map evaluations → notification items ─────────────────────────────────
  const notifItems = evaluations.map((ev, i) => ({
    id:    ev._id || i,
    color: NOTIF_COLORS[i % NOTIF_COLORS.length],
    text:  ev.title || ev.campaignName || t('dashboard.notif.pending_eval'),
    meta:  ev.createdAt
      ? new Date(ev.createdAt).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US')
      : '',
  }))

  // ── Map events → CalendarWidget format ───────────────────────────────────
  const calendarEvents = events.map(ev => ({
    date:      ev.date,
    type:      ev.type || 'campaign',
    label:     ev.title || ev.label || '',
    typeLabel: t(`dashboard.calendar.type.${ev.type}`) || ev.type || '',
    color:     EVENT_COLORS[ev.type] || 'var(--color-primary)',
  }))

  const first = user?.firstName ?? ''

  return (
    <div className="db">

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <EmployeeSidebar t={t} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* ── Main area ───────────────────────────────────────────────────── */}
      <div className="db-main">

        <AppTopbar
          searchPlaceholder={t('dashboard.search.placeholder')}
          locale={locale} setLocale={setLocale}
          theme={theme} cycleTheme={cycleTheme}
          notifItems={notifItems}
          user={user} onLogout={handleLogout}
          onMenuToggle={() => setSidebarOpen(o => !o)}
        />

        {/* ── Page content ────────────────────────────────────────────── */}
        <main className="db-content" id="main-content">

          {/* Hero campaign banner */}
          <div className="db-banner-wrap">
            <CampaignBanner
              t={t}
              campaign={campaign}
              loading={campaignLoading}
              error={campaignError}
              userName={first || 'vous'}
            />
          </div>

          {/* ── Bento grid ──────────────────────────────────────────── */}
          <div className="db-bento">

            {/* Quick card — Growth Journey */}
            <article className="db-card">
              <div className="db-card__top">
                <div className="db-card__icon db-card__icon--violet">
                  <SparklesIcon size={18} color="var(--color-secondary)" strokeWidth={1.5} />
                </div>
                <span className="db-card__arrow">
                  <ArrowNEIcon size={14} color="var(--color-outline-variant)" />
                </span>
              </div>
              <div>
                <h3 className="db-card__title">{t('dashboard.card.growth.title')}</h3>
                <p  className="db-card__text">{t('dashboard.card.growth.body')}</p>
              </div>
            </article>

            {/* Quick card — Peer Feedback */}
            <article className="db-card">
              <div className="db-card__top">
                <div className="db-card__icon db-card__icon--red">
                  <HeartIcon size={18} color="var(--color-primary)" strokeWidth={1.5} />
                </div>
                <span className="db-card__arrow">
                  <ArrowNEIcon size={14} color="var(--color-outline-variant)" />
                </span>
              </div>
              <div>
                <h3 className="db-card__title">{t('dashboard.card.feedback.title')}</h3>
                <p  className="db-card__text">{t('dashboard.card.feedback.body')}</p>
              </div>
            </article>

            {/* Evaluation progress mini-stats */}
            <article className="db-stats">
              <h3 className="db-stats__title">{t('dashboard.stats.title')}</h3>
              <div className="db-stats__grid">
                <div className="db-stats__item">
                  <span className="db-stats__value">{stats.total}</span>
                  <span className="db-stats__label">{t('dashboard.stats.total')}</span>
                </div>
                <div className="db-stats__item db-stats__item--warning">
                  <span className="db-stats__value">{stats.pending}</span>
                  <span className="db-stats__label">{t('dashboard.stats.pending')}</span>
                </div>
                <div className="db-stats__item db-stats__item--success">
                  <span className="db-stats__value">{stats.completed}</span>
                  <span className="db-stats__label">{t('dashboard.stats.completed')}</span>
                </div>
              </div>
              <a
                href="/evaluation"
                className="db-stats__cta"
                style={stats.pending === 0 ? { visibility: 'hidden' } : undefined}
              >
                {t('dashboard.stats.cta')} <ChevronRightIcon size={14} />
              </a>
            </article>

            {/* Quick resources */}
            <aside className="db-resources" style={resources.length === 0 ? { visibility: 'hidden' } : undefined}>
              <h3 className="db-resources__title">{t('dashboard.resources.title')}</h3>
              <ul className="db-resources__list">
                {resources.map(r => (
                  <li key={r._id} className="db-resources__item">
                    <span className="db-resources__name">{r.title}</span>
                    <span className="db-resources__type">{r.type.toUpperCase()}</span>
                  </li>
                ))}
              </ul>
            </aside>

            {/* Notification center */}
            <aside className="db-notifs">
              <div className="db-notifs__header">
                <h3 className="db-notifs__title">
                  {t('dashboard.notifications.title').toUpperCase()}
                </h3>
                {notifItems.length > 0 && (
                  <span className="db-notifs__badge">{notifItems.length}</span>
                )}
              </div>

              {evalsLoading ? (
                <p className="db-status-msg">{t('dashboard.loading')}</p>
              ) : evalsError ? (
                <p className="db-status-msg db-status-msg--error">{t('dashboard.error')}</p>
              ) : notifItems.length === 0 ? (
                <p className="db-status-msg">{t('dashboard.notif.empty')}</p>
              ) : (
                <ul className="db-notifs__list">
                  {notifItems.slice(0, 4).map(({ id, color, text, meta }, idx) => (
                    <li key={id} className={`db-notif${idx < notifItems.length - 1 ? ' db-notif--sep' : ''}`}>
                      <span className="db-notif__dot" style={{ background: color }} aria-hidden="true" />
                      <div>
                        <p className="db-notif__text">{text}</p>
                        <p className="db-notif__meta">{meta}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {notifItems.length > 0 && (
                <button type="button" className="db-notifs__viewall">
                  {t('dashboard.notifications.viewall')}
                </button>
              )}
            </aside>

            {/* Calendar */}
            <div className="db-calendar-wrap">
              {eventsLoading ? (
                <p className="db-status-msg">{t('dashboard.loading')}</p>
              ) : eventsError ? (
                <p className="db-status-msg db-status-msg--error">{t('dashboard.error')}</p>
              ) : (
                <CalendarWidget
                  title={t('dashboard.calendar.title')}
                  events={calendarEvents}
                  locale={locale}
                  labelPrevMonth={t('dashboard.calendar.prev_month')}
                  labelNextMonth={t('dashboard.calendar.next_month')}
                />
              )}
            </div>

            {/* Team spotlight — col-span 2, with real image */}
            <article className="db-spotlight">
              <img
                src={SPOTLIGHT_IMG}
                alt=""
                loading="lazy"
                className="db-spotlight__img"
                aria-hidden="true"
                onError={e => { e.target.style.display = 'none' }}
              />
              <div className="db-spotlight__bg" aria-hidden="true" />
              <div className="db-spotlight__overlay">
                <div className="db-spotlight__kicker">
                  <span className="db-spotlight__line" aria-hidden="true" />
                  <span className="db-spotlight__label">
                    {t('dashboard.spotlight.label').toUpperCase()}
                  </span>
                </div>
                <h3 className="db-spotlight__title">{t('dashboard.spotlight.title')}</h3>
                <p  className="db-spotlight__body">{t('dashboard.spotlight.body')}</p>
              </div>
            </article>

          </div>
        </main>
      </div>
    </div>
  )
}
