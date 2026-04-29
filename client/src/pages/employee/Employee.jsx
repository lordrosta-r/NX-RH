// =============================================================================
// Employee — Page tableau de bord collaborateur (/employee)
//
// Composant racine de la route /employee.
// Le topbar et la sidebar proviennent de <AuthedLayout> (App.jsx).
// Ce composant ne gère que le contenu de la page.
//
// Données chargées :
//   - /api/campaigns?status=active   → campagne active
//   - /api/evaluations?evaluateeId=  → évaluations assignées
//   - /api/events                    → événements calendrier
//   - /api/resources                 → ressources publiées
// =============================================================================

import React, { useEffect } from 'react'
import { useNavigate }          from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useAuth }              from '../../contexts/AuthContext'
import { useTranslate, useLocaleCtx } from '../../contexts/LocaleContext'
import { t as pageT }           from './i18n'
import CampaignBanner           from './CampaignBanner'
import CalendarWidget           from '../../components/ui/CalendarWidget'
import { ArrowUpRight, Sparkles, Heart, ChevronRight, CheckSquare, Square } from 'lucide-react'
import { Skeleton } from '../../components/ui/Skeleton'
import './employee.css'

// ── Correspondance type d'événement → token couleur ─────────────────────────
const EVENT_COLORS = {
  deadline:  'var(--color-error)',
  interview: 'var(--color-secondary)',
  campaign:  'var(--color-primary)',
  feedback:  'var(--color-tertiary)',
}

// ── Couleurs de rotation pour les puces de notification ─────────────────────
const NOTIF_COLORS = [
  'var(--color-primary)',
  'var(--color-secondary)',
  'var(--color-tertiary)',
  'var(--color-secondary-container)',
]

// ── Calcule la progression individuelle d'une évaluation ─────────────────────
function computeEvalProgress(answers = []) {
  const prefixMap = { self_: 'self', n1_: 'n-1', obj_: 'objectives', asp_: 'aspirations' }
  const done = new Set()
  for (const { questionId = '' } of answers) {
    for (const [prefix, phase] of Object.entries(prefixMap)) {
      if (questionId.startsWith(prefix)) { done.add(phase); break }
    }
  }
  return Math.round((done.size / 4) * 100)
}

// ── Bandeau onboarding ────────────────────────────────────────────────────────
function OnboardingBanner({ userId, onboarding, t }) {
  const { refreshUser } = useAuth()

  const toggleStep = useMutation({
    mutationFn: ({ idx, done }) =>
      fetch(`/api/users/${userId}/onboarding/${idx}`, {
        method:      'PATCH',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify({ done }),
      }).then(r => r.ok ? r.json() : Promise.reject(new Error(r.statusText))),
    onSuccess: () => refreshUser(),
  })

  const completeMutation = useMutation({
    mutationFn: () =>
      fetch(`/api/users/${userId}/onboarding/complete`, {
        method:      'PATCH',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        '{}',
      }).then(r => r.ok ? r.json() : Promise.reject(new Error(r.statusText))),
    onSuccess: () => refreshUser(),
  })

  if (!onboarding || onboarding.completed) return null
  const steps = onboarding.steps ?? []
  const hasIncomplete = steps.some(s => !s.done)
  if (!hasIncomplete && !onboarding.completed) return null

  const allDone = steps.every(s => s.done)

  return (
    <div className="db-onboarding">
      <div className="db-onboarding__header">
        <h3 className="db-onboarding__title">{t('onb.title')}</h3>
        <p className="db-onboarding__sub">{t('onb.subtitle')}</p>
      </div>
      <ul className="db-onboarding__steps">
        {steps.map((s, idx) => (
          <li key={idx} className="db-onboarding__step">
            <button
              type="button"
              className={`db-onboarding__check${s.done ? ' db-onboarding__check--done' : ''}`}
              onClick={() => toggleStep.mutate({ idx, done: !s.done })}
              disabled={toggleStep.isPending}
              aria-pressed={s.done}
            >
              {s.done
                ? <CheckSquare size={16} strokeWidth={1.5} />
                : <Square size={16} strokeWidth={1.5} />
              }
              <span>{s.step}</span>
            </button>
          </li>
        ))}
      </ul>
      {allDone && (
        <button
          type="button"
          className="db-onboarding__complete-btn"
          onClick={() => completeMutation.mutate()}
          disabled={completeMutation.isPending}
        >
          {completeMutation.isPending ? t('onb.completing') : t('onb.complete_btn')}
        </button>
      )}
    </div>
  )
}

// =============================================================================
export default function Employee() {
  const { user }        = useAuth()
  const { locale }      = useLocaleCtx()
  const t               = useTranslate(pageT)
  const navigate        = useNavigate()

  // ── Campagne active ────────────────────────────────────────────────────────
  const { data: campaign = null, isLoading: campaignLoading, isError: campaignError } = useQuery({
    queryKey: ['campaign-active'],
    queryFn:  () =>
      fetch('/api/campaigns?status=active', { credentials: 'include' })
        .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json() })
        .then(j => { const l = j.data ?? j; return (Array.isArray(l) ? l[0] : l) ?? null }),
    staleTime: 5 * 60 * 1000,
    enabled: !!user,
  })

  // ── Évaluations de l'utilisateur courant ──────────────────────────────────
  const { data: evaluations = [], isLoading: evalsLoading, isError: evalsError } = useQuery({
    queryKey: ['evaluations-me', user?._id],
    queryFn:  () =>
      fetch(`/api/evaluations?evaluateeId=${user._id}`, { credentials: 'include' })
        .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json() })
        .then(j => {
          const list = j.data ?? j
          // Garder uniquement les auto-évals (evaluator = evaluatee)
          return Array.isArray(list)
            ? list.filter(e => {
                const evtor = e.evaluatorId?._id ?? e.evaluatorId
                const evtee = e.evaluateeId?._id ?? e.evaluateeId
                return evtor?.toString() === evtee?.toString()
              })
            : []
        }),
    staleTime: 5 * 60 * 1000,
    enabled: !!user,
  })

  // ── Détail de l'évaluation active (la liste n'inclut pas les answers) ────────
  const myEvalId = (evaluations.find(e => ['assigned', 'in_progress'].includes(e.status))?._id) ?? null
  const { data: activeEvalDetail } = useQuery({
    queryKey: ['eval', myEvalId],
    queryFn:  () =>
      fetch(`/api/evaluations/${myEvalId}`, { credentials: 'include' })
        .then(r => r.ok ? r.json() : null),
    enabled:   !!myEvalId,
    staleTime: 30 * 1000,
  })

  // ── Événements calendrier ─────────────────────────────────────────────────
  const { data: events = [], isLoading: eventsLoading, isError: eventsError } = useQuery({
    queryKey: ['events'],
    queryFn:  () =>
      fetch('/api/events', { credentials: 'include' })
        .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json() })
        .then(j => j.data ?? j),
    staleTime: 5 * 60 * 1000,
    enabled: !!user,
  })

  // ── Ressources publiées (3 premières) ─────────────────────────────────────
  const { data: resources = [] } = useQuery({
    queryKey: ['resources-published'],
    queryFn:  () =>
      fetch('/api/resources', { credentials: 'include' })
        .then(r => r.ok ? r.json() : [])
        .then(d => (Array.isArray(d) ? d : (d.data ?? []))
          .filter(r => r.status === 'published').slice(0, 3)),
    staleTime: 5 * 60 * 1000,
    enabled: !!user,
  })

  // ── Statistiques dérivées ─────────────────────────────────────────────────
  const pending   = evaluations.filter(e => ['assigned', 'in_progress'].includes(e.status)).length
  const completed = evaluations.filter(e => !['assigned', 'in_progress'].includes(e.status)).length
  const stats = { total: evaluations.length, pending, completed }

  // ── Progression individuelle de l'évaluation en cours ─────────────────────
  const myEval = evaluations.find(e => ['assigned', 'in_progress'].includes(e.status))
  const userProgress = computeEvalProgress((activeEvalDetail ?? myEval)?.answers ?? [])

  // ── Notifications dérivées des évaluations ────────────────────────────────
  const notifItems = evaluations.map((ev, i) => ({
    id:    ev._id ?? i,
    color: NOTIF_COLORS[i % NOTIF_COLORS.length],
    text:  ev.campaignId?.name ?? t('dashboard.notif.pending_eval'),
    meta:  ev.createdAt
      ? new Date(ev.createdAt).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US')
      : '',
  }))

  // ── Événements pour le calendrier ─────────────────────────────────────────
  const calendarEvents = events.map(ev => ({
    date:      ev.date,
    type:      ev.type ?? 'campaign',
    label:     ev.title ?? ev.label ?? '',
    typeLabel: t(`dashboard.calendar.type.${ev.type}`) ?? ev.type ?? '',
    color:     EVENT_COLORS[ev.type] ?? 'var(--color-primary)',
  }))

  const firstName = user?.firstName ?? ''

  return (
    <>
      {/* ── Bandeau onboarding ─────────────────────────────────────────────── */}
      {user && !user.onboarding?.completed && (
        <OnboardingBanner userId={user._id} onboarding={user.onboarding} t={t} />
      )}

      {/* ── Bannière hero ─────────────────────────────────────────────────── */}
      <div className="db-banner-wrap">
        <CampaignBanner
          t={t}
          campaign={campaign}
          loading={campaignLoading}
          error={campaignError}
          userName={firstName || 'vous'}
          userProgress={userProgress}
          onNavigate={() => {
            const first = evaluations.find(e => ['assigned', 'in_progress'].includes(e.status))
            if (first) navigate(`/evaluation/${first._id}`)
          }}
        />
      </div>

      {/* ── Bento grid ────────────────────────────────────────────────────── */}
      <div className="db-bento">

        {/* Carte : parcours de croissance */}
        <article
          className="db-card"
          role="button"
          tabIndex={0}
          onClick={() => navigate('/employee/goals')}
          onKeyDown={e => e.key === 'Enter' && navigate('/employee/goals')}
          aria-label={t('dashboard.card.growth.title')}
        >
          <div className="db-card__top">
            <div className="db-card__icon db-card__icon--violet">
              <Sparkles size={18} color="var(--color-secondary)" strokeWidth={1.5} />
            </div>
            <span className="db-card__arrow">
              <ArrowUpRight size={14} color="var(--color-outline-variant)" />
            </span>
          </div>
          <div>
            <h3 className="db-card__title">{t('dashboard.card.growth.title')}</h3>
            <p  className="db-card__text">{t('dashboard.card.growth.body')}</p>
          </div>
        </article>

        {/* Carte : retour par les pairs */}
        <article
          className="db-card"
          role="button"
          tabIndex={0}
          onClick={() => navigate('/employee/history')}
          onKeyDown={e => e.key === 'Enter' && navigate('/employee/history')}
          aria-label={t('dashboard.card.feedback.title')}
        >
          <div className="db-card__top">
            <div className="db-card__icon db-card__icon--red">
              <Heart size={18} color="var(--color-primary)" strokeWidth={1.5} />
            </div>
            <span className="db-card__arrow">
              <ArrowUpRight size={14} color="var(--color-outline-variant)" />
            </span>
          </div>
          <div>
            <h3 className="db-card__title">{t('dashboard.card.feedback.title')}</h3>
            <p  className="db-card__text">{t('dashboard.card.feedback.body')}</p>
          </div>
        </article>

        {/* Centre de notifications (col 3, couvre les 2 lignes) */}
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
            <div className="sk-list" aria-hidden="true">
              {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="sk-list__item" />)}
            </div>
          ) : evalsError ? (
            <p className="db-status-msg db-status-msg--error">{t('dashboard.error')}</p>
          ) : notifItems.length === 0 ? (
            <p className="db-status-msg">{t('dashboard.notif.empty')}</p>
          ) : (
            <ul className="db-notifs__list">
              {notifItems.slice(0, 4).map(({ id, color, text, meta }, idx) => (
                <li
                  key={id}
                  className={`db-notif${idx < notifItems.length - 1 ? ' db-notif--sep' : ''}`}
                >
                  <span
                    className="db-notif__dot"
                    style={{ background: color }}
                    aria-hidden="true"
                  />
                  <div>
                    <p className="db-notif__text">{text}</p>
                    <p className="db-notif__meta">{meta}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {notifItems.length > 0 && (
            <button
              type="button"
              className="db-notifs__viewall"
              onClick={() => navigate('/employee/history')}
            >
              {t('dashboard.notifications.viewall')}
            </button>
          )}
        </aside>

        {/* Statistiques d'évaluations */}
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
          {stats.pending > 0 && (
            <button
              type="button"
              onClick={() => {
                const first = evaluations.find(ev => ['assigned', 'in_progress'].includes(ev.status))
                if (first) navigate(`/evaluation/${first._id}`)
              }}
              className="db-stats__cta"
            >
              {t('dashboard.stats.cta')} <ChevronRight size={14} />
            </button>
          )}
        </article>

        {/* Ressources récentes (masquées si vides) */}
        {resources.length > 0 && (
          <aside className="db-resources">
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
        )}

        {/* Calendrier des échéances */}
        <div className="db-calendar-wrap">
          {eventsLoading ? (
            <Skeleton height="280px" style={{ borderRadius: 'var(--radius-md)' }} />
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



      </div>
    </>
  )
}

