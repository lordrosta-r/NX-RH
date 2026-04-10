// =============================================================================
// AppSidebar — Shared inner-app sidebar (brand + nav)
// Used by all inner pages: dashboard (employee), hr, manager, director…
// Each page provides its own navItems and brandSub — no business logic here.
// Design: docs/design/dashboard/DESIGN.md
// =============================================================================

import React from 'react'
import './AppSidebar.css'

export default function AppSidebar({ brandSub = '', navItems = [] }) {
  return (
    <aside className="app-sidebar">

      {/* Brand */}
      <div className="app-sidebar__brand">
        <div className="app-sidebar__brand-name">NanoXplore RH</div>
        <div className="app-sidebar__brand-sub">{brandSub}</div>
      </div>

      {/* Navigation */}
      <nav className="app-sidebar__nav" aria-label="Navigation principale">
        {navItems.map(({ id, Icon, label, active, href = `#${id}` }) => (
          <a
            key={id}
            href={href}
            className={`app-sidebar__item${active ? ' app-sidebar__item--active' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            <Icon size={18} strokeWidth={active ? 2 : 1.5} />
            <span>{label}</span>
          </a>
        ))}
      </nav>

    </aside>
  )
}
