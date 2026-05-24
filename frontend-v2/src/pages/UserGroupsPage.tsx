import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, Plus, MoreVertical, Trash2, Edit2, UserPlus, Search, X } from 'lucide-react'
import { groupsApi } from '../api/groups'
import { usersApi } from '../api/users'
import { useAuth } from '../contexts/AuthContext'
import { toast } from '../hooks/useToast'
import type { UserGroup, User } from '../types'

const GROUP_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-purple-100 text-purple-700',
  'bg-green-100 text-green-700',
  'bg-orange-100 text-orange-700',
  'bg-pink-100 text-pink-700',
  'bg-teal-100 text-teal-700',
]

function groupColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return GROUP_COLORS[Math.abs(hash) % GROUP_COLORS.length]
}

function GroupInitials({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/)
  const initials = parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase()
  return (
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ${groupColor(name)}`}>
      {initials}
    </div>
  )
}

function GroupActionMenu({
  onEdit,
  onManageMembers,
  onDelete,
}: {
  onEdit: () => void
  onManageMembers: () => void
  onDelete: () => void
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

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
        aria-label="Actions groupe"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-20 bg-white rounded-lg shadow-lg border border-slate-100 w-44 py-1">
          <button
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 w-full text-left"
            onClick={() => { setOpen(false); onEdit() }}
          >
            <Edit2 className="w-4 h-4" /> Modifier
          </button>
          <button
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 w-full text-left"
            onClick={() => { setOpen(false); onManageMembers() }}
          >
            <UserPlus className="w-4 h-4" /> Gérer membres
          </button>
          <button
            className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
            onClick={() => { setOpen(false); onDelete() }}
          >
            <Trash2 className="w-4 h-4" /> Supprimer
          </button>
        </div>
      )}
    </div>
  )
}

function GroupFormModal({
  group,
  onClose,
  onSave,
  isPending,
}: {
  group?: UserGroup | null
  onClose: () => void
  onSave: (data: { name: string; description?: string }) => void
  isPending: boolean
}) {
  const [name, setName] = useState(group?.name ?? '')
  const [description, setDescription] = useState(group?.description ?? '')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    onSave({ name: name.trim(), description: description.trim() || undefined })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">
            {group ? 'Modifier le groupe' : 'Nouveau groupe'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nom *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              autoFocus
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              placeholder="Nom du groupe"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none resize-none"
              placeholder="Description optionnelle"
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isPending || !name.trim()}
              className="px-4 py-2 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isPending ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

type GroupMember = Pick<User, '_id' | 'firstName' | 'lastName' | 'email' | 'role'>

function ManageMembersModal({
  group,
  onClose,
  onAddMember,
  onRemoveMember,
}: {
  group: UserGroup
  onClose: () => void
  onAddMember: (userId: string) => void
  onRemoveMember: (userId: string) => void
}) {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const { data: searchResults, isLoading: searching } = useQuery({
    queryKey: ['users-search', debouncedSearch],
    queryFn: () =>
      usersApi.getUsers({ q: debouncedSearch, limit: 10 }).then(r => r.data),
    enabled: debouncedSearch.length >= 2,
  })

  const memberIds = new Set(group.members.map(m => m._id))

  const filteredResults = (searchResults?.data ?? []).filter(
    u => !memberIds.has(u._id ?? u.id ?? '')
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">
            Gérer les membres — {group.name}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current members */}
        <div className="mb-4">
          <p className="text-sm font-medium text-slate-700 mb-2">
            Membres actuels ({group.members.length})
          </p>
          {group.members.length === 0 ? (
            <p className="text-sm text-slate-400 italic">Aucun membre</p>
          ) : (
            <ul className="space-y-1 max-h-40 overflow-y-auto">
              {group.members.map(m => (
                <li key={m._id} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 text-xs font-semibold flex items-center justify-center">
                      {(m.firstName?.[0] ?? '') + (m.lastName?.[0] ?? '')}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{m.firstName} {m.lastName}</p>
                      <p className="text-xs text-slate-400">{m.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => onRemoveMember(m._id)}
                    className="text-slate-400 hover:text-red-500 transition p-1"
                    aria-label={`Retirer ${m.firstName}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Search to add */}
        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">Ajouter des membres</p>
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher un utilisateur..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm w-full focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
          </div>
          {debouncedSearch.length >= 2 && (
            <ul className="space-y-1 max-h-40 overflow-y-auto">
              {searching && (
                <li className="text-sm text-slate-400 text-center py-2">Recherche...</li>
              )}
              {!searching && filteredResults.length === 0 && (
                <li className="text-sm text-slate-400 text-center py-2">Aucun résultat</li>
              )}
              {filteredResults.map(u => (
                <li
                  key={u.id ?? u._id}
                  className="flex items-center justify-between px-3 py-2 hover:bg-slate-50 rounded-lg cursor-pointer"
                  onClick={() => onAddMember(u._id ?? u.id ?? '')}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 text-xs font-semibold flex items-center justify-center">
                      {(u.firstName?.[0] ?? '') + (u.lastName?.[0] ?? '')}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{u.firstName} {u.lastName}</p>
                      <p className="text-xs text-slate-400">{u.email}</p>
                    </div>
                  </div>
                  <button
                    className="text-primary-500 hover:text-primary-700 transition p-1"
                    aria-label={`Ajouter ${u.firstName}`}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {debouncedSearch.length < 2 && debouncedSearch.length > 0 && (
            <p className="text-xs text-slate-400 mt-1">Saisissez au moins 2 caractères pour rechercher</p>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-100 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}

function GroupCard({
  group,
  canManage,
  onEdit,
  onManageMembers,
  onDelete,
}: {
  group: UserGroup
  canManage: boolean
  onEdit: (g: UserGroup) => void
  onManageMembers: (g: UserGroup) => void
  onDelete: (g: UserGroup) => void
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <GroupInitials name={group.name} />
          <div>
            <h3 className="text-base font-semibold text-slate-900">{group.name}</h3>
            {group.description && (
              <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">{group.description}</p>
            )}
          </div>
        </div>
        {canManage && (
          <GroupActionMenu
            onEdit={() => onEdit(group)}
            onManageMembers={() => onManageMembers(group)}
            onDelete={() => onDelete(group)}
          />
        )}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
            <Users className="w-3.5 h-3.5" />
            {group.members.length} membre{group.members.length !== 1 ? 's' : ''}
          </span>
        </div>
        <span className="text-xs text-slate-400">
          {new Date(group.createdAt).toLocaleDateString('fr-FR')}
        </span>
      </div>
      {group.members.length > 0 && (
        <div className="flex -space-x-2">
          {group.members.slice(0, 5).map(m => (
            <div
              key={m._id}
              title={`${m.firstName} ${m.lastName}`}
              className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 text-xs font-semibold flex items-center justify-center ring-2 ring-white"
            >
              {(m.firstName?.[0] ?? '') + (m.lastName?.[0] ?? '')}
            </div>
          ))}
          {group.members.length > 5 && (
            <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-500 text-xs font-semibold flex items-center justify-center ring-2 ring-white">
              +{group.members.length - 5}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function UserGroupsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const canManage = user?.role === 'admin' || user?.role === 'hr'

  const [formModal, setFormModal] = useState<{ open: boolean; group?: UserGroup | null }>({ open: false })
  const [membersModal, setMembersModal] = useState<UserGroup | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<UserGroup | null>(null)

  const { data: groups, isLoading, isError, refetch } = useQuery<UserGroup[]>({
    queryKey: ['groups'],
    queryFn: () => groupsApi.list().then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description?: string }) => groupsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      setFormModal({ open: false })
      toast.success('Groupe créé', 'Le groupe a été créé avec succès.')
    },
    onError: () => toast.error('Erreur', 'Impossible de créer le groupe.'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; description?: string } }) =>
      groupsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      setFormModal({ open: false })
      toast.success('Groupe modifié', 'Le groupe a été mis à jour.')
    },
    onError: () => toast.error('Erreur', 'Impossible de modifier le groupe.'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => groupsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      setDeleteConfirm(null)
      toast.success('Groupe supprimé', 'Le groupe a été supprimé.')
    },
    onError: () => toast.error('Erreur', 'Impossible de supprimer le groupe.'),
  })

  const membersMutation = useMutation({
    mutationFn: ({ id, action, userIds }: { id: string; action: 'add' | 'remove'; userIds: string[] }) =>
      groupsApi.updateMembers(id, action, userIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
    },
    onError: () => toast.error('Erreur', 'Impossible de modifier les membres.'),
  })

  function handleSaveGroup(data: { name: string; description?: string }) {
    if (formModal.group) {
      updateMutation.mutate({ id: formModal.group._id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  function handleAddMember(groupId: string, userId: string) {
    membersMutation.mutate({ id: groupId, action: 'add', userIds: [userId] })
    // Optimistically update the modal group
    if (membersModal && membersModal._id === groupId) {
      setMembersModal(prev => {
        if (!prev) return prev
        // We'll refresh from the cache after mutation
        return prev
      })
    }
  }

  function handleRemoveMember(groupId: string, userId: string) {
    membersMutation.mutate({ id: groupId, action: 'remove', userIds: [userId] })
  }

  // Keep membersModal in sync with refreshed data
  const currentMembersGroup = membersModal
    ? (groups ?? []).find(g => g._id === membersModal._id) ?? membersModal
    : null

  return (
    <div className="bg-slate-50 min-h-screen p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Groupes d'utilisateurs</h1>
          {groups !== undefined && (
            <p className="text-sm text-slate-500 mt-1">
              {groups.length} groupe{groups.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        {canManage && (
          <button
            onClick={() => setFormModal({ open: true, group: null })}
            className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nouveau groupe
          </button>
        )}
      </div>

      {/* Error state */}
      {isError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
          <span className="text-sm">Erreur lors du chargement des groupes.</span>
          <button onClick={() => refetch()} className="text-sm font-medium underline hover:no-underline">Réessayer</button>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 space-y-3 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-200" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                  <div className="h-3 bg-slate-200 rounded w-1/2" />
                </div>
              </div>
              <div className="h-3 bg-slate-200 rounded w-1/3" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && groups?.length === 0 && (
        <div className="text-center py-20">
          <Users className="w-14 h-14 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-medium text-lg">Aucun groupe créé</p>
          <p className="text-slate-400 text-sm mt-1">Créez votre premier groupe pour organiser vos utilisateurs.</p>
          {canManage && (
            <button
              onClick={() => setFormModal({ open: true, group: null })}
              className="mt-5 inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" /> Créer un groupe
            </button>
          )}
        </div>
      )}

      {/* Groups grid */}
      {!isLoading && (groups?.length ?? 0) > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(groups ?? []).map(group => (
            <GroupCard
              key={group._id}
              group={group}
              canManage={canManage}
              onEdit={g => setFormModal({ open: true, group: g })}
              onManageMembers={g => setMembersModal(g)}
              onDelete={g => setDeleteConfirm(g)}
            />
          ))}
        </div>
      )}

      {/* Create/Edit modal */}
      {formModal.open && (
        <GroupFormModal
          group={formModal.group}
          onClose={() => setFormModal({ open: false })}
          onSave={handleSaveGroup}
          isPending={createMutation.isPending || updateMutation.isPending}
        />
      )}

      {/* Manage members modal */}
      {currentMembersGroup && (
        <ManageMembersModal
          group={currentMembersGroup}
          onClose={() => setMembersModal(null)}
          onAddMember={(userId) => handleAddMember(currentMembersGroup._id, userId)}
          onRemoveMember={(userId) => handleRemoveMember(currentMembersGroup._id, userId)}
        />
      )}

      {/* Delete confirm modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Supprimer le groupe</h3>
            <p className="text-sm text-slate-600 mb-5">
              Êtes-vous sûr de vouloir supprimer <strong>{deleteConfirm.name}</strong> ?
              Cette action est irréversible.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Annuler
              </button>
              <button
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteConfirm._id)}
                className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {deleteMutation.isPending ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
