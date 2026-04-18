import React from 'react'

const NEXT_STATUS = { draft: 'active', active: 'closed', closed: 'archived' }

const STATUS_LABELS = {
  draft:    'cmp.status.draft',
  active:   'cmp.status.active',
  closed:   'cmp.status.closed',
  archived: 'cmp.status.archived',
}

export default function CampaignCard({ c, t, fmtDate, onDetail, onEdit, onTransition, onAssign, onClone }) {
  return (
    <article className={`cmp-card cmp-card--${c.status}`}>
      <header className="cmp-card__head">
        <span className={`cmp-status cmp-status--${c.status}`}>
          {t(STATUS_LABELS[c.status] || 'cmp.status.draft')}
        </span>
        <h2 className="cmp-card__name">{c.name}</h2>
        {c.description && <p className="cmp-card__desc">{c.description}</p>}
      </header>

      <div className="cmp-card__meta">
        <div>
          <span className="cmp-meta__label">{t('cmp.meta.start')}</span>
          <span className="cmp-meta__value">{fmtDate(c.startDate)}</span>
        </div>
        <div>
          <span className="cmp-meta__label">{t('cmp.meta.end')}</span>
          <span className="cmp-meta__value">{fmtDate(c.endDate)}</span>
        </div>
        {Array.isArray(c.targetDepartments) && c.targetDepartments.length > 0 && (
          <div>
            <span className="cmp-meta__label">{t('cmp.meta.departments')}</span>
            <span className="cmp-meta__value">{c.targetDepartments.length}</span>
          </div>
        )}
      </div>

      {c.stats && (
        <div className="cmp-card__progress">
          <div className="cmp-progress__bar">
            <div className="cmp-progress__fill" style={{ width: `${c.stats.completionPct || 0}%` }} />
          </div>
          <span className="cmp-progress__pct">{c.stats.completionPct || 0}%</span>
        </div>
      )}

      <div className="cmp-card__actions">
        <button type="button" className="cmp-btn cmp-btn--sm" onClick={() => onDetail(c._id || c.id)}>
          {t('cmp.card.detail')}
        </button>
        {c.status === 'draft' && (
          <button type="button" className="cmp-btn cmp-btn--sm" onClick={() => onEdit(c)}>
            {t('cmp.card.edit')}
          </button>
        )}
        {NEXT_STATUS[c.status] && (
          <button type="button" className="cmp-btn cmp-btn--sm cmp-btn--primary"
            onClick={() => onTransition(c._id || c.id, NEXT_STATUS[c.status])}>
            {t(`cmp.action.${NEXT_STATUS[c.status]}`)}
          </button>
        )}
        {c.status === 'active' && (
          <button type="button" className="cmp-btn cmp-btn--sm cmp-btn--secondary"
            onClick={() => onAssign(c)}>
            {t('cmp.action.assign')}
          </button>
        )}
        <button type="button" className="cmp-btn cmp-btn--sm" onClick={() => onClone(c)}>
          {t('cmp.card.clone')}
        </button>
      </div>
    </article>
  )
}
