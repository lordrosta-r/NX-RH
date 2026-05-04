import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import clsx from 'clsx'

export interface PaginationProps {
  total: number
  page: number        // 1-indexed
  limit: number
  onPageChange: (page: number) => void
  className?: string
}

export default function Pagination({ total, page, limit, onPageChange, className }: PaginationProps) {
  const totalPages = Math.ceil(total / limit)
  const from = Math.min((page - 1) * limit + 1, total)
  const to = Math.min(page * limit, total)

  if (totalPages <= 1) return null

  function getPages(): (number | 'ellipsis')[] {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    if (page <= 4) return [1, 2, 3, 4, 5, 'ellipsis', totalPages]
    if (page >= totalPages - 3) return [1, 'ellipsis', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
    return [1, 'ellipsis', page - 1, page, page + 1, 'ellipsis', totalPages]
  }

  return (
    <div className={clsx('flex items-center justify-between', className)}>
      <p className="text-sm text-slate-500">
        Affichage de <span className="font-medium text-slate-700">{from}</span>–<span className="font-medium text-slate-700">{to}</span> sur <span className="font-medium text-slate-700">{total}</span>
      </p>

      <nav className="flex items-center gap-1" aria-label="Pagination">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Page précédente"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {getPages().map((p, i) =>
          p === 'ellipsis' ? (
            <span key={`e${i}`} className="h-8 w-8 flex items-center justify-center text-slate-400 text-sm">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              aria-current={p === page ? 'page' : undefined}
              className={clsx(
                'h-8 w-8 rounded-lg text-sm font-medium transition-colors',
                p === page
                  ? 'bg-primary-500 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              )}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Page suivante"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </nav>
    </div>
  )
}
