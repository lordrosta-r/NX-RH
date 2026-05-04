import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Bell, ChevronDown, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import type { Role } from '../../types'
import { cn } from '../../utils/cn'

interface NavLink {
  label: string
  to: string
  children?: { label: string; to: string }[]
}

function getNavLinks(role: Role): NavLink[] {
  switch (role) {
    case 'admin':
      return [
        { label: 'Tableau de bord', to: '/' },
        { label: 'Utilisateurs', to: '/users' },
        { label: 'Campagnes', to: '/campaigns' },
        { label: 'Formulaires', to: '/forms' },
        {
          label: 'Évaluations', to: '/evaluations',
          children: [
            { label: 'Mes évaluations', to: '/evaluations?view=me' },
            { label: 'Toutes', to: '/evaluations' },
            { label: 'Créer en masse', to: '/evaluations/new' },
            { label: 'Historique', to: '/evaluations/history' },
          ]
        },
        { label: 'Calendrier', to: '/events' },
        { label: 'Ressources', to: '/resources' },
        { label: 'Analytics', to: '/analytics' },
        {
          label: 'Admin', to: '/admin/config',
          children: [
            { label: 'Configuration', to: '/admin/config' },
            { label: 'LDAP', to: '/admin/ldap' },
            { label: "Journal d'audit", to: '/admin/audit' },
            { label: 'Modèles email', to: '/admin/mail-templates' },
          ]
        },
      ]
    case 'hr':
      return [
        { label: 'Tableau de bord', to: '/' },
        { label: 'Utilisateurs', to: '/users' },
        { label: 'Campagnes', to: '/campaigns' },
        { label: 'Formulaires', to: '/forms' },
        {
          label: 'Évaluations', to: '/evaluations',
          children: [
            { label: 'Toutes', to: '/evaluations' },
            { label: 'Créer', to: '/evaluations/new' },
            { label: 'Créer en masse', to: '/evaluations/new?bulk=1' },
            { label: 'Historique', to: '/evaluations/history' },
            { label: 'Audit', to: '/hr/flags' },
          ]
        },
        { label: 'Offboarding', to: '/offboarding' },
        { label: 'Calendrier', to: '/events' },
        { label: 'Ressources', to: '/resources' },
        { label: 'Analytics', to: '/analytics' },
      ]
    case 'director':
      return [
        { label: 'Tableau de bord', to: '/' },
        {
          label: 'Évaluations', to: '/evaluations',
          children: [
            { label: 'Mes évaluations', to: '/evaluations?view=me' },
            { label: 'Mon équipe', to: '/evaluations?view=team' },
            { label: 'Historique', to: '/evaluations/history' },
          ]
        },
        { label: 'Mon Équipe', to: '/users' },
        { label: 'Calendrier', to: '/events' },
        { label: 'Ressources', to: '/resources' },
      ]
    case 'manager':
      return [
        { label: 'Tableau de bord', to: '/' },
        {
          label: 'Évaluations', to: '/evaluations',
          children: [
            { label: 'Mes évaluations', to: '/evaluations?view=me' },
            { label: 'Mon équipe', to: '/evaluations?view=team' },
            { label: 'Historique', to: '/evaluations/history' },
          ]
        },
        { label: 'Mon Équipe', to: '/users' },
        { label: 'Calendrier', to: '/events' },
        { label: 'Ressources', to: '/resources' },
      ]
    case 'employee':
    default:
      return [
        { label: 'Tableau de bord', to: '/' },
        { label: 'Mes évaluations', to: '/evaluations?view=me' },
        { label: 'Calendrier', to: '/events' },
        { label: 'Ressources', to: '/resources' },
      ]
  }
}

export default function Navbar() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  const links = user ? getNavLinks(user.role) : []

  const isActive = (to: string) => location.pathname === to || location.pathname.startsWith(to + '/')

  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : '?'

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-white shadow-sm h-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 h-full flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xs">NX</span>
          </div>
          <span className="text-lg font-bold text-slate-900 hidden sm:block">RH</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden lg:flex items-center gap-1 flex-1">
          {links.map((link) => (
            link.children ? (
              <div key={link.to} className="relative">
                <button
                  onClick={() => setOpenDropdown(openDropdown === link.to ? null : link.to)}
                  className={cn(
                    'flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                    isActive(link.to)
                      ? 'text-primary-700 bg-primary-50'
                      : 'text-slate-600 hover:text-primary-600 hover:bg-slate-50'
                  )}
                >
                  {link.label}
                  <ChevronDown className="w-4 h-4" />
                </button>
                {openDropdown === link.to && (
                  <div className="absolute top-full left-0 mt-1 w-52 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50">
                    {link.children.map((child) => (
                      <Link
                        key={child.to}
                        to={child.to}
                        onClick={() => setOpenDropdown(null)}
                        className="block px-4 py-2 text-sm text-slate-700 hover:bg-primary-50 hover:text-primary-700"
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  'px-3 py-2 text-sm font-medium rounded-md transition-colors',
                  isActive(link.to)
                    ? 'text-primary-700 bg-primary-50 border-b-2 border-primary-500'
                    : 'text-slate-600 hover:text-primary-600 hover:bg-slate-50'
                )}
              >
                {link.label}
              </Link>
            )
          ))}
        </div>

        {/* Right zone */}
        <div className="flex items-center gap-2">
          {/* Cloche notifications */}
          <button
            onClick={() => navigate('/notifications')}
            className="relative p-2 text-slate-500 hover:text-primary-600 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
          </button>

          {/* Avatar + dropdown */}
          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-xs font-semibold">
                {initials}
              </div>
              <span className="hidden md:block text-sm font-medium text-slate-700">
                {user?.firstName}
              </span>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50">
                <Link
                  to="/profile"
                  onClick={() => setProfileOpen(false)}
                  className="block px-4 py-2 text-sm text-slate-700 hover:bg-primary-50 hover:text-primary-700"
                >
                  Mon profil
                </Link>
                <hr className="my-1 border-slate-100" />
                <button
                  onClick={() => { setProfileOpen(false); logout() }}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  Se déconnecter
                </button>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden absolute top-16 left-0 right-0 bg-white border-b border-slate-200 shadow-lg z-30 py-3">
          {links.map((link) => (
            <div key={link.to}>
              <Link
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'block px-6 py-2.5 text-sm font-medium',
                  isActive(link.to)
                    ? 'text-primary-700 bg-primary-50'
                    : 'text-slate-600 hover:text-primary-700 hover:bg-slate-50'
                )}
              >
                {link.label}
              </Link>
              {link.children?.map((child) => (
                <Link
                  key={child.to}
                  to={child.to}
                  onClick={() => setMobileOpen(false)}
                  className="block pl-10 pr-6 py-2 text-sm text-slate-500 hover:text-primary-600 hover:bg-slate-50"
                >
                  {child.label}
                </Link>
              ))}
            </div>
          ))}
        </div>
      )}
    </nav>
  )
}
