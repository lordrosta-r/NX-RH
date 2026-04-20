// =============================================================================
// RoleSpaceSection — quick links to spaces accessible by the user's role.
// =============================================================================

import React from 'react'
import {
  HomeIcon, ClipboardIcon, FolderIcon, DocumentIcon,
} from '../../../components/ui/icons'

function spacesFor(role) {
  const effectiveRole = role === 'director' ? 'manager' : role
  if (effectiveRole === 'admin') {
    return [
      { id: 'admin',      href: '/admin',      Icon: HomeIcon },
      { id: 'hr',         href: '/hr',         Icon: FolderIcon },
      { id: 'manager',    href: '/manager',    Icon: ClipboardIcon },
      { id: 'formeditor', href: '/formeditor', Icon: DocumentIcon },
      { id: 'employee',   href: '/employee',   Icon: HomeIcon },
    ]
  }
  if (effectiveRole === 'hr') {
    return [
      { id: 'hr',         href: '/hr',         Icon: FolderIcon },
      { id: 'campaigns',  href: '/campaigns',  Icon: ClipboardIcon },
      { id: 'formeditor', href: '/formeditor', Icon: DocumentIcon },
      { id: 'employee',   href: '/employee',   Icon: HomeIcon },
    ]
  }
  if (effectiveRole === 'manager') {
    return [
      { id: 'manager',  href: '/manager',  Icon: ClipboardIcon },
      { id: 'employee', href: '/employee', Icon: HomeIcon },
    ]
  }
  // employee
  return [
    { id: 'employee',   href: '/employee',   Icon: HomeIcon },
    { id: 'evaluation', href: '/evaluation', Icon: ClipboardIcon },
  ]
}

export default function RoleSpaceSection({ t, role }) {
  const items = spacesFor(role)
  return (
    <section className="st-card" aria-labelledby="space-h">
      <h2 id="space-h" className="st-card__title">{t('settings.space.heading')}</h2>
      <p className="st-card__sub">{t('settings.space.subtitle')}</p>

      <div className="st-spaces">
        {items.map(({ id, href, Icon }) => (
          <a key={id} href={href} className="st-space">
            <span className="st-space__icon" aria-hidden="true">
              <Icon size={20} strokeWidth={1.75} />
            </span>
            <span className="st-space__body">
              <span className="st-space__name">{t(`settings.space.${id}`)}</span>
              <span className="st-space__desc">{t(`settings.space.${id}.desc`)}</span>
            </span>
          </a>
        ))}
      </div>
    </section>
  )
}
