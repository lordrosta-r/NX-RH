// =============================================================================
// FormEditorBanner — hero section of the Form Editor page
// Design: Editorial Enterprise — text left, stats right
// =============================================================================
import React from 'react'
import './FormEditorBanner.css'

export default function FormEditorBanner({ t }) {
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
          <span className="feb__stat-value">4</span>
          <span className="feb__stat-label">Formulaires</span>
        </div>
        <div className="feb__stat">
          <span className="feb__stat-value">2</span>
          <span className="feb__stat-label">Actifs</span>
        </div>
        <div className="feb__stat">
          <span className="feb__stat-value">179</span>
          <span className="feb__stat-label">Réponses totales</span>
        </div>
      </div>
    </section>
  )
}
