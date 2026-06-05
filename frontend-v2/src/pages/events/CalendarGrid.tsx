/* eslint-disable react-refresh/only-export-components -- fichier exporte aussi EVENT_CONFIG/sameDay/evDate (helpers partagés), préexistant */
import type { LucideIcon } from "lucide-react";
import {
  Clock,
  MessageSquare,
  Users,
  Star,
  BarChart2,
  ClipboardList,
  LogOut,
  Calendar,
} from "lucide-react";
import type { CalendarEvent, EventType } from "../../types";

// ── Config ────────────────────────────────────────────────────────────────────

interface EventConfigItem {
  bg: string;
  text: string;
  dot: string;
  Icon: LucideIcon;
  label: string;
}

// Couleurs mappées sur les tokens du design system institutionnel.
export const EVENT_CONFIG: Record<EventType, EventConfigItem> = {
  deadline: {
    bg: "var(--red-soft)",
    text: "var(--red)",
    dot: "var(--red)",
    Icon: Clock,
    label: "Deadline",
  },
  interview: {
    bg: "var(--blue-soft)",
    text: "var(--blue)",
    dot: "var(--blue)",
    Icon: MessageSquare,
    label: "Entretien",
  },
  meeting: {
    bg: "var(--blue-soft)",
    text: "var(--blue)",
    dot: "var(--blue)",
    Icon: Users,
    label: "Réunion",
  },
  feedback: {
    bg: "var(--green-soft)",
    text: "var(--green)",
    dot: "var(--green)",
    Icon: Star,
    label: "Feedback",
  },
  campaign: {
    bg: "var(--amber-soft)",
    text: "var(--amber)",
    dot: "var(--amber)",
    Icon: BarChart2,
    label: "Campagne",
  },
  evaluation: {
    bg: "var(--blue-soft)",
    text: "var(--blue)",
    dot: "var(--blue)",
    Icon: ClipboardList,
    label: "Évaluation",
  },
  offboarding: {
    bg: "var(--bg-alt-2)",
    text: "var(--ink-2)",
    dot: "var(--ink-3)",
    Icon: LogOut,
    label: "Offboarding",
  },
  other: {
    bg: "var(--bg-alt-2)",
    text: "var(--ink-2)",
    dot: "var(--ink-3)",
    Icon: Calendar,
    label: "Autre",
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const DAYS_SHORT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function firstWeekday(year: number, month: number): number {
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1;
}

export function sameDay(s: string, y: number, m: number, d: number): boolean {
  const date = new Date(s);
  return (
    date.getFullYear() === y && date.getMonth() === m && date.getDate() === d
  );
}

export const evDate = (e: CalendarEvent): string => e.startDate ?? e.date ?? "";

// ── EventTypeChip ─────────────────────────────────────────────────────────────

export function EventTypeChip({ type }: { type: EventType }) {
  const c = EVENT_CONFIG[type];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={{ background: c.bg, color: c.text }}
    >
      <c.Icon size={12} />
      {c.label}
    </span>
  );
}

// ── CalendarGrid ──────────────────────────────────────────────────────────────

export interface CalendarGridProps {
  year: number;
  month: number;
  events: CalendarEvent[];
  selectedDay: number | null;
  onDayClick: (d: number) => void;
}

export function CalendarGrid({
  year,
  month,
  events,
  selectedDay,
  onDayClick,
}: CalendarGridProps) {
  const dim = daysInMonth(year, month);
  const fwd = firstWeekday(year, month);
  const cells: Array<number | null> = [
    ...Array.from({ length: fwd }, () => null),
    ...Array.from({ length: dim }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const today = new Date();
  const isToday = (d: number) =>
    today.getFullYear() === year &&
    today.getMonth() === month &&
    today.getDate() === d;

  return (
    <div
      className="w-full p-4"
      style={{
        background: "#fff",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius-lg)",
      }}
    >
      <div className="grid grid-cols-7 mb-2">
        {DAYS_SHORT.map((d) => (
          <div key={d} className="small text-center py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px">
        {cells.map((day, i) =>
          day === null ? (
            <div
              key={`cell-${i}`}
              className="h-20"
              style={{
                background: "var(--bg-alt)",
                borderRadius: "var(--radius)",
              }}
            />
          ) : (
            <button
              key={`cell-${i}`}
              onClick={() => onDayClick(day)}
              aria-label={`Jour ${day}`}
              aria-pressed={selectedDay === day}
              className="h-20 p-1.5 text-left transition-colors"
              style={{
                borderRadius: "var(--radius)",
                border:
                  selectedDay === day
                    ? "1px solid var(--blue)"
                    : "1px solid var(--line)",
                background: selectedDay === day ? "var(--blue-soft)" : "#fff",
              }}
            >
              <span
                className="inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-medium"
                style={
                  isToday(day)
                    ? { background: "var(--blue)", color: "#fff" }
                    : { color: "var(--ink-2)" }
                }
              >
                {day}
              </span>
              <div className="mt-1 space-y-px overflow-hidden">
                {events
                  .filter((e) => sameDay(evDate(e), year, month, day))
                  .slice(0, 2)
                  .map((ev) => {
                    const c = EVENT_CONFIG[ev.type];
                    return (
                      <div
                        key={ev.id}
                        className="flex items-center gap-1 px-1 overflow-hidden"
                        style={{
                          background: c.bg,
                          color: c.text,
                          borderRadius: "var(--radius)",
                        }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ background: c.dot }}
                        />
                        <span className="text-xs truncate leading-tight">
                          {ev.title}
                        </span>
                      </div>
                    );
                  })}
                {events.filter((e) => sameDay(evDate(e), year, month, day))
                  .length > 2 && (
                  <div className="small pl-1">
                    +
                    {events.filter((e) => sameDay(evDate(e), year, month, day))
                      .length - 2}
                  </div>
                )}
              </div>
            </button>
          ),
        )}
      </div>
    </div>
  );
}
