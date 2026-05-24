import { X, AlertTriangle } from 'lucide-react'
import type { EventType, Role } from '../../types'
import { EVENT_CONFIG } from './CalendarGrid'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface EventFormState {
  title: string
  type: EventType
  startDate: string
  endDate: string
  description: string
  location: string
  campaignId: string
  targetRoles: Role[]
}

export const EMPTY_FORM: EventFormState = {
  title: '', type: 'meeting', startDate: '', endDate: '',
  description: '', location: '', campaignId: '', targetRoles: [],
}

const ALL_ROLES: Role[] = ['admin', 'hr', 'manager', 'employee']
const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin', hr: 'RH', manager: 'Manager', employee: 'Employé',
}

// ── EventSlideOver ────────────────────────────────────────────────────────────

export interface EventSlideOverProps {
  heading?: string
  submitLabel?: string
  form: EventFormState
  onChange: (f: keyof EventFormState, v: string) => void
  onToggleRole: (r: Role) => void
  onClose: () => void
  onSubmit: (e: React.FormEvent) => void
  isPending: boolean
  error?: string | null
}

export function EventSlideOver({
  heading = 'Nouvel événement',
  submitLabel = "Créer l'événement",
  form,
  onChange,
  onToggleRole,
  onClose,
  onSubmit,
  isPending,
  error,
}: EventSlideOverProps) {
  return (
    <>
      <div className="fixed inset-0 bg-slate-900/40 z-40 animate-fadeIn" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg flex flex-col bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">{heading}</h2>
          <button onClick={onClose} className="p-2 rounded-md hover:bg-slate-100 text-slate-400 transition-colors">
            <X size={20} />
          </button>
        </div>
        {/* Form */}
        <form onSubmit={onSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {/* Titre */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Titre <span className="text-red-500">*</span>
              </label>
              <input
                type="text" required value={form.title}
                onChange={e => onChange('title', e.target.value)}
                placeholder="Titre de l'événement"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-900 placeholder:text-slate-400"
              />
            </div>
            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Type <span className="text-red-500">*</span>
              </label>
              <select
                required value={form.type}
                onChange={e => onChange('type', e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-slate-900"
              >
                {(Object.keys(EVENT_CONFIG) as EventType[]).map(t => (
                  <option key={t} value={t}>{EVENT_CONFIG[t].label}</option>
                ))}
              </select>
            </div>
            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Date début <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local" required value={form.startDate}
                  onChange={e => onChange('startDate', e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date fin</label>
                <input
                  type="datetime-local" value={form.endDate}
                  onChange={e => onChange('endDate', e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-900"
                />
              </div>
            </div>
            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea
                rows={3} value={form.description}
                onChange={e => onChange('description', e.target.value)}
                placeholder="Description de l'événement..."
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-900 placeholder:text-slate-400 resize-none"
              />
            </div>
            {/* Lieu */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Lieu</label>
              <input
                type="text" value={form.location}
                onChange={e => onChange('location', e.target.value)}
                placeholder="Salle, ville, lien visio..."
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-900 placeholder:text-slate-400"
              />
            </div>
            {/* Campaign ID */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ID Campagne liée</label>
              <input
                type="text" value={form.campaignId}
                onChange={e => onChange('campaignId', e.target.value)}
                placeholder="Optionnel"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-900 placeholder:text-slate-400"
              />
            </div>
            {/* Rôles */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Rôles ciblés</label>
              <div className="flex flex-wrap gap-3">
                {ALL_ROLES.map(r => (
                  <label key={r} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.targetRoles.includes(r)}
                      onChange={() => onToggleRole(r)}
                      className="w-4 h-4 rounded border-slate-300 text-primary-500 focus:ring-primary-500"
                    />
                    <span className="text-sm text-slate-700">{ROLE_LABELS[r]}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          {/* Footer */}
          <div className="flex flex-col gap-2 px-6 py-4 border-t border-slate-100">
            {error && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                <span className="flex-shrink-0"><AlertTriangle className="w-4 h-4 text-red-500" /></span>
                <span>{error}</span>
              </div>
            )}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button" onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit" disabled={isPending}
                className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                {isPending && (
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                )}
                {submitLabel}
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  )
}
