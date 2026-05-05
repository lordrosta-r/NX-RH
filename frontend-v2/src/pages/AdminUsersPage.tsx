import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Download, UserX, X } from 'lucide-react'
import { adminApi } from '../api/admin'
import type { User, PaginatedResponse } from '../types'

function SkeletonRow() {
  return (
    <tr>
      {Array.from({ length: 6 }).map((_, i) => (
        <td key={i} className="px-4 py-3"><div className="h-4 bg-slate-200 rounded animate-pulse" /></td>
      ))}
    </tr>
  )
}

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = { admin: 'bg-red-100 text-red-700', hr: 'bg-purple-100 text-purple-700', manager: 'bg-blue-100 text-blue-700', director: 'bg-amber-100 text-amber-700', employee: 'bg-slate-100 text-slate-700' }
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${colors[role] ?? 'bg-slate-100 text-slate-700'}`}>{role}</span>
}

export default function AdminUsersPage() {
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [confirmUser, setConfirmUser] = useState<User | null>(null)
  const [confirmText, setConfirmText] = useState('')

  const { data, isLoading } = useQuery<PaginatedResponse<User>>({
    queryKey: ['admin-users', q],
    queryFn: () => adminApi.getAdminUsers({ q }).then(r => r.data),
  })

  const anonymizeMut = useMutation({
    mutationFn: (id: string) => adminApi.anonymizeUser(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); setConfirmUser(null); setConfirmText('') },
  })

  async function exportGdpr(user: User) {
    const res = await adminApi.exportUserGdpr(user.id)
    const url = URL.createObjectURL(res.data as Blob)
    const a = document.createElement('a')
    a.href = url; a.download = `gdpr-${user.id}.json`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Gestion avancée — RGPD</h1>
      </div>

      <div className="bg-white rounded-2xl shadow p-4 mb-6">
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-sm w-full focus:outline-none focus:ring-2 focus:ring-primary-400"
            placeholder="Rechercher un utilisateur..."
            value={q}
            onChange={e => setQ(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              {['Nom', 'Email', 'Rôle', 'Département', 'Créé le', 'RGPD'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />) :
             !data?.data?.length ? (
               <tr><td colSpan={6} className="px-4 py-16 text-center text-slate-400">Aucun utilisateur trouvé</td></tr>
             ) : data.data.map(user => (
               <tr key={user.id} className="hover:bg-slate-50 transition">
                 <td className="px-4 py-3">
                   <div className="flex items-center gap-2">
                     <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-xs font-bold flex-shrink-0">
                       {user.firstName[0]}{user.lastName[0]}
                     </div>
                     <span className="font-medium text-slate-800">{user.firstName} {user.lastName}</span>
                     {user.gdprAnonymized && <span className="text-xs text-slate-400 italic">(anonymisé)</span>}
                   </div>
                 </td>
                 <td className="px-4 py-3 text-slate-600">{user.email}</td>
                 <td className="px-4 py-3"><RoleBadge role={user.role} /></td>
                 <td className="px-4 py-3 text-slate-500">{user.department ?? '—'}</td>
                 <td className="px-4 py-3 text-slate-500 text-xs">{user.createdAt ? new Date(user.createdAt).toLocaleDateString('fr-FR') : '—'}</td>
                 <td className="px-4 py-3">
                   <div className="flex gap-2">
                     <button onClick={() => exportGdpr(user)} className="flex items-center gap-1 px-2 py-1 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 transition" title="Exporter JSON RGPD">
                       <Download size={13} /> JSON
                     </button>
                     <button
                       onClick={() => { setConfirmUser(user); setConfirmText('') }}
                       disabled={!!user.gdprAnonymized}
                       className="flex items-center gap-1 px-2 py-1 text-xs border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition disabled:opacity-40"
                       title="Anonymiser"
                     >
                       <UserX size={13} /> Anon.
                     </button>
                   </div>
                 </td>
               </tr>
             ))
            }
          </tbody>
        </table>
      </div>

      {/* Confirm anonymize modal */}
      {confirmUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-red-700">Anonymisation RGPD</h2>
              <button onClick={() => setConfirmUser(null)} className="p-1 text-slate-400 hover:text-slate-700"><X size={18} /></button>
            </div>
            <p className="text-sm text-slate-600 mb-2">Vous êtes sur le point d'anonymiser <strong>{confirmUser.firstName} {confirmUser.lastName}</strong>.</p>
            <p className="text-sm text-red-600 mb-4 font-medium">⚠️ Cette action est irréversible. Toutes les données personnelles seront effacées.</p>
            <label className="block text-sm font-medium text-slate-700 mb-1">Saisissez <span className="font-mono font-bold">CONFIRMER</span> pour continuer</label>
            <input
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 mb-4"
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder="CONFIRMER"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmUser(null)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-xl border border-slate-200">Annuler</button>
              <button
                onClick={() => anonymizeMut.mutate(confirmUser.id)}
                disabled={confirmText !== 'CONFIRMER' || anonymizeMut.isPending}
                className="px-4 py-2 text-sm bg-red-500 text-white rounded-xl hover:bg-red-600 disabled:opacity-50 transition"
              >
                {anonymizeMut.isPending ? 'Anonymisation…' : 'Anonymiser'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
