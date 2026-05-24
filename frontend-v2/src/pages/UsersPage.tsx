import { useState, useEffect, useRef } from 'react'
import { useDebounce } from '../hooks/useDebounce'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { Search, UserPlus, MoreVertical, Users, Plus, ChevronLeft, ChevronRight, X, AlertTriangle, Upload } from 'lucide-react'
import EmptyState from '../components/ui/EmptyState'
import { useAuth } from '../contexts/AuthContext'
import { usersApi } from '../api/users'
import { toast } from '../hooks/useToast'
import { exportToCsv } from '../utils/export'
import type { User } from '../types'

const PER_PAGE = 20

const ROLE_BADGES: Record<string, string> = {
  admin: 'bg-error-50 text-error-700',
  hr: 'bg-warning-50 text-warning-700',
  manager: 'bg-primary-50 text-primary-700',
  employee: 'bg-slate-100 text-slate-700',
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  hr: 'RH',
  manager: 'Manager',
  employee: 'Employé',
}

function StatusBadge({ isActive, offboarding }: { isActive: boolean; offboarding?: boolean }) {
  if (offboarding)
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-warning-50 text-warning-700">Offboarding</span>
  if (isActive)
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-success-50 text-success-700">● Actif</span>
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">Inactif</span>
}

function Avatar({ user }: { user: User }) {
  const initials = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
  return (
    <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 text-xs font-semibold flex items-center justify-center flex-shrink-0">
      {initials}
    </div>
  )
}

function RelativeDate({ date }: { date?: string }) {
  if (!date) return <span className="text-xs text-slate-400">—</span>
  const diff = Date.now() - new Date(date).getTime()
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor(diff / 3600000)
  const minutes = Math.floor(diff / 60000)
  let label: string
  if (days > 30) label = new Date(date).toLocaleDateString('fr-FR')
  else if (days >= 2) label = `il y a ${days}j`
  else if (days === 1) label = 'hier'
  else if (hours >= 1) label = `il y a ${hours}h`
  else if (minutes >= 1) label = `il y a ${minutes}min`
  else label = "à l'instant"
  return <span className="text-xs text-slate-400">{label}</span>
}

function ActionMenu({ user: u, currentRole, onOffboard, onAnonymize }: {
  user: User
  currentRole: string
  onOffboard: (id: string) => void
  onAnonymize: (user: User) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const canEdit = currentRole === 'admin' || currentRole === 'hr'
  const canAnonymize = currentRole === 'admin'

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="Actions utilisateur"
        className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-20 bg-white rounded-lg shadow-lg border border-slate-100 w-44 py-1">
          <Link
            to={`/users/${u.id}`}
            className="flex items-center px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 w-full"
            onClick={() => setOpen(false)}
          >
            Voir le profil
          </Link>
          {canEdit && (
            <Link
              to={`/users/${u.id}/edit`}
              className="flex items-center px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 w-full"
              onClick={() => setOpen(false)}
            >
              Modifier
            </Link>
          )}
          {canEdit && (
            <button
              className="flex items-center px-3 py-2 text-sm text-warning-700 hover:bg-warning-50 w-full text-left"
              onClick={() => { setOpen(false); onOffboard(u.id) }}
            >
              Offboarding
            </button>
          )}
          {canAnonymize && (
            <button
              className="flex items-center px-3 py-2 text-sm text-error-700 hover:bg-error-50 w-full text-left"
              onClick={() => { setOpen(false); onAnonymize(u) }}
            >
              Anonymiser
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b border-slate-50">
          <td className="px-4 py-4"><div className="w-4 h-4 bg-slate-200 rounded animate-pulse" /></td>
          <td className="px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-slate-200 animate-pulse" />
              <div className="h-4 bg-slate-200 rounded w-32 animate-pulse" />
            </div>
          </td>
          <td className="px-6 py-4"><div className="h-5 bg-slate-200 rounded-full w-20 animate-pulse" /></td>
          <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-24 animate-pulse" /></td>
          <td className="px-6 py-4"><div className="h-5 bg-slate-200 rounded-full w-16 animate-pulse" /></td>
          <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-20 animate-pulse" /></td>
          <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-6 animate-pulse" /></td>
        </tr>
      ))}
    </>
  )
}

export default function UsersPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [searchInput, setSearchInput] = useState('')
  const search = useDebounce(searchInput, 400)
  const [roleFilter, setRoleFilter] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)

  const [anonymizeModal, setAnonymizeModal] = useState<User | null>(null)
  const [confirmText, setConfirmText] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // Reset page when debounced search changes
  useEffect(() => { setPage(1) }, [search])

  // Reset page on filter change
  useEffect(() => { setPage(1) }, [roleFilter, deptFilter, statusFilter])

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['users', search, roleFilter, deptFilter, statusFilter, page],
    queryFn: () =>
      usersApi.getUsers({
        q: search || undefined,
        role: roleFilter || undefined,
        department: deptFilter || undefined,
        isActive:
          statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined,
        page,
        limit: PER_PAGE,
      }).then(r => r.data),
    placeholderData: keepPreviousData,
  })

  // Departments derived from current result set
  const departments = Array.from(
    new Set((data?.data ?? []).map(u => u.department).filter(Boolean))
  ) as string[]

  const offboardMutation = useMutation({
    mutationFn: (id: string) => usersApi.offboard(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
    onError: () => toast.error('Erreur lors de l\'offboarding', 'Veuillez réessayer.'),
  })

  const anonymizeMutation = useMutation({
    mutationFn: (id: string) => usersApi.anonymize(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setAnonymizeModal(null)
      setConfirmText('')
    },
    onError: () => toast.error('Erreur lors de l\'anonymisation', 'Veuillez réessayer.'),
  })

  function handleAnonymize() {
    if (anonymizeModal) anonymizeMutation.mutate(anonymizeModal.id)
  }

  function handleBulkDeactivate() {
    usersApi.bulkAction({ action: 'deactivate', userIds: [...selected] })
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['users'] })
        setSelected(new Set())
        toast.success('Utilisateurs désactivés', `${selected.size} utilisateur(s) désactivé(s).`)
      })
      .catch(() => toast.error('Erreur', 'Impossible de désactiver les utilisateurs.'))
  }

  function handleBulkExport() {
    const allUsers = data?.data ?? []
    const selectedUsers = allUsers.filter(u => selected.has(u.id ?? ''))
    exportToCsv('users-export.csv', selectedUsers.map(u => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      role: u.role,
      department: u.department ?? '',
      isActive: u.isActive,
    })))
  }

  function toggleSelectAll() {
    const allIds = (data?.data ?? []).map(u => u.id ?? '')
    if (allIds.every(id => selected.has(id))) {
      setSelected(new Set())
    } else {
      setSelected(new Set(allIds))
    }
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const hasFilters = !!(search || roleFilter || deptFilter || statusFilter)

  function resetFilters() {
    setSearchInput('')
    setRoleFilter('')
    setDeptFilter('')
    setStatusFilter('')
    setPage(1)
  }

  const totalPages = data?.totalPages ?? Math.ceil((data?.total ?? 0) / PER_PAGE)

  // Pagination pages array (max 5 visible)
  function getPageNumbers() {
    const total = totalPages
    if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1)
    if (page <= 3) return [1, 2, 3, 4, 5]
    if (page >= total - 2) return [total - 4, total - 3, total - 2, total - 1, total]
    return [page - 2, page - 1, page, page + 1, page + 2]
  }

  return (
    <div className="bg-slate-50 min-h-screen p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Collaborateurs</h1>
          {data?.total !== undefined && (
            <p className="text-sm text-slate-500 mt-1">
              {data.total} utilisateur{data.total > 1 ? 's' : ''}
            </p>
          )}
        </div>
        {(user?.role === 'admin' || user?.role === 'hr') && (
          <div className="flex items-center gap-2">
            <Link
              to="/users/groups"
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 rounded-md text-sm hover:bg-slate-50 transition"
            >
              <Users size={16} /> Groupes
            </Link>
            <Link
              to="/admin/users/import"
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 rounded-md text-sm hover:bg-slate-50 transition"
            >
              <Upload size={16} /> Importer CSV
            </Link>
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

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white w-64 outline-none"
          />
        </div>

        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
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
          onChange={e => setDeptFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-primary-500 outline-none"
        >
          <option value="">Tous les départements</option>
          {departments.map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-primary-500 outline-none"
        >
          <option value="">Tous les statuts</option>
          <option value="active">Actif</option>
          <option value="inactive">Inactif</option>
        </select>

        {hasFilters && (
          <button
            onClick={resetFilters}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors bg-white"
          >
            <X className="w-3.5 h-3.5" />
            Réinitialiser
          </button>
        )}
      </div>

      {/* Error state */}
      {isError && (
        <div className="bg-error-50 border border-error-200 text-error-700 rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
          <span className="text-sm">Erreur lors du chargement des utilisateurs.</span>
          <button
            onClick={() => refetch()}
            className="text-sm font-medium underline hover:no-underline"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={(data?.data ?? []).length > 0 && (data?.data ?? []).every(u => selected.has(u.id ?? ''))}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300 text-primary-500 focus:ring-primary-500"
                    aria-label="Tout sélectionner"
                  />
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">Nom</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">Rôle</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">Département</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">Statut</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">Dernière connexion</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonRows />
              ) : data?.data?.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      icon={<Users className="w-8 h-8" />}
                      title="Aucun collaborateur trouvé"
                      description="Aucun utilisateur ne correspond à vos critères de recherche."
                      action={(user?.role === 'admin' || user?.role === 'hr') ? {
                        label: 'Créer le premier collaborateur',
                        onClick: () => window.location.assign('/users/new'),
                      } : undefined}
                    />
                  </td>
                </tr>
              ) : (
                (data?.data ?? []).map(u => (
                  <tr
                    key={u.id ?? u.email}
                    className="hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                  >
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selected.has(u.id ?? '')}
                        onChange={() => toggleSelect(u.id ?? '')}
                        className="rounded border-slate-300 text-primary-500 focus:ring-primary-500"
                        aria-label={`Sélectionner ${u.firstName} ${u.lastName}`}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <Link to={`/users/${u.id}`} className="flex items-center gap-3 group">
                        <Avatar user={u} />
                        <div>
                          <p className="text-sm font-medium text-slate-900 group-hover:text-primary-600 transition-colors">
                            {u.firstName} {u.lastName}
                          </p>
                          <p className="text-xs text-slate-400">{u.email}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_BADGES[u.role] ?? 'bg-slate-100 text-slate-700'}`}>
                        {ROLE_LABELS[u.role] ?? u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{u.department ?? '—'}</td>
                    <td className="px-6 py-4">
                      <StatusBadge isActive={u.isActive} />
                    </td>
                    <td className="px-6 py-4">
                      <RelativeDate date={u.updatedAt} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <ActionMenu
                        user={u}
                        currentRole={user?.role ?? ''}
                        onOffboard={(id) => offboardMutation.mutate(id)}
                        onAnonymize={(target) => { setAnonymizeModal(target); setConfirmText('') }}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
            <p className="text-sm text-slate-500">
              Page {page} sur {totalPages} · {data?.total} utilisateurs
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                aria-label="Page précédente"
                className="px-2 py-1 text-sm border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {getPageNumbers().map(n => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`px-3 py-1 text-sm border rounded transition-colors ${
                    n === page
                      ? 'bg-primary-500 text-white border-primary-500'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                aria-label="Page suivante"
                className="px-2 py-1 text-sm border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Action Bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white rounded-xl px-6 py-3 flex items-center gap-4 shadow-xl z-50">
          <span className="text-sm">{selected.size} sélectionné(s)</span>
          <button onClick={handleBulkDeactivate} className="text-sm bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-md">Désactiver</button>
          <button onClick={handleBulkExport} className="text-sm bg-blue-500 hover:bg-blue-600 px-3 py-1.5 rounded-md">Exporter CSV</button>
          <button onClick={() => setSelected(new Set())} className="text-slate-400 hover:text-white ml-2"><X size={16} /></button>
        </div>
      )}

      {/* Anonymize Modal */}
      {anonymizeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Anonymiser les données</h3>
            <p className="text-sm text-slate-600 mb-4">
              <span className="inline-flex items-center gap-1"><AlertTriangle className="w-4 h-4 text-warning-500 shrink-0" /> Cette action est irréversible.</span> Les données personnelles de{' '}
              <strong>{anonymizeModal.firstName} {anonymizeModal.lastName}</strong> seront
              définitivement anonymisées conformément au RGPD.
            </p>
            <p className="text-sm text-slate-600 mb-2">
              Saisissez <strong>CONFIRMER</strong> pour valider :
            </p>
            <input
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-4 focus:ring-2 focus:ring-error-500 focus:border-error-500 outline-none"
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder="CONFIRMER"
              autoFocus
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setAnonymizeModal(null); setConfirmText('') }}
                className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Annuler
              </button>
              <button
                disabled={confirmText !== 'CONFIRMER' || anonymizeMutation.isPending}
                onClick={handleAnonymize}
                className="px-4 py-2 text-sm bg-error-500 text-white rounded-lg hover:bg-error-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {anonymizeMutation.isPending ? 'En cours...' : 'Anonymiser définitivement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

