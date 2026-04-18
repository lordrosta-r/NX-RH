import React, { useEffect, useState } from 'react'
import CampaignAnalytics from './CampaignAnalytics'

const NEXT_STATUS = { draft: 'active', active: 'closed', closed: 'archived' }

const STATUS_LABELS = {
  draft:    'cmp.status.draft',
  active:   'cmp.status.active',
  closed:   'cmp.status.closed',
  archived: 'cmp.status.archived',
}

export default function CampaignDetailModal({ detail, detailLoading, t, fmtDate, onTransition, onAssign, onEdit, onClose, onClone }) {
  const [tab, setTab] = useState('overview')
  const [evals, setEvals] = useState([])
  const [evalsLoading, setEvalsLoading] = useState(false)

  useEffect(() => {
    if (!detail || tab !== 'evaluations') return
    const id = detail._id || detail.id
    function load() {
      setEvalsLoading(true)
      fetch(`/api/evaluations?campaignId=${id}&page=1&limit=100`, { credentials: 'include' })
        .then(r => r.ok ? r.json() : { data: [] })
        .then(j => setEvals(j.data || j || []))
        .catch(() => setEvals([]))
        .finally(() => setEvalsLoading(false))
    }
    load()
  }, [detail, tab])

  if (!detail && !detailLoading) return null

  const id = detail?._id || detail?.id

  return (
    <div className="cmp-modal-backdrop" onClick={onClose}>
      <div className="cmp-modal cmp-modal--wide" role="dialog" aria-labelledby="cmp-detail-title" onClick={e => e.stopPropagation()}>
        {detailLoading ? (
          <p className="cmp-loading">{t('cmp.loading')}</p>
        ) : detail && (
          <>
            <div className="cmp-detail__head">
              <span className={`cmp-status cmp-status--${detail.status}`}>
                {t(STATUS_LABELS[detail.status] || 'cmp.status.draft')}
              </span>
              <h3 id="cmp-detail-title" className="cmp-modal__title">{detail.name}</h3>
              {detail.description && <p className="cmp-card__desc">{detail.description}</p>}
            </div>

            {/* Tabs */}
            <div className="cmp-tabs" role="tablist">
              <button type="button" role="tab" aria-selected={tab === 'overview'}
                className={`cmp-tab${tab === 'overview' ? ' cmp-tab--active' : ''}`}
                onClick={() => setTab('overview')}>
                {t('cmp.tabs.overview')}
              </button>
              <button type="button" role="tab" aria-selected={tab === 'analytics'}
                className={`cmp-tab${tab === 'analytics' ? ' cmp-tab--active' : ''}`}
                onClick={() => setTab('analytics')}>
                {t('cmp.tabs.analytics')}
              </button>
              <button type="button" role="tab" aria-selected={tab === 'evaluations'}
                className={`cmp-tab${tab === 'evaluations' ? ' cmp-tab--active' : ''}`}
                onClick={() => setTab('evaluations')}>
                {t('cmp.tabs.evaluations')}
              </button>
            </div>

            {tab === 'overview' && (
              <>
                <div className="cmp-detail__meta">
                  <div><span className="cmp-meta__label">{t('cmp.meta.start')}</span><span className="cmp-meta__value">{fmtDate(detail.startDate)}</span></div>
                  <div><span className="cmp-meta__label">{t('cmp.meta.end')}</span><span className="cmp-meta__value">{fmtDate(detail.endDate)}</span></div>
                  {detail.targetDepartments?.length > 0 && (
                    <div><span className="cmp-meta__label">{t('cmp.meta.departments')}</span><span className="cmp-meta__value">{detail.targetDepartments.join(', ')}</span></div>
                  )}
                </div>
                {detail.stats && (
                  <div className="cmp-detail__stats">
                    <div className="cmp-detail__stat"><span className="cmp-detail__stat-val">{detail.stats.total}</span><span className="cmp-meta__label">{t('cmp.detail.total')}</span></div>
                    <div className="cmp-detail__stat"><span className="cmp-detail__stat-val">{detail.stats.started}</span><span className="cmp-meta__label">{t('cmp.detail.started')}</span></div>
                    <div className="cmp-detail__stat"><span className="cmp-detail__stat-val">{detail.stats.submitted}</span><span className="cmp-meta__label">{t('cmp.detail.submitted')}</span></div>
                    <div className="cmp-detail__stat"><span className="cmp-detail__stat-val">{detail.stats.validated}</span><span className="cmp-meta__label">{t('cmp.detail.validated')}</span></div>
                  </div>
                )}
              </>
            )}

            {tab === 'analytics' && <CampaignAnalytics campaignId={id} t={t} />}

            {tab === 'evaluations' && (
              <div className="cmp-eval-list">
                {evalsLoading ? (
                  <p className="cmp-loading">{t('cmp.loading')}</p>
                ) : evals.length === 0 ? (
                  <p className="cmp-detail__stat-val">{t('cmp.evals.empty')}</p>
                ) : (
                  <table className="cmp-an-table">
                    <thead>
                      <tr>
                        <th>{t('cmp.evals.evaluatee')}</th>
                        <th>{t('cmp.evals.form')}</th>
                        <th>{t('cmp.evals.status')}</th>
                        <th>{t('cmp.evals.actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {evals.map(ev => (
                        <tr key={ev._id}>
                          <td>{ev.evaluateeId ? `${ev.evaluateeId.firstName || ''} ${ev.evaluateeId.lastName || ''}`.trim() : '—'}</td>
                          <td>{ev.formId?.title || '—'}</td>
                          <td>{t(`ev.status.${ev.status}`) || ev.status}</td>
                          <td>
                            <a className="cmp-btn cmp-btn--sm" href={`/api/evaluations/${ev._id}/pdf`} download>
                              {t('cmp.evals.pdf')}
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            <div className="cmp-modal__actions">
              {NEXT_STATUS[detail.status] && (
                <button type="button" className="cmp-btn cmp-btn--primary"
                  onClick={() => onTransition(id, NEXT_STATUS[detail.status])}>
                  {t(`cmp.action.${NEXT_STATUS[detail.status]}`)}
                </button>
              )}
              {detail.status === 'active' && (
                <button type="button" className="cmp-btn cmp-btn--secondary"
                  onClick={() => { onClose(); onAssign(detail) }}>
                  {t('cmp.action.assign')}
                </button>
              )}
              {detail.status === 'draft' && (
                <button type="button" className="cmp-btn" onClick={() => { onClose(); onEdit(detail) }}>
                  {t('cmp.card.edit')}
                </button>
              )}
              {onClone && (
                <button type="button" className="cmp-btn" onClick={() => { onClose(); onClone(detail) }}>
                  {t('cmp.card.clone')}
                </button>
              )}
              <button type="button" className="cmp-btn" onClick={onClose}>
                {t('cmp.wizard.cancel')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
