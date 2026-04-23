// =============================================================================
// HRDirectory — Annuaire de l'entreprise (/hr/directory)
//
// Contenu de page uniquement — shell fourni par AuthedLayout.
// Recherche + filtres locaux sur données /api/users.
// Drawer latéral avec profil + évaluations récentes.
// =============================================================================

import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../contexts/AuthContext'
import { useTranslate, useLocaleCtx } from '../../contexts/LocaleContext'
import { t as pageT } from './i18n'
import {
  Search, X, ChevronLeft, ChevronRight, User, Mail,
  Briefcase, Building2, UserCheck, Shield, Filter,
} from 'lucide-react'
import { apiFetch } from '../../lib/apiFetch'
import './hr-directory.css'

const PAGE_SIZE = 50

// ── Avatar initiales ──────────────────────────────────────────────────────────
function Avatar({ name, size = 36 }) {
  const initials = name
    ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'
  const hue = name ? name.charCodeAt(0) * 37 % 360 : 200
  return (
    <div
      className="hrd-avatar"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `hsl(${hue},55%,45%)`,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.35,
        fontWeight: 700,
        flexShrink: 0,
      }}
      aria-hidden="true"
    >
      {initials}
    </div>
  )
}

// ── Badge rôle ────────────────────────────────────────────────────────────────
function RoleBadge({ role }) {
  return <span className={`hrd-badge hrd-badge--${role}`}>{role}</span>
}

// ── Drawer latéral ────────────────────────────────────────────────────────────
function UserDrawer({ user: selectedUser, onClose, t, locale }) {
  const { data: userEvals = [], isLoading: evalsLoading } = useQuery({
    queryKey: ['user-evals-drawer', selectedUser?._id],
    queryFn: () =>
      apiFetch(`/api/evaluations?evaluateeId=${selectedUser._id}`)
        .then(d => Array.isArray(d) ? d : (d.data || [])),
    enabled: !!selectedUser,
  })

  if (!selectedUser) return null

  const recentEvals = userEvals.slice(0, 3)
  const fmtDate = d => d
    ? new Date(d).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—'

  return (
    <>
      <div className="hrd-drawer-backdrop" onClick={onClose} aria-hidden="true" />
      <aside className="hrd-drawer" role="dialog" aria-label={selectedUser.name}>
        <div className="hrd-drawer__header">
          <div className="hrd-drawer__identity">
            <Avatar name={selectedUser.name} size={52} />
            <div>
              <p className="hrd-drawer__name">{selectedUser.name}</p>
              <p className="hrd-drawer__meta">{selectedUser.position || '—'}</p>
            </div>
          </div>
          <button
            type="button"
            className="hrd-drawer__close"
            onClick={onClose}
            aria-label={t('hrd.drawer.close')}
          >
            <X size={18} />
          </button>
        </div>

        <div className="hrd-drawer__body">
          <div className="hrd-drawer__section">
            <div className="hrd-drawer__field">
              <Mail size={14} />
              <span>{selectedUser.email || '—'}</span>
            </div>
            <div className="hrd-drawer__field">
              <Building2 size={14} />
              <span>{selectedUser.department || '—'}</span>
            </div>
            <div className="hrd-drawer__field">
              <Briefcase size={14} />
              <span>{selectedUser.position || '—'}</span>
            </div>
            <div className="hrd-drawer__field">
              <UserCheck size={14} />
              <span>{selectedUser.managerName || selectedUser.manager?.name || '—'}</span>
            </div>
            <div className="hrd-drawer__field">
              <Shield size={14} />
              <RoleBadge role={selectedUser.role} />
            </div>
          </div>

          <div className="hrd-drawer__section">
            <p className="hrd-drawer__section-title">{t('hrd.drawer.evaluations')}</p>
            {evalsLoading ? (
              <p className="hrd-drawer__hint">…</p>
            ) : recentEvals.length === 0 ? (
              <p className="hrd-drawer__hint">{t('hrd.drawer.no_evals')}</p>
            ) : (
              <ul className="hrd-drawer__evals">
                {recentEvals.map((ev, i) => (
                  <li key={ev._id || i} className="hrd-drawer__eval">
                    <span className="hrd-drawer__eval-campaign">
                      {ev.campaignName || ev.campaign?.name || '—'}
                    </span>
                    <span className={`hr-badge hr-badge--${ev.status === 'validated' ? 'validated' : ev.status === 'in_progress' ? 'progress' : 'assigned'}`}>
                      {ev.status}
                    </span>
                    <span className="hrd-drawer__eval-date">{fmtDate(ev.updatedAt || ev.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────
export default function HRDirectory() {
  const { user } = useAuth()
  const { locale } = useLocaleCtx()
  const t = useTranslate(pageT)

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [deptFilter, setDeptFilter] = useState('all')
  const [page, setPage] = useState(0)
  const [selectedUser, setSelectedUser] = useState(null)

  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['hr-directory-users'],
    queryFn: () =>
      apiFetch('/api/users').then(d => Array.isArray(d) ? d : (d.data || [])),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  })

  // Départements uniques dérivés des données
  const departments = useMemo(() => {
    const set = new Set(users.map(u => u.department).filter(Boolean))
    return [...set].sort()
  }, [users])

  // Filtre local
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return users.filter(u => {
      const matchSearch = !q
        || u.name?.toLowerCase().includes(q)
        || u.email?.toLowerCase().includes(q)
        || u.department?.toLowerCase().includes(q)
      const matchRole = roleFilter === 'all' || u.role === roleFilter
      const matchDept = deptFilter === 'all' || u.department === deptFilter
      return matchSearch && matchRole && matchDept
    })
  }, [users, search, roleFilter, deptFilter])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const pageItems = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  function handleSearch(e) {
    setSearch(e.target.value)
    setPage(0)
  }

  function handleRoleFilter(e) {
    setRoleFilter(e.target.value)
    setPage(0)
  }

  function handleDeptFilter(e) {
    setDeptFilter(e.target.value)
    setPage(0)
  }

  return (
    <div className="hrd-page">

      {/* ── Hero ────────────────────────────────────────── */}
      <header className="hrd-hero">
        <p className="hrd-hero__eyebrow">{t('hrd.hero.eyebrow')}</p>
        <h1 className="hrd-hero__headline">
          {t('hrd.hero.title')}
        </h1>
        <p className="hrd-hero__sub">{t('hrd.hero.sub')}</p>
      </header>

      {/* ── Toolbar ─────────────────────────────────────── */}
      <div className="hrd-toolbar">
        <div className="hrd-search">
          <Search size={16} className="hrd-search__icon" aria-hidden="true" />
          <input
            type="search"
            className="hrd-search__input"
            placeholder={t('hrd.search.placeholder')}
            value={search}
            onChange={handleSearch}
          />
          {search && (
            <button
              type="button"
              className="hrd-search__clear"
              onClick={() => { setSearch(''); setPage(0) }}
              aria-label="Clear"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <Filter size={16} className="hrd-toolbar__icon" aria-hidden="true" />

        <select
          className="hrd-filter"
          value={roleFilter}
          onChange={handleRoleFilter}
          aria-label={t('hrd.filter.role.all')}
        >
          <option value="all">{t('hrd.filter.role.all')}</option>
          <option value="employee">{t('hrd.filter.role.employee')}</option>
          <option value="manager">{t('hrd.filter.role.manager')}</option>
          <option value="hr">{t('hrd.filter.role.hr')}</option>
          <option value="admin">{t('hrd.filter.role.admin')}</option>
        </select>

        <select
          className="hrd-filter"
          value={deptFilter}
          onChange={handleDeptFilter}
          aria-label={t('hrd.filter.dept.all')}
        >
          <option value="all">{t('hrd.filter.dept.all')}</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {/* ── Table ───────────────────────────────────────── */}
      {isLoading ? (
        <p className="hrd-status">{t('hrd.loading')}</p>
      ) : error ? (
        <p className="hrd-status hrd-status--error">{error.message}</p>
      ) : filtered.length === 0 ? (
        <p className="hrd-status">{t('hrd.empty')}</p>
      ) : (
        <>
          <div className="hrd-table-wrap">
            <table className="hrd-table">
              <thead>
                <tr>
                  <th>{t('hrd.table.name')}</th>
                  <th>{t('hrd.table.email')}</th>
                  <th>{t('hrd.table.position')}</th>
                  <th>{t('hrd.table.department')}</th>
                  <th>{t('hrd.table.manager')}</th>
                  <th>{t('hrd.table.role')}</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map(u => (
                  <tr
                    key={u._id}
                    className="hrd-table__row"
                    onClick={() => setSelectedUser(u)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && setSelectedUser(u)}
                  >
                    <td className="hrd-table__name">
                      <Avatar name={u.name} />
                      <span>{u.name || '—'}</span>
                    </td>
                    <td className="hrd-table__email">{u.email || '—'}</td>
                    <td>{u.position || '—'}</td>
                    <td>{u.department || '—'}</td>
                    <td>{u.managerName || u.manager?.name || '—'}</td>
                    <td><RoleBadge role={u.role} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="hrd-pagination">
              <button
                type="button"
                className="hrd-pagination__btn"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <ChevronLeft size={16} />
                {t('hrd.pagination.prev')}
              </button>
              <span className="hrd-pagination__info">
                {page + 1} {t('hrd.pagination.of')} {totalPages}
              </span>
              <button
                type="button"
                className="hrd-pagination__btn"
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                {t('hrd.pagination.next')}
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Drawer ──────────────────────────────────────── */}
      {selectedUser && (
        <UserDrawer
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          t={t}
          locale={locale}
        />
      )}
    </div>
  )
}
