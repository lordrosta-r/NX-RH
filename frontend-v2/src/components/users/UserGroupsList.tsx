import { useState, useEffect, useRef } from 'react'
import { MoreVertical, Trash2, Edit2, UserPlus, Users } from 'lucide-react'
import type { UserGroup } from '../../types'

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
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
          <Users className="w-3.5 h-3.5" />
          {group.members.length} membre{group.members.length !== 1 ? 's' : ''}
        </span>
        <span className="text-xs text-slate-500">
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

interface Props {
  groups: UserGroup[]
  isLoading: boolean
  canManage: boolean
  onEdit: (g: UserGroup) => void
  onManageMembers: (g: UserGroup) => void
  onDelete: (g: UserGroup) => void
  onCreateFirst: () => void
}

export function UserGroupsList({
  groups,
  isLoading,
  canManage,
  onEdit,
  onManageMembers,
  onDelete,
  onCreateFirst,
}: Props) {
  if (isLoading) {
    return (
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
    )
  }

  if (groups.length === 0) {
    return (
      <div className="text-center py-20">
        <Users className="w-14 h-14 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-500 font-medium text-lg">Aucun groupe créé</p>
        <p className="text-slate-600 text-sm mt-1">Créez votre premier groupe pour organiser vos utilisateurs.</p>
        {canManage && (
          <button
            onClick={onCreateFirst}
            className="mt-5 inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Créer un groupe
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {groups.map(group => (
        <GroupCard
          key={group._id}
          group={group}
          canManage={canManage}
          onEdit={onEdit}
          onManageMembers={onManageMembers}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}
