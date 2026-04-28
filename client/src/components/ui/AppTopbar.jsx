// =============================================================================
// AppTopbar — shared topbar for all inner pages
// =============================================================================

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import './AppTopbar.css'
import { Bell, Sun, Moon, Globe, ChevronDown, LogOut } from 'lucide-react'

// ── Internal labels ───────────────────────────────────────────────────────────
const L = {
  fr: {
    theme_light: 'Mode clair',
    theme_dark:  'Mode sombre',
    notif:       'Notifications',
    notif_title: 'NOTIFICATIONS',
    notif_all:   'Voir tout',
    lang:        'Switch to English',
    logout:      'Se déconnecter',
    user_menu:   'Menu utilisateur',
  },
  en: {
    theme_light: 'Light mode',
    theme_dark:  'Dark mode',
    notif:       'Notifications',
    notif_title: 'NOTIFICATIONS',
    notif_all:   'View all',
    lang:        'Passer en français',
    logout:      'Sign out',
    user_menu:   'User menu',
  },
}

function ThemeIcon({ theme }) {
  const p = { size: 17, strokeWidth: 1.5 }
  return theme === 'dark' ? <Sun {...p} /> : <Moon {...p} />
}

export default function AppTopbar({
  locale = 'fr',
  setLocale,
  theme,
  cycleTheme,
  notifItems = [],
  user,
  onLogout,
  onMenuToggle,
  nav,
  navGroups,
  badges = {},
}) {
  const lbl = L[locale] ?? L.fr
  const [notifOpen, setNotifOpen] = useState(false)
  const [userOpen,  setUserOpen]  = useState(false)
  const [openGroup, setOpenGroup] = useState(null)
  const notifRef    = useRef(null)
  const userRef     = useRef(null)
  const navRef      = useRef(null)
  const location    = useLocation()

  const first    = user?.firstName ?? ''
  const last     = user?.lastName  ?? ''
  const initials = `${first[0] ?? 'R'}${last[0] ?? 'H'}`.toUpperCase()
  const fullName = first || last ? `${first} ${last}`.trim() : 'Admin'
  const role     = user?.role ?? ''

  const themeLabel = theme === 'dark' ? lbl.theme_light : lbl.theme_dark

  // ── Close dropdowns on outside click / Escape ─────────────────────────────
  useEffect(() => {
    if (!notifOpen) return
    const h = e => { if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false) }
    const k = e => { if (e.key === 'Escape') setNotifOpen(false) }
    document.addEventListener('mousedown', h)
    document.addEventListener('keydown', k)
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('keydown', k) }
  }, [notifOpen])

  useEffect(() => {
    if (!userOpen) return
    const h = e => { if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false) }
    const k = e => { if (e.key === 'Escape') setUserOpen(false) }
    document.addEventListener('mousedown', h)
    document.addEventListener('keydown', k)
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('keydown', k) }
  }, [userOpen])

  useEffect(() => {
    if (!openGroup) return
    const h = e => { if (navRef.current && !navRef.current.contains(e.target)) setOpenGroup(null) }
    const k = e => { if (e.key === 'Escape') setOpenGroup(null) }
    document.addEventListener('mousedown', h)
    document.addEventListener('keydown', k)
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('keydown', k) }
  }, [openGroup])

  // ── Nav group — click-only, no hover auto-open ────────────────────────────
  const toggleGroup = useCallback(id => setOpenGroup(prev => (prev === id ? null : id)), [])

  function isGroupActive(group) {
    return group.children.some(child =>
      child.end ? location.pathname === child.to : location.pathname.startsWith(child.to)
    )
  }

  function groupHasBadge(group) {
    if (group.notifKey && (badges[group.notifKey] ?? 0) > 0) return true
    return group.children.some(child => child.notifKey && (badges[child.notifKey] ?? 0) > 0)
  }

  return (
    <header className="apptb">

      {/* Brand logo */}
      <div className="apptb__brand">
        <img src="/nx-logo.png" alt="NanoXplore" className="apptb__brand-logo" />
      </div>

      {/* Hamburger — mobile only */}
      {onMenuToggle && (
        <button type="button" className="apptb__hamburger" onClick={onMenuToggle} aria-label="Ouvrir le menu">
          <span /><span /><span />
        </button>
      )}

      {/* Grouped dropdown nav */}
      {navGroups && (
        <nav className="apptb__nav" ref={navRef} aria-label="Navigation principale">
          {navGroups.groups.map(group => (
            <div key={group.id} className="apptb__nav-group">
              <button
                type="button"
                className={[
                  'apptb__nav-btn',
                  isGroupActive(group)   ? 'apptb__nav-btn--active' : '',
                  openGroup === group.id ? 'apptb__nav-btn--open'   : '',
                ].filter(Boolean).join(' ')}
                onClick={() => toggleGroup(group.id)}
                aria-expanded={openGroup === group.id}
                aria-haspopup="menu"
              >
                <span>{group.label}</span>
                <ChevronDown size={11} strokeWidth={2.5}
                  className={`apptb__nav-chevron${openGroup === group.id ? ' apptb__nav-chevron--open' : ''}`}
                  aria-hidden="true"
                />
                {groupHasBadge(group) && <span className="apptb__nav-dot" aria-hidden="true" />}
              </button>

              {openGroup === group.id && (
                <div className="apptb__nav-dropdown" role="menu">
                  {group.children.map(item => (
                    <NavLink key={item.id} to={item.to} end={item.end} role="menuitem"
                      className={({ isActive }) => `apptb__nav-link${isActive ? ' apptb__nav-link--active' : ''}`}
                    >
                      {item.label}
                      {item.notifKey && (badges[item.notifKey] ?? 0) > 0 && (
                        <span className="apptb__nav-link-dot" aria-hidden="true" />
                      )}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          ))}

          {navGroups.direct?.map(item => (
            <NavLink key={item.id} to={item.to} end={item.end}
              className={({ isActive }) =>
                `apptb__nav-btn apptb__nav-direct${isActive ? ' apptb__nav-btn--active' : ''}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      )}

      {/* Legacy nav slot */}
      {!navGroups && nav}

      {/* Right cluster */}
      <div className="apptb__right">

        {/* Theme */}
        <button type="button" className="apptb__icon-btn" onClick={cycleTheme} aria-label={themeLabel} title={themeLabel}>
          <ThemeIcon theme={theme} />
        </button>

        {/* Notifications */}
        <div className="apptb__notif-wrap" ref={notifRef}>
          <button type="button"
            className={`apptb__icon-btn${notifItems.length ? ' apptb__icon-btn--notif' : ''}`}
            onClick={() => setNotifOpen(o => !o)}
            aria-label={lbl.notif} aria-expanded={notifOpen}
          >
            <Bell size={17} strokeWidth={1.5} />
            {notifItems.length > 0 && <span className="apptb__bell-dot" aria-hidden="true" />}
          </button>

          {notifOpen && (
            <div className="apptb__notif-dropdown" role="dialog" aria-modal="true" aria-label={lbl.notif}>
              <div className="apptb__notif-header">
                <span className="apptb__notif-title">{lbl.notif_title}</span>
                <span className="apptb__notif-badge">{notifItems.length}</span>
              </div>
              <ul className="apptb__notif-list">
                {notifItems.map(({ id, color, text, meta }, idx) => (
                  <li key={id} className={`apptb__notif-item${idx < notifItems.length - 1 ? ' apptb__notif-item--sep' : ''}`}>
                    <span className="apptb__notif-dot" style={{ background: color }} aria-hidden="true" />
                    <div>
                      <p className="apptb__notif-text">{text}</p>
                      <p className="apptb__notif-meta">{meta}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <button type="button" className="apptb__notif-footer" onClick={() => setNotifOpen(false)}>
                {lbl.notif_all}
              </button>
            </div>
          )}
        </div>

        {/* Language toggle */}
        {setLocale && (
          <button type="button" className="apptb__icon-btn"
            onClick={() => setLocale(locale === 'fr' ? 'en' : 'fr')}
            aria-label={lbl.lang} title={lbl.lang}
          >
            <Globe size={16} strokeWidth={1.5} />
          </button>
        )}

        <div className="apptb__sep" aria-hidden="true" />

        {/* Avatar + user dropdown */}
        <div className="apptb__user-wrap" ref={userRef}>
          <button type="button" className="apptb__avatar-btn"
            onClick={() => setUserOpen(o => !o)}
            aria-expanded={userOpen} aria-haspopup="menu"
            aria-label={lbl.user_menu}
          >
            <div className="apptb__avatar" aria-hidden="true">{initials}</div>
            <ChevronDown size={12} strokeWidth={2.5}
              className={`apptb__user-chevron${userOpen ? ' apptb__user-chevron--open' : ''}`}
              aria-hidden="true"
            />
          </button>

          {userOpen && (
            <div className="apptb__user-dropdown" role="menu">
              <div className="apptb__user-header">
                <p className="apptb__user-name">{fullName}</p>
                <p className="apptb__user-role">{role}</p>
              </div>
              <div className="apptb__user-divider" />
              <button type="button" className="apptb__user-logout" role="menuitem"
                onClick={() => { setUserOpen(false); onLogout() }}
              >
                <LogOut size={14} strokeWidth={1.5} aria-hidden="true" />
                {lbl.logout}
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  )
}

