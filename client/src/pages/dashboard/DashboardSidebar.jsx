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
    { id: 'home',       href: '/dashboard',  Icon: HomeIcon,      label: t('dashboard.nav.home'),       active: true  },
    { id: 'evaluation', href: '/evaluation', Icon: ClipboardIcon, label: t('dashboard.nav.evaluation'), active: false },
    { id: 'growth',   href: '#', disabled: true, Icon: TrendIcon, label: t('dashboard.nav.growth'),   active: false },
    { id: 'settings', href: '#', disabled: true, Icon: GearIcon,  label: t('dashboard.nav.settings'), active: false },
  ]

  return <AppSidebar brandSub="Employee Portal" navItems={navItems}
    labelNavigation={t('dashboard.nav.label')}
    labelComingSoon={t('dashboard.nav.coming_soon')}
  />
}
