import { Search, X } from 'lucide-react'

interface Props {
  searchInput: string
  onSearchChange: (v: string) => void
  roleFilter: string
  onRoleChange: (v: string) => void
  deptFilter: string
  onDeptChange: (v: string) => void
  statusFilter: string
  onStatusChange: (v: string) => void
  departments: string[]
  hasFilters: boolean
  onReset: () => void
}

export function UsersFilterBar({
  searchInput, onSearchChange,
  roleFilter, onRoleChange,
  deptFilter, onDeptChange,
  statusFilter, onStatusChange,
  departments,
  hasFilters, onReset,
}: Props) {
  return (
    <div className="flex items-center gap-3 mb-4 flex-wrap">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Rechercher..."
          value={searchInput}
          onChange={e => onSearchChange(e.target.value)}
          className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white w-64 outline-none"
        />
      </div>

      <select
        value={roleFilter}
        onChange={e => onRoleChange(e.target.value)}
        className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-primary-500 outline-none"
      >
        <option value="">Tous les rôles</option>
        <option value="admin">Admin</option>
        <option value="hr">RH</option>
        <option value="manager">Manager</option>
        <option value="employee">Employé</option>
      </select>

      <select
        value={deptFilter}
        onChange={e => onDeptChange(e.target.value)}
        className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-primary-500 outline-none"
      >
        <option value="">Tous les départements</option>
        {departments.map(d => (
          <option key={d} value={d}>{d}</option>
        ))}
      </select>

      <select
        value={statusFilter}
        onChange={e => onStatusChange(e.target.value)}
        className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-primary-500 outline-none"
      >
        <option value="">Tous les statuts</option>
        <option value="active">Actif</option>
        <option value="inactive">Inactif</option>
      </select>

      {hasFilters && (
        <button
          onClick={onReset}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors bg-white"
        >
          <X className="w-3.5 h-3.5" />
          Réinitialiser
        </button>
      )}
    </div>
  )
}
