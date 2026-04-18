// =============================================================================
// SettingsSidebar — choisit dynamiquement les nav items selon le rôle.
// L'item "settings" est toujours marqué actif sur cette page.
// =============================================================================

import React from 'react'
import AppSidebar from '../../components/ui/AppSidebar'
import {
  HomeIcon, ClipboardIcon,
  DocumentIcon, FolderIcon, GearIcon,
} from '../../components/ui/icons'

function buildItems(role, t) {
  const settingsItem = {
    id: 'settings', href: '/settings', Icon: GearIcon,
    label: t('settings.nav.settings'), active: true,
  }

  // admin → portail Admin (super-set)
  if (role === 'admin') {
    return [
      { id: 'overview',   href: '/admin',      Icon: HomeIcon,      label: 'Admin Overview', active: false },
      { id: 'hr',         href: '/hr',         Icon: FolderIcon,    label: 'HR Portal',      active: false },
      { id: 'campaigns',  href: '/campaigns',  Icon: ClipboardIcon, label: 'Campagnes',      active: false },
      { id: 'formeditor', href: '/formeditor', Icon: DocumentIcon,  label: 'Form Editor',    active: false },
      settingsItem,
    ]
  }

  // hr → portail HR
  if (role === 'hr') {
    return [
      { id: 'overview',   href: '/hr',         Icon: HomeIcon,      label: 'HR Overview', active: false },
      { id: 'campaigns',  href: '/campaigns',  Icon: ClipboardIcon, label: 'Campagnes',   active: false },
      { id: 'formeditor', href: '/formeditor', Icon: DocumentIcon,  label: 'Form Editor', active: false },
      settingsItem,
    ]
  }

  // director → portail Director
  if (role === 'director') {
    return [
      { id: 'overview',    href: '/director',   Icon: HomeIcon,      label: 'Director Overview', active: false },
      { id: 'evaluations', href: '/manager',    Icon: ClipboardIcon, label: 'Evaluations',       active: false },
      settingsItem,
    ]
  }

  // manager → portail Manager
  if (role === 'manager') {
    return [
      { id: 'evaluations', href: '/manager',  Icon: ClipboardIcon, label: 'Evaluations', active: false },
      settingsItem,
    ]
  }

  // employee (defaut)
  return [
    { id: 'home',       href: '/employee',   Icon: HomeIcon,      label: 'Mon espace', active: false },
    { id: 'evaluation', href: '/evaluation', Icon: ClipboardIcon, label: 'Evaluation', active: false },
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
