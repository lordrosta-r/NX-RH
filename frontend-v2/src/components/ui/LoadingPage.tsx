import Skeleton from './Skeleton'
import clsx from 'clsx'

export interface LoadingPageProps {
  variant?: 'table' | 'cards' | 'form'
  className?: string
}

function TableSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex gap-6">
        {[120, 160, 100, 80, 60].map((w, i) => (
          <Skeleton key={i} variant="line" className={`w-${w === 120 ? '28' : w === 160 ? '36' : w === 100 ? '24' : w === 80 ? '20' : '16'} h-3`} />
        ))}
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="px-4 py-3.5 flex gap-6 border-b border-slate-100 last:border-b-0">
          <Skeleton variant="line" className="w-28 h-4" />
          <Skeleton variant="line" className="w-36 h-4" />
          <Skeleton variant="line" className="w-24 h-4" />
          <Skeleton variant="line" className="w-16 h-4" />
          <Skeleton variant="line" className="w-12 h-4" />
        </div>
      ))}
    </div>
  )
}

function CardsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <Skeleton variant="line" className="w-20 h-5" />
            <Skeleton variant="rect" className="w-16 h-6" />
          </div>
          <Skeleton variant="line" className="w-full h-5 mb-2" />
          <Skeleton variant="line" className="w-3/4 h-4" />
          <div className="mt-4 pt-3 border-t border-slate-100 flex gap-2">
            <Skeleton variant="circle" className="w-6 h-6" />
            <Skeleton variant="line" className="w-24 h-4" />
          </div>
        </div>
      ))}
    </div>
  )
}

function FormSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-2xl">
      <Skeleton variant="line" className="w-48 h-6 mb-6" />
      <div className="space-y-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i}>
            <Skeleton variant="line" className="w-28 h-3 mb-2" />
            <Skeleton variant="rect" className="w-full h-10" />
          </div>
        ))}
      </div>
      <div className="mt-6 flex gap-3 justify-end">
        <Skeleton variant="rect" className="w-24 h-10" />
        <Skeleton variant="rect" className="w-32 h-10" />
      </div>
    </div>
  )
}

export default function LoadingPage({ variant = 'table', className }: LoadingPageProps) {
  return (
    <div className={clsx('animate-pulse', className)}>
      {variant === 'table' && <TableSkeleton />}
      {variant === 'cards' && <CardsSkeleton />}
      {variant === 'form' && <FormSkeleton />}
    </div>
  )
}
