import { Link } from 'react-router-dom'
import { Users, Upload, UserPlus } from 'lucide-react'

interface Props {
  total?: number
  role: string
  onImportClick: () => void
}

export function UsersPageHeader({ total, role, onImportClick }: Props) {
  const canManage = role === 'admin' || role === 'hr'

  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Collaborateurs</h1>
        {total !== undefined && (
          <p className="text-sm text-slate-500 mt-1">
            {total} utilisateur{total > 1 ? 's' : ''}
          </p>
        )}
      </div>
      {canManage && (
        <div className="flex items-center gap-2">
          <Link
            to="/users/groups"
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 rounded-md text-sm hover:bg-slate-50 transition"
          >
            <Users size={16} /> Groupes
          </Link>
          <button
            onClick={onImportClick}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 rounded-md text-sm hover:bg-slate-50 transition"
          >
            <Upload size={16} /> Importer CSV
          </button>
          <Link
            to="/users/new"
            className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Nouvel utilisateur
          </Link>
        </div>
      )}
    </div>
  )
}
