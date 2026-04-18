// =============================================================================
// Dashboard — Employee home page
// Layout: dark violet sidebar + Editorial Enterprise main content.
// Design: docs/design/dashboard/DESIGN.md
// =============================================================================

import React from 'react'
import './dashboard.css'
import DashboardSidebar from './DashboardSidebar'
import CampaignBanner   from './CampaignBanner'
import CalendarWidget   from '../../components/ui/CalendarWidget'
import AppTopbar        from '../../components/ui/AppTopbar'
import { t as pageT }   from './i18n'
import { useLocale }    from '../../hooks/useLocale'
import { useTheme }     from '../../hooks/useTheme'
import { useAuthUser }  from '../../hooks/useAuthUser'
import {
  ArrowNEIcon, SparklesIcon, HeartIcon,
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

const NOTIF_COLORS = [
  'var(--color-primary)',
  'var(--color-secondary)',
  'var(--color-tertiary)',
  'var(--color-secondary-container)',
]

// ── Spotlight image (office interior — replaceable with a local asset in /public)
const SPOTLIGHT_IMG = '/assets/spotlight.jpg'


// ── Component ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { t, locale, setLocale } = useLocale(pageT)
  const { theme, cycleTheme }  = useTheme()
  const { user, loading }      = useAuthUser()

  if (loading) return null
  if (!user)   return null

  async function handleLogout() {
    try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }) } catch { /* ignore */ }
    sessionStorage.clear()
    window.location.href = '/'
  }

  const notifItems = [1, 2, 3, 4].map(n => ({
    id: n, color: NOTIF_COLORS[n - 1],
    text: t(`dashboard.notif.${n}`), meta: t(`dashboard.notif.${n}.meta`),
  }))

  const first = user?.firstName ?? ''

  return (
    <div className="db">

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <DashboardSidebar t={t} />

      {/* ── Main area ───────────────────────────────────────────────────── */}
      <div className="db-main">

        <AppTopbar
          searchPlaceholder={t('dashboard.search.placeholder')}
          locale={locale} setLocale={setLocale}
          theme={theme} cycleTheme={cycleTheme}
          notifItems={notifItems}
          user={user} onLogout={handleLogout}
        />

        {/* ── Page content ────────────────────────────────────────────── */}
        <main className="db-content" id="main-content">

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
              <button type="button" className="db-notifs__viewall">
                {t('dashboard.notifications.viewall')}
              </button>
            </aside>

            {/* Calendar — col-span 2 */}
            <div className="db-calendar-wrap">
              <CalendarWidget
                title={t('dashboard.calendar.title')}
                events={makeCalendarEvents(t)}
                locale={locale}
                labelPrevMonth={t('dashboard.calendar.prev_month')}
                labelNextMonth={t('dashboard.calendar.next_month')}
              />
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
