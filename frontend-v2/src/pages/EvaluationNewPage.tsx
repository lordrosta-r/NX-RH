import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { evaluationsApi } from '../api/evaluations'
import { campaignsApi } from '../api/campaigns'
import { usersApi } from '../api/users'

export default function EvaluationNewPage() {
  const navigate = useNavigate()
  const [campaignId, setCampaignId] = useState('')
  const [evaluateeId, setEvaluateeId] = useState('')
  const [evaluatorId, setEvaluatorId] = useState('')

  const { data: campaigns } = useQuery({
    queryKey: ['campaigns', 'active'],
    queryFn: () => campaignsApi.getCampaigns({ status: 'active' }).then(r => r.data),
  })

  const { data: users } = useQuery({
    queryKey: ['users', 'list'],
    queryFn: () => usersApi.getUsers({ limit: 200 }).then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: () => evaluationsApi.createEvaluation({ campaignId, evaluateeId, evaluatorId }),
    onSuccess: (res) => navigate(`/evaluations/${res.data.id}`),
  })

  const usersList = users?.data ?? []
  const campaignsList = campaigns?.data ?? []

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!campaignId || !evaluateeId || !evaluatorId) return
    createMutation.mutate()
  }

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Nouvelle évaluation</h1>
        <p className="text-slate-500 mt-1 text-sm">Créer une évaluation individuelle</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Campagne <span className="text-error-500">*</span>
          </label>
          <select
            value={campaignId}
            onChange={e => setCampaignId(e.target.value)}
            required
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
          >
            <option value="">Sélectionner une campagne…</option>
            {campaignsList.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Évalué <span className="text-error-500">*</span>
          </label>
          <select
            value={evaluateeId}
            onChange={e => setEvaluateeId(e.target.value)}
            required
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
          >
            <option value="">Sélectionner un collaborateur…</option>
            {usersList.map(u => (
              <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Évaluateur <span className="text-error-500">*</span>
          </label>
          <select
            value={evaluatorId}
            onChange={e => setEvaluatorId(e.target.value)}
            required
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
          >
            <option value="">Sélectionner un évaluateur…</option>
            {usersList.map(u => (
              <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.role})</option>
            ))}
          </select>
        </div>

        {createMutation.isError && (
          <p className="text-sm text-error-600">Une erreur est survenue. Veuillez réessayer.</p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/evaluations')}
            className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending || !campaignId || !evaluateeId || !evaluatorId}
            className="px-6 py-2 bg-primary-500 text-white rounded-lg text-sm font-semibold hover:bg-primary-600 disabled:opacity-50"
          >
            {createMutation.isPending ? 'Création…' : 'Créer l\'évaluation'}
          </button>
        </div>
      </form>
    </div>
  )
}
