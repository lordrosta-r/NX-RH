// =============================================================================
// EmployeeHistory — Historique des évaluations (/employee/history)
//
// Contenu de page uniquement — shell fourni par AuthedLayout.
// Liste chronologique (desc) des évaluations avec filtres année/campagne.
// =============================================================================

import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useTranslate, useLocaleCtx } from '../../contexts/LocaleContext'
import { t as pageT } from './i18n'
import { History, Calendar, Award, ChevronRight, Filter, Eye } from 'lucide-react'
import './employee-history.css'

const STATUS_MAP = {
  assigned:        { label: 'Assigné',         cls: 'badge--assigned' },
  in_progress:     { label: 'En cours',         cls: 'badge--progress' },
  submitted:       { label: 'Soumis',           cls: 'badge--submitted' },
  reviewed:        { label: 'Révisé',           cls: 'badge--reviewed' },
  validated:       { label: 'Validé',           cls: 'badge--validated' },
  contested:       { label: 'Contesté',         cls: 'badge--error' },
  signed:          { label: 'Signé',            cls: 'badge--validated' },
  signed_hr:       { label: 'Signé RH',         cls: 'badge--validated' },
  signed_manager:  { label: 'Signé Manager',    cls: 'badge--validated' },
}

function StatusBadge({ status }) {
  const info = STATUS_MAP[status] ?? { label: status, cls: 'badge--assigned' }
  return <span className={`eh-badge ${info.cls}`}>{info.label}</span>
}

function fmtDate(d, locale) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString(
    locale === 'fr' ? 'fr-FR' : 'en-US',
    { day: '2-digit', month: 'long', year: 'numeric' }
  )
}

export default function EmployeeHistory() {
  const { user } = useAuth()
  const { locale } = useLocaleCtx()
  const t = useTranslate(pageT)
  const navigate = useNavigate()

  const [yearFilter, setYearFilter] = useState('all')
  const [campaignFilter, setCampaignFilter] = useState('all')

  const { data: evaluations = [], isLoading } = useQuery({
    queryKey: ['my-evaluations-history', user?._id],
    queryFn: () =>
      fetch(`/api/evaluations?evaluateeId=${user._id}`, { credentials: 'include' })
        .then(r => r.ok ? r.json() : [])
        .then(d => Array.isArray(d) ? d : (d.data || [])),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  })

  // Années disponibles
  const years = useMemo(() => {
    const set = new Set(evaluations.map(ev => {
      const d = ev.updatedAt || ev.createdAt
      return d ? new Date(d).getFullYear().toString() : null
    }).filter(Boolean))
    return [...set].sort((a, b) => b - a)
  }, [evaluations])

  // Campagnes disponibles
  const campaigns = useMemo(() => {
    const map = {}
    evaluations.forEach(ev => {
      const id = ev.campaign?._id || ev.campaignId || ev.campaignName
      const name = ev.campaignName || ev.campaign?.name
      if (id && name) map[id] = name
    })
    return Object.entries(map).map(([id, name]) => ({ id, name }))
  }, [evaluations])

  // Filtrage + tri
  const filtered = useMemo(() => {
    return [...evaluations]
      .filter(ev => {
        if (yearFilter !== 'all') {
          const d = ev.updatedAt || ev.createdAt
          if (!d || new Date(d).getFullYear().toString() !== yearFilter) return false
        }
        if (campaignFilter !== 'all') {
          const id = ev.campaign?._id || ev.campaignId || ev.campaignName
          if (id !== campaignFilter) return false
        }
        return true
      })
      .sort((a, b) =>
        new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)
      )
  }, [evaluations, yearFilter, campaignFilter])

  return (
    <div className="eh-page">

      {/* ── Hero ──────────────────────────────────────── */}
      <header className="eh-hero">
        <p className="eh-hero__eyebrow">HISTORIQUE</p>
        <h1 className="eh-hero__headline">
          Historique des <span className="eh-hero__accent">évaluations</span>
        </h1>
        <p className="eh-hero__sub">Vos bilans passés</p>
      </header>

      {/* ── Filtres ───────────────────────────────────── */}
      <div className="eh-filterbar">
        <Filter size={15} className="eh-filterbar__icon" aria-hidden="true" />

        <select
          className="eh-filter"
          value={yearFilter}
          onChange={e => setYearFilter(e.target.value)}
          aria-label="Année"
        >
          <option value="all">Toutes les années</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>

        <select
          className="eh-filter"
          value={campaignFilter}
          onChange={e => setCampaignFilter(e.target.value)}
          aria-label="Campagne"
        >
          <option value="all">Toutes les campagnes</option>
          {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* ── Liste ─────────────────────────────────────── */}
      {isLoading ? (
        <p className="eh-status">Chargement de votre historique…</p>
      ) : filtered.length === 0 ? (
        <div className="eh-empty">
          <History size={40} color="var(--color-on-surface-variant)" />
          <p>Aucune évaluation clôturée.</p>
        </div>
      ) : (
        <ol className="eh-list">
          {filtered.map((ev, i) => (
            <li key={ev._id || i} className="eh-item">
              <div className="eh-item__timeline">
                <div className="eh-item__dot" />
                {i < filtered.length - 1 && <div className="eh-item__line" />}
              </div>
              <div className="eh-item__body">
                <div className="eh-item__head">
                  <div className="eh-item__meta">
                    <span className="eh-item__date">
                      <Calendar size={13} aria-hidden="true" />
                      {fmtDate(ev.updatedAt || ev.createdAt, locale)}
                    </span>
                    <StatusBadge status={ev.status} />
                  </div>
                  <h3 className="eh-item__title">
                    {ev.campaignName || ev.campaign?.name || 'Évaluation'}
                  </h3>
                  {ev.score !== undefined && ev.score !== null && (
                    <p className="eh-item__score">
                      <Award size={13} aria-hidden="true" />
                      Score : <strong>{ev.score}</strong>
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  className="eh-consult-btn"
                  onClick={() => navigate(`/evaluation/${ev._id}`)}
                >
                  <Eye size={14} />
                  Consulter
                  <ChevronRight size={14} />
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
