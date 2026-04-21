// =============================================================================
// AdminUsers.jsx — Gestion des utilisateurs, route /admin/users
// =============================================================================

import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../contexts/AuthContext'
import { useLocale } from '../../hooks/useLocale'
import { t as pageT } from './i18n'
import { Search, Plus, X, Pencil } from 'lucide-react'
import './admin.css'

const ROLES = ['employee', 'manager', 'hr', 'admin']

function UserModal({ user: editUser, onClose, t }) {
  const qc = useQueryClient()
  const isEdit = !!editUser
  const [form, setForm] = useState({
    email:      editUser?.email      || '',
    firstName:  editUser?.firstName  || '',
    lastName:   editUser?.lastName   || '',
    department: editUser?.department || '',
    position:   editUser?.position   || '',
    role:       editUser?.role       || 'employee',
    managerId:  editUser?.managerId  || '',
  })
  const [err, setErr] = useState(null)

  const mutation = useMutation({
    mutationFn: (data) => {
      const url  = isEdit ? `/api/users/${editUser._id || editUser.id}` : '/api/users'
      const method = isEdit ? 'PATCH' : 'POST'
      return fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(r => {
        if (!r.ok) throw new Error('save_failed')
        return r.json()
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      onClose()
    },
    onError: () => setErr(t('admin.users.error.save')),
  })

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  function handleSubmit(e) {
    e.preventDefault()
    setErr(null)
    mutation.mutate(form)
  }

  return (
    <div className="adm-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="user-modal-title">
      <div className="adm-modal">
        <div className="adm-modal__header">
          <h2 id="user-modal-title" className="adm-modal__title">
            {isEdit ? t('admin.users.modal.edit') : t('admin.users.modal.create')}
          </h2>
          <button type="button" className="adm-modal__close" onClick={onClose} aria-label={t('admin.close')}>
            <X size={18} strokeWidth={2} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="adm-modal__body">
            {err && <p className="adm-error" role="alert">{err}</p>}
            <div className="adm-form-row">
              <div className="adm-form-group">
                <label className="adm-label" htmlFor="u-firstName">{t('admin.users.field.firstName')}</label>
                <input id="u-firstName" className="adm-input" required
                  value={form.firstName} onChange={e => set('firstName', e.target.value)} />
              </div>
              <div className="adm-form-group">
                <label className="adm-label" htmlFor="u-lastName">{t('admin.users.field.lastName')}</label>
                <input id="u-lastName" className="adm-input" required
                  value={form.lastName} onChange={e => set('lastName', e.target.value)} />
              </div>
            </div>
            <div className="adm-form-group">
              <label className="adm-label" htmlFor="u-email">{t('admin.users.field.email')}</label>
              <input id="u-email" type="email" className="adm-input" required
                value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div className="adm-form-row">
              <div className="adm-form-group">
                <label className="adm-label" htmlFor="u-dept">{t('admin.users.field.dept')}</label>
                <input id="u-dept" className="adm-input"
                  value={form.department} onChange={e => set('department', e.target.value)} />
              </div>
              <div className="adm-form-group">
                <label className="adm-label" htmlFor="u-pos">{t('admin.users.field.position')}</label>
                <input id="u-pos" className="adm-input"
                  value={form.position} onChange={e => set('position', e.target.value)} />
              </div>
            </div>
            <div className="adm-form-row">
              <div className="adm-form-group">
                <label className="adm-label" htmlFor="u-role">{t('admin.users.field.role')}</label>
                <select id="u-role" className="adm-select"
                  value={form.role} onChange={e => set('role', e.target.value)}>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="adm-form-group">
                <label className="adm-label" htmlFor="u-mgr">{t('admin.users.field.manager')}</label>
                <input id="u-mgr" className="adm-input"
                  value={form.managerId} onChange={e => set('managerId', e.target.value)}
                  placeholder="ID du manager" />
              </div>
            </div>
          </div>
          <div className="adm-modal__footer">
            <button type="button" className="adm-btn adm-btn--ghost" onClick={onClose}>
              {t('admin.cancel')}
            </button>
            <button type="submit" className="adm-btn adm-btn--primary" disabled={mutation.isPending}>
              {mutation.isPending ? t('admin.loading') : t('admin.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AdminUsers() {
  const { user, loading } = useAuth()
  const { t } = useLocale(pageT)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null) // null | 'create' | {user}

  useEffect(() => {
    if (!loading && user && user.role !== 'admin') navigate('/employee', { replace: true })
  }, [loading, user, navigate])

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () =>
      fetch('/api/users?limit=500', { credentials: 'include' })
        .then(r => r.ok ? r.json() : [])
        .then(d => Array.isArray(d) ? d : (d.users || [])),
    enabled: !!user && user.role === 'admin',
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }) =>
      fetch(`/api/users/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      }).then(r => r.ok ? r.json() : Promise.reject()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  })

  const filtered = useMemo(() => {
    if (!search) return users
    const q = search.toLowerCase()
    return users.filter(u =>
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q)
    )
  }, [users, search])

  if (loading || !user) return null
  if (user.role !== 'admin') return null

  return (
    <div className="adm">
      <header className="adm-hero">
        <p className="adm-hero__eyebrow">{t('admin.users.hero.eyebrow')}</p>
        <h1 className="adm-hero__title">
          <span className="adm-hero__accent">{t('admin.users.hero.title')}</span>
        </h1>
        <p className="adm-hero__sub">{t('admin.users.hero.sub')}</p>
      </header>

      <section className="adm-card">
        <div className="adm-card__header">
          <h2 className="adm-card__title">{t('admin.users.heading')}</h2>
          <div className="adm-card__actions">
            <button
              type="button"
              className="adm-btn adm-btn--primary"
              onClick={() => setModal('create')}
            >
              <Plus size={15} strokeWidth={2.5} aria-hidden="true" />
              {t('admin.users.add')}
            </button>
          </div>
        </div>

        <div className="adm-toolbar">
          <div className="adm-search">
            <Search size={15} strokeWidth={2} aria-hidden="true" />
            <input
              className="adm-search__input"
              placeholder={t('admin.users.search.placeholder')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              aria-label={t('admin.users.search.placeholder')}
            />
          </div>
        </div>

        {isLoading && <p className="adm-loading">{t('admin.loading')}</p>}
        {!isLoading && filtered.length === 0 && (
          <p className="adm-empty">{t('admin.users.empty')}</p>
        )}
        {!isLoading && filtered.length > 0 && (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>{t('admin.users.col.name')}</th>
                  <th>{t('admin.users.col.email')}</th>
                  <th>{t('admin.users.col.role')}</th>
                  <th>{t('admin.users.col.dept')}</th>
                  <th>{t('admin.users.col.source')}</th>
                  <th>{t('admin.users.col.status')}</th>
                  <th>{t('admin.users.col.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u._id || u.id}>
                    <td>{u.firstName} {u.lastName}</td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`adm-role__badge adm-role__badge--${u.role}`}>{u.role}</span>
                    </td>
                    <td>{u.department || t('admin.na')}</td>
                    <td>{u.authSource || 'local'}</td>
                    <td>
                      <span className={`adm-status adm-status--${u.isActive ? 'on' : 'off'}`}>
                        {u.isActive ? t('admin.users.active') : t('admin.users.inactive')}
                      </span>
                    </td>
                    <td>
                      <div className="adm-card__actions">
                        <button
                          type="button"
                          className="adm-btn adm-btn--ghost"
                          onClick={() => setModal(u)}
                          aria-label={t('admin.edit')}
                        >
                          <Pencil size={14} strokeWidth={2} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className={`adm-btn ${u.isActive ? 'adm-btn--danger' : 'adm-btn--ghost'}`}
                          disabled={toggleMutation.isPending}
                          onClick={() => toggleMutation.mutate({ id: u._id || u.id, isActive: !u.isActive })}
                        >
                          {u.isActive ? t('admin.users.toggle.deactivate') : t('admin.users.toggle.activate')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length > filtered.length && (
              <p className="adm-table__hint">
                {t('admin.users.hint').replace('{n}', users.length - filtered.length)}
              </p>
            )}
          </div>
        )}
      </section>

      {modal && (
        <UserModal
          user={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          t={t}
        />
      )}
    </div>
  )
}
