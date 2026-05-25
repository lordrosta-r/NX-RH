import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Download, UserX, X, ShieldOff, AlertTriangle } from 'lucide-react'
import { adminApi } from '../api/admin'
import type { User, PaginatedResponse } from '../types'
import { useAuth } from '../contexts/AuthContext'
import ActionMenu from '../components/ui/ActionMenu'

function SkeletonRow() {
  return (
    <tr>
      {Array.from({ length: 8 }).map((_, i) => (
        <td key={i} className="px-4 py-3"><div className="h-4 bg-slate-200 rounded animate-pulse" /></td>
      ))}
    </tr>
  )
}

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = { admin: 'bg-red-100 text-red-700', hr: 'bg-purple-100 text-purple-700', manager: 'bg-blue-100 text-blue-700', employee: 'bg-slate-100 text-slate-700' }
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${colors[role] ?? 'bg-slate-100 text-slate-700'}`}>{role}</span>
}

function AuthSourceBadge({ source }: { source: string }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${source === 'ldap' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
      {source}
    </span>
  )
}

export default function AdminUsersPage() {
  const qc = useQueryClient()
  const { user: currentUser } = useAuth()
  const [q, setQ] = useState('')
  const [authSourceFilter, setAuthSourceFilter] = useState('')
  const [confirmUser, setConfirmUser] = useState<User | null>(null)
  const [confirmText, setConfirmText] = useState('')
  const [deactivateTarget, setDeactivateTarget] = useState<User | null>(null)

  const isAdminOrHr = currentUser?.role === 'admin' || currentUser?.role === 'hr'

  const { data, isLoading } = useQuery<PaginatedResponse<User>>({
    queryKey: ['admin-users', q, authSourceFilter],
    queryFn: () => adminApi.getAdminUsers({ q, ...(authSourceFilter ? { authSource: authSourceFilter } : {}) }).then(r => r.data),
  })

  const anonymizeMut = useMutation({
    mutationFn: (id: string) => adminApi.anonymizeUser(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); setConfirmUser(null); setConfirmText('') },
  })

  const forceDeactivateMut = useMutation({
    mutationFn: (id: string) => adminApi.forceDeactivateUser(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); setDeactivateTarget(null) },
  })

  async function exportGdpr(user: User) {
    const res = await adminApi.exportUserGdpr(user.id)
    const url = URL.createObjectURL(res.data as Blob)
    const a = document.createElement('a')
    a.href = url; a.download = `gdpr-${user.id}.json`; a.click()
    URL.revokeObjectURL(url)
  }

  const hasOffboarding = data?.data?.some(u => u.offboardingStatus === 'offboarding')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Gestion avancée des utilisateurs</h1>
      </div>

      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2">
        <span className="text-base">🔒</span>
        <p className="text-sm text-blue-800">Les données utilisateur sont soumises au RGPD. Toute anonymisation est irréversible et auditée.</p>
      </div>

      {hasOffboarding && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <p className="text-sm font-medium text-amber-800">Des utilisateurs sont en cours d'offboarding. Vérifiez les dossiers.</p>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow p-4 mb-6 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-sm w-56 focus:outline-none focus:ring-2 focus:ring-primary-400"
            placeholder="Rechercher un utilisateur..."
            value={q}
            onChange={e => setQ(e.target.value)}
          />
        </div>
        <select
          className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          value={authSourceFilter}
          onChange={e => setAuthSourceFilter(e.target.value)}
        >
          <option value="">Toutes sources</option>
          <option value="local">Local</option>
          <option value="ldap">LDAP</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              {['Nom', 'Email', 'Rôle', 'Auth', 'Département', 'Créé le', 'Désactivé le', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />) :
             !data?.data?.length ? (
               <tr><td colSpan={8} className="px-4 py-16 text-center text-slate-600">Aucun utilisateur trouvé</td></tr>
             ) : data.data.map(user => (
               <tr key={user.id} className={`hover:bg-slate-50 transition ${user.offboardingStatus === 'offboarding' ? 'bg-amber-50/40' : ''}`}>
                 <td className="px-4 py-3">
                   <div className="flex items-center gap-2">
                     <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-xs font-bold flex-shrink-0">
                       {user.firstName[0]}{user.lastName[0]}
                     </div>
                     <span className="font-medium text-slate-800">{user.firstName} {user.lastName}</span>
                     {user.gdprAnonymized && <span className="text-xs text-slate-500 italic">(anonymisé)</span>}
                   </div>
                 </td>
                 <td className="px-4 py-3 text-slate-600">{user.email}</td>
                 <td className="px-4 py-3"><RoleBadge role={user.role} /></td>
                 <td className="px-4 py-3"><AuthSourceBadge source={user.authSource} /></td>
                 <td className="px-4 py-3 text-slate-500">{user.department ?? '—'}</td>
                 <td className="px-4 py-3 text-slate-500 text-xs">{user.createdAt ? new Date(user.createdAt).toLocaleDateString('fr-FR') : '—'}</td>
                 <td className="px-4 py-3 text-slate-500 text-xs">
                   {!user.isActive
                     ? (user.deactivatedAt ? new Date(user.deactivatedAt).toLocaleDateString('fr-FR') : '—')
                     : '—'}
                 </td>
                 <td className="px-4 py-3">
                   <ActionMenu
                     align="right"
                     items={[
                       {
                         label: 'Exporter JSON RGPD',
                         icon: <Download size={14} />,
                         onClick: () => exportGdpr(user),
                       },
                       {
                         label: 'Anonymiser RGPD',
                         icon: <UserX size={14} />,
                         onClick: () => { setConfirmUser(user); setConfirmText('') },
                         disabled: !!user.gdprAnonymized,
                         danger: true,
                       },
                       ...(isAdminOrHr ? [{
                         label: 'Forcer désactivation',
                         icon: <ShieldOff size={14} />,
                         onClick: () => setDeactivateTarget(user),
                         disabled: !user.isActive,
                         danger: true,
                         separator: true,
                       }] : []),
                     ]}
                   />
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
              <button onClick={() => setConfirmUser(null)} className="p-1 text-slate-400 hover:text-slate-700" aria-label="Fermer"><X size={18} /></button>
            </div>
            <p className="text-sm text-slate-600 mb-2">Vous êtes sur le point d'anonymiser <strong>{confirmUser.firstName} {confirmUser.lastName}</strong>.</p>
            <p className="text-sm text-red-600 mb-4 font-medium flex items-center gap-1"><AlertTriangle className="w-4 h-4 shrink-0" /> Cette action est irréversible. Toutes les données personnelles seront effacées.</p>
            <label className="block text-sm font-medium text-slate-700 mb-1">Saisissez <span className="font-mono font-bold">CONFIRMER</span> pour continuer</label>
            <input
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 mb-4"
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder="CONFIRMER"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmUser(null)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-md border border-slate-200">Annuler</button>
              <button
                onClick={() => anonymizeMut.mutate(confirmUser.id)}
                disabled={confirmText !== 'CONFIRMER' || anonymizeMut.isPending}
                className="px-4 py-2 text-sm bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 transition"
              >
                {anonymizeMut.isPending ? 'Anonymisation…' : 'Anonymiser'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm force deactivate modal */}
      {deactivateTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">Forcer la désactivation</h2>
              <button onClick={() => setDeactivateTarget(null)} className="p-1 text-slate-400 hover:text-slate-700" aria-label="Fermer"><X size={18} /></button>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              Forcer la désactivation désactivera immédiatement l'accès de{' '}
              <strong>{deactivateTarget.firstName} {deactivateTarget.lastName}</strong>.
            </p>
            <p className="text-sm text-amber-700 font-medium mb-6">Cette action désactivera immédiatement l'accès de cet utilisateur.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeactivateTarget(null)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-md border border-slate-200">Annuler</button>
              <button
                onClick={() => forceDeactivateMut.mutate(deactivateTarget.id)}
                disabled={forceDeactivateMut.isPending}
                className="px-4 py-2 text-sm bg-amber-500 text-white rounded-md hover:bg-amber-600 disabled:opacity-50 transition"
              >
                {forceDeactivateMut.isPending ? 'Désactivation…' : 'Forcer la désactivation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
