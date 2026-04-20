// =============================================================================
// SettingsSidebar — choisit dynamiquement les nav items selon le rôle.
// L'item "settings" est toujours marqué actif sur cette page.
// =============================================================================

import React from 'react'
import AppSidebar from '../../components/ui/AppSidebar'
import {
  HomeIcon, ClipboardIcon,
  DocumentIcon, FolderIcon, GearIcon, SearchIcon,
} from '../../components/ui/icons'

function buildItems(role, t) {
  const effectiveRole = role === 'director' ? 'manager' : role
  const settingsItem = {
    id: 'settings', href: '/settings', Icon: GearIcon,
    label: t('settings.nav.settings'), active: true,
  }

  // admin → portail Admin (super-set)
  if (effectiveRole === 'admin') {
    return [
      { id: 'overview',   href: '/admin',      Icon: HomeIcon,      label: t('settings.nav.overview'),   active: false },
      { id: 'users',      href: '/users',      Icon: SearchIcon,    label: t('settings.nav.users'),      active: false },
      { id: 'campaigns',  href: '/campaigns',  Icon: ClipboardIcon, label: t('settings.nav.campaigns'),  active: false },
      { id: 'formeditor', href: '/formeditor', Icon: DocumentIcon,  label: t('settings.nav.formeditor'), active: false },
      { id: 'resources',  href: '/resources',  Icon: FolderIcon,    label: t('settings.nav.resources'),  active: false },
      settingsItem,
    ]
  }

  // hr → portail HR
  if (effectiveRole === 'hr') {
    return [
      { id: 'overview',   href: '/hr',         Icon: HomeIcon,      label: t('settings.nav.overview'),   active: false },
      { id: 'campaigns',  href: '/campaigns',  Icon: ClipboardIcon, label: t('settings.nav.campaigns'),  active: false },
      { id: 'formeditor', href: '/formeditor', Icon: DocumentIcon,  label: t('settings.nav.formeditor'), active: false },
      settingsItem,
    ]
  }

  if (effectiveRole === 'manager') {
    return [
      { id: 'evaluations', href: '/manager', Icon: ClipboardIcon, label: t('settings.nav.evaluations'), active: false },
      settingsItem,
    ]
  }

  // employee (défaut)
  return [
    { id: 'home',       href: '/employee',   Icon: HomeIcon,      label: t('settings.nav.overview'),  active: false },
    { id: 'evaluation', href: '/evaluation', Icon: ClipboardIcon, label: t('settings.nav.evaluation'), active: false },
    settingsItem,
  ]
}

function brandSubFor(role) {
  if (role === 'admin') return 'Admin Portal'
  if (role === 'hr') return 'HR Portal'
  if (role === 'manager' || role === 'director') return 'Manager Portal'
  return 'Employee Portal'
}

export default function SettingsSidebar({ t, role = 'employee', sidebarOpen, setSidebarOpen }) {
  return (
    <AppSidebar
      brandSub={brandSubFor(role)}
      navItems={buildItems(role, t)}
      labelNavigation={t('settings.nav.label')}
      labelComingSoon={t('settings.nav.coming_soon')}
      sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}
    />
  )
}
