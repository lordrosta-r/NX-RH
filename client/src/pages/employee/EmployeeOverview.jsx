// =============================================================================
// EmployeeOverview — Vue d'ensemble du portail Employee
// Contient toute la logique d'origine de Employee.jsx (campagne active,
// notifications, calendrier, ressources, spotlight…).
//
// Pas de sidebar, pas de topbar, pas de wrapper de page. Le shell parent
// (Employee.jsx) fournit ces éléments.
// Les données sont chargées via useQuery (@tanstack/react-query) :
//   - staleTime 5min → pas de refetch en naviguant entre vues
//   - retour instantané depuis le cache lors du retour sur cette vue
// =============================================================================

import React, { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import CampaignBanner   from './CampaignBanner'
import CalendarWidget   from '../../components/ui/CalendarWidget'
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

const SPOTLIGHT_IMG = '/assets/spotlight.jpg'


export default function EmployeeOverview({ t, locale, user, onNotifItemsChange }) {
  const navigate = useNavigate()

  // ── Fetches via React Query — données cachées 5min, pas de refetch en nav ──

  const { data: events = [], isLoading: eventsLoading, isError: eventsError } = useQuery({
    queryKey: ['events'],
    queryFn:  () => fetch('/api/events', { credentials: 'include' })
      .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json() })
      .then(j => j.data || j),
    enabled: !!user,
  })

  const { data: evaluations = [], isLoading: evalsLoading, isError: evalsError } = useQuery({
    queryKey: ['evaluations-assigned', user?._id],
    queryFn:  () => fetch(`/api/evaluations?evaluateeId=${user._id}&status=assigned`, { credentials: 'include' })
      .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json() })
      .then(j => j.data || j),
    enabled: !!user,
  })

  const { data: campaign = null, isLoading: campaignLoading, isError: campaignError } = useQuery({
    queryKey: ['campaign-active'],
    queryFn:  () => fetch('/api/campaigns?status=active', { credentials: 'include' })
      .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json() })
      .then(j => { const l = j.data || j; return (Array.isArray(l) ? l[0] : l) || null }),
    enabled: !!user,
  })

  const { data: resources = [] } = useQuery({
    queryKey: ['resources-published'],
    queryFn:  () => fetch('/api/resources', { credentials: 'include' })
      .then(r => r.ok ? r.json() : [])
      .then(d => (Array.isArray(d) ? d : (d.data || []))
        .filter(r => r.status === 'published').slice(0, 3)),
    enabled: !!user,
  })

  // ── Stats dérivées ────────────────────────────────────────────────────────
  const pending   = evaluations.filter(e => ['assigned', 'in_progress'].includes(e.status)).length
  const completed = evaluations.filter(e => !['assigned', 'in_progress'].includes(e.status)).length
  const stats = { total: evaluations.length, pending, completed }

  // ── Map evaluations → notification items ─────────────────────────────────
  const notifItems = evaluations.map((ev, i) => ({
    id:    ev._id || i,
    color: NOTIF_COLORS[i % NOTIF_COLORS.length],
    text:  ev.title || ev.campaignName || t('dashboard.notif.pending_eval'),
    meta:  ev.createdAt
      ? new Date(ev.createdAt).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US')
      : '',
  }))

  // Lift les notifs vers le shell pour qu'il puisse les passer au topbar
  useEffect(() => {
    if (typeof onNotifItemsChange === 'function') onNotifItemsChange(notifItems)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evaluations.length, locale])

  const calendarEvents = events.map(ev => ({
    date:      ev.date,
    type:      ev.type || 'campaign',
    label:     ev.title || ev.label || '',
    typeLabel: t(`dashboard.calendar.type.${ev.type}`) || ev.type || '',
    color:     EVENT_COLORS[ev.type] || 'var(--color-primary)',
  }))

  const first = user?.firstName ?? ''

  return (
    <main className="db-content" id="main-content">
      <div className="db-banner-wrap">
        <CampaignBanner
          t={t}
          campaign={campaign}
          loading={campaignLoading}
          error={campaignError}
          userName={first || 'vous'}
          onNavigate={() => navigate('/employee/evaluation')}
        />
      </div>

      <div className="db-bento">
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
            href="/employee/evaluation"
            onClick={(e) => { e.preventDefault(); navigate('/employee/evaluation'); }}
            className="db-stats__cta"
            style={stats.pending === 0 ? { visibility: 'hidden' } : undefined}
          >
            {t('dashboard.stats.cta')} <ChevronRightIcon size={14} />
          </a>
        </article>

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
  )
}
