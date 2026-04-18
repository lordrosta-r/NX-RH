// =============================================================================
// DirectorSidebar — Director portal sidebar
// =============================================================================

import React from 'react'
import AppSidebar from '../../components/ui/AppSidebar'
import { HomeIcon, ClipboardIcon, GearIcon } from '../../components/ui/icons'

export default function DirectorSidebar({ t, activeItem = 'overview' }) {
  const navItems = [
    { id: 'overview',    href: '/director',   Icon: HomeIcon,      label: t('director.nav.overview'),    active: activeItem === 'overview'    },
    { id: 'evaluations', href: '/manager',    Icon: ClipboardIcon, label: t('director.nav.evaluations'), active: false },
    { id: 'settings',    href: '/settings',   Icon: GearIcon,      label: t('director.nav.settings'),    active: activeItem === 'settings'    },
  ]

  return (
    <AppSidebar
      brandSub="Director Portal"
      navItems={navItems}
      labelNavigation={t('director.nav.label')}
      labelComingSoon={t('director.nav.coming_soon')}
    />
  )
}
