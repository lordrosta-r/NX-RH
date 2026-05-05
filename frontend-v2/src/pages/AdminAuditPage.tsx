import { useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { Download, Search } from 'lucide-react'
import { adminApi } from '../api/admin'
import type { AuditLogEntry, PaginatedResponse } from '../types'

function SkeletonRow() {
  return (
    <tr>
      {Array.from({ length: 4 }).map((_, i) => (
        <td key={i} className="px-4 py-3"><div className="h-4 bg-slate-200 rounded animate-pulse" /></td>
      ))}
    </tr>
  )
}

function ActionBadge({ action }: { action: string }) {
  const colors: Record<string, string> = {
    create: 'bg-green-100 text-green-700',
    update: 'bg-blue-100 text-blue-700',
    delete: 'bg-red-100 text-red-700',
    login: 'bg-primary-100 text-primary-700',
    logout: 'bg-slate-100 text-slate-700',
  }
  const base = action.toLowerCase().split('_')[0]
  const cls = colors[base] ?? 'bg-slate-100 text-slate-700'
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{action}</span>
}

export default function AdminAuditPage() {
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({ action: '', targetType: '', actor: '', from: '', to: '' })

  const { data, isLoading } = useQuery<PaginatedResponse<AuditLogEntry>>({
    queryKey: ['audit-log', page, filters],
    queryFn: () => adminApi.getAuditLog({ page, limit: 20, ...filters }).then(r => r.data),
    placeholderData: keepPreviousData,
  })

  async function exportCsv() {
    const res = await adminApi.exportAuditCsv()
    const url = URL.createObjectURL(res.data as Blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'audit.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Journal d'audit</h1>
        <button onClick={exportCsv} className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition">
          <Download size={16} /> Exporter CSV
        </button>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-2xl shadow p-4 mb-6 flex flex-wrap gap-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 w-44"
            placeholder="Acteur..."
            value={filters.actor}
            onChange={e => { setFilters(f => ({ ...f, actor: e.target.value })); setPage(1) }}
          />
        </div>
        <input
          className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 w-40"
          placeholder="Action..."
          value={filters.action}
          onChange={e => { setFilters(f => ({ ...f, action: e.target.value })); setPage(1) }}
        />
        <input
          className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 w-36"
          placeholder="Type cible..."
          value={filters.targetType}
          onChange={e => { setFilters(f => ({ ...f, targetType: e.target.value })); setPage(1) }}
        />
        <input type="date" className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" value={filters.from} onChange={e => { setFilters(f => ({ ...f, from: e.target.value })); setPage(1) }} />
        <input type="date" className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" value={filters.to} onChange={e => { setFilters(f => ({ ...f, to: e.target.value })); setPage(1) }} />
      </div>

      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              {['Date/Heure', 'Acteur', 'Action', 'Cible'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} />) :
             !data?.data?.length ? (
               <tr><td colSpan={4} className="px-4 py-16 text-center text-slate-400">Aucune entrée dans le journal d'audit.</td></tr>
             ) : data.data.map(entry => (
               <tr key={entry.id} className="hover:bg-slate-50 transition">
                 <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">{new Date(entry.createdAt).toLocaleString('fr-FR')}</td>
                 <td className="px-4 py-3">
                   <div className="font-medium text-slate-800">{entry.actorName ?? entry.actorEmail ?? entry.actorId}</div>
                 </td>
                 <td className="px-4 py-3"><ActionBadge action={entry.action} /></td>
                 <td className="px-4 py-3 text-slate-600">
                   {entry.targetLabel ?? entry.targetId ?? '—'}
                   {entry.targetType && <span className="ml-2 text-xs text-slate-400">({entry.targetType})</span>}
                 </td>
               </tr>
             ))
            }
          </tbody>
        </table>
        {data && data.totalPages && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-500">Page {page} sur {data.totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50">Précédent</button>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= (data.totalPages ?? 1)} className="px-3 py-1 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50">Suivant</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

