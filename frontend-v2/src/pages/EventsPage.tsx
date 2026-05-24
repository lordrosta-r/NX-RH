import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import type { LucideIcon } from 'lucide-react'
import {
  Calendar, Clock, Users, Star, BarChart2, ClipboardList,
  LogOut, MessageSquare, ChevronLeft, ChevronRight, Plus, X,
  MoreVertical, Trash2, Eye, Pencil, AlertTriangle,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { eventsApi } from '../api/events'
import { useAuth } from '../contexts/AuthContext'
import type { CalendarEvent, EventType, Role } from '../types'

// ── Constants ──────────────────────────────────────────────────────────────────

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]
const DAYS_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const ALL_ROLES: Role[] = ['admin', 'hr', 'manager', 'employee']
const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin', hr: 'RH', manager: 'Manager', employee: 'Employé',
}

// ── Event config ───────────────────────────────────────────────────────────────

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

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function firstWeekday(year: number, month: number): number {
  const d = new Date(year, month, 1).getDay()
  return d === 0 ? 6 : d - 1
}

function formatDateFR(s: string | undefined): string {
  if (!s) return '—'
  const d = new Date(s)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** Backend uses `date`, frontend type uses `startDate` — normalise either way */
const evDate = (e: CalendarEvent): string => e.startDate ?? e.date ?? ''

function sameDay(s: string, y: number, m: number, d: number): boolean {
  const dt = new Date(s)
  return dt.getFullYear() === y && dt.getMonth() === m && dt.getDate() === d
}

// ── EventTypeChip ──────────────────────────────────────────────────────────────

function EventTypeChip({ type }: { type: EventType }) {
  const c = EVENT_CONFIG[type]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      <c.Icon size={12} />
      {c.label}
    </span>
  )
}

// ── CalendarGrid ───────────────────────────────────────────────────────────────

interface CalendarGridProps {
  year: number
  month: number
  events: CalendarEvent[]
  selectedDay: number | null
  onDayClick: (d: number) => void
}

function CalendarGrid({ year, month, events, selectedDay, onDayClick }: CalendarGridProps) {
  const dim = daysInMonth(year, month)
  const fwd = firstWeekday(year, month)
  const cells: Array<number | null> = [
    ...Array.from({ length: fwd }, () => null),
    ...Array.from({ length: dim }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const today = new Date()
  const isToday = (d: number) =>
    today.getFullYear() === year && today.getMonth() === month && today.getDate() === d

  return (
    <div className="bg-white rounded-2xl shadow p-4">
      <div className="grid grid-cols-7 mb-2">
        {DAYS_SHORT.map(d => (
          <div key={d} className="text-center text-xs font-semibold text-slate-400 py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px">
        {cells.map((day, i) =>
          day === null ? (
            <div key={`cell-${i}`} className="h-20 bg-slate-50/30 rounded-lg" />
          ) : (
            <button
              key={`cell-${i}`}
              onClick={() => onDayClick(day)}
              className={`h-20 p-1.5 rounded-md text-left transition-colors hover:bg-slate-50 ${
                selectedDay === day ? 'ring-2 ring-primary-500 bg-primary-50' : ''
              }`}
            >
              <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-medium ${
                isToday(day) ? 'bg-primary-500 text-white' : 'text-slate-700'
              }`}>
                {day}
              </span>
              <div className="mt-1 space-y-px overflow-hidden">
                {events
                  .filter(e => sameDay(evDate(e), year, month, day))
                  .slice(0, 2)
                  .map(ev => {
                    const c = EVENT_CONFIG[ev.type]
                    return (
                      <div key={ev.id} className={`flex items-center gap-1 px-1 rounded overflow-hidden ${c.bg} ${c.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot}`} />
                        <span className="text-xs truncate leading-tight">{ev.title}</span>
                      </div>
                    )
                  })}
                {events.filter(e => sameDay(evDate(e), year, month, day)).length > 2 && (
                  <div className="text-xs text-slate-400 pl-1">
                    +{events.filter(e => sameDay(evDate(e), year, month, day)).length - 2}
                  </div>
                )}
              </div>
            </button>
          )
        )}
      </div>
    </div>
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

const EMPTY_FORM: EventFormState = {
  title: '', type: 'meeting', startDate: '', endDate: '',
  description: '', location: '', campaignId: '', targetRoles: [],
}

// ── EventSlideOver ─────────────────────────────────────────────────────────────

interface EventSlideOverProps {
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

function EventSlideOver({
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

// ── ConfirmDialog ──────────────────────────────────────────────────────────────

function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
  isPending,
}: {
  message: string
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
              <Trash2 size={18} className="text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Confirmation</h3>
              <p className="text-sm text-slate-500 mt-1">{message}</p>
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
              className="flex items-center gap-2 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
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

// ── Main page ──────────────────────────────────────────────────────────────────

export default function EventsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const canEdit = user?.role === 'admin' || user?.role === 'hr'

  // View & calendar navigation
  const [view, setView] = useState<'month' | 'list'>(() =>
    typeof window !== 'undefined' && window.innerWidth < 768 ? 'list' : 'month'
  )
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  // Filters & UI
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isSlideOverOpen, setIsSlideOverOpen] = useState(false)

  // Form
  const [form, setForm] = useState<EventFormState>(EMPTY_FORM)

  // ── Query ──
  const { data, isLoading } = useQuery({
    queryKey: ['events', { typeFilter }],
    queryFn: () =>
      eventsApi.getEvents({ type: typeFilter || undefined, limit: 200 }).then(r => r.data),
    placeholderData: keepPreviousData,
  })

  const allEvents = data?.data ?? []
  const monthEvents = allEvents.filter(e => {
    const d = new Date(evDate(e))
    return d.getFullYear() === year && d.getMonth() === month
  })
  const selectedDayEvents = selectedDay
    ? monthEvents.filter(e => sameDay(evDate(e), year, month, selectedDay))
    : []

  // ── Mutations ──
  const [formError, setFormError] = useState<string | null>(null)

  const createMutation = useMutation({
    mutationFn: (payload: Partial<CalendarEvent>) =>
      eventsApi.createEvent(payload).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      setIsSlideOverOpen(false)
      setForm(EMPTY_FORM)
      setFormError(null)
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? 'Une erreur est survenue lors de la création de l\'événement.'
      setFormError(msg)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => eventsApi.deleteEvent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      setDeleteId(null)
    },
  })

  // ── Month navigation ──
  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
    setSelectedDay(null)
  }
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
    setSelectedDay(null)
  }

  // ── Form handlers ──
  const handleChange = (f: keyof EventFormState, v: string) =>
    setForm(prev => ({ ...prev, [f]: v }))

  const handleToggleRole = (r: Role) =>
    setForm(prev => ({
      ...prev,
      targetRoles: prev.targetRoles.includes(r)
        ? prev.targetRoles.filter(x => x !== r)
        : [...prev.targetRoles, r],
    }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    if (form.endDate && form.startDate && new Date(form.endDate) <= new Date(form.startDate)) {
      setFormError('La date de fin doit être postérieure à la date de début.')
      return
    }
    createMutation.mutate({
      title: form.title,
      type: form.type,
      date: form.startDate,
      startDate: form.startDate,
      endDate: form.endDate || undefined,
      description: form.description || undefined,
      location: form.location || undefined,
      campaignId: form.campaignId || undefined,
      targetRoles: form.targetRoles.length > 0 ? form.targetRoles : undefined,
    })
  }

  // Close dropdown on outside click
  useEffect(() => {
    const h = () => setOpenMenuId(null)
    document.addEventListener('click', h)
    return () => document.removeEventListener('click', h)
  }, [])

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold text-slate-900">Calendrier</h1>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Desktop view tabs */}
          <div className="hidden md:flex items-center bg-slate-100 rounded-xl p-1 gap-1">
            {(['month', 'list'] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  view === v
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {v === 'month' ? 'Mois' : 'Liste'}
              </button>
            ))}
          </div>
          {/* Type filter */}
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Tous les types</option>
            {(Object.keys(EVENT_CONFIG) as EventType[]).map(t => (
              <option key={t} value={t}>{EVENT_CONFIG[t].label}</option>
            ))}
          </select>
          {canEdit && (
            <button
              onClick={() => setIsSlideOverOpen(true)}
              className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              <Plus size={16} />
              Nouvel événement
            </button>
          )}
        </div>
      </div>

      {/* Mobile view tabs */}
      <div className="flex md:hidden items-center bg-slate-100 rounded-xl p-1 gap-1 w-fit">
        {(['list', 'month'] as const).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              view === v
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {v === 'month' ? 'Mois' : 'Liste'}
          </button>
        ))}
      </div>

      {/* ── Calendar (Mois) ── */}
      {view === 'month' && (
        <div className="space-y-4">
          {/* Month navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={prevMonth}
              className="p-2 rounded-md hover:bg-slate-100 text-slate-500 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-lg font-semibold text-slate-800">
              {MONTHS_FR[month]} {year}
            </h2>
            <button
              onClick={nextMonth}
              className="p-2 rounded-md hover:bg-slate-100 text-slate-500 transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {isLoading ? (
            <div className="bg-white rounded-2xl shadow p-4">
              <div className="grid grid-cols-7 gap-px">
                {Array.from({ length: 35 }).map((_, i) => (
                  <div key={i} className="h-20 bg-slate-100 rounded-lg animate-pulse" />
                ))}
              </div>
            </div>
          ) : (
            <CalendarGrid
              year={year}
              month={month}
              events={monthEvents}
              selectedDay={selectedDay}
              onDayClick={d => setSelectedDay(prev => prev === d ? null : d)}
            />
          )}

          {/* Selected day panel */}
          {selectedDay !== null && (
            <div className="bg-white rounded-2xl shadow p-4">
              <h3 className="font-semibold text-slate-800 text-sm mb-3">
                {selectedDayEvents.length > 0
                  ? `Événements du ${selectedDay} ${MONTHS_FR[month].toLowerCase()}`
                  : `Aucun événement le ${selectedDay} ${MONTHS_FR[month].toLowerCase()}`}
              </h3>
              <div className="space-y-2">
                {selectedDayEvents.map(ev => (
                  <div
                    key={ev.id}
                    onClick={() => navigate(`/events/${ev.id}`)}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <EventTypeChip type={ev.type} />
                    <span className="font-medium text-slate-800 text-sm flex-1 truncate">{ev.title}</span>
                    {ev.location && (
                      <span className="text-xs text-slate-400 hidden sm:block">{ev.location}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── List view ── */}
      {view === 'list' && (
        <div className="bg-white rounded-2xl shadow overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="h-7 w-24 bg-slate-100 rounded-lg animate-pulse" />
                  <div className="h-7 flex-1 bg-slate-100 rounded-lg animate-pulse" />
                  <div className="h-7 w-20 bg-slate-100 rounded-lg animate-pulse" />
                </div>
              ))}
            </div>
          ) : allEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
              <Calendar size={48} strokeWidth={1.5} />
              <p className="text-base">Aucun événement à venir.</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      {['Date', 'Type', 'Titre', 'Lieu', 'Rôles ciblés'].map(h => (
                        <th
                          key={h}
                          className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide"
                        >
                          {h}
                        </th>
                      ))}
                      {canEdit && <th className="w-12" />}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {allEvents.map(ev => (
                      <tr key={ev.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-4 text-slate-500 whitespace-nowrap">
                          {formatDateFR(evDate(ev))}
                        </td>
                        <td className="px-5 py-4">
                          <EventTypeChip type={ev.type} />
                        </td>
                        <td className="px-5 py-4">
                          <button
                            onClick={() => navigate(`/events/${ev.id}`)}
                            className="font-medium text-slate-900 hover:text-primary-600 transition-colors text-left"
                          >
                            {ev.title}
                          </button>
                        </td>
                        <td className="px-5 py-4 text-slate-500 max-w-xs truncate">
                          {ev.location ?? '—'}
                        </td>
                        <td className="px-5 py-4">
                          {ev.targetRoles && ev.targetRoles.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {ev.targetRoles.map(r => (
                                <span
                                  key={r}
                                  className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs"
                                >
                                  {ROLE_LABELS[r as Role] ?? r}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">Tous</span>
                          )}
                        </td>
                        {canEdit && (
                          <td className="px-4 py-4">
                            <div className="relative" onClick={e => e.stopPropagation()}>
                              <button
                                onClick={() => setOpenMenuId(openMenuId === ev.id ? null : ev.id)}
                                className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                              >
                                <MoreVertical size={16} />
                              </button>
                              {openMenuId === ev.id && (
                                <div className="absolute right-0 top-9 z-10 bg-white rounded-xl shadow-lg border border-slate-100 py-1 w-36">
                                  <button
                                    onClick={() => { navigate(`/events/${ev.id}`); setOpenMenuId(null) }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                  >
                                    <Eye size={14} /> Voir
                                  </button>
                                  <button
                                    onClick={() => { navigate(`/events/${ev.id}`); setOpenMenuId(null) }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                  >
                                    <Pencil size={14} /> Modifier
                                  </button>
                                  <button
                                    onClick={() => { setDeleteId(ev.id); setOpenMenuId(null) }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                                  >
                                    <Trash2 size={14} /> Supprimer
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-slate-100">
                {allEvents.map(ev => (
                  <div key={ev.id} className="flex items-start gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <EventTypeChip type={ev.type} />
                        <span className="text-xs text-slate-400">{formatDateFR(evDate(ev))}</span>
                      </div>
                      <button
                        onClick={() => navigate(`/events/${ev.id}`)}
                        className="font-medium text-slate-900 text-sm mt-1 hover:text-primary-600 transition-colors text-left w-full truncate block"
                      >
                        {ev.title}
                      </button>
                      {ev.targetRoles && ev.targetRoles.length > 0 && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          {ev.targetRoles.map(r => ROLE_LABELS[r as Role] ?? r).join(', ')}
                        </p>
                      )}
                    </div>
                    {canEdit && (
                      <div className="relative" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => setOpenMenuId(openMenuId === ev.id ? null : ev.id)}
                          className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400"
                        >
                          <MoreVertical size={16} />
                        </button>
                        {openMenuId === ev.id && (
                          <div className="absolute right-0 top-9 z-10 bg-white rounded-xl shadow-lg border border-slate-100 py-1 w-36">
                            <button
                              onClick={() => { navigate(`/events/${ev.id}`); setOpenMenuId(null) }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                            >
                              <Eye size={14} /> Voir
                            </button>
                            <button
                              onClick={() => { setDeleteId(ev.id); setOpenMenuId(null) }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                            >
                              <Trash2 size={14} /> Supprimer
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Slide-over: Create ── */}
      {isSlideOverOpen && (
        <EventSlideOver
          form={form}
          onChange={handleChange}
          onToggleRole={handleToggleRole}
          onClose={() => { setIsSlideOverOpen(false); setForm(EMPTY_FORM); setFormError(null) }}
          onSubmit={handleSubmit}
          isPending={createMutation.isPending}
          error={formError}
        />
      )}

      {/* ── Confirm: Delete ── */}
      {deleteId !== null && (
        <ConfirmDialog
          message="Êtes-vous sûr de vouloir supprimer cet événement ?"
          onConfirm={() => deleteMutation.mutate(deleteId)}
          onCancel={() => setDeleteId(null)}
          isPending={deleteMutation.isPending}
        />
      )}
    </div>
  )
}
