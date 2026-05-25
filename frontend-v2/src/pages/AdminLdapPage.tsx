import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, XCircle, RefreshCw, Eye } from 'lucide-react'
import { adminApi } from '../api/admin'
import type { LdapConfig } from '../types'
import { queryKeys } from '../lib/queryKeys'

type Tab = 'config' | 'test' | 'preview' | 'sync'

export default function AdminLdapPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('config')
  const [form, setForm] = useState<Partial<LdapConfig>>({})
  const [bindPassword, setBindPassword] = useState('')
  const [testResult, setTestResult] = useState<{ success: boolean; message?: string } | null>(null)
  const [previewData, setPreviewData] = useState<unknown[] | null>(null)
  const [syncResult, setSyncResult] = useState<{ synced: number; errors: number } | null>(null)

  const { data: config, isLoading } = useQuery({
    queryKey: queryKeys.ldapConfig.all,
    queryFn: () => adminApi.getLdapConfig().then(r => r.data),
  })

  useEffect(() => {
    if (config) setForm(config)
  }, [config])

  const saveMut = useMutation({
    mutationFn: (data: Partial<LdapConfig> & { bindPassword?: string }) => adminApi.updateLdapConfig(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.ldapConfig.all }),
  })

  const testMut = useMutation({
    mutationFn: () => adminApi.testLdap(),
    onSuccess: (res) => setTestResult(res.data as { success: boolean; message?: string }),
    onError: () => setTestResult({ success: false, message: 'Connexion échouée' }),
  })

  const previewMut = useMutation({
    mutationFn: () => adminApi.previewLdap(form),
    onSuccess: (res) => setPreviewData((res.data as { users?: unknown[] })?.users ?? (res.data as unknown[])),
  })

  const syncMut = useMutation({
    mutationFn: () => adminApi.syncLdap(),
    onSuccess: (res) => setSyncResult(res.data),
  })

  const tabs: { key: Tab; label: string }[] = [
    { key: 'config', label: 'Config' },
    { key: 'test', label: 'Test' },
    { key: 'preview', label: 'Prévisualisation' },
    { key: 'sync', label: 'Synchronisation' },
  ]

  const inp = 'w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400'

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900 mb-6">Configuration LDAP</h1>

      <div className="flex gap-2 mb-6 border-b border-slate-200">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${tab === t.key ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Config Tab */}
      {tab === 'config' && (
        <div className="bg-white rounded-2xl shadow p-6 max-w-xl">
          {isLoading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 bg-slate-100 rounded-xl animate-pulse" />)}</div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">URL LDAP</label>
                <input className={inp} value={form.url ?? ''} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="ldap://..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Base DN</label>
                <input className={inp} value={form.baseDN ?? ''} onChange={e => setForm(f => ({ ...f, baseDN: e.target.value }))} placeholder="dc=example,dc=com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Bind DN</label>
                <input className={inp} value={form.bindDN ?? ''} onChange={e => setForm(f => ({ ...f, bindDN: e.target.value }))} placeholder="cn=admin,dc=example,dc=com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mot de passe Bind</label>
                <input className={inp} type="password" placeholder="••••••••" value={bindPassword} onChange={e => setBindPassword(e.target.value)} />
                <p className="text-xs text-slate-500 mt-1">Laisser vide pour ne pas modifier</p>
              </div>
              <hr className="border-slate-100" />
              <p className="text-sm font-semibold text-slate-700">Mapping des attributs</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Email', field: 'emailAttr' },
                  { label: 'Prénom', field: 'firstNameAttr' },
                  { label: 'Nom', field: 'lastNameAttr' },
                ].map(({ label, field }) => (
                  <div key={field}>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
                    <input
                      className={inp}
                      value={(form as Record<string, string>)[field] ?? ''}
                      onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                      placeholder={field}
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => saveMut.mutate(bindPassword ? { ...form, bindPassword } : form)}
                  disabled={saveMut.isPending}
                  className="px-4 py-2 text-sm bg-primary-500 text-white rounded-xl hover:bg-primary-600 disabled:opacity-50 transition"
                >
                  {saveMut.isPending ? 'Sauvegarde…' : 'Sauvegarder'}
                </button>
              </div>
              {saveMut.isSuccess && <p className="text-sm text-green-600">Configuration sauvegardée ✓</p>}
            </div>
          )}
        </div>
      )}

      {/* Test Tab */}
      {tab === 'test' && (
        <div className="max-w-md">
          <div className="bg-white rounded-2xl shadow p-6">
            <p className="text-sm text-slate-600 mb-4">Teste la connexion au serveur LDAP avec la configuration actuelle.</p>
            <button
              onClick={() => testMut.mutate()}
              disabled={testMut.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-xl text-sm hover:bg-primary-600 disabled:opacity-50 transition"
            >
              {testMut.isPending ? <><RefreshCw size={16} className="animate-spin" /> Test en cours…</> : 'Tester la connexion'}
            </button>
            {testResult && (
              <div className={`mt-4 p-4 rounded-xl flex items-start gap-3 ${testResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
                {testResult.success ? <CheckCircle size={20} className="text-green-500 flex-shrink-0 mt-0.5" /> : <XCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />}
                <div>
                  <p className={`font-semibold text-sm ${testResult.success ? 'text-green-700' : 'text-red-700'}`}>{testResult.success ? 'Connexion réussie' : 'Connexion échouée'}</p>
                  {testResult.message && <p className="text-xs mt-1 text-slate-600">{testResult.message}</p>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Preview Tab */}
      {tab === 'preview' && (
        <div>
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => previewMut.mutate()}
              disabled={previewMut.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-xl text-sm hover:bg-primary-600 disabled:opacity-50 transition"
            >
              {previewMut.isPending ? <><RefreshCw size={16} className="animate-spin" /> Chargement…</> : <><Eye size={16} /> Charger la prévisualisation</>}
            </button>
          </div>
          {previewData && (
            <div className="bg-white rounded-2xl shadow overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {['Nom', 'Email', 'DN'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(previewData as Record<string, string>[]).slice(0, 50).map((u, i) => (
                    <tr key={u.dn ?? u.mail ?? `row-${i}`} className="hover:bg-slate-50">
                      <td className="px-4 py-3">{u.cn ?? u.name ?? u.displayName ?? '—'}</td>
                      <td className="px-4 py-3">{u.mail ?? u.email ?? '—'}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500 truncate max-w-xs">{u.dn ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Sync Tab */}
      {tab === 'sync' && (
        <div className="max-w-md">
          <div className="bg-white rounded-2xl shadow p-6">
            <p className="text-sm text-slate-600 mb-4">Synchronise les utilisateurs depuis le serveur LDAP vers l'application.</p>
            <button
              onClick={() => syncMut.mutate()}
              disabled={syncMut.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-xl text-sm hover:bg-primary-600 disabled:opacity-50 transition"
            >
              {syncMut.isPending ? <><RefreshCw size={16} className="animate-spin" /> Synchronisation…</> : <><RefreshCw size={16} /> Lancer la synchronisation</>}
            </button>
            {syncResult && (
              <div className="mt-4 p-4 bg-slate-50 rounded-xl">
                <p className="font-semibold text-slate-800 mb-2">Résultat</p>
                <div className="flex gap-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{syncResult.synced}</p>
                    <p className="text-xs text-slate-500">Synchronisés</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-500">{syncResult.errors}</p>
                    <p className="text-xs text-slate-500">Erreurs</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

