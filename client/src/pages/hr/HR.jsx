// =============================================================================
// HR.jsx — Tableau de bord RH, route /hr
//
// Composant route pour la page d'accueil de l'espace RH.
// Pas de sidebar ni topbar : pris en charge par AuthedLayout.
//
// Sections :
//   1. Hero — eyebrow + titre "Pilotage RH" + sous-titre
//   2. KPI bento (6 tuiles) + panneau alertes latéral
//   3. Complétion par service (barres CSS)
//   4. Tableau des dernières actions
//
// Données : react-query → /api/campaigns, /api/evaluations
// Design : docs/design/dashboard/DESIGN.md
// =============================================================================

import React, { useMemo } from 'react'
import { useQuery }       from '@tanstack/react-query'
import { useNavigate }    from 'react-router-dom'
import { useAuth }        from '../../contexts/AuthContext'
import { t as pageT }     from './i18n'
import { useLocale }      from '../../hooks/useLocale'
import {
  Clipboard, TrendingUp, Bell, Sparkles,
  ChevronRight, FileText, Users, CheckCircle2,
} from 'lucide-react'
import { apiFetch } from '../../lib/apiFetch'
import { SkeletonStat, SkeletonTable } from '../../components/ui/Skeleton'
import './hr.css'

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Nombre de jours jusqu'à une date (positif = futur). */
function daysTill(dateStr) {
  const diff = new Date(dateStr) - new Date()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

/** Formate une date ISO en date courte selon la locale. */
function fmtDate(dateStr, locale) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString(
    locale === 'fr' ? 'fr-FR' : 'en-US',
    { day: '2-digit', month: 'short' }
  )
}

// ── Sous-composants ───────────────────────────────────────────────────────────

/** Tuile KPI — icône + valeur + label + sous-label. */
function KpiTile({ icon, iconBg, value, label, sub, onClick, highlight }) {
  return (
    <article
      className={`hr-kpi${onClick ? ' hr-kpi--link' : ''}${highlight ? ' hr-kpi--alert' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      <div className="hr-kpi__top">
        <span className="hr-kpi__icon" style={{ background: iconBg }}>
          {icon}
        </span>
        {onClick && (
          <span className="hr-kpi__arrow" aria-hidden="true">
            <ChevronRight size={14} color="var(--color-outline-variant)" />
          </span>
        )}
      </div>
      <p className="hr-kpi__value">{value ?? '—'}</p>
      <p className="hr-kpi__label">{label}</p>
      <p className="hr-kpi__sub">{sub}</p>
    </article>
  )
}

/** Barre de progression CSS pour le chart complétion par service. */
function DeptBar({ name, completed, total }) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0
  return (
    <div className="hr-deptbar">
      <div className="hr-deptbar__header">
        <span className="hr-deptbar__name">{name}</span>
        <span className="hr-deptbar__pct">{pct}%</span>
      </div>
      <div className="hr-deptbar__track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div
          className={`hr-deptbar__fill${pct < 40 ? ' hr-deptbar__fill--low' : pct < 75 ? ' hr-deptbar__fill--mid' : ' hr-deptbar__fill--high'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="hr-deptbar__count">{completed}/{total}</span>
    </div>
  )
}

/** Badge de statut évaluation. */
function StatusBadge({ status }) {
  const map = {
    assigned:    ['hr-badge--assigned',  'Assigné'],
    in_progress: ['hr-badge--progress',  'En cours'],
    submitted:   ['hr-badge--submitted', 'Soumis'],
    reviewed:    ['hr-badge--reviewed',  'Révisé'],
    validated:   ['hr-badge--validated', 'Validé'],
    signed:      ['hr-badge--validated', 'Signé'],
  }
  const [cls, label] = map[status] ?? ['hr-badge--assigned', status]
  return <span className={`hr-badge ${cls}`}>{label}</span>
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function HR() {
  const { user }          = useAuth()
  const { t, locale }     = useLocale(pageT)
  const navigate          = useNavigate()

  // ── Campagnes ─────────────────────────────────────────────
  const { data: campaigns = [], isLoading: loadingCamp, error: errorCamp } = useQuery({
    queryKey: ['hr-campaigns'],
    queryFn:  () => apiFetch('/api/campaigns').then(d => Array.isArray(d) ? d : (d.data || [])),
    enabled:   !!user,
    staleTime: 5 * 60 * 1000,
  })

  // ── Évaluations ───────────────────────────────────────────
  const { data: evaluations = [], isLoading: loadingEvals, error: errorEvals } = useQuery({
    queryKey: ['hr-evaluations'],
    queryFn:  () => apiFetch('/api/evaluations').then(d => Array.isArray(d) ? d : (d.data || [])),
    enabled:   !!user,
    staleTime: 5 * 60 * 1000,
  })

  // ── Employés (nombre total) ───────────────────────────────
  const { data: employees = [] } = useQuery({
    queryKey: ['hr-employees'],
    queryFn:  () => apiFetch('/api/employees').then(d => Array.isArray(d) ? d : (d.data || [])),
    enabled:   !!user,
    staleTime: 10 * 60 * 1000,
  })

  // ── Stats dérivées ────────────────────────────────────────
  const activeCampaigns = useMemo(
    () => campaigns.filter(c => c.status === 'active'),
    [campaigns]
  )

  const completedEvals = useMemo(
    () => evaluations.filter(e => ['validated', 'signed', 'submitted', 'reviewed'].includes(e.status)),
    [evaluations]
  )

  const overdueEvals = useMemo(
    () => evaluations.filter(e =>
      ['assigned', 'in_progress'].includes(e.status) &&
      e.deadline && new Date(e.deadline) < new Date()
    ),
    [evaluations]
  )

  const completionRate = evaluations.length > 0
    ? Math.round((completedEvals.length / evaluations.length) * 100)
    : 0

  // Alertes : retards + campagnes sur le point de clore
  const alerts = useMemo(() => {
    const list = []
    if (overdueEvals.length > 0) {
      list.push({
        id:    'overdue',
        level: 'urgent',
        text:  `${overdueEvals.length} ${t('hr.alert.overdue')}`,
        meta:  t('hr.alert.meta.urgent'),
      })
    }
    const closingSoon = activeCampaigns
      .filter(c => c.closingDate && daysTill(c.closingDate) <= 7 && daysTill(c.closingDate) >= 0)
    if (closingSoon.length > 0) {
      const minDays = Math.min(...closingSoon.map(c => daysTill(c.closingDate)))
      list.push({
        id:    'closing',
        level: 'warning',
        text:  `${t('hr.alert.closing')} ${minDays} ${t('hr.alert.days')}`,
        meta:  t('hr.alert.meta.warning'),
      })
    }
    const notStarted = evaluations.filter(e => e.status === 'assigned').length
    if (notStarted > 5) {
      list.push({
        id:    'not-started',
        level: 'followup',
        text:  `${notStarted} ${t('hr.alert.notStarted')}`,
        meta:  t('hr.alert.meta.followup'),
      })
    }
    return list
  }, [overdueEvals, activeCampaigns, evaluations, t])

  // Complétion par service (dérivée depuis évaluations si elles ont un champ department)
  const deptStats = useMemo(() => {
    const map = {}
    evaluations.forEach(ev => {
      const dept = ev.department || ev.evaluateeDepartment || t('hr.depts.unknown')
      if (!map[dept]) map[dept] = { completed: 0, total: 0 }
      map[dept].total++
      if (['validated', 'signed', 'submitted', 'reviewed'].includes(ev.status)) {
        map[dept].completed++
      }
    })
    return Object.entries(map)
      .map(([name, { completed, total }]) => ({ name, completed, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6)
  }, [evaluations, t])

  // Dernières actions (évaluations triées par date de mise à jour)
  const recentActivity = useMemo(() =>
    [...evaluations]
      .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
      .slice(0, 6),
    [evaluations]
  )

  // ── Rendu ──────────────────────────────────────────────────
  return (
    <div className="hr-spa">

      {/* ── 1. Hero ────────────────────────────────────────── */}
      <header className="hr-hero">
        <p className="hr-hero__eyebrow">TABLEAU DE BORD</p>
        <h1 className="hr-hero__headline">
          {t('hr.welcome.headline.part1')}{' '}
          <span className="hr-hero__accent">{t('hr.welcome.headline.accent')}</span>
        </h1>
        <p className="hr-hero__sub">{t('hr.welcome.tagline')}</p>
      </header>

      {/* ── 2. KPI bento + alertes ─────────────────────────── */}
      {(errorCamp || errorEvals) && (
        <div className="hr-error-banner" role="alert">
          {errorCamp && <span>{errorCamp.message}</span>}
          {errorEvals && <span>{errorEvals.message}</span>}
        </div>
      )}
      <div className="hr-layout">

        {/* Grille de tuiles KPI */}
        <div className="hr-kpis">
          {(loadingCamp || loadingEvals) ? (
            Array.from({ length: 6 }, (_, i) => <SkeletonStat key={i} />)
          ) : <>
          <KpiTile
            icon={<Clipboard size={18} strokeWidth={1.5} color="var(--color-primary)" />}
            iconBg="var(--color-primary-tint-07)"
            value={loadingCamp ? '…' : activeCampaigns.length}
            label={t('hr.kpi.campaigns.label')}
            sub={t('hr.kpi.campaigns.sub')}
            onClick={() => navigate('/hr/campaigns')}
          />
          <KpiTile
            icon={<CheckCircle2 size={18} strokeWidth={1.5} color="var(--color-success)" />}
            iconBg="var(--color-success-tint)"
            value={loadingEvals ? '…' : `${completionRate}%`}
            label={t('hr.kpi.completion.label')}
            sub={t('hr.kpi.completion.sub')}
          />
          <KpiTile
            icon={<Bell size={18} strokeWidth={1.5} color="var(--color-error)" />}
            iconBg="var(--color-error-tint-06)"
            value={alerts.length}
            label={t('hr.alerts.title')}
            sub="contestations & retards"
            highlight={alerts.length > 0}
          />
          <KpiTile
            icon={<Users size={18} strokeWidth={1.5} color="var(--color-secondary)" />}
            iconBg="var(--color-secondary-tint-08)"
            value={employees.length || '—'}
            label={t('hr.welcome.stat.employees')}
            sub="actifs dans l'organisation"
            onClick={() => navigate('/hr/directory')}
          />
          <KpiTile
            icon={<TrendingUp size={18} strokeWidth={1.5} color="var(--color-primary)" />}
            iconBg="var(--color-primary-tint-07)"
            value={loadingEvals ? '…' : evaluations.length}
            label={t('hr.kpi.evaluations.label')}
            sub={t('hr.kpi.evaluations.sub')}
          />
          <KpiTile
            icon={<Sparkles size={18} strokeWidth={1.5} color="var(--color-secondary)" />}
            iconBg="var(--color-secondary-tint-08)"
            value="—"
            label="Score culture"
            sub="eNPS de l'organisation"
            onClick={() => navigate('/hr/analytics')}
          />
          </>}
        </div>

        {/* Panneau alertes */}
        <aside className="hr-alerts-panel" aria-label={t('hr.alerts.aria')}>
          <h2 className="hr-panel__title">{t('hr.alerts.title').toUpperCase()}</h2>

          {alerts.length === 0 ? (
            <p className="hr-panel__empty">{t('hr.alerts.empty')}</p>
          ) : (
            <ul className="hr-alerts-list">
              {alerts.map(a => (
                <li key={a.id} className={`hr-alert-item hr-alert-item--${a.level}`}>
                  <span className="hr-alert-item__dot" aria-hidden="true" />
                  <div className="hr-alert-item__body">
                    <p className="hr-alert-item__text">{a.text}</p>
                    <p className="hr-alert-item__meta">{a.meta}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            className="hr-panel__cta"
            onClick={() => navigate('/hr/requests')}
          >
            Voir toutes les demandes
            <ChevronRight size={13} />
          </button>
        </aside>
      </div>

      {/* ── 3. Complétion par service ───────────────────────── */}
      <section className="hr-section">
        <div className="hr-section__head">
          <h2 className="hr-section__title">{t('hr.depts.title').toUpperCase()}</h2>
          <button
            type="button"
            className="hr-section__link"
            onClick={() => navigate('/hr/analytics')}
          >
            {t('hr.depts.viewall')}
            <ChevronRight size={13} />
          </button>
        </div>

        {loadingEvals ? (
          <SkeletonTable rows={4} cols={2} />
        ) : deptStats.length === 0 ? (
          <p className="hr-section__msg">{t('hr.depts.empty')}</p>
        ) : (
          <div className="hr-deptchart">
            {deptStats.map(d => (
              <DeptBar key={d.name} name={d.name} completed={d.completed} total={d.total} />
            ))}
          </div>
        )}
      </section>

      {/* ── 4. Dernières actions ────────────────────────────── */}
      <section className="hr-section">
        <div className="hr-section__head">
          <h2 className="hr-section__title">DERNIÈRES ACTIONS</h2>
          <button
            type="button"
            className="hr-section__link"
            onClick={() => navigate('/hr/campaigns')}
          >
            Voir toutes
            <ChevronRight size={13} />
          </button>
        </div>

        {loadingEvals ? (
          <SkeletonTable rows={5} cols={4} />
        ) : recentActivity.length === 0 ? (
          <p className="hr-section__msg">Aucune activité récente.</p>
        ) : (
          <div className="hr-table-wrap">
            <table className="hr-table">
              <thead>
                <tr>
                  <th>Collaborateur</th>
                  <th>Campagne</th>
                  <th>Statut</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentActivity.map((ev, i) => (
                  <tr key={ev._id || i}>
                    <td className="hr-table__name">
                      {ev.evaluateeName || ev.evaluatee?.name || '—'}
                    </td>
                    <td className="hr-table__campaign">
                      {ev.campaignName || ev.campaign?.name || '—'}
                    </td>
                    <td>
                      <StatusBadge status={ev.status} />
                    </td>
                    <td className="hr-table__date">
                      {fmtDate(ev.updatedAt || ev.createdAt, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

    </div>
  )
}

