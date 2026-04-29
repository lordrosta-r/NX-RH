// =============================================================================
// AppSidebar — Shared inner-app sidebar (brand + nav)
// Used by all inner pages: employee, hr, manager…
// Each page provides its own navItems and brandSub — no business logic here.
// Design: docs/design/dashboard/DESIGN.md
// =============================================================================

import React, { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'


export default function AppSidebar({
  brandSub = '',
  navItems = [],
  labelNavigation = 'Main navigation',
  labelComingSoon = 'Coming soon',
  // sidebarOpen / setSidebarOpen optionnels — injectés par la topbar via context ou prop drilling.
  // Si non fournis, la sidebar gère son propre état.
  sidebarOpen,
  setSidebarOpen,
}) {
  const [localOpen, setLocalOpen] = useState(false)
  const open    = sidebarOpen    !== undefined ? sidebarOpen    : localOpen
  const setOpen = setSidebarOpen !== undefined ? setSidebarOpen : setLocalOpen

  // Fermer sur resize → desktop
  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 768) setOpen(false) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [setOpen])

  // Fermer sur Escape
  useEffect(() => {
    if (!open) return
    const handler = e => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, setOpen])

  return (
    <>
      {/* Overlay mobile */}
      {open && (
        <div
          className="app-sidebar__overlay"
          aria-hidden="true"
          onClick={() => setOpen(false)}
        />
      )}

      <aside className={`app-sidebar${open ? ' app-sidebar--open' : ''}`}>

        {/* Brand */}
        <div className="app-sidebar__brand">
          <div className="app-sidebar__brand-name">NanoXplore RH</div>
          <div className="app-sidebar__brand-sub">{brandSub}</div>
        </div>

        {/* Navigation */}
        <nav className="app-sidebar__nav" aria-label={labelNavigation}>
          {navItems.map(({ id, Icon, label, active, to, href, disabled = false, end = false }) => {
            // Disabled: render a span (no navigation)
            if (disabled) {
              return (
                <span
                  key={id}
                  className="app-sidebar__item app-sidebar__item--disabled"
                  aria-disabled="true"
                  role="link"
                  tabIndex={0}
                  title={labelComingSoon}
                >
                  <Icon size={18} strokeWidth={1.5} />
                  <span>{label}</span>
                </span>
              )
            }

            // Router NavLink (preferred) — `to` prop
            if (to) {
              return (
                <NavLink
                  key={id}
                  to={to}
                  end={end}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `app-sidebar__item${isActive ? ' app-sidebar__item--active' : ''}`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon size={18} strokeWidth={isActive ? 2 : 1.5} />
                      <span>{label}</span>
                    </>
                  )}
                </NavLink>
              )
            }

            // Legacy: raw href + manual `active` flag
            const cls = `app-sidebar__item${active ? ' app-sidebar__item--active' : ''}`
            return (
              <a
                key={id}
                href={href ?? `#${id}`}
                className={cls}
                aria-current={active ? 'page' : undefined}
                onClick={() => setOpen(false)}
              >
                <Icon size={18} strokeWidth={active ? 2 : 1.5} />
                <span>{label}</span>
              </a>
            )
          })}
        </nav>

      </aside>
    </>
  )
}
