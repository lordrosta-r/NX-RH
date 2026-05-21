import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Bell, X } from 'lucide-react'
import { adminApi } from '../api/admin'

export default function HrSettingsPage() {
  const [showConfirm, setShowConfirm] = useState(false)
  const [campaignId, setCampaignId] = useState('')
  const [targetStatuses, setTargetStatuses] = useState<string[]>(['assigned', 'in_progress'])
  const [remindResult, setRemindResult] = useState<string | null>(null)

  const { data: settings, isLoading } = useQuery({
    queryKey: ['hr-settings'],
    queryFn: () => adminApi.getHrSettings().then(r => r.data),
  })

  const updateSettingsMut = useMutation({
    mutationFn: (data: unknown) => adminApi.updateHrSettings(data),
  })

  const bulkRemindMut = useMutation({
    mutationFn: () => adminApi.bulkRemind({ campaignId: campaignId || undefined, targetStatuses }),
    onSuccess: (res) => {
      setRemindResult(`Rappels envoyés (${JSON.stringify(res.data)})`)
      setShowConfirm(false)
    },
    onError: () => {
      setRemindResult("Erreur lors de l'envoi des rappels")
      setShowConfirm(false)
    },
  })

  const statuses = ['assigned', 'in_progress', 'submitted']

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900 mb-6">Paramètres RH</h1>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Card rappels */}
        <div className="bg-white rounded-2xl shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <Bell size={20} className="text-amber-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Rappels groupés</h2>
          </div>
          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ID Campagne (optionnel)</label>
              <input
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                value={campaignId}
                onChange={e => setCampaignId(e.target.value)}
                placeholder="Toutes les campagnes actives"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Statuts cibles</label>
              <div className="flex flex-wrap gap-2">
                {statuses.map(s => (
                  <label key={s} className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={targetStatuses.includes(s)}
                      onChange={e => setTargetStatuses(ts => e.target.checked ? [...ts, s] : ts.filter(x => x !== s))}
                      className="rounded"
                    />
                    <span className="text-slate-700">{s}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          {remindResult && <p className="text-sm text-green-600 mb-3">{remindResult}</p>}
          <button
            onClick={() => setShowConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-md text-sm hover:bg-amber-600 transition"
          >
            <Bell size={16} /> Envoyer rappels groupés
          </button>
        </div>

        {/* Card feature flags */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Paramètres campagnes</h2>
          {isLoading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-8 bg-slate-100 rounded-xl animate-pulse" />)}</div>
          ) : (
            <div className="space-y-3">
              {settings && typeof settings === 'object' && Object.entries(settings as Record<string, unknown>)
                .filter(([, v]) => typeof v === 'boolean')
                .map(([k, v]) => (
                  <label key={k} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 cursor-pointer">
                    <span className="text-sm font-medium text-slate-700">{k}</span>
                    <div
                      className={`w-11 h-6 rounded-full transition-colors cursor-pointer ${v ? 'bg-primary-500' : 'bg-slate-200'}`}
                      onClick={() => updateSettingsMut.mutate({ ...settings as Record<string, unknown>, [k]: !v })}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full shadow mt-0.5 transition-transform ${v ? 'translate-x-5.5' : 'translate-x-0.5'}`} />
                    </div>
                  </label>
                ))
              }
            </div>
          )}
        </div>
      </div>

      {/* Confirm modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">Confirmer l'envoi</h2>
              <button onClick={() => setShowConfirm(false)} className="p-1 text-slate-400 hover:text-slate-700"><X size={18} /></button>
            </div>
            <p className="text-sm text-slate-600 mb-6">Vous allez envoyer des rappels à tous les utilisateurs avec les statuts sélectionnés{campaignId ? ` pour la campagne ${campaignId}` : ''}. Confirmer ?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowConfirm(false)} className="px-4 py-2 text-sm border border-slate-200 text-slate-600 rounded-md hover:bg-slate-50">Annuler</button>
              <button
                onClick={() => bulkRemindMut.mutate()}
                disabled={bulkRemindMut.isPending}
                className="px-4 py-2 text-sm bg-amber-500 text-white rounded-md hover:bg-amber-600 disabled:opacity-50 transition"
              >
                {bulkRemindMut.isPending ? 'Envoi…' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
