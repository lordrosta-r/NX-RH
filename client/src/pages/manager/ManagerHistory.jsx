// =============================================================================
// ManagerHistory — Historique des évaluations clôturées (/manager/history)
// Rendu dans <AuthedLayout>.
// =============================================================================

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../contexts/AuthContext'
import { useTranslate, useLocaleCtx } from '../../contexts/LocaleContext'
import { t as pageT } from './i18n'

export default function ManagerHistory() {
  const { user } = useAuth()
  const { locale } = useLocaleCtx()
  const t = useTranslate(pageT)

  const [filterCampaign, setFilterCampaign] = useState('')
  const [filterYear, setFilterYear] = useState('')

  const { data: evals = [], isLoading, isError } = useQuery({
    queryKey: ['manager-evals-history'],
    queryFn: () =>
      fetch('/api/evaluations', { credentials: 'include' })
        .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json() })
        .then(j => j.data ?? j),
    staleTime: 5 * 60 * 1000,
    enabled: !!user,
  })

  const signed = evals.filter(e =>
    ['signed_manager', 'signed_hr', 'validated'].includes(e.status)
  )

  const filtered = signed.filter(e => {
    if (filterCampaign && e.campaignId?._id !== filterCampaign && e.campaignId !== filterCampaign) return false
    if (filterYear && new Date(e.updatedAt).getFullYear().toString() !== filterYear) return false
    return true
  })

  const campaigns = [...new Map(
    signed
      .filter(e => e.campaignId)
      .map(e => [e.campaignId?._id ?? e.campaignId, e.campaignId])
  ).values()]

  const years = [...new Set(
    signed
      .filter(e => e.updatedAt)
      .map(e => new Date(e.updatedAt).getFullYear().toString())
  )].sort((a, b) => b - a)

  return (
    <div className="mgr">
      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="mgr-hero">
        <p className="mgr-hero__eyebrow">{t('manager.hero.eyebrow')}</p>
        <h1 className="mgr-hero__title">{t('manager.history.title')}</h1>
        <p className="mgr-hero__sub">{t('manager.history.subtitle')}</p>
      </section>

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <div className="mgr-history-filters">
        <div className="mgr-history-filter">
          <label htmlFor="filter-campaign">{t('manager.history.filter.campaign')}</label>
          <select
            id="filter-campaign"
            value={filterCampaign}
            onChange={e => setFilterCampaign(e.target.value)}
          >
            <option value="">{t('manager.history.filter.all')}</option>
            {campaigns.map(c => (
              <option key={c?._id ?? c} value={c?._id ?? c}>
                {c?.title ?? c?.name ?? c?._id ?? String(c)}
              </option>
            ))}
          </select>
        </div>
        <div className="mgr-history-filter">
          <label htmlFor="filter-year">{t('manager.history.filter.year')}</label>
          <select
            id="filter-year"
            value={filterYear}
            onChange={e => setFilterYear(e.target.value)}
          >
            <option value="">{t('manager.history.filter.all')}</option>
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      {isLoading && <p className="mgr-loading">{t('manager.loading')}</p>}
      {isError && <p className="mgr-error">{t('manager.error.load')}</p>}

      {!isLoading && !isError && (
        <div className="mgr-table-wrap">
          <table className="mgr-table">
            <thead>
              <tr>
                <th scope="col">{t('manager.history.col.member')}</th>
                <th scope="col">{t('manager.history.col.campaign')}</th>
                <th scope="col">{t('manager.history.col.date')}</th>
                <th scope="col">{t('manager.history.col.score')}</th>
                <th scope="col">{t('manager.history.col.status')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="mgr-table__empty">
                    {t('manager.history.empty')}
                  </td>
                </tr>
              ) : filtered.map(ev => (
                <tr key={ev._id}>
                  <td>
                    {ev.evaluateeId?.firstName || ev.evaluateeId?.lastName
                      ? `${ev.evaluateeId.firstName ?? ''} ${ev.evaluateeId.lastName ?? ''}`.trim()
                      : '—'}
                  </td>
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
    </div>
  )
}
