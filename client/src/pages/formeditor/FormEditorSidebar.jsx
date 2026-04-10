// =============================================================================
// FormEditorSidebar — sidebar for the Form Editor page
// Same HR Portal nav, formeditor item active.
// =============================================================================
import React from 'react'
import AppSidebar from '../../components/ui/AppSidebar'
import { HomeIcon, ClipboardIcon, DocumentIcon, FolderIcon, TrendIcon, GearIcon } from '../../components/ui/icons'

export default function FormEditorSidebar({ t }) {
  const navItems = [
    { id: 'overview',   Icon: HomeIcon,      label: t('fe.nav.overview'),   active: false, href: '/hr'         },
    { id: 'campaigns',  Icon: ClipboardIcon, label: t('fe.nav.campaigns'),  active: false, href: '/hr#campaigns'},
    { id: 'formeditor', Icon: DocumentIcon,  label: t('fe.nav.formeditor'), active: true,  href: '/formeditor' },
    { id: 'resources',  Icon: FolderIcon,    label: t('fe.nav.resources'),  active: false, href: '/resources'  },
    { id: 'reports',    Icon: TrendIcon,     label: t('fe.nav.reports'),    active: false, href: '/hr#reports' },
    { id: 'settings',   Icon: GearIcon,      label: t('fe.nav.settings'),   active: false, href: '/hr#settings'},
  ]
  return <AppSidebar brandSub="HR Portal" navItems={navItems} />
}
