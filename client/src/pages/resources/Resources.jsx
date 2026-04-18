// =============================================================================
// Resources — HR/admin document library
// Lists resources with CRUD capabilities for admin/hr roles.
// Adaptive sidebar: admin sees admin nav, hr sees hr nav.
// =============================================================================

import React, { useState, useEffect } from 'react'
import './resources.css'
import AppSidebar      from '../../components/ui/AppSidebar'
import AppTopbar       from '../../components/ui/AppTopbar'
import {
  HomeIcon, FolderIcon, ClipboardIcon, DocumentIcon, GearIcon,
  SearchIcon, PlusIcon, TrashIcon,
} from '../../components/ui/icons'
import { t as pageT }  from './i18n'
import { useLocale }   from '../../hooks/useLocale'
import { useTheme }    from '../../hooks/useTheme'
import { useAuthUser } from '../../hooks/useAuthUser'

const RESOURCE_TYPES = ['pdf', 'xlsx', 'docx', 'pptx']
const ROLES          = ['admin', 'hr', 'director', 'manager', 'employee']

// ── Adaptive sidebar ─────────────────────────────────────────────────────────
function ResourcesSidebar({ t, role }) {
  const items = role === 'admin'
    ? [
        { id: 'overview',   href: '/admin',      Icon: HomeIcon,      label: t('res.nav.admin'),       active: false },
        { id: 'hr',         href: '/hr',         Icon: FolderIcon,    label: t('res.nav.hr'),          active: false },
        { id: 'users',      href: '/users',      Icon: SearchIcon,    label: t('res.nav.users'),       active: false },
        { id: 'campaigns',  href: '/campaigns',  Icon: ClipboardIcon, label: t('res.nav.campaigns'),   active: false },
        { id: 'formeditor', href: '/formeditor', Icon: DocumentIcon,  label: t('res.nav.formeditor'),  active: false },
        { id: 'resources',  href: '/resources',  Icon: FolderIcon,    label: t('res.nav.resources'),   active: true },
        { id: 'settings',   href: '/settings',   Icon: GearIcon,      label: t('res.nav.settings'),    active: false },
      ]
    : [
        { id: 'overview',   href: '/hr',         Icon: HomeIcon,      label: t('res.nav.hr'),          active: false },
        { id: 'campaigns',  href: '/campaigns',  Icon: ClipboardIcon, label: t('res.nav.campaigns'),   active: false },
        { id: 'formeditor', href: '/formeditor', Icon: DocumentIcon,  label: t('res.nav.formeditor'),  active: false },
        { id: 'resources',  href: '/resources',  Icon: FolderIcon,    label: t('res.nav.resources'),   active: true },
        { id: 'settings',   href: '/settings',   Icon: GearIcon,      label: t('res.nav.settings'),    active: false },
      ]

  return (
    <AppSidebar
      brandSub={role === 'admin' ? 'Admin Portal' : 'HR Portal'}
      navItems={items}
      labelNavigation={t('res.nav.label')}
      labelComingSoon={t('res.nav.coming_soon')}
    />
  )
}

// ── Empty form state ─────────────────────────────────────────────────────────
const emptyForm = {
  title: '', description: '', type: 'pdf', filename: '', status: 'draft', visibleTo: ['employee'],
}

// ── Component ────────────────────────────────────────────────────────────────
export default function Resources() {
  const { t, locale, setLocale } = useLocale(pageT)
  const { theme, cycleTheme }    = useTheme()
  const { user, loading: authLoading } = useAuthUser()

  const [resources, setResources] = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)

  // Modal state
  const [modalOpen, setModalOpen]   = useState(false)
  const [editing, setEditing]       = useState(null) // null = create, object = edit
  const [form, setForm]             = useState({ ...emptyForm })
  const [saving, setSaving]         = useState(false)

  // ── Fetch resources ────────────────────────────────────────────────────────
  function loadResources() {
    setLoading(true)
    fetch('/api/resources', { credentials: 'include' })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(data => { setResources(Array.isArray(data) ? data : (data.data || [])); setError(null) })
      .catch(() => setError(t('res.error.load')))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadResources() }, [])

  if (authLoading) return null
  if (!user) return null
  if (!['hr', 'admin'].includes(user.role)) {
    window.location.href = '/employee'
    return null
  }

  async function handleLogout() {
    try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }) } catch { /* ignore */ }
    sessionStorage.clear()
    window.location.href = '/'
  }

  // ── Modal handlers ─────────────────────────────────────────────────────────
  function openCreate() {
    setEditing(null)
    setForm({ ...emptyForm })
    setModalOpen(true)
  }

  function openEdit(res) {
    setEditing(res)
    setForm({
      title:       res.title       || '',
      description: res.description || '',
      type:        res.type        || 'pdf',
      filename:    res.filename    || '',
      status:      res.status      || 'draft',
      visibleTo:   res.visibleTo   || ['employee'],
    })
    setModalOpen(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const url    = editing ? `/api/resources/${editing._id}` : '/api/resources'
      const method = editing ? 'PATCH' : 'POST'
      const res    = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setModalOpen(false)
      loadResources()
    } catch {
      setError(t('res.error.save'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm(t('res.table.confirm'))) return
    try {
      const res = await fetch(`/api/resources/${id}`, {
        method: 'DELETE', credentials: 'include',
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      loadResources()
    } catch {
      setError(t('res.error.delete'))
    }
  }

  function toggleVisibleTo(role) {
    setForm(prev => ({
      ...prev,
      visibleTo: prev.visibleTo.includes(role)
        ? prev.visibleTo.filter(r => r !== role)
        : [...prev.visibleTo, role],
    }))
  }

  function fmtDate(d) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US')
  }

  return (
    <div className="db">
      <ResourcesSidebar t={t} role={user.role} />

      <div className="db-main">
        <AppTopbar
          t={t}
          theme={theme} cycleTheme={cycleTheme}
          locale={locale} setLocale={setLocale}
          user={user} onLogout={handleLogout}
          searchPlaceholder={t('res.search.placeholder')}
          tKeys={{
            help:   { aria: 'res.help.aria',   title: 'res.help.title' },
            theme:  { to_light: 'res.theme.to_light', to_sidebar: 'res.theme.to_sidebar', to_dark: 'res.theme.to_dark' },
            logout: { aria: 'res.logout.aria', title: 'res.logout.title' },
            bell:   'res.notifications.aria_bell',
          }}
        />

        <main id="main-content" className="db-content res">
          {/* Hero */}
          <section className="res-hero">
            <p className="res-hero__eyebrow">{t('res.hero.eyebrow')}</p>
            <h1 className="res-hero__title">{t('res.hero.title')}</h1>
            <p className="res-hero__sub">{t('res.hero.sub')}</p>
          </section>

          {/* Action bar */}
          <div className="res-actions">
            <button type="button" className="res-btn res-btn--primary" onClick={openCreate}>
              <PlusIcon size={16} /> {t('res.cta.add')}
            </button>
          </div>

          {error && <p className="res-error" role="alert">{error}</p>}
          {loading && <p className="res-loading">{t('res.loading')}</p>}

          {!loading && !error && resources.length === 0 && (
            <p className="res-empty">{t('res.table.empty')}</p>
          )}

          {/* Resource table */}
          {!loading && resources.length > 0 && (
            <div className="res-table-wrap">
              <table className="res-table">
                <thead>
                  <tr>
                    <th>{t('res.table.title')}</th>
                    <th>{t('res.table.type')}</th>
                    <th>{t('res.table.status')}</th>
                    <th>{t('res.table.visible')}</th>
                    <th>{t('res.table.date')}</th>
                    <th>{t('res.table.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {resources.map(r => (
                    <tr key={r._id}>
                      <td className="res-cell--title">
                        <strong>{r.title}</strong>
                        {r.description && <span className="res-cell--desc">{r.description}</span>}
                      </td>
                      <td><span className={`res-type res-type--${r.type}`}>{t(`res.type.${r.type}`)}</span></td>
                      <td><span className={`res-status res-status--${r.status}`}>{t(`res.status.${r.status}`)}</span></td>
                      <td className="res-cell--roles">{(r.visibleTo || []).join(', ')}</td>
                      <td>{fmtDate(r.publishedAt)}</td>
                      <td className="res-cell--actions">
                        <button type="button" className="res-btn res-btn--sm" onClick={() => openEdit(r)}>
                          {t('res.table.edit')}
                        </button>
                        <button type="button" className="res-btn res-btn--sm res-btn--danger" onClick={() => handleDelete(r._id)}>
                          <TrashIcon size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Create / Edit modal */}
          {modalOpen && (
            <div className="res-modal-backdrop" onClick={() => setModalOpen(false)}>
              <div className="res-modal" role="dialog" aria-labelledby="res-modal-title" onClick={e => e.stopPropagation()}>
                <h3 id="res-modal-title" className="res-modal__title">
                  {editing ? t('res.modal.edit.title') : t('res.modal.create.title')}
                </h3>
                <form onSubmit={handleSave} className="res-form">
                  <label className="res-field">
                    <span>{t('res.modal.title')}</span>
                    <input type="text" required value={form.title}
                      onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
                  </label>
                  <label className="res-field">
                    <span>{t('res.modal.description')}</span>
                    <textarea rows={3} value={form.description}
                      onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
                  </label>
                  <label className="res-field">
                    <span>{t('res.modal.type')}</span>
                    <select value={form.type}
                      onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                      {RESOURCE_TYPES.map(rt => <option key={rt} value={rt}>{t(`res.type.${rt}`)}</option>)}
                    </select>
                  </label>
                  <label className="res-field">
                    <span>{t('res.modal.filename')}</span>
                    <input type="text" required value={form.filename}
                      onChange={e => setForm(p => ({ ...p, filename: e.target.value }))} />
                  </label>
                  <label className="res-field">
                    <span>{t('res.modal.status')}</span>
                    <select value={form.status}
                      onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                      <option value="draft">{t('res.status.draft')}</option>
                      <option value="published">{t('res.status.published')}</option>
                    </select>
                  </label>
                  <fieldset className="res-field">
                    <legend>{t('res.modal.visible')}</legend>
                    <div className="res-checks">
                      {ROLES.map(role => (
                        <label key={role} className="res-check">
                          <input type="checkbox" checked={form.visibleTo.includes(role)}
                            onChange={() => toggleVisibleTo(role)} />
                          <span>{role}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <div className="res-modal__actions">
                    <button type="button" className="res-btn" onClick={() => setModalOpen(false)}>
                      {t('res.modal.cancel')}
                    </button>
                    <button type="submit" className="res-btn res-btn--primary" disabled={saving}>
                      {t('res.modal.save')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
