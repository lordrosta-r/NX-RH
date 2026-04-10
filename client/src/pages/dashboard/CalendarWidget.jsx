// =============================================================================
// CalendarWidget — Mini-calendrier d'échéances employé
// Affiche le mois en cours, navigation prev/next, jours avec événements RH.
// Les événements sont injectés via prop `events` (mock dans Dashboard pour l'instant).
// Design: docs/design/dashboard/DESIGN.md
// =============================================================================

import React, { useState } from 'react'
import './CalendarWidget.css'

// ── Chevron inline (pas de dépendance externe) ───────────────────────────────
function ChevronLeft()  {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}
function ChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfWeek(year, month) {
  // Monday = 0, Sunday = 6
  const day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1
}

// ── Component ────────────────────────────────────────────────────────────────
export default function CalendarWidget({ t, events = [], locale = 'fr' }) {
  const today = new Date()
  const [viewYear,  setViewYear]  = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  const daysInMonth  = getDaysInMonth(viewYear, viewMonth)
  const firstDayOfWeek = getFirstDayOfWeek(viewYear, viewMonth)

  // Navigate
  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  // Month + year label
  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString(
    locale === 'fr' ? 'fr-FR' : 'en-US',
    { month: 'long', year: 'numeric' }
  )

  // Map events by day (only current month/year)
  const eventsByDay = {}
  events.forEach(evt => {
    const d = new Date(evt.date)
    if (d.getFullYear() === viewYear && d.getMonth() === viewMonth) {
      const day = d.getDate()
      if (!eventsByDay[day]) eventsByDay[day] = []
      eventsByDay[day].push(evt)
    }
  })

  // Build day cells (blanks + days)
  const cells = []
  for (let b = 0; b < firstDayOfWeek; b++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const isToday = (day) =>
    day === today.getDate() &&
    viewMonth === today.getMonth() &&
    viewYear === today.getFullYear()

  // Day-of-week headers
  const dayHeaders = locale === 'fr'
    ? ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di']
    : ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

  return (
    <div className="cal">

      {/* Header — month nav */}
      <div className="cal__header">
        <div className="cal__title-wrap">
          <span className="cal__label">{t('dashboard.calendar.title').toUpperCase()}</span>
          <h3 className="cal__month">{monthLabel}</h3>
        </div>
        <div className="cal__nav">
          <button className="cal__nav-btn" onClick={prevMonth} aria-label="Mois précédent">
            <ChevronLeft />
          </button>
          <button className="cal__nav-btn" onClick={nextMonth} aria-label="Mois suivant">
            <ChevronRight />
          </button>
        </div>
      </div>

      {/* Day-of-week row */}
      <div className="cal__dow">
        {dayHeaders.map(h => (
          <span key={h} className="cal__dow-cell">{h}</span>
        ))}
      </div>

      {/* Day grid */}
      <div className="cal__grid">
        {cells.map((day, i) => {
          if (!day) return <span key={`blank-${i}`} className="cal__cell cal__cell--blank" />

          const evts = eventsByDay[day] ?? []
          return (
            <button
              key={day}
              className={[
                'cal__cell',
                isToday(day)   ? 'cal__cell--today'   : '',
                evts.length    ? 'cal__cell--has-event' : '',
              ].join(' ')}
              aria-label={evts.length ? evts.map(e => e.label).join(', ') : undefined}
            >
              <span className="cal__day-num">{day}</span>
              {evts.length > 0 && (
                <span className="cal__dots">
                  {evts.slice(0, 3).map((evt, idx) => (
                    <span
                      key={idx}
                      className="cal__dot"
                      style={{ background: evt.color }}
                    />
                  ))}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="cal__legend">
        {[...new Map(events.map(e => [e.type, e])).values()].map(evt => (
          <span key={evt.type} className="cal__legend-item">
            <span className="cal__legend-dot" style={{ background: evt.color }} />
            <span className="cal__legend-label">{t(`dashboard.calendar.type.${evt.type}`)}</span>
          </span>
        ))}
      </div>

    </div>
  )
}
