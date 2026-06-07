import React from 'react'
import clsx from 'clsx'

export interface TimelineItem {
  id: string
  icon?: React.ReactNode
  label: string
  description?: string
  date?: string
  color?: string  // Tailwind bg class for dot
}

export interface TimelineProps {
  items: TimelineItem[]
  className?: string
}

export default function Timeline({ items, className }: TimelineProps) {
  return (
    <ol className={clsx('relative', className)}>
      {items.map((item, i) => (
        <li key={item.id} className="relative pl-10 pb-6 last:pb-0">
          {/* Vertical line */}
          {i < items.length - 1 && (
            <span
              className="absolute left-3.5 top-6 bottom-0 w-px bg-slate-200"
              aria-hidden
            />
          )}
          {/* Dot / icon */}
          <span
            className={clsx(
              'absolute left-0 top-0.5 flex items-center justify-center w-7 h-7 rounded-full ring-4 ring-white',
              item.color || 'bg-primary-100 text-primary-600'
            )}
          >
            {item.icon || <span className="w-2 h-2 rounded-full bg-primary-500" />}
          </span>
          {/* Content */}
          <div>
            <div className="flex items-baseline gap-2">
              <h3 className="text-sm font-semibold text-slate-900">{item.label}</h3>
              {item.date && <time className="text-xs text-slate-500">{item.date}</time>}
            </div>
            {item.description && <p className="mt-0.5 text-sm text-slate-600">{item.description}</p>}
          </div>
        </li>
      ))}
    </ol>
  )
}
