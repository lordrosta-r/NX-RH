// =============================================================================
// AdminSidebar — Admin portal sidebar
// =============================================================================

import React from 'react'
import AppSidebar from '../../components/ui/AppSidebar'
import {
  HomeIcon, ClipboardIcon, DocumentIcon, GearIcon, SearchIcon, FolderIcon,
} from '../../components/ui/icons'

export default function AdminSidebar({ t, activeItem = 'overview' }) {
  const navItems = [
    { id: 'overview',   href: '/admin',      Icon: HomeIcon,      label: t('admin.nav.overview'),   active: activeItem === 'overview'   },
    { id: 'users',      href: '/users',      Icon: SearchIcon,    label: t('admin.nav.users'),      active: activeItem === 'users'      },
    { id: 'campaigns',  href: '/campaigns',  Icon: ClipboardIcon, label: t('admin.nav.campaigns'),  active: activeItem === 'campaigns'  },
    { id: 'formeditor', href: '/formeditor', Icon: DocumentIcon,  label: t('admin.nav.formeditor'), active: activeItem === 'formeditor' },
    { id: 'resources',  href: '/resources',  Icon: FolderIcon,    label: t('admin.nav.resources'),  active: activeItem === 'resources'  },
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
