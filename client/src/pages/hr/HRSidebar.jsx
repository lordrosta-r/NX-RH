// =============================================================================
// HRSidebar — HR portal sidebar
// Thin config wrapper around the shared AppSidebar component.
// Nav items match HR.md role definition.
// =============================================================================

import React from 'react'
import AppSidebar from '../../components/ui/AppSidebar'
import {
  HomeIcon, ClipboardIcon, DocumentIcon,
  FolderIcon, TrendIcon, GearIcon,
} from '../../components/ui/icons'

export default function HRSidebar({ t, activeItem = 'overview' }) {
  const navItems = [
    { id: 'overview',    href: '/hr',          Icon: HomeIcon,      label: t('hr.nav.overview'),    active: activeItem === 'overview'    },
    { id: 'campaigns',  href: '#', disabled: true, Icon: ClipboardIcon, label: t('hr.nav.campaigns'),  active: activeItem === 'campaigns'  },
    { id: 'formeditor', href: '/formeditor',      Icon: DocumentIcon,  label: t('hr.nav.formeditor'), active: activeItem === 'formeditor' },
    { id: 'resources',  href: '#', disabled: true, Icon: FolderIcon,    label: t('hr.nav.resources'),  active: activeItem === 'resources'  },
    { id: 'reports',    href: '#', disabled: true, Icon: TrendIcon,     label: t('hr.nav.reports'),    active: activeItem === 'reports'    },
    { id: 'settings',   href: '#', disabled: true, Icon: GearIcon,      label: t('hr.nav.settings'),   active: activeItem === 'settings'   },
  ]

  return <AppSidebar brandSub="HR Portal" navItems={navItems}
    labelNavigation={t('hr.nav.label')}
    labelComingSoon={t('hr.nav.coming_soon')}
  />
}
