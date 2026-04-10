// =============================================================================
// DashboardSidebar — Employee portal sidebar
// Thin config wrapper around the shared AppSidebar component.
// Nav items match EMPLOYEE.md role definition.
// =============================================================================

import React from 'react'
import AppSidebar from '../../components/ui/AppSidebar'
import { HomeIcon, ClipboardIcon, TrendIcon, GearIcon } from '../../components/ui/icons'

export default function DashboardSidebar({ t }) {
  const navItems = [
    { id: 'home',       Icon: HomeIcon,      label: t('dashboard.nav.home'),       active: true  },
    { id: 'evaluation', Icon: ClipboardIcon, label: t('dashboard.nav.evaluation'), active: false },
    { id: 'growth',     Icon: TrendIcon,     label: t('dashboard.nav.growth'),     active: false },
    { id: 'settings',   Icon: GearIcon,      label: t('dashboard.nav.settings'),   active: false },
  ]

  return <AppSidebar brandSub="Employee Portal" navItems={navItems} />
}
