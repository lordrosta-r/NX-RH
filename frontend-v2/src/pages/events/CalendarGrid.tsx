import type { LucideIcon } from 'lucide-react'
import {
  Clock, MessageSquare, Users, Star, BarChart2,
  ClipboardList, LogOut, Calendar,
} from 'lucide-react'
import type { CalendarEvent, EventType } from '../../types'

// ── Config ────────────────────────────────────────────────────────────────────

interface EventConfigItem {
  bg: string
  text: string
  dot: string
  Icon: LucideIcon
  label: string
}

export const EVENT_CONFIG: Record<EventType, EventConfigItem> = {
  deadline:    { bg: 'bg-red-100',     text: 'text-red-700',     dot: 'bg-red-400',     Icon: Clock,         label: 'Deadline'    },
  interview:   { bg: 'bg-primary-100', text: 'text-primary-700', dot: 'bg-primary-400', Icon: MessageSquare, label: 'Entretien'   },
  meeting:     { bg: 'bg-blue-100',    text: 'text-blue-700',    dot: 'bg-blue-400',    Icon: Users,         label: 'Réunion'     },
  feedback:    { bg: 'bg-green-100',   text: 'text-green-700',   dot: 'bg-green-400',   Icon: Star,          label: 'Feedback'    },
  campaign:    { bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-400',   Icon: BarChart2,     label: 'Campagne'    },
  evaluation:  { bg: 'bg-purple-100',  text: 'text-purple-700',  dot: 'bg-purple-400',  Icon: ClipboardList, label: 'Évaluation'  },
  offboarding: { bg: 'bg-slate-100',   text: 'text-slate-700',   dot: 'bg-slate-400',   Icon: LogOut,        label: 'Offboarding' },
  other:       { bg: 'bg-slate-100',   text: 'text-slate-600',   dot: 'bg-slate-300',   Icon: Calendar,      label: 'Autre'       },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const DAYS_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function firstWeekday(year: number, month: number): number {
  const d = new Date(year, month, 1).getDay()
  return d === 0 ? 6 : d - 1
}

export function sameDay(s: string, y: number, m: number, d: number): boolean {
  const date = new Date(s)
  return date.getFullYear() === y && date.getMonth() === m && date.getDate() === d
}

export const evDate = (e: CalendarEvent): string => e.startDate ?? e.date ?? ''

// ── EventTypeChip ─────────────────────────────────────────────────────────────

export function EventTypeChip({ type }: { type: EventType }) {
  const c = EVENT_CONFIG[type]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      <c.Icon size={12} />
      {c.label}
    </span>
  )
}

// ── CalendarGrid ──────────────────────────────────────────────────────────────

export interface CalendarGridProps {
  year: number
  month: number
  events: CalendarEvent[]
  selectedDay: number | null
  onDayClick: (d: number) => void
}

export function CalendarGrid({ year, month, events, selectedDay, onDayClick }: CalendarGridProps) {
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
