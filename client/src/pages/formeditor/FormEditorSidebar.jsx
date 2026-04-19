// =============================================================================
// FormEditorSidebar — thin config wrapper around the shared AppSidebar.
// Co-located with the formeditor page (no cross-page imports).
// Nav set differs slightly when the user is admin vs HR.
// =============================================================================

import React from 'react'
import AppSidebar from '../../components/ui/AppSidebar'
import {
  HomeIcon, ClipboardIcon, DocumentIcon, FolderIcon, GearIcon,
} from '../../components/ui/icons'

export default function FormEditorSidebar({
  t, role = 'hr', activeItem = 'formeditor', sidebarOpen, setSidebarOpen,
}) {
  const baseHref = role === 'admin' ? '/admin' : '/hr'
  const baseLabel = role === 'admin' ? t('fe.nav.admin') : t('fe.nav.hr')

  const navItems = [
    { id: 'overview',   href: baseHref,       Icon: HomeIcon,      label: baseLabel,                  active: activeItem === 'overview'   },
    { id: 'campaigns',  href: '/campaigns',   Icon: ClipboardIcon, label: t('fe.nav.campaigns'),     active: activeItem === 'campaigns'  },
    { id: 'formeditor', href: '/formeditor',  Icon: DocumentIcon,  label: t('fe.nav.formeditor'),    active: activeItem === 'formeditor' },
    { id: 'resources',  href: '/resources',   Icon: FolderIcon,    label: t('fe.nav.resources'),     active: activeItem === 'resources'  },
    { id: 'settings',   href: '/settings',    Icon: GearIcon,      label: t('fe.nav.settings'),      active: activeItem === 'settings'   },
  ]

  return (
    <AppSidebar
      brandSub={role === 'admin' ? 'Admin Console' : 'HR Portal'}
      navItems={navItems}
      labelNavigation={t('fe.nav.label')}
      labelComingSoon={t('fe.nav.coming_soon')}
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
    />
  )
}
