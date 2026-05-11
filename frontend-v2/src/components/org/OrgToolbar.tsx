import React, { useState } from 'react'
import { Search, Filter, Globe, Users, LayoutGrid } from 'lucide-react'
import type { Role } from '../../types'

export type OrgView = 'all' | 'teams' | 'sector'

const ROLES: { value: Role; label: string; color: string }[] = [
  { value: 'admin',    label: 'Admin',      color: '#0D9488' },
  { value: 'hr',       label: 'RH',         color: '#059669' },
  { value: 'director', label: 'Directeur',  color: '#7C3AED' },
  { value: 'manager',  label: 'Manager',    color: '#2563EB' },
  { value: 'employee', label: 'Employé',    color: '#64748B' },
]

interface OrgToolbarProps {
  activeView: OrgView
  onViewChange: (view: OrgView) => void
  searchQuery: string
  onSearchChange: (q: string) => void
  activeRoles: Role[]
  onRolesChange: (roles: Role[]) => void
  totalCount: number
  filteredCount: number
}

export default function OrgToolbar({
  activeView,
  onViewChange,
  searchQuery,
  onSearchChange,
  activeRoles,
  onRolesChange,
  totalCount,
  filteredCount,
}: OrgToolbarProps) {
  const [showRoleFilter, setShowRoleFilter] = useState(false)

  const toggleRole = (role: Role) => {
    if (activeRoles.includes(role)) {
      onRolesChange(activeRoles.filter(r => r !== role))
    } else {
      onRolesChange([...activeRoles, role])
    }
  }

  const clearFilters = () => {
    onSearchChange('')
    onRolesChange([])
  }

  const hasFilters = searchQuery || activeRoles.length > 0

  return (
    <div
      className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200 px-4 py-2.5 flex items-center gap-4"
      style={{ minWidth: 560 }}
    >
      {/* Tabs */}
      <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
        {([
          { view: 'all',    label: 'Tout',     icon: <Globe size={12} /> },
          { view: 'teams',  label: 'Équipes',  icon: <Users size={12} /> },
          { view: 'sector', label: 'Secteurs', icon: <LayoutGrid size={12} /> },
        ] as { view: OrgView; label: string; icon: React.ReactNode }[]).map(({ view, label, icon }) => (
          <button
            key={view}
            onClick={() => onViewChange(view)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
              activeView === view
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* Separator */}
      <div className="w-px h-5 bg-slate-200" />

      {/* Search */}
      <div className="relative flex-1 min-w-[140px]">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Rechercher…"
          className="w-full pl-7 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-200 bg-slate-50"
        />
      </div>

      {/* Role filter */}
      <div className="relative">
        <button
          onClick={() => setShowRoleFilter(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            activeRoles.length > 0
              ? 'bg-teal-50 border-teal-300 text-teal-700'
              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Filter size={12} />
          Rôles
          {activeRoles.length > 0 && (
            <span className="bg-teal-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-bold">
              {activeRoles.length}
            </span>
          )}
        </button>

        {showRoleFilter && (
          <div className="absolute top-full right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl p-3 z-50 min-w-[160px]">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Filtrer par rôle</p>
            {ROLES.map(({ value, label, color }) => (
              <label key={value} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-slate-50 rounded px-1">
                <input
                  type="checkbox"
                  checked={activeRoles.includes(value)}
                  onChange={() => toggleRole(value)}
                  className="rounded border-slate-300 w-3.5 h-3.5"
                />
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs text-slate-700">{label}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Count + clear */}
      {hasFilters && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">
            {filteredCount}/{totalCount}
          </span>
          <button
            onClick={clearFilters}
            className="text-xs text-slate-400 hover:text-slate-600 underline"
          >
            Réinitialiser
          </button>
        </div>
      )}
    </div>
  )
}
