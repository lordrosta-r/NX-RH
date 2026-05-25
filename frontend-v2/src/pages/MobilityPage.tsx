import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/api/client'
import { queryKeys } from '../lib/queryKeys'

type MobilityStatus = 'pending' | 'under_review' | 'approved' | 'rejected' | 'on_hold'
type RequestType = 'internal_transfer' | 'promotion' | 'lateral_move' | 'site_change' | 'department_change'

interface MobilityRequest {
  _id: string
  employeeId: { _id: string; firstName: string; lastName: string; email: string; department?: string; position?: string }
  targetPosition: string
  targetDepartment?: string
  requestType: RequestType
  motivation?: string
  status: MobilityStatus
  priority: string
  hrComment?: string
  createdAt: string
  targetDate?: string
}

const STATUS_LABELS: Record<MobilityStatus, string> = {
  pending: 'En attente',
  under_review: "En cours d'examen",
  approved: 'Approuvée',
  rejected: 'Refusée',
  on_hold: 'En suspens',
}

const STATUS_COLORS: Record<MobilityStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  under_review: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  on_hold: 'bg-gray-100 text-gray-600',
}

const TYPE_LABELS: Record<RequestType, string> = {
  internal_transfer: 'Mutation interne',
  promotion: 'Promotion',
  lateral_move: 'Mobilité latérale',
  site_change: 'Changement de site',
  department_change: 'Changement de département',
}

const EMPTY_FORM = {
  targetPosition: '',
  targetDepartment: '',
  requestType: 'internal_transfer' as RequestType,
  motivation: '',
  priority: 'normal',
}

export default function MobilityPage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const isHrAdmin = user && ['admin', 'hr'].includes(user.role)

  const [statusFilter, setStatusFilter] = useState('')
  const [showNewForm, setShowNewForm] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<MobilityRequest | null>(null)
  const [hrComment, setHrComment] = useState('')
  const [newRequest, setNewRequest] = useState(EMPTY_FORM)

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.mobility.lists(),
    queryFn: () =>
      api.get('/mobility', { params: { status: statusFilter || undefined, limit: 50 } }).then(r => r.data),
  })

  const requests: MobilityRequest[] = data?.data ?? []
  const total: number = data?.total ?? 0

  const createMutation = useMutation({
    mutationFn: (req: typeof newRequest) => api.post('/mobility', req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.mobility.lists() })
      setShowNewForm(false)
      setNewRequest(EMPTY_FORM)
    },
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, hrComment: comment }: { id: string; status: string; hrComment?: string }) =>
      api.patch(`/mobility/${id}`, { status, hrComment: comment }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.mobility.lists() })
      setSelectedRequest(null)
    },
  })

  const kpis = {
    total,
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mobilité interne</h1>
          <p className="text-gray-500 text-sm mt-1">Gestion des demandes de mobilité et mutations</p>
        </div>
        <button
          onClick={() => setShowNewForm(true)}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Nouvelle demande
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total', value: kpis.total, color: 'blue' },
          { label: 'En attente', value: kpis.pending, color: 'yellow' },
          { label: 'Approuvées', value: kpis.approved, color: 'green' },
          { label: 'Refusées', value: kpis.rejected, color: 'red' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white p-4 rounded-xl border border-gray-200">
            <p className="text-sm text-gray-500">{label}</p>
            <p className={`text-2xl font-bold text-${color}-600 mt-1`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-2">
        {(['', 'pending', 'under_review', 'approved', 'rejected', 'on_hold'] as const).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
              statusFilter === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s ? STATUS_LABELS[s] : 'Tous'}
          </button>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 bg-gray-200 animate-pulse rounded-lg" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <p className="text-4xl mb-3">📋</p>
          <p className="font-medium">Aucune demande de mobilité</p>
          <p className="text-sm mt-1">Les demandes apparaîtront ici</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto hidden sm:block">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Collaborateur</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Poste visé</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Statut</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                {isHrAdmin && <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {requests.map(r => (
                <tr key={r._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">
                      {r.employeeId.firstName} {r.employeeId.lastName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {r.employeeId.department ?? r.employeeId.position ?? r.employeeId.email}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{r.targetPosition}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{TYPE_LABELS[r.requestType] ?? r.requestType}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status]}`}>
                      {STATUS_LABELS[r.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(r.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                  {isHrAdmin && (
                    <td className="px-4 py-3">
                      <button
                        onClick={() => { setSelectedRequest(r); setHrComment(r.hrComment ?? '') }}
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                      >
                        Traiter →
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden divide-y divide-gray-100">
            {requests.map(r => (
              <div key={r._id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-gray-800">{r.employeeId.firstName} {r.employeeId.lastName}</p>
                    <p className="text-xs text-gray-500">{r.employeeId.department ?? r.employeeId.position ?? r.employeeId.email}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status]}`}>
                    {STATUS_LABELS[r.status]}
                  </span>
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <dt className="text-gray-500">Poste visé</dt>
                  <dd className="text-gray-700 truncate">{r.targetPosition}</dd>
                  <dt className="text-gray-500">Type</dt>
                  <dd className="text-gray-500 text-xs">{TYPE_LABELS[r.requestType] ?? r.requestType}</dd>
                  <dt className="text-gray-500">Date</dt>
                  <dd className="text-gray-500 text-xs">{new Date(r.createdAt).toLocaleDateString('fr-FR')}</dd>
                </dl>
                {isHrAdmin && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <button onClick={() => { setSelectedRequest(r); setHrComment(r.hrComment ?? '') }} className="text-blue-600 hover:text-blue-800 text-xs font-medium">
                      Traiter →
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal — nouvelle demande */}
      {showNewForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-800">Nouvelle demande de mobilité</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Poste visé *</label>
                <input
                  value={newRequest.targetPosition}
                  onChange={e => setNewRequest(n => ({ ...n, targetPosition: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="Ex : Chef de projet senior"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Département cible</label>
                <input
                  value={newRequest.targetDepartment}
                  onChange={e => setNewRequest(n => ({ ...n, targetDepartment: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="Ex : Ingénierie"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type de demande</label>
                <select
                  value={newRequest.requestType}
                  onChange={e => setNewRequest(n => ({ ...n, requestType: e.target.value as RequestType }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  {(Object.entries(TYPE_LABELS) as [RequestType, string][]).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motivation</label>
                <textarea
                  value={newRequest.motivation}
                  onChange={e => setNewRequest(n => ({ ...n, motivation: e.target.value }))}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
                  placeholder="Expliquez votre demande…"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => createMutation.mutate(newRequest)}
                disabled={!newRequest.targetPosition || createMutation.isPending}
                className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {createMutation.isPending ? 'Envoi…' : 'Soumettre'}
              </button>
              <button
                onClick={() => setShowNewForm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal — traitement RH */}
      {selectedRequest && isHrAdmin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-800">Traiter la demande</h2>
            <div>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Collaborateur : </span>
                {selectedRequest.employeeId.firstName} {selectedRequest.employeeId.lastName}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Poste visé : </span>
                {selectedRequest.targetPosition}
              </p>
              {selectedRequest.motivation && (
                <p className="text-sm text-gray-600 mt-2">
                  <span className="font-medium">Motivation : </span>
                  {selectedRequest.motivation}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Commentaire RH</label>
              <textarea
                value={hrComment}
                onChange={e => setHrComment(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(['under_review', 'approved', 'rejected', 'on_hold'] as MobilityStatus[]).map(s => (
                <button
                  key={s}
                  onClick={() => updateStatusMutation.mutate({ id: selectedRequest._id, status: s, hrComment })}
                  disabled={updateStatusMutation.isPending}
                  className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                    s === 'approved'
                      ? 'border-green-300 text-green-700 hover:bg-green-50'
                      : s === 'rejected'
                      ? 'border-red-300 text-red-700 hover:bg-red-50'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
            <button
              onClick={() => setSelectedRequest(null)}
              className="w-full px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
