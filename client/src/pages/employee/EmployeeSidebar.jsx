// =============================================================================
// EmployeeSidebar — Employee portal sidebar
// Thin config wrapper around the shared AppSidebar component.
// Nav items match EMPLOYEE.md role definition.
// =============================================================================

import React from 'react'
import AppSidebar from '../../components/ui/AppSidebar'
import { HomeIcon, ClipboardIcon, GearIcon } from '../../components/ui/icons'

export default function EmployeeSidebar({ t, activeItem = 'home' }) {
  const navItems = [
    { id: 'home',       href: '/employee',   Icon: HomeIcon,      label: t('dashboard.nav.home'),       active: activeItem === 'home'  },
    { id: 'evaluation', href: '/evaluation', Icon: ClipboardIcon, label: t('dashboard.nav.evaluation'), active: activeItem === 'evaluation' },
    { id: 'settings',   href: '/settings',   Icon: GearIcon,      label: t('dashboard.nav.settings'),   active: activeItem === 'settings' },
  ]

  return <AppSidebar brandSub="Employee Portal" navItems={navItems}
    labelNavigation={t('dashboard.nav.label')}
    labelComingSoon={t('dashboard.nav.coming_soon')}
  />
}
