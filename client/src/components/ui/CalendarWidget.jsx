// =============================================================================
// CalendarWidget — Mini-calendrier d'échéances (composant partagé)
// Générique : aucune clé i18n hardcodée.
// Props:
//   title   {string}  — label affiché en haut (fourni par la page parente)
//   events  {Array}   — [{ date, type, label, typeLabel, color }]
//   locale  {string}  — 'fr' | 'en'
// Design: docs/design/dashboard/DESIGN.md
// =============================================================================

import React, { useState } from 'react'
import './CalendarWidget.css'

function ChevronLeft() {
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

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfWeek(year, month) {
  const day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1
}

export default function CalendarWidget({
  title = '',
  events = [],
  locale = 'fr',
  labelPrevMonth = 'Previous month',
  labelNextMonth = 'Next month',
}) {
  const today = new Date()
  const [viewYear,    setViewYear]    = useState(today.getFullYear())
  const [viewMonth,   setViewMonth]   = useState(today.getMonth())
  const [selectedDay, setSelectedDay] = useState(null)

  const daysInMonth    = getDaysInMonth(viewYear, viewMonth)
  const firstDayOfWeek = getFirstDayOfWeek(viewYear, viewMonth)

  const prevMonth = () => {
    setSelectedDay(null)
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    setSelectedDay(null)
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString(
    locale === 'fr' ? 'fr-FR' : 'en-US',
    { month: 'long', year: 'numeric' }
  )

  // Map events by day
  const eventsByDay = {}
  events.forEach(evt => {
    const d = new Date(evt.date)
    if (d.getFullYear() === viewYear && d.getMonth() === viewMonth) {
      const day = d.getDate()
      if (!eventsByDay[day]) eventsByDay[day] = []
      eventsByDay[day].push(evt)
    }
  })

  const cells = []
  for (let b = 0; b < firstDayOfWeek; b++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const isToday = (day) =>
    day === today.getDate() &&
    viewMonth === today.getMonth() &&
    viewYear === today.getFullYear()

  const dayHeaders = locale === 'fr'
    ? ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di']
    : ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

  // Legend: unique types, use typeLabel from event
  const legendItems = [...new Map(events.map(e => [e.type, e])).values()]

  return (
    <div className="cal">

      <div className="cal__header">
        <div className="cal__title-wrap">
          <span className="cal__label">{title.toUpperCase()}</span>
          <h3 className="cal__month">{monthLabel}</h3>
        </div>
        <div className="cal__nav">
          <button type="button" className="cal__nav-btn" onClick={prevMonth} aria-label={labelPrevMonth}>
            <ChevronLeft />
          </button>
          <button type="button" className="cal__nav-btn" onClick={nextMonth} aria-label={labelNextMonth}>
            <ChevronRight />
          </button>
        </div>
      </div>

      <div className="cal__dow">
        {dayHeaders.map(h => (
          <span key={h} className="cal__dow-cell">{h}</span>
        ))}
      </div>

      <div className="cal__grid">
        {cells.map((day, i) => {
          if (!day) return <span key={`blank-${i}`} className="cal__cell cal__cell--blank" />
          const evts = eventsByDay[day] ?? []
          return (
            <button
              key={day}
              type="button"
              className={['cal__cell',
                isToday(day)       ? 'cal__cell--today'     : '',
                evts.length        ? 'cal__cell--has-event' : '',
                selectedDay === day ? 'cal__cell--selected'  : '',
              ].filter(Boolean).join(' ')}
              onClick={() => evts.length && setSelectedDay(selectedDay === day ? null : day)}
              aria-label={`${day}${evts.length ? ': ' + evts.map(e => e.label).join(', ') : ''}`}
              aria-expanded={evts.length ? selectedDay === day : undefined}
            >
              <span className="cal__day-num">{day}</span>
              {evts.length > 0 && (
                <span className="cal__dots">
                  {evts.slice(0, 3).map((evt, idx) => (
                    <span key={idx} className="cal__dot" style={{ background: evt.color }} />
                  ))}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="cal__legend">
        {legendItems.map(evt => (
          <span key={evt.type} className="cal__legend-item">
            <span className="cal__legend-dot" style={{ background: evt.color }} />
            <span className="cal__legend-label">{evt.typeLabel}</span>
          </span>
        ))}
      </div>

      {selectedDay && eventsByDay[selectedDay] && (
        <div className="cal__detail" role="region" aria-live="polite">
          <p className="cal__detail__date">
            {new Date(viewYear, viewMonth, selectedDay).toLocaleDateString(
              locale === 'fr' ? 'fr-FR' : 'en-US',
              { day: 'numeric', month: 'long' }
            )}
          </p>
          {eventsByDay[selectedDay].map((evt, i) => (
            <div key={i} className="cal__detail__evt">
              <span className="cal__detail__dot" style={{ background: evt.color }} />
              <span className="cal__detail__label">{evt.label}</span>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}
