import { useState } from 'react'
import { Search, X, Plus } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { usersApi } from '../../api/users'
import { useDebounce } from '../../hooks/useDebounce'
import type { UserGroup } from '../../types'

interface Props {
  group: UserGroup
  onClose: () => void
  onAddMember: (userId: string) => void
  onRemoveMember: (userId: string) => void
}

export function UserGroupMembersPanel({ group, onClose, onAddMember, onRemoveMember }: Props) {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 400)

  const { data: searchResults, isLoading: searching } = useQuery({
    queryKey: ['users-search', debouncedSearch],
    queryFn: () => usersApi.getUsers({ q: debouncedSearch, limit: 10 }).then(r => r.data),
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
                    onClick={() => onRemoveMember(m._id ?? '')}
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
