// =============================================================================
// CampaignBanner — Hero section of the employee dashboard
// Editorial Enterprise headline + circular progress ring + CTA.
// Design: docs/design/dashboard/DESIGN.md
// =============================================================================

import React from 'react'
import './CampaignBanner.css'

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
export default function CampaignBanner({ t, progress = 0 }) {
  return (
    <section className="cb">

      {/* Left — headline block */}
      <div className="cb__content">
        <div className="cb__badge">
          <span className="cb__badge-dot" aria-hidden="true" />
          {t('dashboard.campaign.badge')}
        </div>

        <h2 className="cb__headline">
          {t('dashboard.campaign.headline.part1')}{' '}
          <span className="cb__headline-accent">
            {t('dashboard.campaign.headline.accent')}
          </span>{' '}
          {t('dashboard.campaign.headline.part2')}
        </h2>

        <p className="cb__body">{t('dashboard.campaign.body')}</p>
      </div>

      {/* Right — ring + CTA */}
      <div className="cb__cta-area">
        <div className="cb__ring-wrap">
          <ProgressRing value={progress} size={192} trackWidth={10} />
          {/* Center text — overlaid via CSS absolute positioning */}
          <div className="cb__ring-text">
            <span className="cb__ring-value">{progress}%</span>
            <span className="cb__ring-label">
              {t('dashboard.campaign.progress.label').toUpperCase()}
            </span>
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
