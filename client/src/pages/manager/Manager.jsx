// =============================================================================
// Manager — Tableau de bord équipe (/manager)
// Rendu dans <AuthedLayout> (topbar/sidebar viennent du layout parent).
// =============================================================================

import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../contexts/AuthContext'
import { useTranslate, useLocaleCtx } from '../../contexts/LocaleContext'
import { t as pageT } from './i18n'
import { Users, Clipboard, CheckCircle2, ArrowUpRight, ChevronRight } from 'lucide-react'
import './manager.css'

function avatarInitial(member) {
  return (member?.firstName?.[0] ?? member?.name?.[0] ?? '?').toUpperCase()
}

export default function Manager() {
  const { user } = useAuth()
  const { locale } = useLocaleCtx()
  const t = useTranslate(pageT)
  const navigate = useNavigate()

  // ── Active campaign ────────────────────────────────────────────────────────
  const { data: campaign = null } = useQuery({
    queryKey: ['campaign-active'],
    queryFn: () =>
      fetch('/api/campaigns?status=active', { credentials: 'include' })
        .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json() })
        .then(j => { const l = j.data ?? j; return (Array.isArray(l) ? l[0] : l) ?? null }),
    staleTime: 5 * 60 * 1000,
    enabled: !!user,
  })

  // ── Team evaluations ───────────────────────────────────────────────────────
  const { data: evals = [], isLoading: evalsLoading, isError: evalsError } = useQuery({
    queryKey: ['manager-evals'],
    queryFn: () =>
      fetch('/api/evaluations', { credentials: 'include' })
        .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json() })
        .then(j => j.data ?? j),
    staleTime: 2 * 60 * 1000,
    enabled: !!user,
  })

  // ── Team members ───────────────────────────────────────────────────────────
  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ['team-members'],
    queryFn: () =>
      fetch('/api/users', { credentials: 'include' })
        .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json() })
        .then(j => j.data ?? j),
    staleTime: 5 * 60 * 1000,
    enabled: !!user,
  })

  // ── Derived KPIs ───────────────────────────────────────────────────────────
  const kpis = {
    pending:   evals.filter(e => ['assigned', 'in_progress'].includes(e.status)).length,
    submitted: evals.filter(e => e.status === 'submitted').length,
    signed:    evals.filter(e => e.status === 'signed_manager').length,
  }

  // ── Urgency: evals awaiting manager action ─────────────────────────────────
  const urgencyCount = evals.filter(e =>
    ['submitted', 'signed_evaluatee'].includes(e.status)
  ).length

  function getMemberEvalStatus(memberId) {
    const ev = evals.find(
      e => e.evaluateeId?._id === memberId || e.evaluateeId === memberId
    )
    return ev?.status ?? 'not_started'
  }

  const firstName = user?.firstName ?? user?.name?.split(' ')[0] ?? ''

  return (
    <div className="mgr">
      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="mgr-hero">
        <p className="mgr-hero__eyebrow">{t('manager.hero.eyebrow')}</p>
        <h1 className="mgr-hero__title">
          {t('manager.hero.title')}{' '}
          <span className="mgr-hero__accent">{firstName}</span>
        </h1>
        <p className="mgr-hero__sub">{t('manager.hero.subtitle')}</p>
      </section>

      {/* ── Urgency banner ──────────────────────────────────────────────── */}
      {campaign && urgencyCount > 0 && (
        <div className="mgr-urgency" role="status">
          <Clipboard size={18} />
          <span>
            <strong>{urgencyCount}</strong>{' '}
            {t('manager.urgency.desc')}{' '}
            {campaign.endDate
              ? new Date(campaign.endDate).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US')
              : ''}
          </span>
        </div>
      )}

      {/* ── KPI strip ───────────────────────────────────────────────────── */}
      <div className="mgr-kpis">
        {['pending', 'submitted', 'signed'].map(k => (
          <div key={k} className={`mgr-kpi mgr-kpi--${k}`}>
            <span className="mgr-kpi__value">{kpis[k]}</span>
            <span className="mgr-kpi__label">{t(`manager.kpi.${k}`)}</span>
          </div>
        ))}
      </div>

      {/* ── Team member cards ───────────────────────────────────────────── */}
      {evalsLoading || membersLoading ? (
        <p className="mgr-loading">{t('manager.loading')}</p>
      ) : evalsError ? (
        <p className="mgr-error">{t('manager.error.load')}</p>
      ) : (
        <>
          {members.length > 0 && (
            <div className="mgr-cards">
              {members.slice(0, 8).map(member => {
                const status = getMemberEvalStatus(member._id)
                return (
                  <div
                    key={member._id}
                    className="mgr-card"
                    onClick={() => navigate(`/manager/team/${member._id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && navigate(`/manager/team/${member._id}`)}
                    aria-label={`${member.firstName ?? ''} ${member.lastName ?? ''}`.trim()}
                  >
                    <div className="mgr-card__header">
                      <div className="mgr-card__avatar">{avatarInitial(member)}</div>
                      <div>
                        <p className="mgr-card__name">
                          {member.firstName ?? ''} {member.lastName ?? ''}
                        </p>
                        <p className="mgr-card__role">
                          {member.position ?? member.role ?? ''}
                        </p>
                      </div>
                    </div>
                    <div className="mgr-card__status">
                      <span className={`mgr-status mgr-status--${status}`}>
                        {t(`manager.eval_status.${status}`) || status}
                      </span>
                      <ChevronRight size={16} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div>
            <button
              type="button"
              className="mgr-btn mgr-btn--primary"
              onClick={() => navigate('/manager/team')}
            >
              <Users size={16} />
              {t('manager.team.viewall')}
              <ArrowUpRight size={14} />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
