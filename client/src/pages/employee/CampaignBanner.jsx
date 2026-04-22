// =============================================================================
// CampaignBanner — Hero section of the employee dashboard
// Contains the welcome greeting + editorial headline + progress ring + CTA.
// Design: docs/design/dashboard/DESIGN.md
// =============================================================================

import React from 'react'
import './CampaignBanner.css'
import { Bell } from 'lucide-react'

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
export default function CampaignBanner({ t, campaign, loading, error, userName = '', onNavigate, isActive = true, userProgress = 0 }) {
  const [animatedProgress, setAnimatedProgress] = React.useState(0)
  const actualProgress = userProgress

  // Trigger animation only when becoming active again
  React.useEffect(() => {
    if (!isActive) {
      setAnimatedProgress(0)
    } else {
      // small delay to allow display:block to paint before transitioning
      const timer = setTimeout(() => setAnimatedProgress(actualProgress), 50)
      return () => clearTimeout(timer)
    }
  }, [isActive, actualProgress])

  const progress     = animatedProgress
  const campaignName = !loading && !error && campaign
    ? (campaign.name || campaign.title || t('dashboard.campaign.headline.accent'))
    : null

  const statusText = loading
    ? t('dashboard.loading')
    : error
      ? t('dashboard.error')
      : !campaign
        ? t('dashboard.campaign.empty')
        : (campaign.description || t('dashboard.campaign.body'))

  const isReady = !loading && !error && campaign

  return (
    <section className="cb">

      {/* Left — greeting + headline block */}
      <div className="cb__content">
        <p className="cb__greeting">
          {t('dashboard.welcome.greeting')} {userName || 'vous'}.
        </p>
        <p className="cb__tagline">{t('dashboard.welcome.tagline')}</p>

        {/* Active Campaign badge */}
        <div className="cb__badge" style={!isReady ? { visibility: 'hidden' } : undefined}>
          <Bell size={11} color="var(--color-error)" strokeWidth={2} />
          {t('dashboard.campaign.badge')}
        </div>

        <h2 className="cb__headline" style={!isReady ? { visibility: 'hidden' } : undefined}>
          {t('dashboard.campaign.headline.part1')}{' '}
          <span className="cb__headline-accent">{campaignName}</span>{' '}
          {t('dashboard.campaign.headline.part2')}
        </h2>

        <p className="cb__body">{statusText}</p>
      </div>

      {/* Right — ring + CTA — always in DOM to stabilise banner height */}
      <div className="cb__cta-area" style={!isReady ? { visibility: 'hidden' } : undefined}>
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

        <a
          className="cb__btn"
          href="#"
          onClick={(e) => {
            if (onNavigate) {
              e.preventDefault();
              onNavigate();
            }
          }}
        >
          {t('dashboard.campaign.cta')}
        </a>
      </div>

      {/* Decorative ambient glow */}
      <div className="cb__glow" aria-hidden="true" />

    </section>
  )
}

