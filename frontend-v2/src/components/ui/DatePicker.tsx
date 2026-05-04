import React, { useState, useRef, useEffect } from 'react'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import clsx from 'clsx'

export interface DatePickerProps {
  value?: Date | null
  onChange: (date: Date | null) => void
  minDate?: Date
  maxDate?: Date
  placeholder?: string
  disabled?: boolean
  error?: boolean
  label?: string
}

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]
const DAYS_FR = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di']

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

function isToday(date: Date) {
  return isSameDay(date, new Date())
}

export default function DatePicker({ value, onChange, minDate, maxDate, placeholder = 'Sélectionner une date', disabled = false, error = false, label }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [viewDate, setViewDate] = useState(value || new Date())
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function getDaysInMonth(year: number, month: number) {
    const days: Date[] = []
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDow = (firstDay.getDay() + 6) % 7
    for (let i = 0; i < startDow; i++) {
      days.push(new Date(year, month, 1 - (startDow - i)))
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d))
    }
    return days
  }

  const days = getDaysInMonth(viewDate.getFullYear(), viewDate.getMonth())

  function isOutOfRange(date: Date) {
    if (minDate && date < minDate) return true
    if (maxDate && date > maxDate) return true
    return false
  }

  const displayValue = value
    ? `${value.getDate().toString().padStart(2, '0')}/${(value.getMonth() + 1).toString().padStart(2, '0')}/${value.getFullYear()}`
    : ''

  return (
    <div className="relative w-full" ref={containerRef}>
      {label && <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>}
      <div
        className={clsx(
          'flex items-center h-10 w-full rounded-lg border text-sm cursor-pointer transition-colors',
          'focus-within:ring-2 focus-within:ring-offset-0',
          error
            ? 'border-error-500 ring-2 ring-error-200'
            : 'border-slate-300 focus-within:border-primary-500 focus-within:ring-primary-200',
          disabled && 'opacity-50 cursor-not-allowed bg-slate-100'
        )}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className={clsx('flex-1 px-3', displayValue ? 'text-slate-700' : 'text-slate-400')}>
          {displayValue || placeholder}
        </span>
        <Calendar className="w-4 h-4 text-slate-400 mr-3 flex-shrink-0" />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 p-4 z-50 w-72">
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
              className="p-1 rounded hover:bg-slate-100 text-slate-600"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-slate-700">
              {MONTHS_FR[viewDate.getMonth()]} {viewDate.getFullYear()}
            </span>
            <button
              type="button"
              onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
              className="p-1 rounded hover:bg-slate-100 text-slate-600"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 mb-1">
            {DAYS_FR.map(d => (
              <div key={d} className="text-center text-xs font-medium text-slate-400 py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {days.map((date, i) => {
              const isCurrentMonth = date.getMonth() === viewDate.getMonth()
              const isSelected = value ? isSameDay(date, value) : false
              const today = isToday(date)
              const outOfRange = isOutOfRange(date)

              return (
                <button
                  key={i}
                  type="button"
                  disabled={outOfRange || !isCurrentMonth}
                  onClick={() => {
                    if (!outOfRange && isCurrentMonth) {
                      onChange(date)
                      setIsOpen(false)
                    }
                  }}
                  className={clsx(
                    'h-8 w-8 mx-auto rounded-lg text-xs flex items-center justify-center transition-colors',
                    !isCurrentMonth && 'text-slate-300',
                    isCurrentMonth && !isSelected && !outOfRange && 'hover:bg-primary-50 text-slate-700',
                    isSelected && 'bg-primary-500 text-white',
                    today && !isSelected && 'border border-primary-300',
                    outOfRange && 'opacity-30 cursor-not-allowed'
                  )}
                >
                  {date.getDate()}
                </button>
              )
            })}
          </div>
          {value && (
            <button
              type="button"
              onClick={() => { onChange(null); setIsOpen(false) }}
              className="mt-3 w-full text-xs text-slate-500 hover:text-slate-700 text-center"
            >
              Effacer la date
            </button>
          )}
        </div>
      )}
    </div>
  )
}
