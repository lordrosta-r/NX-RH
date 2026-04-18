// =============================================================================
// CampaignBanner — Hero section of the employee dashboard
// Contains the welcome greeting + editorial headline + progress ring + CTA.
// Design: docs/design/dashboard/DESIGN.md
// =============================================================================

import React from 'react'
import './CampaignBanner.css'
import { BellIcon } from '../../components/ui/icons'

// ── Circular SVG progress ring ──────────────────────────────────────────────
function ProgressRing({ value = 0, size = 192, trackWidth = 10 }) {
  const center = size / 2
  const radius = center - trackWidth - 8
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - Math.min(value, 100) / 100)

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ transform: 'rotate(-90deg)' }}
      aria-hidden="true"
    >
      {/* Track */}
      <circle
        cx={center} cy={center} r={radius}
        fill="transparent"
        stroke="var(--color-surface-container-high)"
        strokeWidth={trackWidth}
      />
      {/* Progress */}
      <circle
        cx={center} cy={center} r={radius}
        fill="transparent"
        stroke="var(--color-secondary)"
        strokeWidth={trackWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
      />
    </svg>
  )
}

// ── Banner component ────────────────────────────────────────────────────────
export default function CampaignBanner({ t, campaign, loading, error, userName = '' }) {
  const greeting = (
    <>
      <p className="cb__greeting">
        {t('dashboard.welcome.greeting')} {userName || 'vous'}.
      </p>
      <p className="cb__tagline">{t('dashboard.welcome.tagline')}</p>
    </>
  )

  if (loading) {
    return (
      <section className="cb">
        <div className="cb__content">{greeting}<p className="cb__body">{t('dashboard.loading')}</p></div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="cb">
        <div className="cb__content">{greeting}<p className="cb__body">{t('dashboard.error')}</p></div>
      </section>
    )
  }

  if (!campaign) {
    return (
      <section className="cb">
        <div className="cb__content">{greeting}<p className="cb__body">{t('dashboard.campaign.empty')}</p></div>
      </section>
    )
  }

  const progress     = campaign.progress ?? 0
  const campaignName = campaign.name || campaign.title || t('dashboard.campaign.headline.accent')

  return (
    <section className="cb">

      {/* Left — greeting + headline block */}
      <div className="cb__content">
        {greeting}

        {/* Active Campaign badge — bell icon + label */}
        <div className="cb__badge">
          <BellIcon size={11} color="var(--color-error)" strokeWidth={2} />
          {t('dashboard.campaign.badge')}
        </div>

        <h2 className="cb__headline">
          {t('dashboard.campaign.headline.part1')}{' '}
          <span className="cb__headline-accent">{campaignName}</span>{' '}
          {t('dashboard.campaign.headline.part2')}
        </h2>

        <p className="cb__body">{campaign.description || t('dashboard.campaign.body')}</p>
      </div>

      {/* Right — ring + CTA */}
      <div className="cb__cta-area">
        <div className="cb__ring-wrap">
          <div
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${t('dashboard.campaign.progress.label')} : ${progress}%`}
          >
            <ProgressRing value={progress} size={192} trackWidth={10} />
            <div className="cb__ring-text">
              <span className="cb__ring-value">{progress}%</span>
              <span className="cb__ring-label">
                {t('dashboard.campaign.progress.label').toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        <button className="cb__btn">
          {t('dashboard.campaign.cta')}
        </button>
      </div>

      {/* Decorative ambient glow */}
      <div className="cb__glow" aria-hidden="true" />

    </section>
  )
}
