// =============================================================================
// AppSidebar — Shared inner-app sidebar (brand + nav)
// Used by all inner pages: dashboard (employee), hr, manager, director…
// Each page provides its own navItems and brandSub — no business logic here.
// Design: docs/design/dashboard/DESIGN.md
// =============================================================================

import React, { useState, useEffect } from 'react'
import './AppSidebar.css'

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
          {navItems.map(({ id, Icon, label, active, href = `#${id}`, disabled = false }) => {
            const content = (
              <>
                <Icon size={18} strokeWidth={active ? 2 : 1.5} />
                <span>{label}</span>
              </>
            )
            const cls = `app-sidebar__item${active ? ' app-sidebar__item--active' : ''}${disabled ? ' app-sidebar__item--disabled' : ''}`
            return disabled ? (
              <span
                key={id}
                className={cls}
                aria-disabled="true"
                role="link"
                tabIndex={0}
                title={labelComingSoon}
              >
                {content}
              </span>
            ) : (
              <a
                key={id}
                href={href}
                className={cls}
                aria-current={active ? 'page' : undefined}
                onClick={() => setOpen(false)}
              >
                {content}
              </a>
            )
          })}
        </nav>

      </aside>
    </>
  )
}
