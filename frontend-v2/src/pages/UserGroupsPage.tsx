import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { groupsApi } from '../api/groups'
import { useAuth } from '../contexts/AuthContext'
import { toast } from '../hooks/useToast'
import { UserGroupsList, UserGroupFormModal, UserGroupMembersPanel, UserGroupDeleteModal } from '../components/users'
import type { UserGroup } from '../types'
import { queryKeys } from '../lib/queryKeys'

export default function UserGroupsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const canManage = user?.role === 'admin' || user?.role === 'hr'

  const [formModal, setFormModal] = useState<{ open: boolean; group?: UserGroup | null }>({ open: false })
  const [membersModal, setMembersModal] = useState<UserGroup | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<UserGroup | null>(null)

  const { data: groups, isLoading, isError, refetch } = useQuery<UserGroup[]>({
    queryKey: queryKeys.groups.all,
    queryFn: () => groupsApi.list().then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description?: string }) => groupsApi.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: queryKeys.groups.all }); setFormModal({ open: false }); toast.success('Groupe créé', 'Le groupe a été créé avec succès.') },
    onError: () => toast.error('Erreur', 'Impossible de créer le groupe.'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; description?: string } }) => groupsApi.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: queryKeys.groups.all }); setFormModal({ open: false }); toast.success('Groupe modifié', 'Le groupe a été mis à jour.') },
    onError: () => toast.error('Erreur', 'Impossible de modifier le groupe.'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => groupsApi.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: queryKeys.groups.all }); setDeleteConfirm(null); toast.success('Groupe supprimé', 'Le groupe a été supprimé.') },
    onError: () => toast.error('Erreur', 'Impossible de supprimer le groupe.'),
  })

  const membersMutation = useMutation({
    mutationFn: ({ id, action, userIds }: { id: string; action: 'add' | 'remove'; userIds: string[] }) =>
      groupsApi.updateMembers(id, action, userIds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.groups.all }),
    onError: () => toast.error('Erreur', 'Impossible de modifier les membres.'),
  })

  function handleSaveGroup(data: { name: string; description?: string }) {
    if (formModal.group) {
      updateMutation.mutate({ id: formModal.group._id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const currentMembersGroup = membersModal
    ? (groups ?? []).find(g => g._id === membersModal._id) ?? membersModal
    : null

  return (
    <div className="bg-slate-50 min-h-screen p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Groupes d'utilisateurs</h1>
          {groups !== undefined && (
            <p className="text-sm text-slate-500 mt-1">{groups.length} groupe{groups.length !== 1 ? 's' : ''}</p>
          )}
        </div>
        {canManage && (
          <button
            onClick={() => setFormModal({ open: true, group: null })}
            className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Nouveau groupe
          </button>
        )}
      </div>

      {isError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
          <span className="text-sm">Erreur lors du chargement des groupes.</span>
          <button onClick={() => refetch()} className="text-sm font-medium underline hover:no-underline">Réessayer</button>
        </div>
      )}

      <UserGroupsList
        groups={groups ?? []}
        isLoading={isLoading}
        canManage={canManage}
        onEdit={g => setFormModal({ open: true, group: g })}
        onManageMembers={g => setMembersModal(g)}
        onDelete={g => setDeleteConfirm(g)}
        onCreateFirst={() => setFormModal({ open: true, group: null })}
      />

      {formModal.open && (
        <UserGroupFormModal
          group={formModal.group}
          onClose={() => setFormModal({ open: false })}
          onSave={handleSaveGroup}
          isPending={createMutation.isPending || updateMutation.isPending}
        />
      )}

      {currentMembersGroup && (
        <UserGroupMembersPanel
          group={currentMembersGroup}
          onClose={() => setMembersModal(null)}
          onAddMember={(userId) => membersMutation.mutate({ id: currentMembersGroup._id, action: 'add', userIds: [userId] })}
          onRemoveMember={(userId) => membersMutation.mutate({ id: currentMembersGroup._id, action: 'remove', userIds: [userId] })}
        />
      )}

      {deleteConfirm && (
        <UserGroupDeleteModal
          group={deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={() => deleteMutation.mutate(deleteConfirm._id)}
          isPending={deleteMutation.isPending}
        />
      )}
    </div>
  )
}
