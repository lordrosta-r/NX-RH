import React from 'react'
import clsx from 'clsx'

export interface DataCardProps {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  badge?: React.ReactNode
  actions?: React.ReactNode
  meta?: React.ReactNode
  selected?: boolean
}

export default function DataCard({ children, onClick, className, badge, actions, meta, selected }: DataCardProps) {
  return (
    <div
      className={clsx(
        'bg-white rounded-xl border border-slate-200 p-5 transition-all duration-150',
        onClick && 'cursor-pointer hover:shadow-lg hover:scale-[1.01]',
        selected && 'ring-2 ring-primary-500 border-primary-200',
        'shadow-sm',
        className
      )}
      onClick={onClick}
    >
      {(badge || actions) && (
        <div className="flex items-start justify-between mb-3">
          <div>{badge}</div>
          <div onClick={e => e.stopPropagation()}>{actions}</div>
        </div>
      )}
      {children}
      {meta && <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">{meta}</div>}
    </div>
  )
}
