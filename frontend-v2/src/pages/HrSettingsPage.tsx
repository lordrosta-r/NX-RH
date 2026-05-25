import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, X } from 'lucide-react'
import { adminApi } from '../api/admin'
import { queryKeys } from '../lib/queryKeys'

type CampaignSettings = {
  allow_self_evaluation: boolean
  require_manager_signature: boolean
  send_completion_email: boolean
  auto_close_days: number
}

export default function HrSettingsPage() {
  const [showConfirm, setShowConfirm] = useState(false)
  const [campaignId, setCampaignId] = useState('')
  const [targetStatuses, setTargetStatuses] = useState<string[]>(['assigned', 'in_progress'])
  const [remindResult, setRemindResult] = useState<string | null>(null)
  const [autoCloseDays, setAutoCloseDays] = useState<number>(0)
  const qc = useQueryClient()

  const { data: campaignSettings, isLoading: settingsLoading } = useQuery<CampaignSettings>({
    queryKey: queryKeys.campaignSettings.all,
    queryFn: () => adminApi.getHrSettings().then(r => r.data as CampaignSettings),
  })

  useEffect(() => {
    if (campaignSettings?.auto_close_days != null) {
      setAutoCloseDays(campaignSettings.auto_close_days)
    }
  }, [campaignSettings?.auto_close_days])

  const updateSettings = useMutation({
    mutationFn: (data: Partial<CampaignSettings>) => adminApi.updateHrSettings(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.campaignSettings.all }),
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
              <label htmlFor="hr-campaign-id" className="block text-sm font-medium text-slate-700 mb-1">ID Campagne (optionnel)</label>
              <input
                id="hr-campaign-id"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                value={campaignId}
                onChange={e => setCampaignId(e.target.value)}
                placeholder="Toutes les campagnes actives"
              />
            </div>
            <fieldset>
              <legend className="block text-sm font-medium text-slate-700 mb-2">Statuts cibles</legend>
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
            </fieldset>
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
          {settingsLoading ? (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-8 bg-slate-100 rounded-xl animate-pulse" />)}</div>
          ) : (
            <div className="space-y-3">
              {(
                [
                  { key: 'allow_self_evaluation',      label: 'Auto-évaluation autorisée' },
                  { key: 'require_manager_signature',  label: 'Signature manager obligatoire' },
                  { key: 'send_completion_email',      label: 'Email de clôture automatique' },
                ] as const
              ).map(({ key, label }) => {
                const val = campaignSettings?.[key] ?? false
                return (
                  <div key={key} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50">
                    <span className="text-sm font-medium text-slate-700">{label}</span>
                    <div
                      className={`w-11 h-6 rounded-full transition-colors cursor-pointer flex items-center px-0.5 ${val ? 'bg-teal-500' : 'bg-slate-200'}`}
                      onClick={() => updateSettings.mutate({ [key]: !val })}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${val ? 'translate-x-5' : 'translate-x-0'}`} />
                    </div>
                  </div>
                )
              })}

              <div className="p-3 rounded-xl hover:bg-slate-50">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Clôture auto après N jours (0 = désactivé)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    value={autoCloseDays}
                    onChange={e => setAutoCloseDays(Number(e.target.value))}
                    className="w-24 px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                  <button
                    onClick={() => updateSettings.mutate({ auto_close_days: autoCloseDays })}
                    disabled={updateSettings.isPending}
                    className="px-3 py-1.5 bg-teal-500 text-white rounded-lg text-sm hover:bg-teal-600 disabled:opacity-50 transition"
                  >
                    Sauvegarder
                  </button>
                </div>
              </div>
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
