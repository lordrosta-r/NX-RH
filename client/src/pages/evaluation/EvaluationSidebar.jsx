// =============================================================================
// EvaluationSidebar — thin wrapper around AppSidebar for the evaluation page
// Employee portal nav, "evaluation" item active.
// =============================================================================
import React from 'react'
import AppSidebar from '../../components/ui/AppSidebar'
import { Home, ClipboardList, Settings } from 'lucide-react'

export default function EvaluationSidebar({ t, sidebarOpen, setSidebarOpen }) {
  const navItems = [
    { id: 'home',       Icon: Home,          label: t('ev.nav.dashboard'),  active: false, href: '/employee'  },
    { id: 'evaluation', Icon: ClipboardList, label: t('ev.nav.evaluation'), active: true,  href: '/evaluation' },
    { id: 'settings',   Icon: Settings,      label: t('ev.nav.settings'),   active: false, href: '/settings' },
  ]
  return <AppSidebar brandSub="Employee Portal" navItems={navItems}
    labelNavigation={t('ev.nav.label')}
    labelComingSoon={t('ev.nav.coming_soon')}
    sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}
  />
}
