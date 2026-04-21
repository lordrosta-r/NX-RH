// =============================================================================
// HRAnalytics — Analyses RH (/hr/analytics)
//
// 5 dashboards : Flight Risk, Goal Gap, Skills Gap, Sentiment Heatmap, 9-Box.
// Toutes les données sont des mocks en attendant l'intégration API.
// Contenu de page uniquement — shell fourni par AuthedLayout.
// =============================================================================

import React, { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useTranslate, useLocaleCtx } from '../../contexts/LocaleContext'
import { t as pageT } from './i18n'
import { BarChart2, Download, Info } from 'lucide-react'
import './hr-analytics.css'

// ── Données de démonstration ──────────────────────────────────────────────────
// TODO: remplacer par données réelles depuis /api/evaluations et /api/users

const MOCK_FLIGHT_RISK = [
  { name: 'A. Martin',   satisfaction: 7.2, performance: 8.1, mobility: false },
  { name: 'B. Dupont',   satisfaction: 3.1, performance: 5.8, mobility: true  },
  { name: 'C. Lambert',  satisfaction: 5.5, performance: 6.2, mobility: false },
  { name: 'D. Petit',    satisfaction: 2.4, performance: 4.1, mobility: true  },
  { name: 'E. Moreau',   satisfaction: 8.3, performance: 9.0, mobility: false },
  { name: 'F. Simon',    satisfaction: 4.7, performance: 7.4, mobility: false },
  { name: 'G. Laurent',  satisfaction: 6.1, performance: 6.8, mobility: true  },
  { name: 'H. Lefebvre', satisfaction: 9.0, performance: 8.7, mobility: false },
  { name: 'I. Roux',     satisfaction: 1.9, performance: 3.2, mobility: true  },
  { name: 'J. David',    satisfaction: 7.8, performance: 7.1, mobility: false },
]

const MOCK_GOAL_GAP = [
  { dept: 'Engineering', achieved: 72, partial: 18, notAchieved: 10 },
  { dept: 'Product',     achieved: 60, partial: 25, notAchieved: 15 },
  { dept: 'Design',      achieved: 85, partial: 10, notAchieved: 5  },
  { dept: 'Marketing',   achieved: 45, partial: 30, notAchieved: 25 },
  { dept: 'Sales',       achieved: 78, partial: 12, notAchieved: 10 },
]

const MOCK_SKILLS = [
  { axis: 'Technique',       value: 7.8 },
  { axis: 'Leadership',      value: 6.2 },
  { axis: 'Communication',   value: 7.5 },
  { axis: 'Travail équipe',  value: 8.1 },
  { axis: 'Adaptabilité',    value: 6.9 },
  { axis: 'Initiative',      value: 7.3 },
]

const MOCK_SENTIMENT_YEAR = (() => {
  // Génère 52 semaines de scores 0-10 fictifs
  return Array.from({ length: 52 }, (_, i) => ({
    week: i + 1,
    score: 4 + Math.sin(i / 6) * 3 + (Math.random() * 1.2 - 0.6),
  }))
})()

const MOCK_NINEBOX = [
  // [potentiel 0-2, performance 0-2, name]
  { pot: 2, perf: 2, name: 'A. Martin' },
  { pot: 2, perf: 2, name: 'E. Moreau' },
  { pot: 2, perf: 1, name: 'H. Lefebvre' },
  { pot: 1, perf: 2, name: 'J. David' },
  { pot: 1, perf: 1, name: 'C. Lambert' },
  { pot: 1, perf: 1, name: 'F. Simon' },
  { pot: 0, perf: 1, name: 'B. Dupont' },
  { pot: 0, perf: 0, name: 'I. Roux' },
  { pot: 2, perf: 0, name: 'G. Laurent' },
]

const TABS = ['flightrisk', 'goalgap', 'skillsgap', 'sentiment', 'ninebox']

// ── Scatter Plot (Flight Risk) ────────────────────────────────────────────────
// viewBox 0 0 400 300 — x=satisfaction, y=performance (inversé SVG)
function FlightRiskChart({ data }) {
  const W = 400, H = 300, PAD = 40
  function cx(v) { return PAD + (v / 10) * (W - PAD * 2) }
  function cy(v) { return H - PAD - (v / 10) * (H - PAD * 2) }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="hra-scatter" aria-label="Flight Risk Scatter Plot">
      {/* Grid */}
      {[0,2,4,6,8,10].map(v => (
        <g key={v}>
          <line x1={cx(v)} y1={PAD} x2={cx(v)} y2={H - PAD} stroke="var(--color-divider)" strokeWidth={0.5} />
          <line x1={PAD} y1={cy(v)} x2={W - PAD} y2={cy(v)} stroke="var(--color-divider)" strokeWidth={0.5} />
          <text x={cx(v)} y={H - PAD + 14} textAnchor="middle" fontSize={9} fill="var(--color-on-surface-variant)">{v}</text>
          <text x={PAD - 6} y={cy(v) + 3} textAnchor="end" fontSize={9} fill="var(--color-on-surface-variant)">{v}</text>
        </g>
      ))}
      {/* Axes labels */}
      <text x={W / 2} y={H - 4} textAnchor="middle" fontSize={10} fill="var(--color-on-surface-variant)">Satisfaction</text>
      <text x={10} y={H / 2} textAnchor="middle" fontSize={10} fill="var(--color-on-surface-variant)" transform={`rotate(-90,10,${H/2})`}>Performance</text>
      {/* Points */}
      {data.map((d, i) => (
        <g key={i}>
          <circle
            cx={cx(d.satisfaction)}
            cy={cy(d.performance)}
            r={6}
            fill={d.mobility ? 'var(--color-error)' : 'var(--color-secondary)'}
            opacity={0.82}
          />
          <title>{d.name} — Sat: {d.satisfaction} / Perf: {d.performance}{d.mobility ? ' (risque mobilité)' : ''}</title>
        </g>
      ))}
    </svg>
  )
}

// ── Goal Gap Bar Chart ────────────────────────────────────────────────────────
function GoalGapChart({ data }) {
  return (
    <div className="hra-goalgap">
      {data.map(d => (
        <div key={d.dept} className="hra-goalgap__row">
          <span className="hra-goalgap__dept">{d.dept}</span>
          <div className="hra-goalgap__bars">
            <div
              className="hra-goalgap__bar hra-goalgap__bar--achieved"
              style={{ width: `${d.achieved}%` }}
              title={`Atteint: ${d.achieved}%`}
            />
            <div
              className="hra-goalgap__bar hra-goalgap__bar--partial"
              style={{ width: `${d.partial}%` }}
              title={`Partiel: ${d.partial}%`}
            />
            <div
              className="hra-goalgap__bar hra-goalgap__bar--missed"
              style={{ width: `${d.notAchieved}%` }}
              title={`Non atteint: ${d.notAchieved}%`}
            />
          </div>
          <span className="hra-goalgap__pct">{d.achieved}%</span>
        </div>
      ))}
      <div className="hra-legend">
        <span className="hra-legend__item hra-legend__item--achieved">Atteint</span>
        <span className="hra-legend__item hra-legend__item--partial">Partiel</span>
        <span className="hra-legend__item hra-legend__item--missed">Non atteint</span>
      </div>
    </div>
  )
}

// ── Skills Gap Radar ──────────────────────────────────────────────────────────
function SkillsRadar({ skills }) {
  const W = 300, H = 300, CX = 150, CY = 150, R = 110
  const N = skills.length
  const MAX = 10

  function getPoint(i, value) {
    const angle = (i / N) * 2 * Math.PI - Math.PI / 2
    const r = (value / MAX) * R
    return [CX + r * Math.cos(angle), CY + r * Math.sin(angle)]
  }

  const dataPoints = skills.map((s, i) => getPoint(i, s.value))
  const polyData = dataPoints.map(([x, y]) => `${x},${y}`).join(' ')

  // Grid circles at 2,4,6,8,10
  const gridLevels = [2, 4, 6, 8, 10]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="hra-radar" aria-label="Skills Gap Radar">
      {/* Grid */}
      {gridLevels.map(level =>
        <polygon
          key={level}
          points={skills.map((_, i) => getPoint(i, level).join(',')).join(' ')}
          fill="none"
          stroke="var(--color-divider)"
          strokeWidth={0.8}
        />
      )}
      {/* Axes */}
      {skills.map((_, i) => {
        const [x, y] = getPoint(i, MAX)
        return <line key={i} x1={CX} y1={CY} x2={x} y2={y} stroke="var(--color-divider)" strokeWidth={0.8} />
      })}
      {/* Data polygon */}
      <polygon
        points={polyData}
        fill="var(--color-secondary)"
        fillOpacity={0.18}
        stroke="var(--color-secondary)"
        strokeWidth={2}
      />
      {/* Labels */}
      {skills.map((s, i) => {
        const [x, y] = getPoint(i, MAX + 1.5)
        return (
          <text
            key={i} x={x} y={y}
            textAnchor="middle" dominantBaseline="middle"
            fontSize={9.5} fill="var(--color-on-surface)"
          >
            {s.axis}
          </text>
        )
      })}
      {/* Data points */}
      {dataPoints.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={4} fill="var(--color-secondary)" />
      ))}
    </svg>
  )
}

// ── Sentiment Heatmap ─────────────────────────────────────────────────────────
function SentimentHeatmap({ data }) {
  function scoreColor(score) {
    if (score >= 7) return 'var(--color-success)'
    if (score >= 4) return '#f59e0b'
    return 'var(--color-error)'
  }

  return (
    <div className="hra-heatmap">
      <div className="hra-heatmap__grid">
        {data.map((d, i) => (
          <div
            key={i}
            className="hra-heatmap__cell"
            style={{ background: scoreColor(d.score) }}
            title={`Sem. ${d.week}: ${d.score.toFixed(1)}`}
          />
        ))}
      </div>
      <div className="hra-legend">
        <span className="hra-legend__item" style={{ '--dot-color': 'var(--color-success)' }}>Score &gt; 7</span>
        <span className="hra-legend__item" style={{ '--dot-color': '#f59e0b' }}>Score 4-7</span>
        <span className="hra-legend__item" style={{ '--dot-color': 'var(--color-error)' }}>Score &lt; 4</span>
      </div>
    </div>
  )
}

// ── 9-Box Grid ────────────────────────────────────────────────────────────────
const BOX_LABELS_Y = ['Élevé', 'Moyen', 'Faible']
const BOX_LABELS_X = ['Faible', 'Moyen', 'Élevé']
const BOX_COLORS = [
  ['#fde68a','#86efac','#4ade80'],
  ['#fca5a5','#fde68a','#86efac'],
  ['#f87171','#fca5a5','#fde68a'],
]

function NineBoxGrid({ data }) {
  const cells = Array.from({ length: 3 }, (_, row) =>
    Array.from({ length: 3 }, (_, col) => ({
      potRow: 2 - row,
      perfCol: col,
      names: data.filter(d => d.pot === (2 - row) && d.perf === col).map(d => d.name),
    }))
  )

  return (
    <div className="hra-ninebox">
      <div className="hra-ninebox__ylabel">
        <span>Potentiel</span>
      </div>
      <div className="hra-ninebox__main">
        <div className="hra-ninebox__grid">
          {cells.map((row, ri) =>
            row.map((cell, ci) => (
              <div
                key={`${ri}-${ci}`}
                className="hra-ninebox__cell"
                style={{ background: BOX_COLORS[ri][ci] }}
              >
                {cell.names.map((name, ni) => (
                  <span key={ni} className="hra-ninebox__pill">{name}</span>
                ))}
              </div>
            ))
          )}
        </div>
        <div className="hra-ninebox__xlabels">
          {BOX_LABELS_X.map(l => <span key={l}>{l}</span>)}
        </div>
        <p className="hra-ninebox__xlabel">Performance</p>
      </div>
      <div className="hra-ninebox__ylabels">
        {BOX_LABELS_Y.map(l => <span key={l}>{l}</span>)}
      </div>
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────
export default function HRAnalytics() {
  const { user } = useAuth()
  const t = useTranslate(pageT)

  const [activeTab, setActiveTab] = useState('flightrisk')
  const [period, setPeriod] = useState('year')
  const [dept, setDept] = useState('all')

  return (
    <div className="hra-page">

      {/* ── Hero ──────────────────────────────────────── */}
      <header className="hra-hero">
        <p className="hra-hero__eyebrow">{t('hra.hero.eyebrow')}</p>
        <h1 className="hra-hero__headline">
          {t('hra.hero.title')}
        </h1>
        <p className="hra-hero__sub">{t('hra.hero.sub')}</p>
      </header>

      {/* ── Barre de filtres ──────────────────────────── */}
      <div className="hra-filterbar">
        <select className="hra-select" value={period} onChange={e => setPeriod(e.target.value)} aria-label={t('hra.filter.period')}>
          <option value="year">Année courante</option>
          <option value="q1">T1</option>
          <option value="q2">T2</option>
          <option value="q3">T3</option>
          <option value="q4">T4</option>
        </select>

        <select className="hra-select" value={dept} onChange={e => setDept(e.target.value)} aria-label={t('hra.filter.dept')}>
          <option value="all">Tous les départements</option>
          <option value="eng">Engineering</option>
          <option value="product">Product</option>
          <option value="design">Design</option>
          <option value="marketing">Marketing</option>
          <option value="sales">Sales</option>
        </select>

        <div className="hra-filterbar__spacer" />

        <button type="button" className="hra-export-btn" disabled title={t('hra.export.soon')}>
          <Download size={14} />
          {t('hra.export.pdf')}
        </button>
        <button type="button" className="hra-export-btn" disabled title={t('hra.export.soon')}>
          <Download size={14} />
          {t('hra.export.csv')}
        </button>
      </div>

      {/* ── Disclaimer ───────────────────────────────── */}
      <div className="hra-disclaimer" role="note">
        <Info size={14} aria-hidden="true" />
        <span>{t('hra.mock.disclaimer')}</span>
      </div>

      {/* ── Tabs ─────────────────────────────────────── */}
      <div className="hra-tabs" role="tablist">
        {TABS.map(tab => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            className={`hra-tab${activeTab === tab ? ' hra-tab--active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {t(`hra.tab.${tab}`)}
          </button>
        ))}
      </div>

      {/* ── Contenu ──────────────────────────────────── */}
      <div className="hra-chart-area">
        {activeTab === 'flightrisk' && (
          <div className="hra-chart-wrap">
            <h2 className="hra-chart-title">{t('hra.tab.flightrisk')}</h2>
            <FlightRiskChart data={MOCK_FLIGHT_RISK} />
            <div className="hra-legend">
              <span className="hra-legend__item" style={{ '--dot-color': 'var(--color-secondary)' }}>Stable</span>
              <span className="hra-legend__item" style={{ '--dot-color': 'var(--color-error)' }}>Risque mobilité</span>
            </div>
          </div>
        )}

        {activeTab === 'goalgap' && (
          <div className="hra-chart-wrap">
            <h2 className="hra-chart-title">{t('hra.tab.goalgap')}</h2>
            <GoalGapChart data={MOCK_GOAL_GAP} />
          </div>
        )}

        {activeTab === 'skillsgap' && (
          <div className="hra-chart-wrap hra-chart-wrap--center">
            <h2 className="hra-chart-title">{t('hra.tab.skillsgap')}</h2>
            <SkillsRadar skills={MOCK_SKILLS} />
          </div>
        )}

        {activeTab === 'sentiment' && (
          <div className="hra-chart-wrap">
            <h2 className="hra-chart-title">{t('hra.tab.sentiment')}</h2>
            <SentimentHeatmap data={MOCK_SENTIMENT_YEAR} />
          </div>
        )}

        {activeTab === 'ninebox' && (
          <div className="hra-chart-wrap">
            <h2 className="hra-chart-title">{t('hra.tab.ninebox')}</h2>
            <NineBoxGrid data={MOCK_NINEBOX} />
          </div>
        )}
      </div>
    </div>
  )
}
