import React from 'react'

const NEXT_STATUS = { draft: 'active', active: 'closed', closed: 'archived' }

const STATUS_LABELS = {
  draft:    'cmp.status.draft',
  active:   'cmp.status.active',
  closed:   'cmp.status.closed',
  archived: 'cmp.status.archived',
}

export default function CampaignDetailModal({ detail, detailLoading, t, fmtDate, onTransition, onAssign, onEdit, onClose }) {
  if (!detail && !detailLoading) return null

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
            <div className="cmp-modal__actions">
              {NEXT_STATUS[detail.status] && (
                <button type="button" className="cmp-btn cmp-btn--primary"
                  onClick={() => onTransition(detail._id || detail.id, NEXT_STATUS[detail.status])}>
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
