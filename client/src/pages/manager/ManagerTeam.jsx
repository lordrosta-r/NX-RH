// =============================================================================
// ManagerTeam — Liste de l'équipe (/manager/team)
// Rendu dans <AuthedLayout>.
// =============================================================================

import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../contexts/AuthContext'
import { useTranslate } from '../../contexts/LocaleContext'
import { t as pageT } from './i18n'
import { ChevronRight } from 'lucide-react'
import { SkeletonTable } from '../../components/ui/Skeleton'
import './manager.css'

function avatarInitial(member) {
  return (member?.firstName?.[0] ?? member?.name?.[0] ?? '?').toUpperCase()
}

export default function ManagerTeam() {
  const { user } = useAuth()
  const t = useTranslate(pageT)
  const navigate = useNavigate()

  const { data: members = [], isLoading: membersLoading, isError: membersError } = useQuery({
    queryKey: ['team-members'],
    queryFn: () =>
      fetch('/api/users', { credentials: 'include' })
        .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json() })
        .then(j => j.data ?? j),
    staleTime: 5 * 60 * 1000,
    enabled: !!user,
  })

  const { data: evals = [], isLoading: evalsLoading } = useQuery({
    queryKey: ['manager-evals'],
    queryFn: () =>
      fetch('/api/evaluations', { credentials: 'include' })
        .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json() })
        .then(j => j.data ?? j),
    staleTime: 2 * 60 * 1000,
    enabled: !!user,
  })

  function getMemberEvalStatus(memberId) {
    const ev = evals.find(
      e => e.evaluateeId?._id === memberId || e.evaluateeId === memberId
    )
    return ev?.status ?? 'not_started'
  }

  function getMemberCurrentEval(memberId) {
    return evals.find(
      e => e.evaluateeId?._id === memberId || e.evaluateeId === memberId
    )
  }

  const isLoading = membersLoading || evalsLoading

  return (
    <div className="mgr">
      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="mgr-hero">
        <p className="mgr-hero__eyebrow">{t('manager.hero.eyebrow')}</p>
        <h1 className="mgr-hero__title">{t('manager.team.title')}</h1>
        <p className="mgr-hero__sub">{t('manager.team.subtitle')}</p>
      </section>

      {isLoading && <SkeletonTable rows={6} cols={4} />}
      {membersError && <p className="mgr-error">{t('manager.error.load')}</p>}

      {!isLoading && !membersError && (
        <div className="mgr-table-wrap">
          <table className="mgr-table">
            <thead>
              <tr>
                <th scope="col">{t('manager.team.member')}</th>
                <th scope="col">{t('manager.team.role')}</th>
                <th scope="col">{t('manager.team.status')}</th>
                <th scope="col">{t('manager.team.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {members.length === 0 ? (
                <tr>
                  <td colSpan={4} className="mgr-table__empty">
                    {t('manager.team.empty')}
                  </td>
                </tr>
              ) : members.map(member => {
                const status = getMemberEvalStatus(member._id)
                const currentEval = getMemberCurrentEval(member._id)
                return (
                  <tr key={member._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div
                          className="mgr-card__avatar"
                          style={{ width: '2rem', height: '2rem', fontSize: '0.8125rem', flexShrink: 0 }}
                        >
                          {avatarInitial(member)}
                        </div>
                        <span style={{ fontWeight: 600 }}>
                          {member.firstName ?? ''} {member.lastName ?? ''}
                        </span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--color-on-surface-variant)' }}>
                      {member.position ?? member.role ?? '—'}
                    </td>
                    <td>
                      <span className={`mgr-badge mgr-badge--${status}`}>
                        {t(`manager.eval_status.${status}`) || status}
                      </span>
                    </td>
                    <td>
                      <div className="mgr-table__actions">
                        <button
                          type="button"
                          className="mgr-btn mgr-btn--sm"
                          onClick={() => navigate(`/manager/team/${member._id}`)}
                        >
                          {t('manager.team.view')}
                          <ChevronRight size={14} />
                        </button>
                        {currentEval && ['submitted', 'signed_evaluatee'].includes(currentEval.status) && (
                          <button
                            type="button"
                            className="mgr-btn mgr-btn--sm mgr-btn--primary"
                            onClick={() => navigate(`/manager/review/${currentEval._id}`)}
                          >
                            {currentEval.status === 'signed_evaluatee'
                              ? t('manager.review.cosign')
                              : t('manager.review.validate_sign')}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

