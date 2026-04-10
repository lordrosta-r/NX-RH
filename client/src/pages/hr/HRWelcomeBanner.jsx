// =============================================================================
// HRWelcomeBanner — Hero card du dashboard RH
// Greeting + tagline + 2 CTAs (gauche) + image avec overlay stats (droite).
// Design: docs/design/dashboard/DESIGN.md
// =============================================================================

import React from 'react'
import './HRWelcomeBanner.css'

const HERO_IMG = 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=900&q=70'

export default function HRWelcomeBanner({ t, userName = '' }) {
  return (
    <section className="hrwb">

      {/* ── Left — greeting + CTAs ─────────────────────────────────────── */}
      <div className="hrwb__content">
        <p className="hrwb__greeting">
          {t('hr.welcome.greeting')} {userName || 'RH'}.
        </p>
        <p className="hrwb__tagline">{t('hr.welcome.tagline')}</p>

        <div className="hrwb__badge">
          <span className="hrwb__badge-dot" aria-hidden="true" />
          {t('hr.welcome.badge')}
        </div>

        <h2 className="hrwb__headline">
          {t('hr.welcome.headline.part1')}{' '}
          <span className="hrwb__headline-accent">
            {t('hr.welcome.headline.accent')}
          </span>{' '}
          {t('hr.welcome.headline.part2')}
        </h2>

        <div className="hrwb__actions">
          <button className="hrwb__btn hrwb__btn--primary">
            {t('hr.welcome.cta.primary')}
          </button>
          <button className="hrwb__btn hrwb__btn--secondary">
            {t('hr.welcome.cta.secondary')}
          </button>
        </div>
      </div>

      {/* ── Right — image + stat overlay ──────────────────────────────── */}
      <div className="hrwb__visual">
        <img
          src={HERO_IMG}
          alt=""
          className="hrwb__img"
          aria-hidden="true"
          onError={e => { e.target.style.display = 'none' }}
        />
        <div className="hrwb__img-bg" aria-hidden="true" />
        <div className="hrwb__stats">
          <div className="hrwb__stat">
            <span className="hrwb__stat-value">128</span>
            <span className="hrwb__stat-label">{t('hr.welcome.stat.employees')}</span>
          </div>
          <div className="hrwb__stat-sep" aria-hidden="true" />
          <div className="hrwb__stat">
            <span className="hrwb__stat-value">1</span>
            <span className="hrwb__stat-label">{t('hr.welcome.stat.campaign')}</span>
          </div>
          <div className="hrwb__stat-sep" aria-hidden="true" />
          <div className="hrwb__stat">
            <span className="hrwb__stat-value">67%</span>
            <span className="hrwb__stat-label">{t('hr.welcome.stat.completion')}</span>
          </div>
        </div>
      </div>

      <div className="hrwb__glow" aria-hidden="true" />
    </section>
  )
}
