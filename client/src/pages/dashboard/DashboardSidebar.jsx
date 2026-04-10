// =============================================================================
// DashboardSidebar — Inner app navigation (brand + nav items only)
// User profile moved to topbar. See Dashboard.jsx.
// =============================================================================

import React from 'react'
import './DashboardSidebar.css'
import { HomeIcon, ClipboardIcon, TrendIcon, GearIcon } from '../../components/ui/icons'

const NAV_ITEMS = [
  { id: 'home',       Icon: HomeIcon,      labelKey: 'dashboard.nav.home',       active: true  },
  { id: 'evaluation', Icon: ClipboardIcon, labelKey: 'dashboard.nav.evaluation', active: false },
  { id: 'growth',     Icon: TrendIcon,     labelKey: 'dashboard.nav.growth',     active: false },
  { id: 'settings',   Icon: GearIcon,      labelKey: 'dashboard.nav.settings',   active: false },
]

export default function DashboardSidebar({ t }) {
  return (
    <aside className="ds-sidebar">

      {/* ── Brand ─────────────────────────────────────────────────────────── */}
      <div className="ds-sidebar__brand">
        <div className="ds-sidebar__brand-name">NanoXplore RH</div>
        <div className="ds-sidebar__brand-sub">Employee Portal</div>
      </div>

      {/* ── Navigation ────────────────────────────────────────────────────── */}
      <nav className="ds-sidebar__nav" aria-label="Navigation principale">
        {NAV_ITEMS.map(({ id, Icon, labelKey, active }) => (
          <a
            key={id}
            href={`#${id}`}
            className={`ds-sidebar__item${active ? ' ds-sidebar__item--active' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            <Icon size={18} strokeWidth={active ? 2 : 1.5} />
            <span>{t(labelKey)}</span>
          </a>
        ))}
      </nav>

    </aside>
  )
}
