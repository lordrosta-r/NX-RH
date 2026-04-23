// =============================================================================
// HRCampaigns.jsx — Liste des campagnes d'évaluation, route /hr/campaigns
//
// Pas de sidebar ni topbar : pris en charge par AuthedLayout.
// Sections :
//   1. Hero + toolbar (filtres + CTA)
//   2. Grille de cartes campagne
// =============================================================================

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuth }     from '../../contexts/AuthContext'
import { useTranslate } from '../../contexts/LocaleContext'
import { t as pageT }  from './i18n'
import { PlusCircle, Play, X, Archive, Copy, Eye } from 'lucide-react'
import { apiFetch } from '../../lib/apiFetch'
import { showToast } from '../../components/ui/Toast'
import './hr-campaigns.css'

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString(undefined, {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

const STATUS_ORDER = { active: 0, draft: 1, closed: 2, archived: 3 }

const FILTERS = ['all', 'active', 'draft', 'closed', 'archived']

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status, t }) {
  const cls = {
    draft:    'cmp-badge--draft',
    active:   'cmp-badge--active',
    closed:   'cmp-badge--closed',
    archived: 'cmp-badge--archived',
  }[status] ?? 'cmp-badge--draft'
  return (
    <span className={`cmp-badge ${cls}`}>{t(`cmp.status.${status}`) || status}</span>
  )
}

function CampaignCard({ campaign, t, onAction }) {
  const { _id, name, description, startDate, endDate, status, stats } = campaign
  const completion = stats?.completionRate ?? 0
  const total      = stats?.total ?? 0

  return (
    <article className="cmp-card">
      <div className="cmp-card__head">
        <h2 className="cmp-card__title">{name}</h2>
        <StatusBadge status={status} t={t} />
      </div>

      {description && <p className="cmp-card__desc">{description}</p>}

      <p className="cmp-card__period">
        {fmtDate(startDate)} → {fmtDate(endDate)}
      </p>

      <div className="cmp-progress">
        <div className="cmp-progress__label">
          <span>{t('cmp.card.completion')}</span>
          <span>{completion}%</span>
        </div>
        <div className="cmp-progress__track">
          <div className="cmp-progress__fill" style={{ width: `${completion}%` }} />
        </div>
      </div>

      <p className="cmp-card__participants">{total} {t('cmp.card.participants')}</p>

      <div className="cmp-card__actions">
        <button type="button" className="cmp-btn cmp-btn--ghost" onClick={() => onAction('detail', _id)}>
          <Eye size={13} /> {t('cmp.card.detail')}
        </button>
        {status === 'draft' && (
          <button type="button" className="cmp-btn cmp-btn--primary" onClick={() => onAction('activate', _id)}>
            <Play size={13} /> {t('cmp.card.activate')}
          </button>
        )}
        {status === 'active' && (
          <button type="button" className="cmp-btn" onClick={() => onAction('close', _id)}>
            <X size={13} /> {t('cmp.card.close')}
          </button>
        )}
        {status === 'closed' && (
          <button type="button" className="cmp-btn" onClick={() => onAction('archive', _id)}>
            <Archive size={13} /> {t('cmp.card.archive')}
          </button>
        )}
        <button type="button" className="cmp-btn cmp-btn--ghost" onClick={() => onAction('clone', _id)}>
          <Copy size={13} /> {t('cmp.card.clone')}
        </button>
      </div>
    </article>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function HRCampaigns() {
  const { user }    = useAuth()
  const t           = useTranslate(pageT)
  const navigate    = useNavigate()
  const qc          = useQueryClient()
  const [activeFilter, setActiveFilter] = useState('all')

  const { data: rawData, isLoading, isError, error } = useQuery({
    queryKey: ['hr-campaigns-list'],
    queryFn:  () =>
      apiFetch('/api/campaigns').then(d => Array.isArray(d) ? d : (d.data || [])),
    enabled:   !!user,
    staleTime: 30 * 1000,
  })

  const patchMutation = useMutation({
    mutationFn: ({ id, status }) =>
      apiFetch(`/api/campaigns/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr-campaigns-list'] })
      showToast({ message: 'Campagne mise à jour', type: 'success' })
    },
    onError: (err) => showToast({ message: err.message, type: 'error' }),
  })

  const cloneMutation = useMutation({
    mutationFn: (id) =>
      apiFetch(`/api/campaigns/${id}/clone`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr-campaigns-list'] })
      showToast({ message: 'Campagne dupliquée', type: 'success' })
    },
    onError: (err) => showToast({ message: err.message, type: 'error' }),
  })

  function handleAction(action, id) {
    if (action === 'detail') {
      navigate(`/hr/campaigns/${id}`)
      return
    }
    const confirmMsg = {
      activate: t('cmp.confirm.activate'),
      close:    t('cmp.confirm.close'),
      archive:  t('cmp.confirm.archive'),
      clone:    t('cmp.confirm.clone'),
    }[action]
    if (!window.confirm(confirmMsg)) return

    if (action === 'clone') {
      cloneMutation.mutate(id)
    } else {
      const statusMap = { activate: 'active', close: 'closed', archive: 'archived' }
      patchMutation.mutate({ id, status: statusMap[action] })
    }
  }

  const campaigns = rawData ?? []
  const filtered  = activeFilter === 'all'
    ? campaigns
    : campaigns.filter(c => c.status === activeFilter)
  const sorted = [...filtered].sort(
    (a, b) => (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99)
  )

  return (
    <div className="cmp-page">

      {/* ── Hero ──────────────────────────────────────────── */}
      <header className="cmp-hero">
        <p className="cmp-hero__eyebrow">{t('cmp.hero.eyebrow')}</p>
        <h1 className="cmp-hero__headline">{t('cmp.hero.title')}</h1>
        <p className="cmp-hero__sub">{t('cmp.hero.sub')}</p>
      </header>

      {/* ── Toolbar ───────────────────────────────────────── */}
      <div className="cmp-toolbar">
        <nav className="cmp-filters" aria-label="Filtres campagne">
          {FILTERS.map(f => (
            <button
              key={f}
              type="button"
              className={`cmp-filter-btn${activeFilter === f ? ' cmp-filter-btn--active' : ''}`}
              onClick={() => setActiveFilter(f)}
            >
              {t(`cmp.filter.${f}`)}
            </button>
          ))}
        </nav>
        <button
          type="button"
          className="cmp-cta"
          onClick={() => navigate('/hr/campaigns/new')}
        >
          <PlusCircle size={16} />
          {t('cmp.cta.new')}
        </button>
      </div>

      {/* ── Content ───────────────────────────────────────── */}
      {isLoading ? (
        <p className="cmp-state-msg">{t('cmp.loading')}</p>
      ) : isError ? (
        <p className="cmp-state-msg" role="alert" style={{ color: 'var(--color-error)' }}>
          {error?.message || t('cmp.error.load')}
        </p>
      ) : sorted.length === 0 ? (
        <div className="cmp-empty">
          <p className="cmp-empty__title">{t('cmp.empty.title')}</p>
          <p className="cmp-empty__sub">{t('cmp.empty.sub')}</p>
        </div>
      ) : (
        <div className="cmp-grid">
          {sorted.map(c => (
            <CampaignCard
              key={c._id}
              campaign={c}
              t={t}
              onAction={handleAction}
            />
          ))}
        </div>
      )}

    </div>
  )
}
