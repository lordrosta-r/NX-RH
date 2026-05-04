import React from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import clsx from 'clsx'

export interface StatCardProps {
  label: string
  value: string | number
  icon?: React.ReactNode
  iconColor?: string
  trend?: number       // positif = hausse, négatif = baisse, 0 = stable
  trendLabel?: string
  loading?: boolean
  className?: string
}

export default function StatCard({ label, value, icon, iconColor = 'bg-primary-50 text-primary-600', trend, trendLabel, loading = false, className }: StatCardProps) {
  const TrendIcon = trend == null || trend === 0 ? Minus : trend > 0 ? TrendingUp : TrendingDown
  const trendColor = trend == null || trend === 0 ? 'text-slate-400' : trend > 0 ? 'text-success-600' : 'text-error-600'

  if (loading) {
    return (
      <div className={clsx('bg-white rounded-xl border border-slate-200 p-5 shadow-sm', className)}>
        <div className="flex items-center justify-between mb-3">
          <div className="h-3 w-24 bg-slate-200 rounded animate-pulse" />
          <div className="h-10 w-10 bg-slate-200 rounded-xl animate-pulse" />
        </div>
        <div className="h-8 w-16 bg-slate-200 rounded animate-pulse" />
      </div>
    )
  }

  return (
    <div className={clsx('bg-white rounded-xl border border-slate-200 p-5 shadow-sm', className)}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        {icon && (
          <div className={clsx('p-2.5 rounded-xl', iconColor)}>
            {icon}
          </div>
        )}
      </div>
      <p className="text-3xl font-bold text-slate-900">{value}</p>
      {(trend != null || trendLabel) && (
        <div className={clsx('flex items-center gap-1 mt-2 text-sm', trendColor)}>
          <TrendIcon className="w-4 h-4" />
          {trend != null && <span>{Math.abs(trend)}%</span>}
          {trendLabel && <span className="text-slate-500 ml-1">{trendLabel}</span>}
        </div>
      )}
    </div>
  )
}
