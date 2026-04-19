// =============================================================================
// Users — Admin/HR user management page
// Table with search, role/department/status filters, pagination, create/edit modal.
// =============================================================================

import React, { useState, useEffect } from 'react'
import './users.css'
import AppSidebar      from '../../components/ui/AppSidebar'
import AppTopbar       from '../../components/ui/AppTopbar'
import {
  HomeIcon, FolderIcon, ClipboardIcon, DocumentIcon, GearIcon,
  SearchIcon, PlusIcon,
} from '../../components/ui/icons'
import { t as pageT }  from './i18n'
import { useLocale }   from '../../hooks/useLocale'
import { useTheme }    from '../../hooks/useTheme'
import { useAuthUser } from '../../hooks/useAuthUser'

const ROLES       = ['admin', 'hr', 'director', 'manager', 'employee']
const DEPARTMENTS = [
  'Engineering', 'Product', 'Design', 'Data', 'Security', 'Infrastructure',
  'Finance', 'Legal', 'HR', 'Sales', 'Marketing', 'Customer Success',
  'Operations', 'Executive',
]

// ── Adaptive sidebar ─────────────────────────────────────────────────────────
function UsersSidebar({ t, role, sidebarOpen, setSidebarOpen }) {
  const items = role === 'admin'
    ? [
        { id: 'overview',   href: '/admin',      Icon: HomeIcon,      label: t('usr.nav.admin'),       active: false },
        { id: 'users',      href: '/users',      Icon: SearchIcon,    label: t('usr.nav.users'),       active: true },
        { id: 'campaigns',  href: '/campaigns',  Icon: ClipboardIcon, label: t('usr.nav.campaigns'),   active: false },
        { id: 'formeditor', href: '/formeditor', Icon: DocumentIcon,  label: t('usr.nav.formeditor'),  active: false },
        { id: 'resources',  href: '/resources',  Icon: FolderIcon,    label: t('usr.nav.resources'),   active: false },
        { id: 'settings',   href: '/settings',   Icon: GearIcon,      label: t('usr.nav.settings'),    active: false },
      ]
    : [
        { id: 'overview',   href: '/hr',         Icon: HomeIcon,      label: t('usr.nav.hr'),          active: false },
        { id: 'users',      href: '/users',      Icon: SearchIcon,    label: t('usr.nav.users'),       active: true },
        { id: 'campaigns',  href: '/campaigns',  Icon: ClipboardIcon, label: t('usr.nav.campaigns'),   active: false },
        { id: 'formeditor', href: '/formeditor', Icon: DocumentIcon,  label: t('usr.nav.formeditor'),  active: false },
        { id: 'resources',  href: '/resources',  Icon: FolderIcon,    label: t('usr.nav.resources'),   active: false },
        { id: 'settings',   href: '/settings',   Icon: GearIcon,      label: t('usr.nav.settings'),    active: false },
      ]

  return (
    <AppSidebar
      brandSub={role === 'admin' ? 'Admin Portal' : 'HR Portal'}
      navItems={items}
      labelNavigation={t('usr.nav.label')}
      labelComingSoon={t('usr.nav.coming_soon')}
      sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}
    />
  )
}

// ── Empty form state ─────────────────────────────────────────────────────────
const emptyForm = {
  firstName: '', lastName: '', email: '', role: 'employee',
  department: 'Engineering', tempPassword: '', position: '',
  isActive: true, managerId: '',
}

// ── Component ────────────────────────────────────────────────────────────────
export default function Users() {
  const { t, locale, setLocale } = useLocale(pageT)
  const { theme, cycleTheme }    = useTheme()
  const { user, loading: authLoading } = useAuthUser()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [users, setUsers]       = useState([])
  const [total, setTotal]       = useState(0)
  const [page, setPage]         = useState(1)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const limit = 20

  // Filters
  const [search, setSearch]     = useState('')
  const [roleFilter, setRoleFilter]         = useState('')
  const [deptFilter, setDeptFilter]         = useState('')
  const [activeFilter, setActiveFilter]     = useState('')

  // Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing]     = useState(null)
  const [form, setForm]           = useState({ ...emptyForm })
  const [saving, setSaving]       = useState(false)

  // ── Fetch users ────────────────────────────────────────────────────────────
  function loadUsers(p = page) {
    setLoading(true)
    const params = new URLSearchParams({ page: p, limit })
    if (search)       params.set('search', search)
    if (roleFilter)   params.set('role', roleFilter)
    if (deptFilter)   params.set('department', deptFilter)
    if (activeFilter) params.set('isActive', activeFilter)

    fetch(`/api/users?${params}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(data => {
        setUsers(data.data || data.users || (Array.isArray(data) ? data : []))
        setTotal(data.total || 0)
        setError(null)
      })
      .catch(() => setError(t('usr.error.load')))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadUsers(1); setPage(1) }, [search, roleFilter, deptFilter, activeFilter]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { loadUsers(page) }, [page]) // eslint-disable-line react-hooks/exhaustive-deps

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

  function openEdit(u) {
    setEditing(u)
    setForm({
      firstName:    u.firstName    || '',
      lastName:     u.lastName     || '',
      email:        u.email        || '',
      role:         u.role         || 'employee',
      department:   u.department   || 'Engineering',
      tempPassword: '',
      position:     u.position     || '',
      isActive:     u.isActive !== false,
      managerId:    u.managerId?._id || u.managerId || '',
    })
    setModalOpen(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const url    = editing ? `/api/users/${editing._id}` : '/api/users'
      const method = editing ? 'PATCH' : 'POST'
      const body   = { ...form }
      if (editing) delete body.tempPassword // only on create
      if (!editing && !body.tempPassword) delete body.tempPassword

      const res = await fetch(url, {
        method, credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setModalOpen(false)
      loadUsers(page)
    } catch {
      setError(t('usr.error.save'))
    } finally {
      setSaving(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / limit))

  return (
    <div className="db">
      <UsersSidebar t={t} role={user.role} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="db-main">
        <AppTopbar
          t={t}
          theme={theme} cycleTheme={cycleTheme}
          locale={locale} setLocale={setLocale}
          user={user} onLogout={handleLogout}
          searchPlaceholder={t('usr.search.placeholder')}
          onMenuToggle={() => setSidebarOpen(o => !o)}
          tKeys={{
            help:   { aria: 'usr.help.aria',   title: 'usr.help.title' },
            theme:  { to_light: 'usr.theme.to_light', to_sidebar: 'usr.theme.to_sidebar', to_dark: 'usr.theme.to_dark' },
            logout: { aria: 'usr.logout.aria', title: 'usr.logout.title' },
            bell:   'usr.notifications.aria_bell',
          }}
        />

        <main id="main-content" className="db-content usr">
          {/* Hero */}
          <section className="usr-hero">
            <p className="usr-hero__eyebrow">{t('usr.hero.eyebrow')}</p>
            <h1 className="usr-hero__title">
              <span className="usr-hero__accent">{total || users.length}</span> {t('usr.hero.title_suffix')}
            </h1>
            <p className="usr-hero__sub">{t('usr.hero.sub')}</p>
          </section>

          {/* Action bar + filters */}
          <div className="usr-toolbar">
            <button type="button" className="usr-btn usr-btn--cta" onClick={openCreate}>
              <PlusIcon size={16} /> {t('usr.cta.add')}
            </button>

            <div className="usr-filters">
              <input
                type="text" className="usr-search"
                placeholder={t('usr.search.placeholder')}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
                <option value="">{t('usr.filter.all_roles')}</option>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
                <option value="">{t('usr.filter.all_departments')}</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <select value={activeFilter} onChange={e => setActiveFilter(e.target.value)}>
                <option value="">{t('usr.filter.all_status')}</option>
                <option value="true">{t('usr.filter.active')}</option>
                <option value="false">{t('usr.filter.inactive')}</option>
              </select>
            </div>
          </div>

          {error && <p className="usr-error" role="alert">{error}</p>}
          {loading && <p className="usr-loading">{t('usr.loading')}</p>}

          {!loading && !error && users.length === 0 && (
            <p className="usr-empty">{t('usr.table.empty')}</p>
          )}

          {/* Users table */}
          {!loading && users.length > 0 && (
            <>
              <div className="usr-table-wrap">
                <table className="usr-table">
                  <thead>
                    <tr>
                      <th>{t('usr.table.name')}</th>
                      <th>{t('usr.table.email')}</th>
                      <th>{t('usr.table.role')}</th>
                      <th>{t('usr.table.department')}</th>
                      <th>{t('usr.table.status')}</th>
                      <th>{t('usr.table.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u._id}>
                        <td className="usr-cell--name">{u.firstName} {u.lastName}</td>
                        <td>{u.email}</td>
                        <td><span className={`usr-role usr-role--${u.role}`}>{u.role}</span></td>
                        <td>{u.department || '—'}</td>
                        <td>
                          <span className={`usr-active usr-active--${u.isActive !== false}`}>
                            {u.isActive !== false ? t('usr.table.active') : t('usr.table.inactive')}
                          </span>
                        </td>
                        <td>
                          <button type="button" className="usr-btn usr-btn--sm" onClick={() => openEdit(u)}>
                            {t('usr.table.edit')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="usr-pagination">
                  <button type="button" className="usr-btn usr-btn--sm"
                    disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                    {t('usr.page.prev')}
                  </button>
                  <span className="usr-page-info">{page} {t('usr.page.of')} {totalPages}</span>
                  <button type="button" className="usr-btn usr-btn--sm"
                    disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                    {t('usr.page.next')}
                  </button>
                </div>
              )}
            </>
          )}

          {/* Create / Edit modal */}
          {modalOpen && (
            <div className="usr-modal-backdrop" onClick={() => setModalOpen(false)}>
              <div className="usr-modal" role="dialog" aria-labelledby="usr-modal-title" onClick={e => e.stopPropagation()}>
                <h3 id="usr-modal-title" className="usr-modal__title">
                  {editing ? t('usr.modal.edit.title') : t('usr.modal.create.title')}
                </h3>
                <form onSubmit={handleSave} className="usr-form">
                  <label className="usr-field">
                    <span>{t('usr.modal.firstName')}</span>
                    <input type="text" required value={form.firstName}
                      onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))} />
                  </label>
                  <label className="usr-field">
                    <span>{t('usr.modal.lastName')}</span>
                    <input type="text" required value={form.lastName}
                      onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))} />
                  </label>
                  <label className="usr-field">
                    <span>{t('usr.modal.email')}</span>
                    <input type="email" required value={form.email}
                      onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                  </label>
                  <label className="usr-field">
                    <span>{t('usr.modal.role')}</span>
                    <select value={form.role}
                      onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </label>
                  <label className="usr-field">
                    <span>{t('usr.modal.department')}</span>
                    <select value={form.department}
                      onChange={e => setForm(p => ({ ...p, department: e.target.value }))}>
                      {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </label>
                  <label className="usr-field">
                    <span>{t('usr.modal.position')}</span>
                    <input type="text" value={form.position}
                      onChange={e => setForm(p => ({ ...p, position: e.target.value }))}
                      placeholder={t('usr.modal.position_placeholder')} />
                  </label>
                  <label className="usr-field">
                    <span>{t('usr.modal.manager')}</span>
                    <select value={form.managerId}
                      onChange={e => setForm(p => ({ ...p, managerId: e.target.value }))}>
                      <option value="">{t('usr.modal.no_manager')}</option>
                      {users.filter(u => ['manager', 'director', 'admin'].includes(u.role) && u._id !== (editing?._id)).map(u => (
                        <option key={u._id} value={u._id}>{u.firstName} {u.lastName}</option>
                      ))}
                    </select>
                  </label>
                  {editing && (
                    <label className="usr-field usr-field--check">
                      <input type="checkbox" checked={form.isActive}
                        onChange={e => setForm(p => ({ ...p, isActive: e.target.checked }))} />
                      <span>{t('usr.modal.isActive')}</span>
                    </label>
                  )}
                  {!editing && (
                    <label className="usr-field">
                      <span>{t('usr.modal.tempPassword')}</span>
                      <input type="password" value={form.tempPassword}
                        onChange={e => setForm(p => ({ ...p, tempPassword: e.target.value }))} />
                    </label>
                  )}
                  <div className="usr-modal__actions">
                    <button type="button" className="usr-btn" onClick={() => setModalOpen(false)}>
                      {t('usr.modal.cancel')}
                    </button>
                    <button type="submit" className="usr-btn usr-btn--primary" disabled={saving}>
                      {t('usr.modal.save')}
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
