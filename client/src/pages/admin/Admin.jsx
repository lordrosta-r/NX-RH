// =============================================================================
// Admin — System governance portal
// Sections: Users overview · System health · Quick links to other portals.
// Only accessible to role=admin.
// =============================================================================

import React, { useState, useEffect } from 'react'
import './admin.css'
import AdminSidebar    from './AdminSidebar'
import AppTopbar       from '../../components/ui/AppTopbar'
import { t as pageT }  from './i18n'
import { useLocale }   from '../../hooks/useLocale'
import { useTheme }    from '../../hooks/useTheme'
import { useAuthUser } from '../../hooks/useAuthUser'

export default function Admin() {
  const { t, locale, setLocale } = useLocale(pageT)
  const { theme, cycleTheme } = useTheme()
  const { user, loading: authLoading } = useAuthUser()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [users, setUsers]       = useState([])
  const [usersLoad, setUsersLoad] = useState(true)
  const [health, setHealth]     = useState(null)
  const [error, setError]       = useState(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/users?limit=200', { credentials: 'include' })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(data => { if (!cancelled) setUsers(Array.isArray(data) ? data : (data.users || [])) })
      .catch(() => { if (!cancelled) setError(t('admin.error.users')) })
      .finally(() => { if (!cancelled) setUsersLoad(false) })

    fetch('/api/health', { credentials: 'include' })
      .then(r => r.json())
      .then(data => { if (!cancelled) setHealth(data) })
      .catch(() => { /* tolérant */ })

    return () => { cancelled = true }
  }, [t])

  useEffect(() => {
    if (!authLoading && user && user.role !== 'admin') {
      window.location.href = '/employee'
    }
  }, [authLoading, user])

  if (authLoading) return null
  if (!user) return null
  if (user.role !== 'admin') return null

  async function handleLogout() {
    try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }) } catch { /* ignore */ }
    sessionStorage.clear()
    window.location.href = '/'
  }

  // Statistiques utilisateurs
  const stats = {
    total:     users.length,
    active:    users.filter(u => u.isActive).length,
    inactive:  users.filter(u => !u.isActive).length,
    byRole:    users.reduce((acc, u) => { acc[u.role] = (acc[u.role] || 0) + 1; return acc }, {}),
    ldap:      users.filter(u => u.authSource === 'ldap').length,
    local:     users.filter(u => u.authSource === 'local').length,
  }

  return (
    <div className="db">
      <AdminSidebar t={t} activeItem="overview" sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="db-main">
        <AppTopbar
          t={t}
          theme={theme}
          cycleTheme={cycleTheme}
          locale={locale}
          setLocale={setLocale}
          user={user}
          onLogout={handleLogout}
          searchPlaceholder={t('admin.search.placeholder')}
          onMenuToggle={() => setSidebarOpen(o => !o)}
          tKeys={{
            help:   { aria: 'admin.help.aria',   title: 'admin.help.title' },
            theme:  { to_light: 'admin.theme.to_light', to_sidebar: 'admin.theme.to_sidebar', to_dark: 'admin.theme.to_dark' },
            logout: { aria: 'admin.logout.aria', title: 'admin.logout.title' },
            bell:   'admin.notifications.aria_bell',
          }}
        />

        <main id="main-content" className="db-content adm">
          {/* Hero */}
          <section className="adm-hero">
            <p className="adm-hero__eyebrow">{t('admin.hero.eyebrow')}</p>
            <h1 className="adm-hero__title">
              <span className="adm-hero__accent">{t('admin.hero.title_accent')}</span> {t('admin.hero.title_rest')}
            </h1>
            <p className="adm-hero__sub">{t('admin.hero.sub')}</p>
          </section>

          {/* KPIs */}
          <section className="adm-kpis" aria-label={t('admin.kpis.label')}>
            <div className="adm-kpi">
              <span className="adm-kpi__value">{stats.total}</span>
              <span className="adm-kpi__label">{t('admin.kpi.users_total')}</span>
            </div>
            <div className="adm-kpi">
              <span className="adm-kpi__value">{stats.active}</span>
              <span className="adm-kpi__label">{t('admin.kpi.users_active')}</span>
            </div>
            <div className="adm-kpi">
              <span className="adm-kpi__value">{stats.inactive}</span>
              <span className="adm-kpi__label">{t('admin.kpi.users_inactive')}</span>
            </div>
            <div className="adm-kpi">
              <span className="adm-kpi__value">{stats.ldap}</span>
              <span className="adm-kpi__label">{t('admin.kpi.users_ldap')}</span>
            </div>
            <div className="adm-kpi">
              <span className="adm-kpi__value">{stats.local}</span>
              <span className="adm-kpi__label">{t('admin.kpi.users_local')}</span>
            </div>
            <div className="adm-kpi">
              <span className={`adm-kpi__value adm-kpi__value--${health?.status === 'ok' ? 'ok' : 'warn'}`}>
                {health?.status === 'ok' ? '✓' : '!'}
              </span>
              <span className="adm-kpi__label">{t('admin.kpi.system')}</span>
            </div>
          </section>

          {/* Distribution par rôle */}
          <section className="adm-card" aria-labelledby="adm-roles">
            <h2 id="adm-roles" className="adm-card__title">{t('admin.roles.heading')}</h2>
            <div className="adm-roles">
              {['admin', 'hr', 'director', 'manager', 'employee'].map(r => (
                <div key={r} className="adm-role">
                  <span className={`adm-role__badge adm-role__badge--${r}`}>{r}</span>
                  <span className="adm-role__count">{stats.byRole[r] || 0}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Quick actions */}
          <section className="adm-card" aria-labelledby="adm-actions">
            <h2 id="adm-actions" className="adm-card__title">{t('admin.actions.heading')}</h2>
            <div className="adm-actions">
              <a className="adm-action" href="/users">
                <span className="adm-action__name">{t('admin.actions.users')}</span>
                <span className="adm-action__desc">{t('admin.actions.users.desc')}</span>
              </a>
              <a className="adm-action" href="/campaigns">
                <span className="adm-action__name">{t('admin.actions.campaigns')}</span>
                <span className="adm-action__desc">{t('admin.actions.campaigns.desc')}</span>
              </a>
              <a className="adm-action" href="/formeditor">
                <span className="adm-action__name">{t('admin.actions.formeditor')}</span>
                <span className="adm-action__desc">{t('admin.actions.formeditor.desc')}</span>
              </a>
              <a className="adm-action" href="/resources">
                <span className="adm-action__name">{t('admin.actions.resources')}</span>
                <span className="adm-action__desc">{t('admin.actions.resources.desc')}</span>
              </a>
              <a className="adm-action" href="/settings">
                <span className="adm-action__name">{t('admin.actions.settings')}</span>
                <span className="adm-action__desc">{t('admin.actions.settings.desc')}</span>
              </a>
            </div>
          </section>

          {/* Liste utilisateurs (compacte) */}
          <section className="adm-card" aria-labelledby="adm-users">
            <h2 id="adm-users" className="adm-card__title">{t('admin.users.heading')}</h2>
            {usersLoad && <p className="adm-loading">{t('admin.loading')}</p>}
            {error && <p className="adm-error" role="alert">{error}</p>}
            {!usersLoad && !error && (
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
                    </tr>
                  </thead>
                  <tbody>
                    {users.slice(0, 50).map(u => (
                      <tr key={u._id || u.id}>
                        <td>{u.firstName} {u.lastName}</td>
                        <td>{u.email}</td>
                        <td><span className={`adm-role__badge adm-role__badge--${u.role}`}>{u.role}</span></td>
                        <td>{u.department || '—'}</td>
                        <td>{u.authSource || 'local'}</td>
                        <td>
                          <span className={`adm-status adm-status--${u.isActive ? 'on' : 'off'}`}>
                            {u.isActive ? t('admin.users.active') : t('admin.users.inactive')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {users.length > 50 && (
                  <p className="adm-table__hint">{t('admin.users.hint').replace('{n}', users.length - 50)}</p>
                )}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  )
}
