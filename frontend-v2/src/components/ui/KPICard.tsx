import type { ReactNode } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export interface KPICardProps {
  title: string
  value: string | number
  subtitle?: string
  trend?: {
    value: number
    direction: 'up' | 'down' | 'neutral'
  }
  icon?: ReactNode
  color?: 'primary' | 'success' | 'warning' | 'danger'
  isLoading?: boolean
}

const colorConfig = {
  primary: {
    bg: 'bg-primary-50 dark:bg-primary-900/20',
    icon: 'text-primary-600 dark:text-primary-400',
    border: 'border-primary-100 dark:border-primary-800',
  },
  success: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    icon: 'text-green-600 dark:text-green-400',
    border: 'border-green-100 dark:border-green-800',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    icon: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-100 dark:border-amber-800',
  },
  danger: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    icon: 'text-red-600 dark:text-red-400',
    border: 'border-red-100 dark:border-red-800',
  },
} as const

const trendColor = {
  up: 'text-green-600 dark:text-green-400',
  down: 'text-red-500 dark:text-red-400',
  neutral: 'text-slate-500 dark:text-slate-400',
} as const

const TrendIcon = ({ direction }: { direction: 'up' | 'down' | 'neutral' }) => {
  if (direction === 'up') return <TrendingUp className="w-3 h-3" />
  if (direction === 'down') return <TrendingDown className="w-3 h-3" />
  return <Minus className="w-3 h-3" />
}

export function KPICard({
  title,
  value,
  subtitle,
  trend,
  icon,
  color = 'primary',
  isLoading,
}: KPICardProps) {
  const c = colorConfig[color]

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="h-4 w-28 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          <div className="w-9 h-9 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse" />
        </div>
        <div className="h-8 w-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-2" />
        <div className="h-3 w-32 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" />
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</span>
        {icon && (
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${c.bg} ${c.icon} ${c.border} border`}>
            {icon}
          </div>
        )}
      </div>

      <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 leading-none">
        {value}
      </p>

      <div className="flex flex-col gap-1 min-h-[1.25rem]">
        {trend && (
          <span className={`inline-flex items-center gap-1 text-xs font-medium ${trendColor[trend.direction]}`}>
            <TrendIcon direction={trend.direction} />
            {trend.value > 0 ? '+' : ''}{trend.value}% vs mois dernier
          </span>
        )}
        {subtitle && (
          <span className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</span>
        )}
      </div>
    </div>
  )
}
