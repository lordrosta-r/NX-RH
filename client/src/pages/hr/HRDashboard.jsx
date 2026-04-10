// =============================================================================
// HRDashboard — HR portal home page
// Sections: Welcome hero · KPIs · Campaign status · Alerts ·
//           Calendar (entretiens) · Form Editor · Resources · Dept table · Actions
// Design: docs/design/dashboard/DESIGN.md
// =============================================================================

import React, { useEffect, useState, useRef } from 'react'
import './hr.css'
import HRSidebar        from './HRSidebar'
import HRWelcomeBanner  from './HRWelcomeBanner'
import CalendarWidget   from '../../components/ui/CalendarWidget'
import { t as pageT }  from './i18n'
import { useLocale }   from '../../hooks/useLocale'
import { useTheme }    from '../../hooks/useTheme'
import {
  BellIcon, SearchIcon,
  SunIcon, MoonIcon, PaletteIcon, HelpIcon, DocumentIcon,
} from '../../components/ui/icons'

// ── Mock data ────────────────────────────────────────────────────────────────

const KPIS = [
  { id: 'campaigns',  value: '1',   accent: false },
  { id: 'completion', value: '67%', accent: false },
  { id: 'overdue',    value: '8',   accent: true  },
  { id: 'validated',  value: '43',  accent: false },
]

const PHASES = [
  { id: 'self',      pct: 78, done: 34, total: 44 },
  { id: 'review',    pct: 54, done: 24, total: 44 },
  { id: 'interview', pct: 31, done: 14, total: 44 },
]

const ALERTS = [
  { id: 1, level: 'error',   textKey: 'hr.alert.1.text', metaKey: 'hr.alert.1.meta' },
  { id: 2, level: 'warning', textKey: 'hr.alert.2.text', metaKey: 'hr.alert.2.meta' },
  { id: 3, level: 'warning', textKey: 'hr.alert.3.text', metaKey: 'hr.alert.3.meta' },
  { id: 4, level: 'info',    textKey: 'hr.alert.4.text', metaKey: 'hr.alert.4.meta' },
]

const DEPARTMENTS = [
  { name: 'RH',         total: 12, pct: 92 },
  { name: 'Finance',    total: 8,  pct: 87 },
  { name: 'Marketing',  total: 15, pct: 73 },
  { name: 'R&D',        total: 34, pct: 61 },
  { name: 'Commercial', total: 9,  pct: 33 },
]

const TEMPLATES = [
  { id: 1, nameKey: 'hr.form.tpl.1.name', typeKey: 'hr.form.tpl.type.self',  status: 'published', campaigns: 1 },
  { id: 2, nameKey: 'hr.form.tpl.2.name', typeKey: 'hr.form.tpl.type.peer',  status: 'published', campaigns: 0 },
  { id: 3, nameKey: 'hr.form.tpl.3.name', typeKey: 'hr.form.tpl.type.self',  status: 'draft',     campaigns: 0 },
]

const RESOURCES = [
  { id: 1, nameKey: 'hr.res.1.name', type: 'pdf',  dateKey: 'hr.res.1.date', status: 'published' },
  { id: 2, nameKey: 'hr.res.2.name', type: 'xlsx', dateKey: 'hr.res.2.date', status: 'published' },
  { id: 3, nameKey: 'hr.res.3.name', type: 'pdf',  dateKey: 'hr.res.3.date', status: 'draft'     },
  { id: 4, nameKey: 'hr.res.4.name', type: 'pdf',  dateKey: 'hr.res.4.date', status: 'published' },
]

// ── Calendar events — entretiens + échéances RH ──────────────────────────────
const makeCalendarEvents = (t) => [
  { date: '2026-04-15', type: 'deadline',  label: t('hr.calendar.type.deadline'),  typeLabel: t('hr.calendar.type.deadline'),  color: 'var(--color-error)'     },
  { date: '2026-04-17', type: 'interview', label: t('hr.calendar.type.interview'), typeLabel: t('hr.calendar.type.interview'), color: 'var(--color-secondary)' },
  { date: '2026-04-17', type: 'interview', label: t('hr.calendar.type.interview'), typeLabel: t('hr.calendar.type.interview'), color: 'var(--color-secondary)' },
  { date: '2026-04-20', type: 'interview', label: t('hr.calendar.type.interview'), typeLabel: t('hr.calendar.type.interview'), color: 'var(--color-secondary)' },
  { date: '2026-04-22', type: 'meeting',   label: t('hr.calendar.type.meeting'),   typeLabel: t('hr.calendar.type.meeting'),   color: 'var(--color-tertiary)'  },
  { date: '2026-04-24', type: 'interview', label: t('hr.calendar.type.interview'), typeLabel: t('hr.calendar.type.interview'), color: 'var(--color-secondary)' },
  { date: '2026-04-28', type: 'deadline',  label: t('hr.calendar.type.deadline'),  typeLabel: t('hr.calendar.type.deadline'),  color: 'var(--color-error)'     },
  { date: '2026-05-05', type: 'report',    label: t('hr.calendar.type.report'),    typeLabel: t('hr.calendar.type.report'),    color: 'var(--color-outline)'   },
]

// ── Helpers ──────────────────────────────────────────────────────────────────
function getCurrentUser() {
  try { return JSON.parse(sessionStorage.getItem('user')) } catch { return null }
}

function ThemeIcon({ theme }) {
  const p = { size: 17, color: 'var(--color-on-surface-variant)' }
  if (theme === 'dark')  return <SunIcon     {...p} />
  if (theme === 'light') return <PaletteIcon {...p} />
  return                        <MoonIcon    {...p} />
}

function themeLabel(theme) {
  if (theme === 'dark')  return 'Passer en mode clair'
  if (theme === 'light') return 'Passer en mode sidebar claire'
  return 'Passer en mode sombre'
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

// ── Component ─────────────────────────────────────────────────────────────────
export default function HRDashboard() {
  const { t, locale }         = useLocale(pageT)
  const { theme, cycleTheme } = useTheme()
  const [user, setUser]       = useState(null)
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef(null)

  useEffect(() => { setUser(getCurrentUser()) }, [])

  useEffect(() => {
    if (!notifOpen) return
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [notifOpen])

  const dateLabel = new Date().toLocaleDateString(
    locale === 'fr' ? 'fr-FR' : 'en-US',
    { day: 'numeric', month: 'long', year: 'numeric' }
  )

  const first    = user?.firstName ?? 'RH'
  const last     = user?.lastName  ?? ''
  const initials = `${first[0] ?? 'R'}${last[0] ?? 'H'}`.toUpperCase()
  const fullName = first || last ? `${first} ${last}`.trim() : 'RH Admin'
  const role     = user?.role ?? 'hr'

  return (
    <div className="hr">
      <HRSidebar t={t} activeItem="overview" />

      <div className="hr-main">

        {/* ── Topbar ──────────────────────────────────────────────────── */}
        <header className="hr-topbar">
          <div className="hr-search" role="search">
            <SearchIcon size={15} color="var(--color-outline)" />
            <input type="text" className="hr-search__input"
              placeholder={t('hr.search.placeholder')}
              aria-label={t('hr.search.placeholder')} />
          </div>

          <div className="hr-topbar__right">
            <span className="hr-topbar__date">{dateLabel}</span>
            <div className="hr-topbar__sep" aria-hidden="true" />

            <button className="hr-icon-btn" onClick={cycleTheme} aria-label={themeLabel(theme)} title={themeLabel(theme)}>
              <ThemeIcon theme={theme} />
            </button>
            <button className="hr-icon-btn" aria-label="Aide" title="Aide">
              <HelpIcon size={17} color="var(--color-on-surface-variant)" strokeWidth={1.5} />
            </button>

            <div className="hr-notif-wrap" ref={notifRef}>
              <button className="hr-icon-btn hr-icon-btn--notif"
                onClick={() => setNotifOpen(o => !o)}
                aria-label="Alertes" aria-expanded={notifOpen}>
                <BellIcon size={17} color="var(--color-on-surface-variant)" />
                <span className="hr-bell-dot" aria-hidden="true" />
              </button>
              {notifOpen && (
                <div className="hr-notif-dropdown" role="dialog" aria-label="Alertes">
                  <div className="hr-notif-dropdown__header">
                    <span className="hr-notif-dropdown__title">{t('hr.alerts.title').toUpperCase()}</span>
                    <span className="hr-notif-dropdown__badge">{ALERTS.length}</span>
                  </div>
                  <ul className="hr-notif-dropdown__list">
                    {ALERTS.map(({ id, level, textKey, metaKey }, idx) => (
                      <li key={id} className={`hr-notif-item${idx < ALERTS.length - 1 ? ' hr-notif-item--sep' : ''}`}>
                        <span className="hr-notif-item__dot" style={{ background: alertColor(level) }} aria-hidden="true" />
                        <div>
                          <p className="hr-notif-item__text">{t(textKey)}</p>
                          <p className="hr-notif-item__meta">{t(metaKey)}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <button className="hr-notif-dropdown__footer" onClick={() => setNotifOpen(false)}>
                    {t('hr.depts.viewall')}
                  </button>
                </div>
              )}
            </div>

            <div className="hr-topbar__sep" aria-hidden="true" />
            <div className="hr-topbar__user">
              <div className="hr-topbar__user-info">
                <p className="hr-topbar__user-name">{fullName}</p>
                <p className="hr-topbar__user-role">{role}</p>
              </div>
              <div className="hr-topbar__avatar" aria-hidden="true">{initials}</div>
            </div>
          </div>
        </header>

        {/* ── Page content ────────────────────────────────────────────── */}
        <main className="hr-content">

          {/* ── Welcome banner ────────────────────────────────────────── */}
          <HRWelcomeBanner t={t} userName={first} />

          {/* ── KPI strip ─────────────────────────────────────────────── */}
          <div className="hr-kpis">
            {KPIS.map(({ id, value, accent }) => (
              <div key={id} className={`hr-kpi${accent ? ' hr-kpi--alert' : ''}`}>
                <span className="hr-kpi__value">{value}</span>
                <span className="hr-kpi__label">{t(`hr.kpi.${id}.label`)}</span>
                <span className="hr-kpi__sub">{t(`hr.kpi.${id}.sub`)}</span>
              </div>
            ))}
          </div>

          {/* ── Bento ─────────────────────────────────────────────────── */}
          <div className="hr-bento">

            {/* Row 1 — Campaign status + Alerts */}
            <article className="hr-camp">
              <div className="hr-camp__head">
                <div className="hr-camp__badge">
                  <BellIcon size={10} color="var(--color-error)" strokeWidth={2} />
                  {t('hr.camp.badge').toUpperCase()}
                </div>
                <h2 className="hr-camp__title">{t('hr.camp.title')}</h2>
                <p className="hr-camp__dates">{t('hr.camp.dates')}</p>
              </div>
              <div className="hr-camp__phases">
                {PHASES.map(({ id, pct, done, total }) => (
                  <div key={id} className="hr-phase">
                    <div className="hr-phase__meta">
                      <span className="hr-phase__name">{t(`hr.camp.phase.${id}`)}</span>
                      <span className="hr-phase__count">{done}/{total}</span>
                    </div>
                    <div className="hr-phase__track">
                      <div className="hr-phase__bar" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="hr-phase__pct">{pct}%</span>
                  </div>
                ))}
              </div>
              <div className="hr-camp__actions">
                <button className="hr-camp__btn hr-camp__btn--secondary">{t('hr.camp.cta.view')}</button>
                <button className="hr-camp__btn hr-camp__btn--danger">{t('hr.camp.cta.close')}</button>
              </div>
            </article>

            <aside className="hr-alerts">
              <div className="hr-alerts__header">
                <h3 className="hr-alerts__title">{t('hr.alerts.title').toUpperCase()}</h3>
                <span className="hr-alerts__badge">{ALERTS.length}</span>
              </div>
              <ul className="hr-alerts__list">
                {ALERTS.map(({ id, level, textKey, metaKey }, idx) => (
                  <li key={id} className={`hr-alert${idx < ALERTS.length - 1 ? ' hr-alert--sep' : ''}`}>
                    <span className="hr-alert__dot" style={{ background: alertColor(level) }} aria-hidden="true" />
                    <div>
                      <p className="hr-alert__text">{t(textKey)}</p>
                      <p className="hr-alert__meta">{t(metaKey)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </aside>

            {/* Row 2 — Department completion + Quick actions */}
            <article className="hr-depts">
              <div className="hr-depts__header">
                <h3 className="hr-depts__title">{t('hr.depts.title').toUpperCase()}</h3>
              </div>
              <div className="hr-depts__table">
                {DEPARTMENTS.map(({ name, total, pct }) => (
                  <div key={name} className="hr-dept-row">
                    <span className="hr-dept-row__name">{name}</span>
                    <span className="hr-dept-row__total">{total}</span>
                    <div className="hr-dept-row__track">
                      <div className="hr-dept-row__bar" style={{ width: `${pct}%`, background: deptColor(pct) }} />
                    </div>
                    <span className="hr-dept-row__pct" style={{ color: deptColor(pct) }}>{pct}%</span>
                  </div>
                ))}
              </div>
              <button className="hr-depts__viewall">{t('hr.depts.viewall')}</button>
            </article>

            <article className="hr-actions">
              <h3 className="hr-actions__title">{t('hr.actions.title').toUpperCase()}</h3>
              <div className="hr-actions__list">
                <button className="hr-action-btn hr-action-btn--primary">
                  <span className="hr-action-btn__icon">+</span>
                  {t('hr.actions.campaign')}
                </button>
                <button className="hr-action-btn">
                  <span className="hr-action-btn__icon">+</span>
                  {t('hr.actions.template')}
                </button>
                <button className="hr-action-btn">
                  <span className="hr-action-btn__icon">↓</span>
                  {t('hr.actions.export')}
                </button>
                <button className="hr-action-btn hr-action-btn--danger">
                  <span className="hr-action-btn__icon">○</span>
                  {t('hr.actions.close')}
                </button>
              </div>
            </article>

            {/* Row 3 — Calendar + Form Editor */}
            <div className="hr-calendar-wrap">
              <CalendarWidget
                title={t('hr.calendar.title')}
                events={makeCalendarEvents(t)}
                locale={locale}
              />
            </div>

            <article className="hr-form-editor">
              <div className="hr-form-editor__header">
                <h3 className="hr-form-editor__title">{t('hr.form.title').toUpperCase()}</h3>
                <button className="hr-form-editor__new">+ {t('hr.form.new')}</button>
              </div>
              <ul className="hr-form-editor__list">
                {TEMPLATES.map(({ id, nameKey, typeKey, status, campaigns }) => (
                  <li key={id} className="hr-tpl">
                    <div className="hr-tpl__icon">
                      <DocumentIcon size={16} color="var(--color-secondary)" strokeWidth={1.5} />
                    </div>
                    <div className="hr-tpl__info">
                      <p className="hr-tpl__name">{t(nameKey)}</p>
                      <p className="hr-tpl__type">{t(typeKey)}</p>
                    </div>
                    <div className="hr-tpl__right">
                      <span className={`hr-tpl__status hr-tpl__status--${status}`}>
                        {t(`hr.form.status.${status}`)}
                      </span>
                      {campaigns > 0 && (
                        <span className="hr-tpl__used">{campaigns} camp.</span>
                      )}
                    </div>
                    <button className="hr-tpl__edit" aria-label="Modifier">✎</button>
                  </li>
                ))}
              </ul>
              <button className="hr-form-editor__viewall">{t('hr.form.viewall')}</button>
            </article>

            {/* Row 4 — Resources (full width) */}
            <article className="hr-resources">
              <div className="hr-resources__header">
                <div>
                  <h3 className="hr-resources__title">{t('hr.res.title').toUpperCase()}</h3>
                  <p className="hr-resources__sub">{t('hr.res.sub')}</p>
                </div>
                <button className="hr-resources__publish">+ {t('hr.res.publish')}</button>
              </div>
              <div className="hr-resources__grid">
                {RESOURCES.map(({ id, nameKey, type, dateKey, status }) => (
                  <div key={id} className="hr-resource">
                    <div className="hr-resource__icon">
                      <ResourceTypeIcon type={type} />
                    </div>
                    <div className="hr-resource__info">
                      <p className="hr-resource__name">{t(nameKey)}</p>
                      <p className="hr-resource__date">{t(dateKey)}</p>
                    </div>
                    <span className={`hr-resource__status hr-resource__status--${status}`}>
                      {t(`hr.res.status.${status}`)}
                    </span>
                    <button className="hr-resource__dl" aria-label="Télécharger">↓</button>
                  </div>
                ))}
              </div>
            </article>

          </div>
        </main>
      </div>
    </div>
  )
}
