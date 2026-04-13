// =============================================================================
// FormEditorBanner — hero section of the Form Editor page
// Design: Editorial Enterprise — text left, stats right
// =============================================================================
import React from 'react'
import './FormEditorBanner.css'

export default function FormEditorBanner({ t, formCount = 0, activeCount = 0, responseCount = 0 }) {
  return (
    <section className="feb">
      <div className="feb__content">
        <p className="feb__greeting">{t('fe.banner.tagline')}</p>
        <p className="feb__desc">{t('fe.banner.desc')}</p>
        <h2 className="feb__headline">
          {t('fe.banner.headline.part1')}{' '}
          <span className="feb__headline-accent">{t('fe.banner.headline.accent')}</span>
        </h2>
      </div>
      <div className="feb__stats">
        <div className="feb__stat">
          <span className="feb__stat-value">{formCount}</span>
          <span className="feb__stat-label">{t('fe.banner.forms')}</span>
        </div>
        <div className="feb__stat">
          <span className="feb__stat-value">{activeCount}</span>
          <span className="feb__stat-label">{t('fe.banner.active')}</span>
        </div>
        <div className="feb__stat">
          <span className="feb__stat-value">{responseCount}</span>
          <span className="feb__stat-label">{t('fe.banner.responses')}</span>
        </div>
      </div>
    </section>
  )
}
