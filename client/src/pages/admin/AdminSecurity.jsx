// =============================================================================
// AdminSecurity.jsx — Sécurité & audit, route /admin/security
// Sections : Audit log (avec filtres) · Impersonation
// =============================================================================

import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../contexts/AuthContext'
import { useLocale } from '../../hooks/useLocale'
import { t as pageT } from './i18n'
import { AlertTriangle, Search } from 'lucide-react'

export default function AdminSecurity() {
  const { user, loading } = useAuth()
  const { t } = useLocale(pageT)
  const navigate = useNavigate()
  const [filterType, setFilterType] = useState('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const [filterUser, setFilterUser] = useState('')
  const [impersonateUser, setImpersonateUser] = useState('')

  useEffect(() => {
    if (!loading && user && user.role !== 'admin') navigate('/employee', { replace: true })
  }, [loading, user, navigate])

  const { data: logs = [] } = useQuery({
    queryKey: ['admin-audit-logs'],
    queryFn: () =>
      fetch('/api/admin/audit?limit=100', { credentials: 'include' })
        .then(r => r.ok ? r.json() : { data: [] })
        .then(d => Array.isArray(d) ? d : (d.data || []))
        .catch(() => []),
    enabled: !!user && user.role === 'admin',
    staleTime: 60 * 1000,
  })

  const { data: users = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () =>
      fetch('/api/users?limit=500', { credentials: 'include' })
        .then(r => r.ok ? r.json() : [])
        .then(d => Array.isArray(d) ? d : (d.users || [])),
    enabled: !!user && user.role === 'admin',
    staleTime: 5 * 60 * 1000,
  })

  const filtered = useMemo(() => {
    let result = logs
    if (filterType)  result = result.filter(l => l.targetType === filterType)
    if (filterUser) {
      const q = filterUser.toLowerCase()
      result = result.filter(l => {
        const u = l.userId
        if (!u) return false
        return `${u.firstName ?? ''} ${u.lastName ?? ''}`.toLowerCase().includes(q)
      })
    }
    if (filterFrom)  result = result.filter(l => new Date(l.createdAt) >= new Date(filterFrom))
    if (filterTo)    result = result.filter(l => new Date(l.createdAt) <= new Date(filterTo))
    return result
  }, [logs, filterType, filterUser, filterFrom, filterTo])

  const actionTypes = useMemo(() => [...new Set(logs.map(l => l.targetType).filter(Boolean))], [logs])

  const selectedUserObj = useMemo(
    () => users.find(u => (u._id || u.id) === impersonateUser),
    [users, impersonateUser]
  )

  if (loading || !user) return null
  if (user.role !== 'admin') return null

  return (
    <div className="adm">
      <header className="adm-hero">
        <p className="adm-hero__eyebrow">{t('admin.security.hero.eyebrow')}</p>
        <h1 className="adm-hero__title">
          <span className="adm-hero__accent">{t('admin.security.hero.title')}</span>
        </h1>
        <p className="adm-hero__sub">{t('admin.security.hero.sub')}</p>
      </header>

      {/* ── Audit log ────────────────────────────────────────────────────────── */}
      <section className="adm-card" aria-labelledby="adm-audit-hd">
        <h2 id="adm-audit-hd" className="adm-card__title">{t('admin.security.audit.heading')}</h2>

        <div className="adm-toolbar">
          <select
            className="adm-select"
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            aria-label={t('admin.security.filter.type')}
            style={{ maxWidth: 200 }}
          >
            <option value="">{t('admin.security.filter.type.all')}</option>
            {actionTypes.map(type => <option key={type} value={type}>{type}</option>)}
          </select>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <label htmlFor="sec-from" className="adm-label" style={{ whiteSpace: 'nowrap' }}>
              {t('admin.security.filter.date_from')}
            </label>
            <input
              id="sec-from"
              type="date"
              className="adm-input"
              value={filterFrom}
              onChange={e => setFilterFrom(e.target.value)}
              style={{ maxWidth: 160 }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <label htmlFor="sec-to" className="adm-label" style={{ whiteSpace: 'nowrap' }}>
              {t('admin.security.filter.date_to')}
            </label>
            <input
              id="sec-to"
              type="date"
              className="adm-input"
              value={filterTo}
              onChange={e => setFilterTo(e.target.value)}
              style={{ maxWidth: 160 }}
            />
          </div>

          <div className="adm-search">
            <Search size={15} strokeWidth={2} aria-hidden="true" />
            <input
              className="adm-search__input"
              placeholder={t('admin.security.filter.user')}
              value={filterUser}
              onChange={e => setFilterUser(e.target.value)}
            />
          </div>
        </div>

        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>{t('admin.security.audit.col.type')}</th>
                <th>{t('admin.security.audit.col.action')}</th>
                <th>{t('admin.security.audit.col.user')}</th>
                <th>{t('admin.security.audit.col.role')}</th>
                <th>{t('admin.security.audit.col.date')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="adm-empty">{t('admin.security.audit.empty')}</td>
                </tr>
              ) : (
                filtered.map((log, i) => {
                  const u = log.userId
                  const userName = u
                    ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || t('admin.na')
                    : t('admin.na')
                  return (
                    <tr key={log._id || i}>
                      <td>{log.targetType || t('admin.na')}</td>
                      <td>{log.action || t('admin.na')}</td>
                      <td>{userName}</td>
                      <td>{log.userRole || u?.role || t('admin.na')}</td>
                      <td>{log.createdAt ? new Date(log.createdAt).toLocaleString() : t('admin.na')}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Impersonation ────────────────────────────────────────────────────── */}
      <section className="adm-card" aria-labelledby="adm-imp-hd">
        <h2 id="adm-imp-hd" className="adm-card__title">{t('admin.security.impersonate.heading')}</h2>

        <div className="adm-callout adm-callout--warn">
          <AlertTriangle size={16} strokeWidth={2} aria-hidden="true" />
          <span>{t('admin.security.impersonate.warning')}</span>
        </div>

        <div className="adm-form-group" style={{ maxWidth: 400 }}>
          <label className="adm-label" htmlFor="imp-user">
            {t('admin.security.impersonate.select')}
          </label>
          <select
            id="imp-user"
            className="adm-select"
            value={impersonateUser}
            onChange={e => setImpersonateUser(e.target.value)}
          >
            <option value="">—</option>
            {users.filter(u => u.role !== 'admin').map(u => (
              <option key={u._id || u.id} value={u._id || u.id}>
                {u.firstName} {u.lastName} ({u.role})
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className="adm-btn adm-btn--danger"
          disabled={!impersonateUser}
          onClick={() => {
            /* Mock — real impersonation would call POST /api/auth/impersonate */
          }}
        >
          {t('admin.security.impersonate.btn')}
          {selectedUserObj ? ` ${selectedUserObj.firstName} ${selectedUserObj.lastName}` : ''}
        </button>

        <p style={{ marginTop: '0.75rem', fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}>
          {t('admin.security.impersonate.legal')}
        </p>
      </section>
    </div>
  )
}
