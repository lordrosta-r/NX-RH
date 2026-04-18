// =============================================================================
// ManagerSidebar — Manager portal sidebar
// Thin config wrapper around the shared AppSidebar component.
// Nav items match MANAGER.md role definition.
// =============================================================================

import React from 'react'
import AppSidebar from '../../components/ui/AppSidebar'
import { ClipboardIcon, GearIcon } from '../../components/ui/icons'

export default function ManagerSidebar({ t, activeItem = 'evaluations' }) {
  const navItems = [
    { id: 'evaluations', href: '/manager',  Icon: ClipboardIcon, label: t('manager.nav.evaluations'), active: activeItem === 'evaluations' },
    { id: 'settings',    href: '/settings', Icon: GearIcon, label: t('manager.nav.settings'), active: activeItem === 'settings' },
  ]

  return <AppSidebar brandSub="Manager Portal" navItems={navItems}
    labelNavigation={t('manager.nav.label')}
    labelComingSoon={t('manager.nav.coming_soon')}
  />
}
