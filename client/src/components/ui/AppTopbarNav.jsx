import React from 'react'
import './AppTopbarNav.css'

// =============================================================================
// AppTopbarNav — horizontal nav links rendered inside the topbar.
// Used by mini-SPA shells (e.g. Employee) to switch sub-views.
//
// When react-router-dom is available in the tree (BrowserRouter), NavLink
// auto-handles the aria-current and active class via the className callback.
// Falls back to plain <a> for pages not yet on React Router (legacy MPA).
//
// Props:
//   items: [{ id, href, label, active }]
// =============================================================================

let NavLink
try {
  // eslint-disable-next-line no-undef
  NavLink = require('react-router-dom').NavLink
} catch { /* not available in this bundle */ }

export default function AppTopbarNav({ items = [] }) {
  return (
    <nav className="apptb-nav" aria-label="Sections">
      {items.map(({ id, href, label, active }) => {
        // If React Router NavLink is available, use it — active class is auto-managed
        if (NavLink) {
          return (
            <NavLink
              key={id}
              to={href}
              end={href === '/employee'} // exact match for root
              className={({ isActive }) =>
                `apptb-nav__link${isActive ? ' apptb-nav__link--active' : ''}`
              }
            >
              {label}
            </NavLink>
          )
        }
        // Legacy fallback — plain <a> with manual active prop
        return (
          <a
            key={id}
            href={href}
            className={`apptb-nav__link${active ? ' apptb-nav__link--active' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            {label}
          </a>
        )
      })}
    </nav>
  )
}
