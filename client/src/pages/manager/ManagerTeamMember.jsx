// =============================================================================
// ManagerTeamMember — Fiche collaborateur (/manager/team/:userId)
// Rendu dans <AuthedLayout>.
// =============================================================================

import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../contexts/AuthContext'
import { useTranslate, useLocaleCtx } from '../../contexts/LocaleContext'
import { t as pageT } from './i18n'
import './manager.css'

function avatarInitial(member) {
  return (member?.firstName?.[0] ?? member?.name?.[0] ?? '?').toUpperCase()
}

export default function ManagerTeamMember() {
  const { userId } = useParams()
  const { user: authUser } = useAuth()
  const { locale } = useLocaleCtx()
  const t = useTranslate(pageT)
  const navigate = useNavigate()

  const { data: member, isLoading: memberLoading, isError: memberError } = useQuery({
    queryKey: ['user', userId],
    queryFn: () =>
      fetch(`/api/users/${userId}`, { credentials: 'include' })
        .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json() })
        .then(j => j.data ?? j),
    staleTime: 5 * 60 * 1000,
    enabled: !!userId && !!authUser,
  })

  const { data: evals = [], isLoading: evalsLoading } = useQuery({
    queryKey: ['evals-member', userId],
    queryFn: () =>
      fetch(`/api/evaluations?evaluateeId=${userId}`, { credentials: 'include' })
        .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json() })
        .then(j => j.data ?? j),
    staleTime: 2 * 60 * 1000,
    enabled: !!userId && !!authUser,
  })

  const currentEval = evals.find(e => {
    const evId = e.evaluateeId?._id?.toString() ?? e.evaluateeId?.toString()
    return evId === userId &&
      ['assigned', 'in_progress', 'submitted', 'signed_evaluatee', 'reviewed'].includes(e.status)
  })

  const historyEvals = evals.filter(e => {
    const evId = e.evaluateeId?._id?.toString() ?? e.evaluateeId?.toString()
    return evId === userId &&
      ['signed_manager', 'signed_hr', 'validated'].includes(e.status)
  })

  const isLoading = memberLoading || evalsLoading

  if (isLoading) {
    return <div className="mgr"><p className="mgr-loading">{t('manager.loading')}</p></div>
  }
  if (memberError || !member) {
    return <div className="mgr"><p className="mgr-error">{t('manager.error.load')}</p></div>
  }

  return (
    <div className="mgr">
      {/* ── Back link ──────────────────────────────────────────────────────── */}
      <button type="button" className="mgr-back" onClick={() => navigate('/manager/team')}>
        {t('manager.member.back')}
      </button>

      {/* ── Member header ─────────────────────────────────────────────────── */}
      <div className="mgr-member-header">
        <div className="mgr-member-avatar">{avatarInitial(member)}</div>
        <div className="mgr-member-info">
          <h1>{member.firstName ?? ''} {member.lastName ?? ''}</h1>
          <p>
            {member.position ?? member.role ?? ''}
            {member.department ? ` — ${member.department}` : ''}
          </p>
        </div>
      </div>

      {/* ── Current eval CTA ──────────────────────────────────────────────── */}
      {currentEval ? (
        <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <span className={`mgr-badge mgr-badge--${currentEval.status}`}>
            {t(`manager.eval_status.${currentEval.status}`) || currentEval.status}
          </span>
          {['submitted', 'signed_evaluatee'].includes(currentEval.status) && (
            <button
              type="button"
              className="mgr-btn mgr-btn--primary"
              onClick={() => navigate(`/manager/review/${currentEval._id}`)}
            >
              {t('manager.member.view_eval')}
            </button>
          )}
        </div>
      ) : (
        <p style={{ marginBottom: '2rem', color: 'var(--color-on-surface-variant)', fontSize: '0.875rem' }}>
          {t('manager.member.no_eval')}
        </p>
      )}

      {/* ── Objectives ────────────────────────────────────────────────────── */}
      <section className="mgr-section">
        <h2 className="mgr-section__title">{t('manager.member.objectives')}</h2>
        <div className="mgr-panel">
          {currentEval?.answers?.filter(a => a.phase === 'objectives').length > 0 ? (
            currentEval.answers
              .filter(a => a.phase === 'objectives')
              .map((ans, i) => {
                const q = currentEval.formId?.questions?.find(qq => qq.id === ans.questionId)
                return (
                  <div key={ans.questionId ?? i} className="mgr-objective">
                    <span className="mgr-objective__name">{q?.label ?? `Objectif ${i + 1}`}</span>
                    <span className={`mgr-status mgr-status--${currentEval.status}`}>
                      {String(ans.value)}
                    </span>
                  </div>
                )
              })
          ) : (
            <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.875rem', margin: 0 }}>
              {t('manager.member.no_eval')}
            </p>
          )}
        </div>
      </section>

      {/* ── Evaluation history ────────────────────────────────────────────── */}
      <section className="mgr-section">
        <h2 className="mgr-section__title">{t('manager.member.history')}</h2>
        {historyEvals.length === 0 ? (
          <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.875rem' }}>
            {t('manager.member.no_history')}
          </p>
        ) : (
          <div className="mgr-table-wrap">
            <table className="mgr-table">
              <thead>
                <tr>
                  <th scope="col">{t('manager.history.col.campaign')}</th>
                  <th scope="col">{t('manager.history.col.date')}</th>
                  <th scope="col">{t('manager.history.col.score')}</th>
                  <th scope="col">{t('manager.history.col.status')}</th>
                </tr>
              </thead>
              <tbody>
                {historyEvals.map(ev => (
                  <tr key={ev._id}>
                    <td>{ev.campaignId?.title ?? ev.campaignName ?? '—'}</td>
                    <td>
                      {ev.updatedAt
                        ? new Date(ev.updatedAt).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US')
                        : '—'}
                    </td>
                    <td>{ev.score !== null && ev.score !== undefined ? `${ev.score}/100` : '—'}</td>
                    <td>
                      <span className={`mgr-badge mgr-badge--${ev.status}`}>
                        {t(`manager.eval_status.${ev.status}`) || ev.status}
                      </span>
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
