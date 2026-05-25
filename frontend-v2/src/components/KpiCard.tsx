import type { ReactNode } from 'react'

export interface KpiCardProps {
  title: string
  value?: number | string
  total?: number
  icon: ReactNode
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red'
  trend?: number // % change vs previous period (positive = up)
  isLoading?: boolean
}

const colorMap: Record<KpiCardProps['color'], { bg: string; icon: string; trend: string }> = {
  blue:   { bg: 'bg-blue-50',   icon: 'text-blue-500',   trend: 'text-blue-600'   },
  green:  { bg: 'bg-green-50',  icon: 'text-green-500',  trend: 'text-green-600'  },
  purple: { bg: 'bg-purple-50', icon: 'text-purple-500', trend: 'text-purple-600' },
  orange: { bg: 'bg-orange-50', icon: 'text-orange-500', trend: 'text-orange-600' },
  red:    { bg: 'bg-red-50',    icon: 'text-red-500',    trend: 'text-red-600'    },
}

export function KpiCard({ title, value, total, icon, color, trend, isLoading }: KpiCardProps) {
  const c = colorMap[color]
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-slate-500">{title}</span>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${c.bg} ${c.icon}`}>
          {icon}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <div className="h-8 bg-slate-200 rounded animate-pulse w-16" />
          <div className="h-3 bg-slate-100 rounded animate-pulse w-24" />
        </div>
      ) : (
        <>
          <p className="text-3xl font-bold text-slate-900">
            {value ?? '—'}
          </p>
          <div className="flex items-center gap-2 mt-1 min-h-[1.25rem]">
            {total != null && (
              <span className="text-xs text-slate-500">sur {total}</span>
            )}
            {trend != null && (
              <span
                className={`text-xs font-medium ${
                  trend >= 0 ? 'text-green-600' : 'text-red-500'
                }`}
              >
                {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}%
              </span>
            )}
          </div>
        </>
      )}
    </div>
  )
}
