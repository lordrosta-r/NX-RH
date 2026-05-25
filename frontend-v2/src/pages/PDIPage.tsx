import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/api/client'
import { queryKeys } from '@/lib/queryKeys'
import { PlusCircle, ClipboardList, ChevronRight } from 'lucide-react'

type PDIStatus = 'draft' | 'active' | 'completed' | 'archived'

interface PDI {
  _id: string
  employee: { _id: string; firstName: string; lastName: string; email: string; department?: string; position?: string }
  manager: { _id: string; firstName: string; lastName: string; email: string }
  period: { start: string; end: string }
  objectives: string[]
  actions: { _id: string; status: string }[]
  status: PDIStatus
  employeeSignedAt?: string
  managerSignedAt?: string
  createdAt: string
}

const STATUS_LABELS: Record<PDIStatus, string> = {
  draft: 'Brouillon',
  active: 'Actif',
  completed: 'Terminé',
  archived: 'Archivé',
}

const STATUS_COLORS: Record<PDIStatus, string> = {
  draft: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  active: 'bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300',
  completed: 'bg-success-100 text-success-800 dark:bg-success-900/30 dark:text-success-300',
  archived: 'bg-surface-200 text-surface-600 dark:bg-surface-700 dark:text-surface-400',
}

const EMPTY_FORM = {
  employee: '',
  manager: '',
  periodStart: '',
  periodEnd: '',
  notes: '',
}

export default function PDIPage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const canCreate = user && ['admin', 'hr', 'manager'].includes(user.role)

  const [statusFilter, setStatusFilter] = useState('')
  const [showNewForm, setShowNewForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.pdi.list({ status: statusFilter }),
    queryFn: () =>
      api.get('/pdi', { params: { status: statusFilter || undefined } }).then(r => r.data),
  })

  const pdis: PDI[] = data?.data ?? []

  const createMutation = useMutation({
    mutationFn: (payload: typeof form) =>
      api.post('/pdi', {
        employee: payload.employee,
        manager: payload.manager,
        period: { start: payload.periodStart, end: payload.periodEnd },
        notes: payload.notes,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.pdi.lists() })
      setShowNewForm(false)
      setForm(EMPTY_FORM)
    },
  })

  function completedCount(pdi: PDI) {
    return pdi.actions.filter(a => a.status === 'completed').length
  }

  function progress(pdi: PDI) {
    if (!pdi.actions.length) return 0
    return Math.round((completedCount(pdi) / pdi.actions.length) * 100)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50 flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-primary-600" />
            Plans de Développement Individuel
          </h1>
          <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
            Suivez les objectifs de développement de vos collaborateurs
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowNewForm(v => !v)}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            Nouveau PDI
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {(['', 'draft', 'active', 'completed', 'archived'] as const).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              statusFilter === s
                ? 'bg-primary-600 text-white'
                : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-700'
            }`}
          >
            {s === '' ? 'Tous' : STATUS_LABELS[s as PDIStatus]}
          </button>
        ))}
      </div>

      {/* New PDI form */}
      {showNewForm && (
        <div className="bg-surface-50 dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 p-5 space-y-4">
          <h2 className="font-semibold text-surface-800 dark:text-surface-100">Créer un nouveau PDI</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-surface-600 dark:text-surface-400 mb-1">
                ID Employé *
              </label>
              <input
                className="w-full border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-900 rounded-lg px-3 py-2 text-sm text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={form.employee}
                onChange={e => setForm(f => ({ ...f, employee: e.target.value }))}
                placeholder="ObjectId de l'employé"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 dark:text-surface-400 mb-1">
                ID Manager *
              </label>
              <input
                className="w-full border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-900 rounded-lg px-3 py-2 text-sm text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={form.manager}
                onChange={e => setForm(f => ({ ...f, manager: e.target.value }))}
                placeholder="ObjectId du manager"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 dark:text-surface-400 mb-1">
                Début de période *
              </label>
              <input
                type="date"
                className="w-full border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-900 rounded-lg px-3 py-2 text-sm text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={form.periodStart}
                onChange={e => setForm(f => ({ ...f, periodStart: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 dark:text-surface-400 mb-1">
                Fin de période *
              </label>
              <input
                type="date"
                className="w-full border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-900 rounded-lg px-3 py-2 text-sm text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={form.periodEnd}
                onChange={e => setForm(f => ({ ...f, periodEnd: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-600 dark:text-surface-400 mb-1">Notes</label>
            <textarea
              rows={2}
              className="w-full border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-900 rounded-lg px-3 py-2 text-sm text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowNewForm(false)}
              className="px-4 py-2 text-sm rounded-lg border border-surface-300 dark:border-surface-600 text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
            >
              Annuler
            </button>
            <button
              disabled={createMutation.isPending || !form.employee || !form.manager || !form.periodStart || !form.periodEnd}
              onClick={() => createMutation.mutate(form)}
              className="px-4 py-2 text-sm bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
            >
              {createMutation.isPending ? 'Création…' : 'Créer'}
            </button>
          </div>
        </div>
      )}

      {/* PDI list */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : pdis.length === 0 ? (
        <div className="text-center py-16 text-surface-400 dark:text-surface-500">
          <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Aucun PDI trouvé</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pdis.map(pdi => (
            <Link
              key={pdi._id}
              to={`/pdi/${pdi._id}`}
              className="flex items-center justify-between bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 p-4 hover:shadow-md hover:border-primary-300 dark:hover:border-primary-700 transition-all group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-surface-900 dark:text-surface-100 truncate">
                    {pdi.employee.firstName} {pdi.employee.lastName}
                  </span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[pdi.status]}`}>
                    {STATUS_LABELS[pdi.status]}
                  </span>
                </div>
                <div className="text-xs text-surface-500 dark:text-surface-400 flex flex-wrap gap-x-3 gap-y-0.5">
                  <span>Manager : {pdi.manager.firstName} {pdi.manager.lastName}</span>
                  <span>
                    Période : {new Date(pdi.period.start).toLocaleDateString('fr-FR')} –{' '}
                    {new Date(pdi.period.end).toLocaleDateString('fr-FR')}
                  </span>
                  <span>{pdi.actions.length} action{pdi.actions.length !== 1 ? 's' : ''}</span>
                </div>
                {pdi.actions.length > 0 && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden max-w-[160px]">
                      <div
                        className="h-full bg-success-500 rounded-full transition-all"
                        style={{ width: `${progress(pdi)}%` }}
                      />
                    </div>
                    <span className="text-xs text-surface-500 dark:text-surface-400">
                      {completedCount(pdi)}/{pdi.actions.length}
                    </span>
                  </div>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-surface-400 group-hover:text-primary-500 flex-shrink-0 ml-3 transition-colors" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
