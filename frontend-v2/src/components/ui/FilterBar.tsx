import React from 'react'
import clsx from 'clsx'

export interface FilterBarProps {
  children: React.ReactNode
  className?: string
}

export default function FilterBar({ children, className }: FilterBarProps) {
  return (
    <div className={clsx('flex flex-wrap items-center gap-3', className)}>
      {children}
    </div>
  )
}
