// =============================================================================
// Dashboard — Employee home page
// Layout: dark violet sidebar + Editorial Enterprise main content.
// Design: docs/design/dashboard/DESIGN.md
// =============================================================================

import React, { useEffect, useState, useRef } from 'react'
import './dashboard.css'
import DashboardSidebar from './DashboardSidebar'
import CampaignBanner   from './CampaignBanner'
import CalendarWidget   from '../../components/ui/CalendarWidget'
import { t as pageT }   from './i18n'
import { useLocale }    from '../../hooks/useLocale'
import { useTheme }     from '../../hooks/useTheme'
import {
  BellIcon, SearchIcon, ArrowNEIcon,
  SunIcon, MoonIcon, PaletteIcon, HelpIcon,
  SparklesIcon, HeartIcon,
} from '../../components/ui/icons'

// ── Mock calendar events (remplacer par API quand dispo) ─────────────────────
// typeLabel is rendered in the legend — no i18n key needed inside CalendarWidget
const makeCalendarEvents = (t) => [
  { date: '2026-04-15', type: 'deadline',  label: t('dashboard.calendar.type.deadline'),  typeLabel: t('dashboard.calendar.type.deadline'),  color: 'var(--color-error)' },
  { date: '2026-04-22', type: 'interview', label: t('dashboard.calendar.type.interview'), typeLabel: t('dashboard.calendar.type.interview'), color: 'var(--color-secondary)' },
  { date: '2026-04-28', type: 'campaign',  label: t('dashboard.calendar.type.campaign'),  typeLabel: t('dashboard.calendar.type.campaign'),  color: 'var(--color-primary)' },
  { date: '2026-05-05', type: 'feedback',  label: t('dashboard.calendar.type.feedback'),  typeLabel: t('dashboard.calendar.type.feedback'),  color: 'var(--color-tertiary)' },
  { date: '2026-05-12', type: 'interview', label: t('dashboard.calendar.type.interview'), typeLabel: t('dashboard.calendar.type.interview'), color: 'var(--color-secondary)' },
]

// ── Helpers ──────────────────────────────────────────────────────────────────
function getCurrentUser() {
  try { return JSON.parse(sessionStorage.getItem('user')) } catch { return null }
}

const NOTIF_COLORS = [
  'var(--color-primary)',
  'var(--color-secondary)',
  'var(--color-tertiary)',
  'var(--color-secondary-container)',
]

// ── Spotlight image (office interior — replaceable with a local asset in /public)
const SPOTLIGHT_IMG = 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=70'

// ── Theme icon — one per state ────────────────────────────────────────────────
function ThemeIcon({ theme }) {
  const props = { size: 17, color: 'var(--color-on-surface-variant)' }
  if (theme === 'dark')         return <SunIcon     {...props} />
  if (theme === 'light')        return <PaletteIcon {...props} />
  return                               <MoonIcon    {...props} />
}

function themeLabel(theme) {
  if (theme === 'dark')  return 'Passer en mode clair'
  if (theme === 'light') return 'Passer en mode sidebar claire'
  return 'Passer en mode sombre'
}

// ── Component ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { t, locale }          = useLocale(pageT)
  const { theme, cycleTheme }  = useTheme()
  const [user, setUser]        = useState(null)
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef(null)

  useEffect(() => { setUser(getCurrentUser()) }, [])

  // Close notification dropdown when clicking outside
  useEffect(() => {
    if (!notifOpen) return
    function onClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [notifOpen])

  const notifItems = [1, 2, 3, 4].map(n => ({
    id:    n,
    color: NOTIF_COLORS[n - 1],
    text:  t(`dashboard.notif.${n}`),
    meta:  t(`dashboard.notif.${n}.meta`),
  }))

  const dateLabel = new Date().toLocaleDateString(
    locale === 'fr' ? 'fr-FR' : 'en-US',
    { day: 'numeric', month: 'long', year: 'numeric' }
  )

  // User info
  const first    = user?.firstName ?? ''
  const last     = user?.lastName  ?? ''
  const initials = `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase() || 'U'
  const fullName = first || last ? `${first} ${last}`.trim() : 'Utilisateur'
  const role     = user?.role ?? 'employee'

  return (
    <div className="db">

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <DashboardSidebar t={t} />

      {/* ── Main area ───────────────────────────────────────────────────── */}
      <div className="db-main">

        {/* ── Topbar ──────────────────────────────────────────────────── */}
        <header className="db-topbar">

          {/* Search pill */}
          <div className="db-search" role="search">
            <SearchIcon size={15} color="var(--color-outline)" />
            <input
              type="text"
              className="db-search__input"
              placeholder={t('dashboard.search.placeholder')}
              aria-label={t('dashboard.search.placeholder')}
            />
          </div>

          {/* Right cluster */}
          <div className="db-topbar__right">

            {/* Date */}
            <span className="db-topbar__date">{dateLabel}</span>

            <div className="db-topbar__sep" aria-hidden="true" />

            {/* Theme cycle */}
            <button
              className="db-icon-btn"
              onClick={cycleTheme}
              aria-label={themeLabel(theme)}
              title={themeLabel(theme)}
            >
              <ThemeIcon theme={theme} />
            </button>

            {/* Help */}
            <button
              className="db-icon-btn"
              aria-label="Aide"
              title="Aide"
            >
              <HelpIcon size={17} color="var(--color-on-surface-variant)" strokeWidth={1.5} />
            </button>

            {/* Notification bell + dropdown */}
            <div className="db-notif-wrap" ref={notifRef}>
              <button
                className="db-icon-btn db-icon-btn--notif"
                onClick={() => setNotifOpen(o => !o)}
                aria-label="Notifications"
                aria-expanded={notifOpen}
              >
                <BellIcon size={17} color="var(--color-on-surface-variant)" />
                <span className="db-bell-dot" aria-hidden="true" />
              </button>

              {notifOpen && (
                <div className="db-notif-dropdown" role="dialog" aria-label="Notifications">
                  <div className="db-notif-dropdown__header">
                    <span className="db-notif-dropdown__title">
                      {t('dashboard.notifications.title').toUpperCase()}
                    </span>
                    <span className="db-notif-dropdown__badge">{notifItems.length}</span>
                  </div>
                  <ul className="db-notif-dropdown__list">
                    {notifItems.map(({ id, color, text, meta }, idx) => (
                      <li key={id} className={`db-notif-item${idx < notifItems.length - 1 ? ' db-notif-item--sep' : ''}`}>
                        <span className="db-notif-item__dot" style={{ background: color }} aria-hidden="true" />
                        <div>
                          <p className="db-notif-item__text">{text}</p>
                          <p className="db-notif-item__meta">{meta}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <button className="db-notif-dropdown__footer" onClick={() => setNotifOpen(false)}>
                    {t('dashboard.notifications.viewall')}
                  </button>
                </div>
              )}
            </div>

            <div className="db-topbar__sep" aria-hidden="true" />

            {/* User profile — top right */}
            <div className="db-topbar__user">
              <div className="db-topbar__user-info">
                <p className="db-topbar__user-name">{fullName}</p>
                <p className="db-topbar__user-role">{role}</p>
              </div>
              <div className="db-topbar__avatar" aria-hidden="true">{initials}</div>
            </div>

          </div>
        </header>

        {/* ── Page content ────────────────────────────────────────────── */}
        <main className="db-content">

          {/* Hero campaign banner — greeting lives inside the card */}
          <div className="db-banner-wrap">
            <CampaignBanner t={t} progress={0} userName={first || 'vous'} />
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

            {/* Notification center — row-span 2 */}
            <aside className="db-notifs">
              <div className="db-notifs__header">
                <h3 className="db-notifs__title">
                  {t('dashboard.notifications.title').toUpperCase()}
                </h3>
                <span className="db-notifs__badge">{notifItems.length}</span>
              </div>
              <ul className="db-notifs__list">
                {notifItems.slice(0, 2).map(({ id, color, text, meta }, idx) => (
                  <li key={id} className={`db-notif${idx < 1 ? ' db-notif--sep' : ''}`}>
                    <span className="db-notif__dot" style={{ background: color }} aria-hidden="true" />
                    <div>
                      <p className="db-notif__text">{text}</p>
                      <p className="db-notif__meta">{meta}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <button className="db-notifs__viewall">
                {t('dashboard.notifications.viewall')}
              </button>
            </aside>

            {/* Calendar — col-span 2 */}
            <div className="db-calendar-wrap">
              <CalendarWidget
                title={t('dashboard.calendar.title')}
                events={makeCalendarEvents(t)}
                locale={locale}
              />
            </div>

            {/* Team spotlight — col-span 2, with real image */}
            <article className="db-spotlight">
              <img
                src={SPOTLIGHT_IMG}
                alt=""
                className="db-spotlight__img"
                aria-hidden="true"
                onError={e => { e.target.style.display = 'none' }}
              />
              {/* Fallback gradient always rendered (visible if img fails) */}
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
