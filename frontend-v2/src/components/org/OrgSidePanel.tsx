import { X, Mail, Building2, Users, ChevronRight, Save, ExternalLink } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { orgApi } from '../../api/org'
import type { OrgNodeData } from '../../hooks/useOrgLayout'
import type { Role } from '../../types'

const ROLE_OPTIONS: { value: Role; label: string; color: string }[] = [
  { value: 'admin',    label: 'Admin',      color: '#0D9488' },
  { value: 'hr',       label: 'RH',         color: '#059669' },
  { value: 'manager',  label: 'Manager',    color: '#2563EB' },
  { value: 'employee', label: 'Employé',    color: '#64748B' },
]

interface OrgSidePanelProps {
  person: OrgNodeData
  canEdit: boolean
  onClose: () => void
  onNavigateTo: (id: string) => void
  sectors?: { _id?: string; id?: string; name: string }[]
  allUsers?: OrgNodeData[]
}

export default function OrgSidePanel({
  person,
  canEdit,
  onClose,
  onNavigateTo,
  sectors = [],
  allUsers = [],
}: OrgSidePanelProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [editRole, setEditRole] = useState<Role>(person.role)
  const [editSectorId, setEditSectorId] = useState<string>(person.sectorId ?? '')
  const [editManagerId, setEditManagerId] = useState<string>(person.managerId ?? '')
  const [managerSearch, setManagerSearch] = useState('')
  const [dirty, setDirty] = useState(false)

  // Reset on person change
  useEffect(() => {
    setEditRole(person.role)
    setEditSectorId(person.sectorId ?? '')
    setEditManagerId(person.managerId ?? '')
    setDirty(false)
  }, [person.id])

  const mutation = useMutation({
    mutationFn: () =>
      orgApi.patchOrgUser(person.id, {
        role: editRole !== person.role ? editRole : undefined,
        sectorId: editSectorId !== (person.sectorId ?? '') ? editSectorId || null : undefined,
        managerId: editManagerId !== (person.managerId ?? '') ? editManagerId || null : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org'] })
      setDirty(false)
    },
  })

  const filteredManagers = allUsers.filter(u => {
    if (u.id === person.id) return false
    const name = `${u.firstName} ${u.lastName}`.toLowerCase()
    return !managerSearch || name.includes(managerSearch.toLowerCase())
  }).slice(0, 8)

  const currentManager = allUsers.find(u => u.id === (editManagerId || person.managerId))

  return (
    <div className="absolute right-0 top-0 h-full w-80 bg-white shadow-2xl border-l border-slate-200 z-20 flex flex-col animate-[slideInRight_0.2s_ease]">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-base flex-shrink-0"
            style={{ backgroundColor: person.color }}
          >
            {person.initials}
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 text-sm leading-tight">
              {person.firstName} {person.lastName}
            </h3>
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: person.color }}
            >
              {ROLE_OPTIONS.find(r => r.value === person.role)?.label ?? person.role}
            </span>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 mt-0.5">
          <X size={16} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Info section */}
        <div className="space-y-2">
          {person.email && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Mail size={14} className="text-slate-400 flex-shrink-0" />
              <span className="truncate">{person.email}</span>
            </div>
          )}
          {person.department && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Building2 size={14} className="text-slate-400 flex-shrink-0" />
              <span>{person.department}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Users size={14} className="text-slate-400 flex-shrink-0" />
            <span>{person.reportCount} reporté{person.reportCount !== 1 ? 's' : ''} direct{person.reportCount !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Manager */}
        {currentManager && !canEdit && (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Manager direct</p>
            <button
              onClick={() => onNavigateTo(currentManager.id)}
              className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-slate-50 text-left group"
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ backgroundColor: currentManager.color }}
              >
                {currentManager.initials}
              </div>
              <span className="text-sm text-slate-700 flex-1">{currentManager.firstName} {currentManager.lastName}</span>
              <ChevronRight size={14} className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>
        )}

        {/* Edit section (admin/hr only) */}
        {canEdit && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Modifier</p>

            {/* Role */}
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Rôle</label>
              <select
                value={editRole}
                onChange={e => { setEditRole(e.target.value as Role); setDirty(true) }}
                className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-200"
              >
                {ROLE_OPTIONS.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            {/* Sector */}
            {sectors.length > 0 && (
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Secteur</label>
                <select
                  value={editSectorId}
                  onChange={e => { setEditSectorId(e.target.value); setDirty(true) }}
                  className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-200"
                >
                  <option value="">— Aucun secteur —</option>
                  {sectors.map(s => (
                    <option key={s._id ?? s.id} value={s._id ?? s.id ?? ''}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Manager */}
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Manager direct</label>
              <input
                type="text"
                placeholder="Rechercher un manager…"
                value={managerSearch}
                onChange={e => setManagerSearch(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 mb-1.5 focus:outline-none focus:ring-2 focus:ring-teal-200"
              />
              <div className="border border-slate-200 rounded-lg overflow-hidden max-h-36 overflow-y-auto">
                <button
                  onClick={() => { setEditManagerId(''); setDirty(true) }}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 ${!editManagerId ? 'bg-teal-50 text-teal-700' : 'text-slate-500'}`}
                >
                  — Aucun manager —
                </button>
                {filteredManagers.map(u => (
                  <button
                    key={u.id}
                    onClick={() => { setEditManagerId(u.id); setDirty(true) }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-slate-50 ${editManagerId === u.id ? 'bg-teal-50' : ''}`}
                  >
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
                      style={{ backgroundColor: u.color }}
                    >
                      {u.initials}
                    </div>
                    <span className="text-slate-700">{u.firstName} {u.lastName}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-100 space-y-2">
        {canEdit && dirty && (
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium py-2 rounded-lg transition-colors disabled:opacity-60"
          >
            <Save size={14} />
            {mutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        )}
        {mutation.isError && (
          <p className="text-xs text-red-600 text-center">Erreur lors de la sauvegarde</p>
        )}
        <button
          onClick={() => navigate(`/users/${person.id}`)}
          className="w-full flex items-center justify-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <ExternalLink size={13} />
          Voir le profil
        </button>
      </div>
    </div>
  )
}
