import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowLeft, Calendar, Clock, Users, Star, BarChart2, ClipboardList,
  LogOut, MessageSquare, MapPin, Link2, Pencil, Trash2, X, AlertTriangle,
} from 'lucide-react'
import { eventsApi } from '../api/events'
import { useAuth } from '../contexts/AuthContext'
import type { CalendarEvent, EventType, Role } from '../types'

// ── Constants ──────────────────────────────────────────────────────────────────

const ALL_ROLES: Role[] = ['admin', 'hr', 'manager', 'director', 'employee']
const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin', hr: 'RH', manager: 'Manager', director: 'Directeur', employee: 'Employé',
}

interface EventConfigItem {
  bg: string
  text: string
  dot: string
  Icon: LucideIcon
  label: string
}

const EVENT_CONFIG: Record<EventType, EventConfigItem> = {
  deadline:    { bg: 'bg-red-100',     text: 'text-red-700',     dot: 'bg-red-400',     Icon: Clock,         label: 'Deadline'    },
  interview:   { bg: 'bg-primary-100', text: 'text-primary-700', dot: 'bg-primary-400', Icon: MessageSquare, label: 'Entretien'   },
  meeting:     { bg: 'bg-blue-100',    text: 'text-blue-700',    dot: 'bg-blue-400',    Icon: Users,         label: 'Réunion'     },
  feedback:    { bg: 'bg-green-100',   text: 'text-green-700',   dot: 'bg-green-400',   Icon: Star,          label: 'Feedback'    },
  campaign:    { bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-400',   Icon: BarChart2,     label: 'Campagne'    },
  evaluation:  { bg: 'bg-purple-100',  text: 'text-purple-700',  dot: 'bg-purple-400',  Icon: ClipboardList, label: 'Évaluation'  },
  offboarding: { bg: 'bg-slate-100',   text: 'text-slate-700',   dot: 'bg-slate-400',   Icon: LogOut,        label: 'Offboarding' },
  other:       { bg: 'bg-slate-100',   text: 'text-slate-600',   dot: 'bg-slate-300',   Icon: Calendar,      label: 'Autre'       },
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDateFR(s: string | undefined): string {
  if (!s) return '—'
  const d = new Date(s)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatTimeFR(s: string | undefined): string {
  if (!s) return ''
  const d = new Date(s)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

/** Backend returns `date`, frontend uses `startDate` — normalise */
const evDate = (e: { startDate?: string; date?: string }): string => e.startDate ?? e.date ?? ''

function toDatetimeLocal(s: string): string {
  try {
    const d = new Date(s)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  } catch {
    return s
  }
}

// ── EventTypeChip ──────────────────────────────────────────────────────────────

function EventTypeChip({ type, size = 'md' }: { type: EventType; size?: 'sm' | 'md' }) {
  const c = EVENT_CONFIG[type]
  const cls = size === 'sm'
    ? 'px-2.5 py-0.5 text-xs gap-1.5'
    : 'px-3 py-1 text-sm gap-1.5'
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${cls} ${c.bg} ${c.text}`}>
      <c.Icon size={size === 'sm' ? 12 : 14} />
      {c.label}
    </span>
  )
}

// ── Form types ─────────────────────────────────────────────────────────────────

interface EventFormState {
  title: string
  type: EventType
  startDate: string
  endDate: string
  description: string
  location: string
  campaignId: string
  targetRoles: Role[]
}

// ── EditSlideOver ──────────────────────────────────────────────────────────────

function EditSlideOver({
  form,
  onChange,
  onToggleRole,
  onClose,
  onSubmit,
  isPending,
}: {
  form: EventFormState
  onChange: (f: keyof EventFormState, v: string) => void
  onToggleRole: (r: Role) => void
  onClose: () => void
  onSubmit: (e: React.FormEvent) => void
  isPending: boolean
}) {
  return (
    <>
      <div className="fixed inset-0 bg-slate-900/40 z-40 animate-fadeIn" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg flex flex-col bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">Modifier l'événement</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
            <X size={20} />
          </button>
        </div>
        {/* Form */}
        <form onSubmit={onSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Titre <span className="text-red-500">*</span>
              </label>
              <input
                type="text" required value={form.title}
                onChange={e => onChange('title', e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-900"
              />
            </div>
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
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea
                rows={3} value={form.description}
                onChange={e => onChange('description', e.target.value)}
                placeholder="Description de l'événement..."
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-900 placeholder:text-slate-400 resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Lieu</label>
              <input
                type="text" value={form.location}
                onChange={e => onChange('location', e.target.value)}
                placeholder="Salle, ville, lien visio..."
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-900 placeholder:text-slate-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ID Campagne liée</label>
              <input
                type="text" value={form.campaignId}
                onChange={e => onChange('campaignId', e.target.value)}
                placeholder="Optionnel"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-900 placeholder:text-slate-400"
              />
            </div>
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
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100">
            <button
              type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit" disabled={isPending}
              className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            >
              {isPending && (
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              )}
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </>
  )
}

// ── ConfirmDialog ──────────────────────────────────────────────────────────────

function ConfirmDialog({
  onConfirm,
  onCancel,
  isPending,
}: {
  onConfirm: () => void
  onCancel: () => void
  isPending: boolean
}) {
  return (
    <>
      <div className="fixed inset-0 bg-slate-900/40 z-50" onClick={onCancel} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm pointer-events-auto animate-scaleIn">
          <div className="flex items-start gap-3 mb-5">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle size={18} className="text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Supprimer l'événement</h3>
              <p className="text-sm text-slate-500 mt-1">
                Êtes-vous sûr de vouloir supprimer cet événement ? Cette action est irréversible.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={onConfirm}
              disabled={isPending}
              className="flex items-center gap-2 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            >
              {isPending && (
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              )}
              Supprimer
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Page skeleton ──────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-slate-200 rounded-lg" />
      <div className="flex items-center gap-4">
        <div className="h-10 w-72 bg-slate-200 rounded-lg" />
        <div className="h-8 w-24 bg-slate-200 rounded-full" />
      </div>
      <div className="bg-white rounded-2xl shadow p-6 space-y-4">
        <div className="h-5 w-64 bg-slate-200 rounded" />
        <div className="h-5 w-48 bg-slate-200 rounded" />
        <div className="h-5 w-56 bg-slate-200 rounded" />
        <div className="h-20 w-full bg-slate-200 rounded-lg" />
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const canEdit = user?.role === 'admin' || user?.role === 'hr'

  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [editForm, setEditForm] = useState<EventFormState | null>(null)

  // ── Query ──
  const { data: event, isLoading, isError } = useQuery({
    queryKey: ['events', id],
    queryFn: () => eventsApi.getEvent(id!).then(r => r.data),
    enabled: !!id,
  })

  // Pre-fill edit form when event loads
  useEffect(() => {
    if (event) {
      setEditForm({
        title: event.title,
        type: event.type,
        startDate: toDatetimeLocal(evDate(event)),
        endDate: event.endDate ? toDatetimeLocal(event.endDate) : '',
        description: event.description ?? '',
        location: event.location ?? '',
        campaignId: event.campaignId ?? '',
        targetRoles: (event.targetRoles ?? []) as Role[],
      })
    }
  }, [event])

  // ── Mutations ──
  const updateMutation = useMutation({
    mutationFn: (data: Partial<CalendarEvent>) => eventsApi.updateEvent(id!, data).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      queryClient.invalidateQueries({ queryKey: ['events', id] })
      setIsEditOpen(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => eventsApi.deleteEvent(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      navigate('/events')
    },
  })

  // ── Edit form handlers ──
  const handleChange = (f: keyof EventFormState, v: string) =>
    setEditForm(prev => prev ? { ...prev, [f]: v } : prev)

  const handleToggleRole = (r: Role) =>
    setEditForm(prev => {
      if (!prev) return prev
      return {
        ...prev,
        targetRoles: prev.targetRoles.includes(r)
          ? prev.targetRoles.filter(x => x !== r)
          : [...prev.targetRoles, r],
      }
    })

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editForm) return
    updateMutation.mutate({
      title: editForm.title,
      type: editForm.type,
      startDate: editForm.startDate,
      endDate: editForm.endDate || undefined,
      description: editForm.description || undefined,
      location: editForm.location || undefined,
      campaignId: editForm.campaignId || undefined,
      targetRoles: editForm.targetRoles.length > 0 ? editForm.targetRoles : undefined,
    })
  }

  // ── Render states ──
  if (isLoading) return <PageSkeleton />

  if (isError || !event) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/events')}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft size={16} /> Retour
        </button>
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700">
          <AlertTriangle size={20} />
          <p className="text-sm font-medium">Événement introuvable ou erreur de chargement.</p>
        </div>
      </div>
    )
  }

  const cfg = EVENT_CONFIG[event.type]
  const hasTime = (s: string) => {
    const d = new Date(s)
    return d.getHours() !== 0 || d.getMinutes() !== 0
  }

  const dateDisplay = (() => {
    const start = formatDateFR(evDate(event))
    const startTime = hasTime(evDate(event)) ? formatTimeFR(evDate(event)) : null
    if (!event.endDate) return startTime ? `${start} — ${startTime}` : start
    const end = formatDateFR(event.endDate)
    const endTime = hasTime(event.endDate) ? formatTimeFR(event.endDate) : null
    if (start === end) {
      return startTime && endTime
        ? `${start} — ${startTime} → ${endTime}`
        : start
    }
    return `${start} → ${end}`
  })()

  return (
    <div className="space-y-6 max-w-3xl">
      {/* ── Back ── */}
      <button
        onClick={() => navigate('/events')}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors group"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
        Retour au calendrier
      </button>

      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-slate-900 leading-tight">{event.title}</h1>
          <EventTypeChip type={event.type} />
        </div>
        {canEdit && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setIsEditOpen(true)}
              className="flex items-center gap-2 border border-slate-200 hover:border-slate-300 bg-white px-3 py-2 rounded-xl text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
            >
              <Pencil size={14} /> Modifier
            </button>
            <button
              onClick={() => setIsDeleteOpen(true)}
              className="flex items-center gap-2 border border-red-200 hover:border-red-300 bg-white px-3 py-2 rounded-xl text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
            >
              <Trash2 size={14} /> Supprimer
            </button>
          </div>
        )}
      </div>

      {/* ── Detail card ── */}
      <div className="bg-white rounded-2xl shadow p-6 space-y-5">
        {/* Date */}
        <div className="flex items-start gap-3">
          <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${cfg.bg}`}>
            <cfg.Icon size={16} className={cfg.text} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Date</p>
            <p className="text-sm font-medium text-slate-800">{dateDisplay}</p>
          </div>
        </div>

        {/* Location */}
        {event.location && (
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100">
              <MapPin size={16} className="text-slate-500" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Lieu</p>
              <p className="text-sm font-medium text-slate-800">{event.location}</p>
            </div>
          </div>
        )}

        {/* Target roles */}
        {event.targetRoles && event.targetRoles.length > 0 && (
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100">
              <Users size={16} className="text-slate-500" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Rôles ciblés</p>
              <div className="flex flex-wrap gap-1.5">
                {event.targetRoles.map(r => (
                  <span
                    key={r}
                    className="px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-full text-xs font-medium"
                  >
                    {ROLE_LABELS[r as Role] ?? r}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Campaign link */}
        {event.campaignId && (
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-amber-50">
              <Link2 size={16} className="text-amber-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Campagne liée</p>
              <Link
                to={`/campaigns/${event.campaignId}`}
                className="text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors inline-flex items-center gap-1"
              >
                EA {event.campaignId} →
              </Link>
            </div>
          </div>
        )}

        {/* Divider + description */}
        {event.description && (
          <>
            <hr className="border-slate-100" />
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Description</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                {event.description}
              </p>
            </div>
          </>
        )}
      </div>

      {/* ── Edit slide-over ── */}
      {isEditOpen && editForm && (
        <EditSlideOver
          form={editForm}
          onChange={handleChange}
          onToggleRole={handleToggleRole}
          onClose={() => setIsEditOpen(false)}
          onSubmit={handleEditSubmit}
          isPending={updateMutation.isPending}
        />
      )}

      {/* ── Delete confirm ── */}
      {isDeleteOpen && (
        <ConfirmDialog
          onConfirm={() => deleteMutation.mutate()}
          onCancel={() => setIsDeleteOpen(false)}
          isPending={deleteMutation.isPending}
        />
      )}
    </div>
  )
}
