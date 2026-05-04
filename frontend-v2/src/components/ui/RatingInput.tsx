import React from 'react'
import { Star } from 'lucide-react'
import clsx from 'clsx'

export interface RatingInputProps {
  value?: number | null
  onChange: (value: number) => void
  mode: 'stars' | 'scale'
  min?: number
  max?: number
  labels?: Record<number, string>
  disabled?: boolean
  readonly?: boolean
}

export default function RatingInput({
  value,
  onChange,
  mode,
  min = 1,
  max,
  labels,
  disabled = false,
  readonly = false,
}: RatingInputProps) {
  const effectiveMax = max ?? (mode === 'stars' ? 5 : 10)
  const items = Array.from({ length: effectiveMax - min + 1 }, (_, i) => min + i)

  if (mode === 'stars') {
    return (
      <div className="flex items-center gap-1" role="group" aria-label="Note">
        {items.map(i => (
          <button
            key={i}
            type="button"
            disabled={disabled || readonly}
            onClick={() => !disabled && !readonly && onChange(i)}
            aria-label={`Note ${i} sur ${effectiveMax}`}
            className={clsx(
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 rounded',
              (disabled || readonly) && 'cursor-not-allowed'
            )}
          >
            <Star
              className={clsx(
                'w-8 h-8 transition-colors',
                value != null && i <= value
                  ? 'text-warning-400 fill-warning-400'
                  : 'text-slate-300',
                !disabled && !readonly && 'hover:text-warning-400'
              )}
            />
          </button>
        ))}
        {value && labels?.[value] && (
          <span className="ml-2 text-sm text-slate-600">{labels[value]}</span>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-1" role="group" aria-label="Note">
      {items.map(i => (
        <button
          key={i}
          type="button"
          disabled={disabled || readonly}
          onClick={() => !disabled && !readonly && onChange(i)}
          aria-label={`Note ${i} sur ${effectiveMax}`}
          className={clsx(
            'w-10 h-10 rounded-lg text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300',
            value === i
              ? 'bg-primary-500 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-primary-50',
            (disabled || readonly) && 'cursor-not-allowed opacity-60'
          )}
        >
          {i}
        </button>
      ))}
      {value && labels?.[value] && (
        <span className="ml-2 self-center text-sm text-slate-600">{labels[value]}</span>
      )}
    </div>
  )
}
