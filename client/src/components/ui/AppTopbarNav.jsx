import React from 'react'
import './AppTopbarNav.css'

// =============================================================================
// AppTopbarNav — horizontal nav links rendered inside the topbar.
// Used by mini-SPA shells (e.g. Employee) to switch sub-views.
//
// Props:
//   items: [{ id, href, label, active }]
// =============================================================================

export default function AppTopbarNav({ items = [] }) {
  return (
    <nav className="apptb-nav" aria-label="Sections">
      {items.map(({ id, href, label, active }) => (
        <a
          key={id}
          href={href}
          className={`apptb-nav__link${active ? ' apptb-nav__link--active' : ''}`}
          aria-current={active ? 'page' : undefined}
        >
          {label}
        </a>
      ))}
    </nav>
  )
}
