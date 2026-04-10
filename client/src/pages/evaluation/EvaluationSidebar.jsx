// =============================================================================
// EvaluationSidebar — thin wrapper around AppSidebar for the evaluation page
// Employee portal nav, "evaluation" item active.
// =============================================================================
import React from 'react'
import AppSidebar from '../../components/ui/AppSidebar'
import { HomeIcon, ClipboardIcon, TrendIcon, GearIcon } from '../../components/ui/icons'

export default function EvaluationSidebar({ t }) {
  const navItems = [
    { id: 'dashboard',  Icon: HomeIcon,      label: t('ev.nav.dashboard'),  active: false, href: '/dashboard'  },
    { id: 'evaluation', Icon: ClipboardIcon, label: t('ev.nav.evaluation'), active: true,  href: '/evaluation' },
    { id: 'progress',   Icon: TrendIcon,     label: t('ev.nav.progress'),   active: false, href: '/dashboard#progress' },
    { id: 'settings',   Icon: GearIcon,      label: t('ev.nav.settings'),   active: false, href: '/dashboard#settings' },
  ]
  return <AppSidebar brandSub="Employee Portal" navItems={navItems} />
}
