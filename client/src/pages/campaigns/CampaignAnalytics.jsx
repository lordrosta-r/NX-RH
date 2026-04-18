// =============================================================================
// CampaignAnalytics — inline analytics panel for HR campaign detail.
// Loads /api/campaigns/:id/analytics and renders KPIs + simple SVG bar charts.
// No external chart lib — KISS.
// =============================================================================
import React, { useEffect, useState } from 'react'

const STATUS_ORDER = [
  'assigned', 'in_progress', 'submitted', 'reviewed',
  'signed_evaluatee', 'signed_manager', 'signed_hr', 'validated',
]

const STATUS_COLORS = {
  assigned:         'var(--color-outline)',
  in_progress:      'var(--color-tertiary)',
  submitted:        'var(--color-primary)',
  reviewed:         'var(--color-primary)',
  signed_evaluatee: 'var(--color-secondary)',
  signed_manager:   'var(--color-secondary)',
  signed_hr:        'var(--color-secondary)',
  validated:        'var(--color-secondary-container)',
}

function Bar({ value, max, color, label, suffix = '' }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="cmp-an-bar">
      <div className="cmp-an-bar__label">{label}</div>
      <div className="cmp-an-bar__track">
        <div
          className="cmp-an-bar__fill"
          style={{ width: `${pct}%`, background: color || 'var(--color-primary)' }}
        />
      </div>
      <div className="cmp-an-bar__val">{value}{suffix}</div>
    </div>
  )
}

export default function CampaignAnalytics({ campaignId, t }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    if (!campaignId) return
    let cancel = false
    function load() {
      setLoading(true)
      fetch(`/api/campaigns/${campaignId}/analytics`, { credentials: 'include' })
        .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
        .then(d => { if (!cancel) setData(d) })
        .catch(e => { if (!cancel) setError(e.message) })
        .finally(() => { if (!cancel) setLoading(false) })
    }
    load()
    return () => { cancel = true }
  }, [campaignId])

  if (loading) return <p className="cmp-loading">{t('cmp.loading')}</p>
  if (error)   return <p className="cmp-error">{error}</p>
  if (!data)   return null

  const statusMax  = Math.max(1, ...STATUS_ORDER.map(s => data.statusDistribution[s] || 0))
  const scoreMax   = Math.max(1, ...(data.scoreDistribution || []).map(b => b.count))
  const deptMax    = Math.max(1, ...(data.byDepartment || []).map(d => d.total))

  return (
    <section className="cmp-analytics">
      <h4 className="cmp-analytics__title">{t('cmp.analytics.title')}</h4>

      <div className="cmp-analytics__kpis">
        <div className="cmp-an-kpi">
          <span className="cmp-an-kpi__val">{data.totalEvaluations}</span>
          <span className="cmp-an-kpi__lbl">{t('cmp.analytics.kpi.total')}</span>
        </div>
        <div className="cmp-an-kpi">
          <span className="cmp-an-kpi__val">{data.completionPct}%</span>
          <span className="cmp-an-kpi__lbl">{t('cmp.analytics.kpi.completion')}</span>
        </div>
        <div className="cmp-an-kpi">
          <span className="cmp-an-kpi__val">{data.avgScore !== null && data.avgScore !== undefined ? data.avgScore : '—'}</span>
          <span className="cmp-an-kpi__lbl">{t('cmp.analytics.kpi.avgScore')}</span>
        </div>
      </div>

      <div className="cmp-analytics__group">
        <h5 className="cmp-analytics__sub">{t('cmp.analytics.statusDist')}</h5>
        {STATUS_ORDER.map(s => (
          <Bar
            key={s}
            label={t(`ev.status.${s}`) || s}
            value={data.statusDistribution[s] || 0}
            max={statusMax}
            color={STATUS_COLORS[s]}
          />
        ))}
      </div>

      {data.scoreDistribution && data.scoreDistribution.length > 0 && (
        <div className="cmp-analytics__group">
          <h5 className="cmp-analytics__sub">{t('cmp.analytics.scoreDist')}</h5>
          {data.scoreDistribution.map(b => (
            <Bar
              key={b.from}
              label={`${b.from}–${b.to}`}
              value={b.count}
              max={scoreMax}
              color="var(--color-primary)"
            />
          ))}
        </div>
      )}

      {data.byDepartment && data.byDepartment.length > 0 && (
        <div className="cmp-analytics__group">
          <h5 className="cmp-analytics__sub">{t('cmp.analytics.byDept')}</h5>
          <table className="cmp-an-table">
            <thead>
              <tr>
                <th>{t('cmp.analytics.dept')}</th>
                <th>{t('cmp.analytics.kpi.total')}</th>
                <th>{t('cmp.analytics.kpi.completion')}</th>
                <th>{t('cmp.analytics.kpi.avgScore')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.byDepartment.map(d => (
                <tr key={d.department}>
                  <td>{d.department}</td>
                  <td>{d.total}</td>
                  <td>{d.completionPct}%</td>
                  <td>{d.avgScore !== null && d.avgScore !== undefined ? d.avgScore : '—'}</td>
                  <td style={{ width: 120 }}>
                    <Bar value={d.completed} max={deptMax} color="var(--color-secondary)" label="" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
