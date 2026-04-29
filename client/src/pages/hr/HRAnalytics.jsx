// =============================================================================
// HRAnalytics — Analyses RH (/hr/analytics)
//
// 5 dashboards : Flight Risk, Goal Gap, Skills Gap, Sentiment Heatmap, 9-Box.
// Données réelles depuis /api/evaluations et /api/campaigns (TanStack Query v5).
// Contenu de page uniquement — shell fourni par AuthedLayout.
// =============================================================================

import React, { useState, useMemo } from 'react'
import { useQuery }    from '@tanstack/react-query'
import { useAuth }     from '../../contexts/AuthContext'
import { useTranslate } from '../../contexts/LocaleContext'
import { t as pageT }  from './i18n'
import { BarChart2, Download } from 'lucide-react'
import { apiFetch } from '../../lib/apiFetch'
import { Skeleton, SkeletonStat } from '../../components/ui/Skeleton'

// ── Constantes ────────────────────────────────────────────────────────────────

const TERMINAL_STATUSES = ['submitted', 'reviewed', 'signed_evaluatee', 'signed_manager', 'signed_hr', 'validated']
const SCORED_STATUSES   = ['reviewed', 'signed_evaluatee', 'signed_manager', 'signed_hr', 'validated']

const DEPARTMENTS = [
  'Engineering', 'Product', 'Design', 'Data', 'Security',
  'Infrastructure', 'Finance', 'Legal', 'HR', 'Sales',
  'Marketing', 'Customer Success', 'Operations', 'Executive',
]

const TABS = ['flightrisk', 'goalgap', 'skillsgap', 'sentiment', 'ninebox']

// ── Fetch helpers ─────────────────────────────────────────────────────────────

async function fetchEvals() {
  const json = await apiFetch('/api/evaluations')
  return Array.isArray(json) ? json : (json.data ?? [])
}

async function fetchCampaigns() {
  const json = await apiFetch('/api/campaigns')
  return Array.isArray(json) ? json : (json.data ?? [])
}

// ── Filtres ───────────────────────────────────────────────────────────────────

function getPeriodBounds(period) {
  const year = new Date().getFullYear()
  const QUARTERS = { q1: [0, 2], q2: [3, 5], q3: [6, 8], q4: [9, 11] }
  if (period === 'year') return [new Date(year, 0, 1), new Date(year, 11, 31, 23, 59, 59)]
  if (QUARTERS[period]) {
    const [s, e] = QUARTERS[period]
    return [new Date(year, s, 1), new Date(year, e + 1, 0, 23, 59, 59)]
  }
  return null
}

function applyFilters(evals, { dept, period, campaignId }) {
  return evals.filter(ev => {
    if (dept !== 'all' && ev.evaluateeId?.department !== dept) return false
    if (campaignId !== 'all') {
      const cid = (ev.campaignId?._id || ev.campaignId)?.toString()
      if (cid !== campaignId) return false
    }
    if (period !== 'all') {
      const bounds = getPeriodBounds(period)
      if (bounds) {
        const d = new Date(ev.createdAt)
        if (d < bounds[0] || d > bounds[1]) return false
      }
    }
    return true
  })
}

// ── Compute : Flight Risk ─────────────────────────────────────────────────────
// Performance = score moyen / 10 (reviewer score)
// Satisfaction = proxy basé sur l'absence/présence de disagreementFlag

function computeFlightRisk(evals) {
  const byPerson = {}
  evals.forEach(ev => {
    if (!ev.evaluateeId) return
    const id   = (ev.evaluateeId._id || ev.evaluateeId).toString()
    const name = ev.evaluateeId.firstName
      ? `${ev.evaluateeId.firstName.charAt(0)}. ${ev.evaluateeId.lastName}`
      : id.slice(-6)
    if (!byPerson[id]) byPerson[id] = { name, scores: [], disagree: false }
    if (ev.score != null) byPerson[id].scores.push(ev.score)
    if (ev.disagreementFlag) byPerson[id].disagree = true
  })

  return Object.values(byPerson)
    .filter(p => p.scores.length > 0)
    .map(p => {
      const perf = Math.round(p.scores.reduce((a, b) => a + b, 0) / p.scores.length / 10 * 10) / 10
      const sat  = p.disagree
        ? Math.max(1, Math.round((perf - 3.5) * 10) / 10)
        : Math.min(10, Math.round((perf + 0.8) * 10) / 10)
      return { name: p.name, performance: perf, satisfaction: sat, mobility: p.disagree }
    })
}

// ── Compute : Goal Gap ────────────────────────────────────────────────────────
// Répartition des scores (≥70 = atteint, 40-69 = partiel, <40 = insuffisant) par département

function computeGoalGap(evals) {
  const relevant = evals.filter(ev => SCORED_STATUSES.includes(ev.status) && ev.score != null)
  const byDept   = {}
  relevant.forEach(ev => {
    const dept = ev.evaluateeId?.department || 'Non assigné'
    if (!byDept[dept]) byDept[dept] = []
    byDept[dept].push(ev.score)
  })
  return Object.entries(byDept).map(([dept, scores]) => {
    const n = scores.length
    return {
      dept,
      achieved:    Math.round(scores.filter(s => s >= 70).length / n * 100),
      partial:     Math.round(scores.filter(s => s >= 40 && s < 70).length / n * 100),
      notAchieved: Math.round(scores.filter(s => s < 40).length / n * 100),
    }
  }).sort((a, b) => b.achieved - a.achieved)
}

// ── Compute : Skills (taux de complétion par type de formulaire) ──────────────

function computeSkillsByFormType(evals) {
  const TYPE_LABELS = {
    self_evaluation:     'Auto-éval.',
    manager_evaluation:  'Bilan N-1',
    upward_feedback:     'Upward',
    director_evaluation: 'Direction',
    peer_review:         'Peer Review',
  }
  const byType = {}
  evals.forEach(ev => {
    const type = ev.formId?.formType
    if (!type || !TYPE_LABELS[type]) return
    if (!byType[type]) byType[type] = { total: 0, completed: 0 }
    byType[type].total++
    if (TERMINAL_STATUSES.includes(ev.status)) byType[type].completed++
  })
  return Object.entries(byType)
    .filter(([, v]) => v.total > 0)
    .map(([type, { total, completed }]) => ({
      axis:  TYPE_LABELS[type],
      value: Math.round(completed / total * 10 * 10) / 10,
    }))
}

// ── Compute : Sentiment (activité mensuelle) ──────────────────────────────────

function computeSentiment(evals) {
  const now    = new Date()
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1)
    return { label: d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }), year: d.getFullYear(), month: d.getMonth(), count: 0, scores: [] }
  })
  evals.forEach(ev => {
    if (!TERMINAL_STATUSES.includes(ev.status)) return
    const d = new Date(ev.updatedAt || ev.createdAt)
    const m = months.find(m => m.year === d.getFullYear() && m.month === d.getMonth())
    if (!m) return
    m.count++
    if (ev.score != null) m.scores.push(ev.score)
  })
  return months.map(m => ({
    ...m,
    avgScore: m.scores.length
      ? Math.round(m.scores.reduce((a, b) => a + b, 0) / m.scores.length / 10 * 10) / 10
      : null,
  }))
}

// ── Compute : 9-Box ───────────────────────────────────────────────────────────
// Performance = score moyen  → low(<40)/mid(40-70)/high(>70) → 0/1/2
// Potentiel   = taux de complétion → low(<34%)/mid(34-66%)/high(>66%) → 0/1/2

function computeNineBox(evals) {
  const byPerson = {}
  evals.forEach(ev => {
    if (!ev.evaluateeId) return
    const id   = (ev.evaluateeId._id || ev.evaluateeId).toString()
    const name = ev.evaluateeId.firstName
      ? `${ev.evaluateeId.firstName.charAt(0)}. ${ev.evaluateeId.lastName}`
      : id.slice(-6)
    if (!byPerson[id]) byPerson[id] = { name, scores: [], total: 0, completed: 0 }
    byPerson[id].total++
    if (TERMINAL_STATUSES.includes(ev.status)) {
      byPerson[id].completed++
      if (ev.score != null) byPerson[id].scores.push(ev.score)
    }
  })
  return Object.values(byPerson).map(p => {
    const avg  = p.scores.length ? p.scores.reduce((a, b) => a + b, 0) / p.scores.length : 0
    const rate = p.total > 0 ? p.completed / p.total : 0
    return {
      name: p.name,
      perf: avg  >= 70 ? 2 : avg  >= 40 ? 1 : 0,
      pot:  rate >= 0.67 ? 2 : rate >= 0.34 ? 1 : 0,
    }
  })
}

// ── Export CSV ────────────────────────────────────────────────────────────────

function exportCSV(activeTab, data) {
  const HEADERS = {
    flightrisk: ['Nom', 'Performance (/10)', 'Satisfaction proxy (/10)', 'Désaccord signalé'],
    goalgap:    ['Département', 'Atteint (%)', 'Partiel (%)', 'Insuffisant (%)'],
    skillsgap:  ['Type de formulaire', 'Taux de complétion (/10)'],
    sentiment:  ['Mois', 'Évaluations soumises', 'Score moyen (/10)'],
    ninebox:    ['Nom', 'Performance (0-2)', 'Potentiel (0-2)'],
  }
  const ROWS = {
    flightrisk: d => [d.name, d.performance, d.satisfaction, d.mobility ? 'Oui' : 'Non'],
    goalgap:    d => [d.dept, d.achieved, d.partial, d.notAchieved],
    skillsgap:  d => [d.axis, d.value],
    sentiment:  d => [d.label, d.count, d.avgScore ?? '–'],
    ninebox:    d => [d.name, d.perf, d.pot],
  }
  if (!data?.length || !HEADERS[activeTab]) return
  const rows  = [HEADERS[activeTab], ...data.map(ROWS[activeTab])]
  const csv   = rows.map(r => r.join(';')).join('\n')
  const blob  = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url   = URL.createObjectURL(blob)
  const a     = document.createElement('a')
  a.href      = url
  a.download  = `analytics-${activeTab}-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Chart : Scatter Plot (Flight Risk) ────────────────────────────────────────

function FlightRiskChart({ data }) {
  const W = 400, H = 300, PAD = 40
  const cx = v => PAD + (v / 10) * (W - PAD * 2)
  const cy = v => H - PAD - (v / 10) * (H - PAD * 2)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="hra-scatter" aria-label="Flight Risk Scatter Plot">
      {[0, 2, 4, 6, 8, 10].map(v => (
        <g key={v}>
          <line x1={cx(v)} y1={PAD}     x2={cx(v)}     y2={H - PAD} stroke="var(--color-divider)" strokeWidth={0.5} />
          <line x1={PAD}   y1={cy(v)}   x2={W - PAD}   y2={cy(v)}   stroke="var(--color-divider)" strokeWidth={0.5} />
          <text x={cx(v)} y={H - PAD + 14} textAnchor="middle" fontSize={9} fill="var(--color-on-surface-variant)">{v}</text>
          <text x={PAD - 6} y={cy(v) + 3}  textAnchor="end"    fontSize={9} fill="var(--color-on-surface-variant)">{v}</text>
        </g>
      ))}
      <text x={W / 2} y={H - 4} textAnchor="middle" fontSize={10} fill="var(--color-on-surface-variant)">Satisfaction (proxy)</text>
      <text x={10} y={H / 2} textAnchor="middle" fontSize={10} fill="var(--color-on-surface-variant)" transform={`rotate(-90,10,${H / 2})`}>Performance</text>
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={cx(d.satisfaction)} cy={cy(d.performance)} r={6} fill={d.mobility ? 'var(--color-error)' : 'var(--color-secondary)'} opacity={0.82} />
          <title>{d.name} — Perf : {d.performance}/10 | Sat : {d.satisfaction}/10{d.mobility ? ' — désaccord signalé' : ''}</title>
        </g>
      ))}
    </svg>
  )
}

// ── Chart : Goal Gap Bars ─────────────────────────────────────────────────────

function GoalGapChart({ data }) {
  return (
    <div className="hra-goalgap">
      {data.map(d => (
        <div key={d.dept} className="hra-goalgap__row">
          <span className="hra-goalgap__dept">{d.dept}</span>
          <div className="hra-goalgap__bars">
            <div className="hra-goalgap__bar hra-goalgap__bar--achieved" style={{ width: `${d.achieved}%` }}    title={`Atteint : ${d.achieved}%`} />
            <div className="hra-goalgap__bar hra-goalgap__bar--partial"  style={{ width: `${d.partial}%` }}     title={`Partiel : ${d.partial}%`} />
            <div className="hra-goalgap__bar hra-goalgap__bar--missed"   style={{ width: `${d.notAchieved}%` }} title={`Insuffisant : ${d.notAchieved}%`} />
          </div>
          <span className="hra-goalgap__pct">{d.achieved}%</span>
        </div>
      ))}
      <div className="hra-legend">
        <span className="hra-legend__item hra-legend__item--achieved">Score ≥ 70 (atteint)</span>
        <span className="hra-legend__item hra-legend__item--partial">Score 40-69 (partiel)</span>
        <span className="hra-legend__item hra-legend__item--missed">Score &lt; 40 (insuffisant)</span>
      </div>
    </div>
  )
}

// ── Chart : Skills Radar (complétion par type de formulaire) ──────────────────

function SkillsRadar({ skills }) {
  const W = 300, H = 300, CX = 150, CY = 150, R = 110, N = skills.length, MAX = 10
  const getPoint = (i, value) => {
    const angle = (i / N) * 2 * Math.PI - Math.PI / 2
    const r     = (value / MAX) * R
    return [CX + r * Math.cos(angle), CY + r * Math.sin(angle)]
  }
  const pts      = skills.map((s, i) => getPoint(i, s.value))
  const polyData = pts.map(([x, y]) => `${x},${y}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="hra-radar" aria-label="Complétion par type de formulaire">
      {[2, 4, 6, 8, 10].map(lvl => (
        <polygon key={lvl} points={skills.map((_, i) => getPoint(i, lvl).join(',')).join(' ')} fill="none" stroke="var(--color-divider)" strokeWidth={0.8} />
      ))}
      {skills.map((_, i) => {
        const [x, y] = getPoint(i, MAX)
        return <line key={i} x1={CX} y1={CY} x2={x} y2={y} stroke="var(--color-divider)" strokeWidth={0.8} />
      })}
      <polygon points={polyData} fill="var(--color-secondary)" fillOpacity={0.18} stroke="var(--color-secondary)" strokeWidth={2} />
      {skills.map((s, i) => {
        const [x, y] = getPoint(i, MAX + 1.5)
        return <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize={9.5} fill="var(--color-on-surface)">{s.axis}</text>
      })}
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={4} fill="var(--color-secondary)">
          <title>{skills[i].axis} : {skills[i].value}/10</title>
        </circle>
      ))}
    </svg>
  )
}

// ── Chart : Sentiment / Activité mensuelle ────────────────────────────────────

function SentimentHeatmap({ data }) {
  const countColor = n => {
    if (n === 0) return 'var(--color-surface-container, #e8e3e0)'
    if (n <= 2)  return '#fde68a'
    if (n <= 5)  return '#86efac'
    return 'var(--color-success)'
  }
  return (
    <div className="hra-heatmap">
      <div className="hra-heatmap__grid" style={{ gridTemplateColumns: 'repeat(12, 1fr)' }}>
        {data.map((d, i) => (
          <div
            key={i}
            className="hra-heatmap__cell"
            style={{ background: countColor(d.count) }}
            title={`${d.label} : ${d.count} éval.${d.avgScore != null ? ` — score moyen ${d.avgScore}/10` : ''}`}
          />
        ))}
      </div>
      <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginTop: '0.375rem' }}>
        {data.map((d, i) => (
          <span key={i} style={{ fontSize: '0.625rem', color: 'var(--color-on-surface-variant)', minWidth: '34px', textAlign: 'center' }}>{d.label}</span>
        ))}
      </div>
      <div className="hra-legend">
        <span className="hra-legend__item" style={{ '--dot-color': 'var(--color-surface-container, #e8e3e0)' }}>Aucune</span>
        <span className="hra-legend__item" style={{ '--dot-color': '#fde68a' }}>1-2</span>
        <span className="hra-legend__item" style={{ '--dot-color': '#86efac' }}>3-5</span>
        <span className="hra-legend__item" style={{ '--dot-color': 'var(--color-success)' }}>6+</span>
      </div>
    </div>
  )
}

// ── Chart : 9-Box Grid ────────────────────────────────────────────────────────

const BOX_LABELS_Y = ['Élevé', 'Moyen', 'Faible']
const BOX_LABELS_X = ['Faible', 'Moyen', 'Élevé']
const BOX_COLORS   = [
  ['#fde68a', '#86efac', '#4ade80'],
  ['#fca5a5', '#fde68a', '#86efac'],
  ['#f87171', '#fca5a5', '#fde68a'],
]

function NineBoxGrid({ data }) {
  const cells = Array.from({ length: 3 }, (_, row) =>
    Array.from({ length: 3 }, (_, col) => ({
      names: data.filter(d => d.pot === (2 - row) && d.perf === col).map(d => d.name),
    }))
  )
  return (
    <div className="hra-ninebox">
      <div className="hra-ninebox__ylabel"><span>Potentiel (engagement)</span></div>
      <div className="hra-ninebox__main">
        <div className="hra-ninebox__grid">
          {cells.map((row, ri) =>
            row.map((cell, ci) => (
              <div key={`${ri}-${ci}`} className="hra-ninebox__cell" style={{ background: BOX_COLORS[ri][ci] }}>
                {cell.names.map((name, ni) => <span key={ni} className="hra-ninebox__pill">{name}</span>)}
              </div>
            ))
          )}
        </div>
        <div className="hra-ninebox__xlabels">{BOX_LABELS_X.map(l => <span key={l}>{l}</span>)}</div>
        <p className="hra-ninebox__xlabel">Performance (score moyen)</p>
      </div>
      <div className="hra-ninebox__ylabels">{BOX_LABELS_Y.map(l => <span key={l}>{l}</span>)}</div>
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ message }) {
  return (
    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-on-surface-variant)' }}>
      <BarChart2 size={32} strokeWidth={1.5} aria-hidden="true" style={{ marginBottom: '0.75rem', opacity: 0.4, display: 'block', margin: '0 auto 0.75rem' }} />
      <p style={{ margin: 0, fontSize: '0.9375rem' }}>{message}</p>
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function HRAnalytics() {
  const { user } = useAuth()
  const t = useTranslate(pageT)

  const [activeTab,   setActiveTab]   = useState('flightrisk')
  const [period,      setPeriod]      = useState('year')
  const [dept,        setDept]        = useState('all')
  const [campaignId,  setCampaignId]  = useState('all')

  const { data: rawEvals = [], isLoading, error } = useQuery({
    queryKey:  ['analytics-evals'],
    queryFn:   fetchEvals,
    enabled:   !!user,
    staleTime: 60_000,
  })

  const { data: campaigns = [] } = useQuery({
    queryKey:  ['analytics-campaigns'],
    queryFn:   fetchCampaigns,
    enabled:   !!user,
    staleTime: 60_000,
  })

  const evals = useMemo(
    () => applyFilters(rawEvals, { dept, period, campaignId }),
    [rawEvals, dept, period, campaignId]
  )

  const flightRiskData = useMemo(() => computeFlightRisk(evals),       [evals])
  const goalGapData    = useMemo(() => computeGoalGap(evals),          [evals])
  const skillsData     = useMemo(() => computeSkillsByFormType(evals), [evals])
  const sentimentData  = useMemo(() => computeSentiment(rawEvals),     [rawEvals]) // pas de filtre période sur le heatmap
  const nineBoxData    = useMemo(() => computeNineBox(evals),          [evals])

  const activeData = { flightrisk: flightRiskData, goalgap: goalGapData, skillsgap: skillsData, sentiment: sentimentData, ninebox: nineBoxData }[activeTab]

  const SUB = {
    flightrisk: 'Performance (score moyen) vs. satisfaction estimée — désaccords signalés surlignés en rouge.',
    goalgap:    'Distribution des scores par département. Seuils : ≥ 70 = atteint, 40-69 = partiel, < 40 = insuffisant.',
    skillsgap:  'Taux de complétion (0-10) par type de formulaire, basé sur les évaluations soumises ou validées.',
    sentiment:  'Activité des 12 derniers mois — évaluations soumises ou validées (indépendant du filtre période).',
    ninebox:    'Performance (score moyen) × Potentiel (taux de complétion des phases assignées).',
  }

  return (
    <div className="hra-page">

      {/* ── Hero ──────────────────────────────────────── */}
      <header className="hra-hero">
        <p className="hra-hero__eyebrow">{t('hra.hero.eyebrow')}</p>
        <h1 className="hra-hero__headline">{t('hra.hero.title')}</h1>
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
          <option value="all">Toutes les périodes</option>
        </select>

        <select className="hra-select" value={dept} onChange={e => setDept(e.target.value)} aria-label={t('hra.filter.dept')}>
          <option value="all">Tous les départements</option>
          {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        <select className="hra-select" value={campaignId} onChange={e => setCampaignId(e.target.value)} aria-label={t('hra.filter.campaign')}>
          <option value="all">Toutes les campagnes</option>
          {campaigns.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>

        <div className="hra-filterbar__spacer" />

        <button
          type="button"
          className="hra-export-btn"
          onClick={() => {
            const params = new URLSearchParams()
            if (campaignId !== 'all') params.set('campaignId', campaignId)
            if (dept !== 'all') params.set('dept', dept)
            const qs = params.toString()
            window.open(`/api/evaluations/export${qs ? `?${qs}` : ''}`)
          }}
        >
          <Download size={14} strokeWidth={1.5} aria-hidden="true" />
          Exporter CSV
        </button>
      </div>

      {/* ── Erreur de chargement ──────────────────────── */}
      {error && (
        <div className="hra-disclaimer" role="alert" style={{ background: '#fee2e2', color: '#991b1b', borderColor: '#fca5a5' }}>
          <span>Erreur lors du chargement des données analytiques. Veuillez rafraîchir la page.</span>
        </div>
      )}

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
        {isLoading ? (
          <div className="sk-analytics">
            <div className="sk-analytics__stats">
              <SkeletonStat />
              <SkeletonStat />
              <SkeletonStat />
            </div>
            <Skeleton className="sk-chart-placeholder" height="300px" />
          </div>
        ) : (
          <>
            {activeTab === 'flightrisk' && (
              <div className="hra-chart-wrap">
                <h2 className="hra-chart-title">{t('hra.tab.flightrisk')}</h2>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', margin: '0 0 0.75rem' }}>{SUB.flightrisk}</p>
                {flightRiskData.length === 0
                  ? <EmptyState message="Aucun collaborateur avec des évaluations scorées dans cette sélection." />
                  : <>
                      <FlightRiskChart data={flightRiskData} />
                      <div className="hra-legend">
                        <span className="hra-legend__item" style={{ '--dot-color': 'var(--color-secondary)' }}>Stable</span>
                        <span className="hra-legend__item" style={{ '--dot-color': 'var(--color-error)' }}>Désaccord signalé</span>
                      </div>
                    </>
                }
              </div>
            )}

            {activeTab === 'goalgap' && (
              <div className="hra-chart-wrap">
                <h2 className="hra-chart-title">{t('hra.tab.goalgap')}</h2>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', margin: '0 0 0.75rem' }}>{SUB.goalgap}</p>
                {goalGapData.length === 0
                  ? <EmptyState message="Aucune évaluation scorée dans cette sélection." />
                  : <GoalGapChart data={goalGapData} />
                }
              </div>
            )}

            {activeTab === 'skillsgap' && (
              <div className="hra-chart-wrap hra-chart-wrap--center">
                <h2 className="hra-chart-title">{t('hra.tab.skillsgap')}</h2>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', margin: '0 0 0.75rem' }}>{SUB.skillsgap}</p>
                {skillsData.length < 3
                  ? <EmptyState message="Pas assez de types de formulaires différents pour afficher le radar (minimum 3)." />
                  : <>
                      <SkillsRadar skills={skillsData} />
                      <div className="hra-legend">
                        {skillsData.map(s => (
                          <span key={s.axis} className="hra-legend__item" style={{ '--dot-color': 'var(--color-secondary)' }}>{s.axis} : {s.value}/10</span>
                        ))}
                      </div>
                    </>
                }
              </div>
            )}

            {activeTab === 'sentiment' && (
              <div className="hra-chart-wrap">
                <h2 className="hra-chart-title">{t('hra.tab.sentiment')}</h2>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', margin: '0 0 0.75rem' }}>{SUB.sentiment}</p>
                <SentimentHeatmap data={sentimentData} />
              </div>
            )}

            {activeTab === 'ninebox' && (
              <div className="hra-chart-wrap">
                <h2 className="hra-chart-title">{t('hra.tab.ninebox')}</h2>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', margin: '0 0 0.75rem' }}>{SUB.ninebox}</p>
                {nineBoxData.length === 0
                  ? <EmptyState message="Aucun collaborateur avec des évaluations dans cette sélection." />
                  : <NineBoxGrid data={nineBoxData} />
                }
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
