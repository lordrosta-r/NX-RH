import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Mail, Pencil, Trash2, X } from 'lucide-react'
import { adminApi } from '../api/admin'

type ConfigKey = { key: string; value: string }

function SkeletonRow() {
  return (
    <tr>
      <td className="px-4 py-3"><div className="h-4 bg-slate-200 rounded w-32 animate-pulse" /></td>
      <td className="px-4 py-3"><div className="h-4 bg-slate-200 rounded w-48 animate-pulse" /></td>
      <td className="px-4 py-3"><div className="h-4 bg-slate-200 rounded w-16 animate-pulse" /></td>
    </tr>
  )
}

export default function AdminConfigPage() {
  const qc = useQueryClient()
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [editingKey, setEditingKey] = useState<ConfigKey | null>(null)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [keyForm, setKeyForm] = useState({ key: '', value: '' })
  const [emailTo, setEmailTo] = useState('')
  const [testResult, setTestResult] = useState<string | null>(null)

  const { data: keys, isLoading } = useQuery({
    queryKey: ['config-keys'],
    queryFn: () => adminApi.getConfigKeys().then(r => r.data),
  })

  const setKeyMut = useMutation({
    mutationFn: ({ key, value }: ConfigKey) => adminApi.setConfigKey(key, value),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['config-keys'] }); setShowKeyModal(false); setEditingKey(null) },
  })

  const deleteKeyMut = useMutation({
    mutationFn: (key: string) => adminApi.deleteConfigKey(key),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['config-keys'] }); setDeleteTarget(null) },
  })

  const testEmailMut = useMutation({
    mutationFn: (to: string) => adminApi.sendTestEmail(to),
    onSuccess: () => { setTestResult('Email envoyé avec succès !'); setEmailTo('') },
    onError: () => setTestResult("Erreur lors de l'envoi."),
  })

  function openNew() {
    setKeyForm({ key: '', value: '' })
    setEditingKey(null)
    setShowKeyModal(true)
  }

  function openEdit(k: ConfigKey) {
    setKeyForm({ key: k.key, value: k.value })
    setEditingKey(k)
    setShowKeyModal(true)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Configuration système</h1>
        <div className="flex gap-3">
          <button onClick={() => { setShowEmailModal(true); setTestResult(null) }} className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition">
            <Mail size={16} /> Email de test
          </button>
          <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-xl text-sm font-medium hover:bg-primary-600 transition">
            <Plus size={16} /> Nouvelle clé
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Clé</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Valeur</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />) :
             !keys?.length ? (
               <tr><td colSpan={3} className="px-4 py-12 text-center text-slate-400">Aucune clé de configuration</td></tr>
             ) : keys.map(k => (
               <tr key={k.key} className="hover:bg-slate-50 transition">
                 <td className="px-4 py-3 font-mono text-slate-800">{k.key}</td>
                 <td className="px-4 py-3 text-slate-600 max-w-xs truncate">
                    {typeof k.value === 'object' && k.value !== null
                      ? JSON.stringify(k.value)
                      : String(k.value ?? '')}
                  </td>
                 <td className="px-4 py-3 text-right flex justify-end gap-2">
                   <button onClick={() => openEdit(k)} className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition"><Pencil size={15} /></button>
                   <button onClick={() => setDeleteTarget(k.key)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"><Trash2 size={15} /></button>
                 </td>
               </tr>
             ))
            }
          </tbody>
        </table>
      </div>

      {/* Modal nouvelle/modifier clé */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">{editingKey ? 'Modifier la clé' : 'Nouvelle clé'}</h2>
              <button onClick={() => setShowKeyModal(false)} className="p-1 text-slate-400 hover:text-slate-700"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Clé</label>
                <input
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 font-mono"
                  value={keyForm.key}
                  onChange={e => setKeyForm(f => ({ ...f, key: e.target.value }))}
                  disabled={!!editingKey}
                  placeholder="ex: SMTP_HOST"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Valeur</label>
                <input
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                  value={keyForm.value}
                  onChange={e => setKeyForm(f => ({ ...f, value: e.target.value }))}
                  placeholder="Valeur"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowKeyModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-xl border border-slate-200">Annuler</button>
              <button
                onClick={() => setKeyMut.mutate(keyForm)}
                disabled={!keyForm.key || setKeyMut.isPending}
                className="px-4 py-2 text-sm bg-primary-500 text-white rounded-xl hover:bg-primary-600 disabled:opacity-50 transition"
              >
                {setKeyMut.isPending ? 'Sauvegarde…' : 'Sauvegarder'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal email de test */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">Email de test</h2>
              <button onClick={() => setShowEmailModal(false)} className="p-1 text-slate-400 hover:text-slate-700"><X size={18} /></button>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Adresse destinataire</label>
              <input
                type="email"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                value={emailTo}
                onChange={e => setEmailTo(e.target.value)}
                placeholder="admin@example.com"
              />
            </div>
            {testResult && (
              <p className={`mt-3 text-sm ${testResult.includes('succès') ? 'text-green-600' : 'text-red-600'}`}>{testResult}</p>
            )}
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowEmailModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-xl border border-slate-200">Fermer</button>
              <button
                onClick={() => testEmailMut.mutate(emailTo)}
                disabled={!emailTo || testEmailMut.isPending}
                className="px-4 py-2 text-sm bg-primary-500 text-white rounded-xl hover:bg-primary-600 disabled:opacity-50 transition"
              >
                {testEmailMut.isPending ? 'Envoi…' : 'Envoyer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-2">Supprimer la clé</h2>
            <p className="text-sm text-slate-600 mb-6">Supprimer <span className="font-mono font-semibold">{deleteTarget}</span> ?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-xl border border-slate-200">Annuler</button>
              <button
                onClick={() => deleteKeyMut.mutate(deleteTarget)}
                disabled={deleteKeyMut.isPending}
                className="px-4 py-2 text-sm bg-red-500 text-white rounded-xl hover:bg-red-600 disabled:opacity-50 transition"
              >
                {deleteKeyMut.isPending ? 'Suppression…' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

