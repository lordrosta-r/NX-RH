import { useState, useRef, useEffect } from 'react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import { Bell, ChevronDown, LogOut, User, Menu, X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../contexts/AuthContext'
import type { Role } from '../../types'
import { notificationsApi } from '../../api/notifications'
import clsx from 'clsx'

interface NavItem {
  label: string
  href?: string
  dropdown?: { label: string; href: string; separator?: boolean }[]
}

function getNavItems(role: Role): NavItem[] {
  const dashboard: NavItem = { label: 'Tableau de bord', href: '/' }
  const calendar: NavItem  = { label: 'Calendrier', href: '/events' }
  const resources: NavItem = { label: 'Ressources', href: '/resources' }

  if (role === 'admin') return [
    dashboard,
    { label: 'Utilisateurs', href: '/users' },
    { label: 'Campagnes', href: '/campaigns' },
    { label: 'Formulaires', href: '/forms' },
    {
      label: 'Évaluations',
      dropdown: [
        { label: 'Mes évaluations', href: '/evaluations' },
        { label: 'Toutes les évaluations', href: '/evaluations' },
        { label: 'Historique', href: '/evaluations/history' },
      ],
    },
    calendar,
    resources,
    { label: 'Analytics', href: '/analytics' },
    {
      label: 'Admin',
      dropdown: [
        { label: 'Configuration', href: '/admin/config' },
        { label: 'LDAP', href: '/admin/ldap' },
        { label: "Journal d'audit", href: '/admin/audit' },
        { label: 'Email de test', href: '/admin/mail-templates', separator: true },
      ],
    },
  ]

  if (role === 'hr') return [
    dashboard,
    { label: 'Utilisateurs', href: '/users' },
    { label: 'Campagnes', href: '/campaigns' },
    { label: 'Formulaires', href: '/forms' },
    {
      label: 'Évaluations',
      dropdown: [
        { label: 'Toutes les évaluations', href: '/evaluations' },
        { label: 'Historique', href: '/evaluations/history' },
      ],
    },
    { label: 'Offboarding', href: '/offboarding' },
    calendar,
    resources,
    { label: 'Analytics', href: '/analytics' },
  ]

  if (role === 'director') return [
    dashboard,
    {
      label: 'Évaluations',
      dropdown: [
        { label: 'Mes évaluations', href: '/evaluations' },
        { label: 'Mon équipe', href: '/evaluations/history' },
        { label: 'Historique', href: '/evaluations/history' },
      ],
    },
    { label: 'Mon Équipe', href: '/users' },
    calendar,
    resources,
  ]

  if (role === 'manager') return [
    dashboard,
    {
      label: 'Mes Évaluations',
      dropdown: [
        { label: 'À traiter', href: '/evaluations' },
        { label: 'Historique', href: '/evaluations/history' },
      ],
    },
    { label: 'Mon Équipe', href: '/users' },
    calendar,
    resources,
  ]

  // employee
  return [
    dashboard,
    { label: 'Mes Évaluations', href: '/evaluations' },
    calendar,
    resources,
  ]
}

function NavDropdown({ item }: { item: NavItem }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 font-medium py-1 transition-colors focus:outline-none focus-visible:text-primary-600"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {item.label}
        <ChevronDown className={clsx('w-3.5 h-3.5 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-50"
          role="menu"
        >
          {item.dropdown!.map((d) => (
            <div key={`${d.href}-${d.label}`}>
              {d.separator && <div className="my-1 border-t border-slate-100" />}
              <NavLink
                to={d.href}
                onClick={() => setOpen(false)}
                role="menuitem"
                className={({ isActive }) => clsx(
                  'block px-4 py-2 text-sm transition-colors',
                  isActive ? 'text-primary-600 bg-primary-50' : 'text-slate-700 hover:bg-slate-50',
                )}
              >
                {d.label}
              </NavLink>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [avatarOpen, setAvatarOpen] = useState(false)
  const avatarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) setAvatarOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const { data: notifCount } = useQuery({
    queryKey: ['notifications-count'],
    queryFn: () => notificationsApi.getNotificationCount().then((r) => r.data),
    refetchInterval: 30000,
  })
  const unreadCount = notifCount?.count ?? 0

  const navItems = user ? getNavItems(user.role) : []
  const initials = user
    ? `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase()
    : '??'

  async function handleLogout() {
    setAvatarOpen(false)
    await logout()
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 h-16 bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between gap-6">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 flex-shrink-0">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xs">NX</span>
          </div>
          <span className="text-lg font-bold text-primary-700">RH</span>
        </Link>

        {/* Nav desktop */}
        <div className="hidden md:flex items-center gap-5 flex-1">
          {navItems.map(item =>
            item.dropdown ? (
              <NavDropdown key={item.label} item={item} />
            ) : (
              <NavLink
                key={item.href}
                to={item.href!}
                end={item.href === '/'}
                className={({ isActive }) => clsx(
                  'text-sm font-medium transition-colors whitespace-nowrap',
                  isActive ? 'text-primary-600' : 'text-slate-600 hover:text-slate-900',
                )}
              >
                {item.label}
              </NavLink>
            )
          )}
        </div>

        {/* Zone droite */}
        <div className="flex items-center gap-3">
          {/* Notifications */}
          <button
            onClick={() => navigate('/notifications')}
            className="relative p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Avatar + menu */}
          <div ref={avatarRef} className="relative">
            <button
              onClick={() => setAvatarOpen(v => !v)}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
              aria-expanded={avatarOpen}
              aria-haspopup="menu"
            >
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-primary-700 text-xs font-semibold">{initials}</span>
              </div>
              <ChevronDown
                className={clsx(
                  'w-3.5 h-3.5 text-slate-400 transition-transform hidden sm:block',
                  avatarOpen && 'rotate-180',
                )}
              />
            </button>

            {avatarOpen && (
              <div
                className="absolute top-full right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-50"
                role="menu"
              >
                {/* Info utilisateur */}
                <div className="px-4 py-2.5 border-b border-slate-100">
                  <p className="text-sm font-semibold text-slate-900">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
                </div>

                <NavLink
                  to="/profile"
                  onClick={() => setAvatarOpen(false)}
                  role="menuitem"
                  className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <User className="w-4 h-4" />
                  Mon profil
                </NavLink>

                <div className="border-t border-slate-100 mt-1 pt-1">
                  <button
                    onClick={handleLogout}
                    role="menuitem"
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Se déconnecter
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Hamburger mobile */}
          <button
            onClick={() => setMobileOpen(v => !v)}
            className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 focus:outline-none"
            aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Menu mobile */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-slate-100 shadow-lg">
          <div className="px-4 py-3 space-y-1">
            {navItems.map(item =>
              item.href ? (
                <NavLink
                  key={item.href}
                  to={item.href}
                  end={item.href === '/'}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) => clsx(
                    'block px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive ? 'bg-primary-50 text-primary-700' : 'text-slate-700 hover:bg-slate-50',
                  )}
                >
                  {item.label}
                </NavLink>
              ) : (
                <div key={item.label}>
                  <p className="px-3 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    {item.label}
                  </p>
                  {item.dropdown?.map(d => (
                    <NavLink
                      key={`${d.href}-${d.label}`}
                      to={d.href}
                      onClick={() => setMobileOpen(false)}
                      className={({ isActive }) => clsx(
                        'block px-6 py-2 rounded-lg text-sm transition-colors',
                        isActive ? 'text-primary-600 bg-primary-50' : 'text-slate-600 hover:bg-slate-50',
                      )}
                    >
                      {d.label}
                    </NavLink>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
