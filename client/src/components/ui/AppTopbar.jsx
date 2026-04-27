// =============================================================================
// AppTopbar — shared topbar for all inner pages
// Identical across HR, Dashboard, Manager, FormEditor, Evaluation.
// Props: searchPlaceholder, locale, setLocale, theme, cycleTheme,
//        notifItems [{id, color, text, meta}], user, onLogout,
//        navGroups { groups, direct }, badges { [key]: count }
// =============================================================================

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import './AppTopbar.css'
import { Bell, Search, Sun, Moon, Palette, Globe, ChevronDown } from 'lucide-react'

// ── Internal labels (no external i18n dependency) ─────────────────────────────
const L = {
  fr: {
    search:        'Rechercher…',
    theme_light:   'Passer en mode clair',
    theme_sidebar: 'Passer en mode sidebar claire',
    theme_dark:    'Passer en mode sombre',
    notif:         'Notifications',
    notif_title:   'NOTIFICATIONS',
    notif_all:     'Voir tout',
    lang:          'Switch to English',
    logout:        'Se déconnecter',
  },
  en: {
    search:        'Search…',
    theme_light:   'Switch to light mode',
    theme_sidebar: 'Switch to light sidebar',
    theme_dark:    'Switch to dark mode',
    notif:         'Notifications',
    notif_title:   'NOTIFICATIONS',
    notif_all:     'View all',
    lang:          'Passer en français',
    logout:        'Sign out',
  },
}

function ThemeIcon({ theme }) {
  const p = { size: 17, color: 'var(--color-on-surface-variant)' }
  if (theme === 'dark')  return <Sun     {...p} />
  if (theme === 'light') return <Palette {...p} />
  return                        <Moon    {...p} />
}

/**
 * AppTopbar — shared topbar for all inner pages.
 *
 * @param {string}   searchPlaceholder  Localized search hint (differs per page)
 * @param {string}   [locale='fr']      'fr' | 'en'
 * @param {Function} [setLocale]        Locale toggle handler
 * @param {string}   theme              'dark' | 'light' | 'light-sidebar'
 * @param {Function} cycleTheme         Theme cycle handler
 * @param {Array}    [notifItems=[]]    [{id, color, text, meta}]
 * @param {Object}   user               From useAuthUser
 * @param {Function} onLogout           Logout handler
 */
export default function AppTopbar({
  searchPlaceholder,
  locale = 'fr',
  setLocale,
  theme,
  cycleTheme,
  notifItems = [],
  user,
  onLogout,
  onMenuToggle,
  nav,
  brand,
  navGroups,
  badges = {},
}) {
  const lbl = L[locale] ?? L.fr
  const [notifOpen,  setNotifOpen]  = useState(false)
  const [openGroup,  setOpenGroup]  = useState(null)
  const notifRef  = useRef(null)
  const navRef    = useRef(null)
  const closeTimer = useRef(null)
  const location  = useLocation()

  const first    = user?.firstName ?? ''
  const last     = user?.lastName  ?? ''
  const initials = `${first[0] ?? 'R'}${last[0] ?? 'H'}`.toUpperCase()
  const fullName = first || last ? `${first} ${last}`.trim() : 'Admin'
  const role     = user?.role ?? ''

  const themeLabel = theme === 'dark'  ? lbl.theme_light
    : theme === 'light' ? lbl.theme_sidebar
    : lbl.theme_dark

  // ── Notif dropdown: close on outside click / Escape ──────────────────────
  useEffect(() => {
    if (!notifOpen) return
    const handler = e => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [notifOpen])

  useEffect(() => {
    if (!notifOpen) return
    const handler = e => { if (e.key === 'Escape') setNotifOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [notifOpen])

  // ── Nav dropdown: close on outside click / Escape ────────────────────────
  useEffect(() => {
    if (!openGroup) return
    const handler = e => {
      if (navRef.current && !navRef.current.contains(e.target)) setOpenGroup(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [openGroup])

  useEffect(() => {
    if (!openGroup) return
    const handler = e => { if (e.key === 'Escape') setOpenGroup(null) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [openGroup])

  // ── Nav dropdown: hover helpers ───────────────────────────────────────────
  const handleGroupEnter = useCallback(id => {
    clearTimeout(closeTimer.current)
    setOpenGroup(id)
  }, [])

  const handleGroupLeave = useCallback(() => {
    closeTimer.current = setTimeout(() => setOpenGroup(null), 150)
  }, [])

  const toggleGroup = useCallback(id => {
    setOpenGroup(prev => (prev === id ? null : id))
  }, [])

  // ── Active/badge helpers ──────────────────────────────────────────────────
  function isGroupActive(group) {
    return group.children.some(child =>
      child.end
        ? location.pathname === child.to
        : location.pathname.startsWith(child.to)
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
        <span className="apptb__brand-icon">NX</span>
        <span className="apptb__brand-wordmark">NanoXplore</span>
      </div>

      {/* Hamburger — mobile only */}
      {onMenuToggle && (
        <button
          type="button"
          className="apptb__hamburger"
          onClick={onMenuToggle}
          aria-label="Ouvrir le menu"
        >
          <span /><span /><span />
        </button>
      )}

      {/* Grouped dropdown nav */}
      {navGroups && (
        <nav className="apptb__nav" ref={navRef} aria-label="Navigation principale">
          {navGroups.groups.map(group => (
            <div
              key={group.id}
              className="apptb__nav-group"
              onMouseEnter={() => handleGroupEnter(group.id)}
              onMouseLeave={handleGroupLeave}
            >
              <button
                type="button"
                className={[
                  'apptb__nav-btn',
                  isGroupActive(group)       ? 'apptb__nav-btn--active' : '',
                  openGroup === group.id     ? 'apptb__nav-btn--open'   : '',
                ].filter(Boolean).join(' ')}
                onClick={() => toggleGroup(group.id)}
                aria-expanded={openGroup === group.id}
                aria-haspopup="menu"
              >
                <span>{group.label}</span>
                <ChevronDown
                  size={11}
                  strokeWidth={2.5}
                  className={`apptb__nav-chevron${openGroup === group.id ? ' apptb__nav-chevron--open' : ''}`}
                  aria-hidden="true"
                />
                {groupHasBadge(group) && (
                  <span className="apptb__nav-dot" aria-hidden="true" />
                )}
              </button>

              {openGroup === group.id && (
                <div className="apptb__nav-dropdown" role="menu">
                  {group.children.map(item => (
                    <NavLink
                      key={item.id}
                      to={item.to}
                      end={item.end}
                      role="menuitem"
                      className={({ isActive }) =>
                        `apptb__nav-link${isActive ? ' apptb__nav-link--active' : ''}`
                      }
                      onClick={() => setOpenGroup(null)}
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
            <NavLink
              key={item.id}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `apptb__nav-btn apptb__nav-direct${isActive ? ' apptb__nav-btn--active' : ''}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      )}

      {/* Legacy nav slot (backward compat) */}
      {!navGroups && nav}

      {/* Search — shown only when no nav is present */}
      {!navGroups && !nav && (
        <div className="apptb__search" role="search">
          <Search size={15} color="var(--color-outline)" />
          <input
            type="text"
            className="apptb__search-input"
            placeholder={searchPlaceholder ?? lbl.search}
            aria-label={searchPlaceholder ?? lbl.search}
          />
        </div>
      )}

      {/* Right cluster */}
      <div className="apptb__right">
        <div className="apptb__sep" aria-hidden="true" />

        {/* Theme */}
        <button type="button" className="apptb__icon-btn"
          onClick={cycleTheme} aria-label={themeLabel} title={themeLabel}>
          <ThemeIcon theme={theme} />
        </button>

        {/* Notifications */}
        <div className="apptb__notif-wrap" ref={notifRef}>
          <button
            type="button"
            className={`apptb__icon-btn${notifItems.length ? ' apptb__icon-btn--notif' : ''}`}
            onClick={() => setNotifOpen(o => !o)}
            aria-label={lbl.notif}
            aria-expanded={notifOpen}
          >
            <Bell size={17} color="var(--color-on-surface-variant)" />
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
          <button
            type="button"
            className="apptb__locale-btn"
            onClick={() => setLocale(locale === 'fr' ? 'en' : 'fr')}
            aria-label={lbl.lang}
            title={lbl.lang}
          >
            <Globe size={16} color="var(--color-on-surface-variant)" />
          </button>
        )}

        <div className="apptb__sep" aria-hidden="true" />

        {/* User */}
        <div className="apptb__user">
          <div className="apptb__user-info">
            <p className="apptb__user-name">{fullName}</p>
            <p className="apptb__user-role">{role}</p>
          </div>
          <div className="apptb__avatar" aria-hidden="true">{initials}</div>
          <button type="button" className="apptb__icon-btn"
            onClick={onLogout} aria-label={lbl.logout} title={lbl.logout}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
              stroke="var(--color-on-surface-variant)" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>

      </div>
    </header>
  )
}

