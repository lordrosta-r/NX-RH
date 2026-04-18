// =============================================================================
// SettingsSidebar — choisit dynamiquement les nav items selon le rôle.
// L'item "settings" est toujours marqué actif sur cette page.
// =============================================================================

import React from 'react'
import AppSidebar from '../../components/ui/AppSidebar'
import {
  HomeIcon, ClipboardIcon, TrendIcon,
  DocumentIcon, FolderIcon, GearIcon,
} from '../../components/ui/icons'

function buildItems(role, t) {
  const settingsItem = {
    id: 'settings', href: '/settings', Icon: GearIcon,
    label: t('settings.nav.settings'), active: true,
  }

  // hr / admin → portail HR (super-set)
  if (role === 'hr' || role === 'admin') {
    return [
      { id: 'overview',   href: '/hr',         Icon: HomeIcon,      label: 'HR Overview',   active: false },
      { id: 'campaigns',  href: '#',           Icon: ClipboardIcon, label: 'Campaigns',     active: false, disabled: true },
      { id: 'formeditor', href: '/formeditor', Icon: DocumentIcon,  label: 'Form Editor',   active: false },
      { id: 'resources',  href: '#',           Icon: FolderIcon,    label: 'Resources',     active: false, disabled: true },
      { id: 'reports',    href: '#',           Icon: TrendIcon,     label: 'Reports',       active: false, disabled: true },
      settingsItem,
    ]
  }

  // manager → portail Manager
  if (role === 'manager') {
    return [
      { id: 'evaluations', href: '/manager', Icon: ClipboardIcon, label: 'Evaluations', active: false },
      { id: 'team',        href: '#',        Icon: HomeIcon,      label: 'Team',        active: false, disabled: true },
      settingsItem,
    ]
  }

  // employee / director → portail employé (defaut)
  return [
    { id: 'home',       href: '/dashboard',  Icon: HomeIcon,      label: 'Dashboard',  active: false },
    { id: 'evaluation', href: '/evaluation', Icon: ClipboardIcon, label: 'Evaluation', active: false },
    { id: 'growth',     href: '#',           Icon: TrendIcon,     label: 'Growth',     active: false, disabled: true },
    settingsItem,
  ]
}

function brandSubFor(role) {
  if (role === 'admin')    return 'Admin Portal'
  if (role === 'hr')       return 'HR Portal'
  if (role === 'manager')  return 'Manager Portal'
  if (role === 'director') return 'Director Portal'
  return 'Employee Portal'
}

export default function SettingsSidebar({ t, role = 'employee' }) {
  return (
    <AppSidebar
      brandSub={brandSubFor(role)}
      navItems={buildItems(role, t)}
      labelNavigation={t('settings.nav.label')}
      labelComingSoon={t('settings.nav.coming_soon')}
    />
  )
}
