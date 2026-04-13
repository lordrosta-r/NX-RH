// =============================================================================
// AppSidebar — Shared inner-app sidebar (brand + nav)
// Used by all inner pages: dashboard (employee), hr, manager, director…
// Each page provides its own navItems and brandSub — no business logic here.
// Design: docs/design/dashboard/DESIGN.md
// =============================================================================

import React from 'react'
import './AppSidebar.css'

export default function AppSidebar({
  brandSub = '',
  navItems = [],
  labelNavigation = 'Main navigation',
  labelComingSoon = 'Coming soon',
}) {
  return (
    <aside className="app-sidebar">

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
              role="none"
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
            >
              {content}
            </a>
          )
        })}
      </nav>

    </aside>
  )
}
