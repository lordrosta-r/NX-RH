import React from 'react'
import clsx from 'clsx'

export interface SkeletonProps {
  variant?: 'line' | 'circle' | 'rect'
  width?: string
  height?: string
  className?: string
}

export default function Skeleton({ variant = 'line', width, height, className }: SkeletonProps) {
  return (
    <div
      className={clsx(
        'bg-slate-200 animate-pulse',
        variant === 'line' && 'h-4 rounded',
        variant === 'circle' && 'rounded-full',
        variant === 'rect' && 'rounded-lg',
        width,
        height,
        className
      )}
      aria-hidden="true"
    />
  )
}
