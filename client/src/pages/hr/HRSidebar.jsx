// =============================================================================
// HRSidebar — HR portal sidebar
// Thin config wrapper around the shared AppSidebar component.
// Nav items match HR.md role definition.
// =============================================================================

import React from 'react'
import AppSidebar from '../../components/ui/AppSidebar'
import {
  HomeIcon, ClipboardIcon, DocumentIcon, FolderIcon, GearIcon,
} from '../../components/ui/icons'

export default function HRSidebar({ t, activeItem = 'overview', sidebarOpen, setSidebarOpen }) {
  const navItems = [
    { id: 'overview',    href: '/hr',          Icon: HomeIcon,      label: t('hr.nav.overview'),    active: activeItem === 'overview'    },
    { id: 'campaigns',   href: '/campaigns',   Icon: ClipboardIcon, label: t('hr.nav.campaigns'),   active: activeItem === 'campaigns'   },
    { id: 'formeditor',  href: '/formeditor',  Icon: DocumentIcon,  label: t('hr.nav.formeditor'),  active: activeItem === 'formeditor'  },
    { id: 'resources',   href: '/resources',   Icon: FolderIcon,    label: t('hr.nav.resources'),   active: activeItem === 'resources'   },
    { id: 'settings',    href: '/settings',    Icon: GearIcon,      label: t('hr.nav.settings'),    active: activeItem === 'settings'    },
  ]

  return <AppSidebar brandSub="HR Portal" navItems={navItems}
    labelNavigation={t('hr.nav.label')}
    labelComingSoon={t('hr.nav.coming_soon')}
    sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}
  />
}
