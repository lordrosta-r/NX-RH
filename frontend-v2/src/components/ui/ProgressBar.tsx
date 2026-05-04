import React from 'react'
import clsx from 'clsx'

export interface ProgressBarProps {
  value: number          // 0–100
  max?: number
  size?: 'thin' | 'thick'
  color?: string         // Tailwind bg class, e.g. 'bg-primary-500'
  showLabel?: boolean
  label?: string
  className?: string
}

export default function ProgressBar({ value, max = 100, size = 'thick', color = 'bg-primary-500', showLabel = false, label, className }: ProgressBarProps) {
  const pct = Math.round(Math.min(100, Math.max(0, (value / max) * 100)))

  return (
    <div className={clsx('w-full', className)}>
      {(showLabel || label) && (
        <div className="flex justify-between items-center mb-1">
          {label && <span className="text-xs font-medium text-slate-600">{label}</span>}
          {showLabel && <span className="text-xs font-semibold text-slate-700">{pct}%</span>}
        </div>
      )}
      <div
        className={clsx(
          'w-full bg-slate-200 rounded-full overflow-hidden',
          size === 'thin' ? 'h-1' : 'h-2'
        )}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className={clsx('h-full rounded-full transition-all duration-300', color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
