// =============================================================================
// AdminSidebar — Admin portal sidebar
// =============================================================================

import React from 'react'
import AppSidebar from '../../components/ui/AppSidebar'
import {
  HomeIcon, FolderIcon, ClipboardIcon, DocumentIcon, GearIcon,
} from '../../components/ui/icons'

export default function AdminSidebar({ t, activeItem = 'overview' }) {
  const navItems = [
    { id: 'overview',   href: '/admin',      Icon: HomeIcon,      label: t('admin.nav.overview'),   active: activeItem === 'overview'   },
    { id: 'hr',         href: '/hr',         Icon: FolderIcon,    label: t('admin.nav.hr'),         active: false },
    { id: 'campaigns',  href: '/campaigns',  Icon: ClipboardIcon, label: t('admin.nav.campaigns'),  active: activeItem === 'campaigns'  },
    { id: 'formeditor', href: '/formeditor', Icon: DocumentIcon,  label: t('admin.nav.formeditor'), active: activeItem === 'formeditor' },
    { id: 'settings',   href: '/settings',   Icon: GearIcon,      label: t('admin.nav.settings'),   active: activeItem === 'settings'   },
  ]

  return (
    <AppSidebar
      brandSub="Admin Portal"
      navItems={navItems}
      labelNavigation={t('admin.nav.label')}
      labelComingSoon={t('admin.nav.coming_soon')}
    />
  )
}
