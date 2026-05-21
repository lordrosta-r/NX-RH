import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Inbox, MoreVertical, X } from 'lucide-react'
import { adminApi } from '../api/admin'
import type { HrFlag, HrFlagStatus, HrFlagType, PaginatedResponse } from '../types'

const TYPE_LABELS: Record<HrFlagType, string> = {
  mobility_request: 'Mobilité',
  salary_raise_request: 'Augmentation',
  promotion_request: 'Promotion',
  training_request: 'Formation',
  other: 'Autre',
}
const TYPE_COLORS: Record<HrFlagType, string> = {
  mobility_request: 'bg-blue-100 text-blue-700',
  salary_raise_request: 'bg-green-100 text-green-700',
  promotion_request: 'bg-purple-100 text-purple-700',
  training_request: 'bg-amber-100 text-amber-700',
  other: 'bg-slate-100 text-slate-700',
}
const STATUS_LABELS: Record<HrFlagStatus, string> = {
  pending: 'En attente',
  in_progress: 'En cours',
  treated: 'Traité',
  rejected: 'Rejeté',
}
const STATUS_COLORS: Record<HrFlagStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  in_progress: 'bg-blue-100 text-blue-700',
  treated: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}

function SkeletonRow() {
  return <tr>{Array.from({ length: 5 }).map((_, i) => <td key={i} className="px-4 py-3"><div className="h-4 bg-slate-200 rounded animate-pulse" /></td>)}</tr>
}

export default function HrFlagsPage() {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [selectedFlag, setSelectedFlag] = useState<HrFlag | null>(null)
  const [note, setNote] = useState('')
  const [newStatus, setNewStatus] = useState<HrFlagStatus | ''>('')

  const { data, isLoading } = useQuery<PaginatedResponse<HrFlag>>({
    queryKey: ['hr-flags', statusFilter, typeFilter],
    queryFn: () => adminApi.getFlags({ status: statusFilter || undefined, type: typeFilter || undefined }).then(r => r.data as PaginatedResponse<HrFlag>),
  })

  const updateStatusMut = useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: string; note?: string }) => adminApi.updateFlagStatus(id, status, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr-flags'] })
      setSelectedFlag(null)
    },
  })

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900 mb-6">Signaux RH</h1>

      {/* Filtres */}
      <div className="bg-white rounded-2xl shadow p-4 mb-6 flex flex-wrap gap-3">
        <select
          className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select
          className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
        >
          <option value="">Tous les types</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              {['Collaborateur', 'Type', 'Date', 'Statut', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />) :
             !data?.data?.length ? (
               <tr>
                 <td colSpan={5} className="px-4 py-20 text-center">
                   <Inbox size={40} className="mx-auto mb-2 text-slate-200" />
                   <p className="text-slate-400">Aucun signal RH</p>
                 </td>
               </tr>
             ) : data.data.map(flag => (
               <tr key={flag.id} className="hover:bg-slate-50 transition">
                 <td className="px-4 py-3 font-medium text-slate-800">{flag.userName ?? flag.userId}</td>
                 <td className="px-4 py-3">
                   <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[flag.type]}`}>{TYPE_LABELS[flag.type]}</span>
                 </td>
                 <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{new Date(flag.createdAt).toLocaleDateString('fr-FR')}</td>
                 <td className="px-4 py-3">
                   <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[flag.status]}`}>{STATUS_LABELS[flag.status]}</span>
                 </td>
                 <td className="px-4 py-3">
                   <button onClick={() => { setSelectedFlag(flag); setNote(flag.note ?? ''); setNewStatus(flag.status) }} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition">
                     <MoreVertical size={15} />
                   </button>
                 </td>
               </tr>
             ))
            }
          </tbody>
        </table>
      </div>

      {/* Slide-over détail */}
      {selectedFlag && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSelectedFlag(null)} />
          <div className="relative w-full max-w-md bg-white shadow-xl flex flex-col animate-slideInUp">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Détail du signal</h2>
              <button onClick={() => setSelectedFlag(null)} className="p-1 text-slate-400 hover:text-slate-700"><X size={18} /></button>
            </div>
            <div className="p-6 flex-1 overflow-y-auto space-y-4">
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase mb-1">Collaborateur</p>
                <p className="font-semibold text-slate-800">{selectedFlag.userName ?? selectedFlag.userId}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase mb-1">Type</p>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[selectedFlag.type]}`}>{TYPE_LABELS[selectedFlag.type]}</span>
              </div>
              {selectedFlag.description && (
                <div>
                  <p className="text-xs text-slate-400 font-medium uppercase mb-1">Description</p>
                  <p className="text-sm text-slate-700">{selectedFlag.description}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase mb-1">Note RH</p>
                <textarea
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
                  rows={3}
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Ajouter une note..."
                />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase mb-1">Changer le statut</p>
                <select
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                  value={newStatus}
                  onChange={e => setNewStatus(e.target.value as HrFlagStatus)}
                >
                  {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex gap-3">
              <button onClick={() => setSelectedFlag(null)} className="flex-1 px-4 py-2 text-sm border border-slate-200 text-slate-600 rounded-md hover:bg-slate-50">Fermer</button>
              <button
                onClick={() => updateStatusMut.mutate({ id: selectedFlag.id, status: newStatus || selectedFlag.status, note })}
                disabled={updateStatusMut.isPending}
                className="flex-1 px-4 py-2 text-sm bg-primary-500 text-white rounded-md hover:bg-primary-600 disabled:opacity-50 transition"
              >
                {updateStatusMut.isPending ? 'Sauvegarde…' : 'Sauvegarder'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

