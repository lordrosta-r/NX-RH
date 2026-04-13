// =============================================================================
// HRWelcomeBanner — Hero card du dashboard RH
// Carte d'identité mission RH : greeting + chiffres clés + CTAs + image.
// Différent de hr-camp qui est la vue opérationnelle de la campagne en cours.
// Design: docs/design/dashboard/DESIGN.md
// =============================================================================

import React from 'react'
import './HRWelcomeBanner.css'

const HERO_IMG = 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=900&q=70'

export default function HRWelcomeBanner({ t, userName = '' }) {
  return (
    <section className="hrwb">

      {/* ── Left — greeting + mission + CTAs ──────────────────────────── */}
      <div className="hrwb__content">
        <p className="hrwb__greeting">
          {t('hr.welcome.greeting')} {userName || 'RH'}.
        </p>
        <p className="hrwb__tagline">{t('hr.welcome.tagline')}</p>
        <p className="hrwb__desc">{t('hr.welcome.desc')}</p>
        <a href="#reports" className="btn btn--sm">{t('hr.welcome.cta')}</a>

        <h2 className="hrwb__headline">
          {t('hr.welcome.headline.part1')}{' '}
          <span className="hrwb__headline-accent">
            {t('hr.welcome.headline.accent')}
          </span>
          {t('hr.welcome.headline.part2') ? ` ${t('hr.welcome.headline.part2')}` : ''}
        </h2>

      </div>

      {/* ── Right — image + stat overlay ──────────────────────────────── */}
      <div className="hrwb__visual">
        <img
          src={HERO_IMG}
          alt=""
          loading="lazy"
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
            <span className="hrwb__stat-value">5</span>
            <span className="hrwb__stat-label">{t('hr.welcome.stat.departments')}</span>
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
