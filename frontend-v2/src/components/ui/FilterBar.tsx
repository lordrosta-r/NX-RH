import React from 'react'
import { X, SlidersHorizontal } from 'lucide-react'
import clsx from 'clsx'
import SearchInput from './SearchInput'

export interface ActiveFilter {
  key: string
  label: string
  value: string
}

export interface FilterBarProps {
  filters?: ActiveFilter[]
  onRemoveFilter?: (key: string) => void
  onClearAll?: () => void
  searchValue?: string
  onSearchChange?: (value: string) => void
  onOpenAdvanced?: () => void
  children?: React.ReactNode
  className?: string
}

export default function FilterBar({
  filters = [],
  onRemoveFilter,
  onClearAll,
  searchValue,
  onSearchChange,
  onOpenAdvanced,
  children,
  className,
}: FilterBarProps) {
  const hasActiveFilters = filters.length > 0

  return (
    <div className={clsx('flex flex-wrap items-center gap-3', className)}>
      {/* Search */}
      {onSearchChange !== undefined && (
        <SearchInput
          value={searchValue ?? ''}
          onChange={onSearchChange}
          className="w-64"
        />
      )}

      {/* Active filter chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          {filters.map(filter => (
            <span
              key={filter.key}
              className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1 rounded-full bg-primary-100 text-primary-700 text-sm font-medium"
            >
              <span className="text-primary-500 text-xs">{filter.label} :</span>
              {filter.value}
              {onRemoveFilter && (
                <button
                  type="button"
                  onClick={() => onRemoveFilter(filter.key)}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-primary-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
                  aria-label={`Supprimer le filtre ${filter.label}`}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}

          {onClearAll && filters.length > 1 && (
            <button
              type="button"
              onClick={onClearAll}
              className="text-sm text-slate-500 hover:text-slate-700 underline transition-colors"
            >
              Tout effacer
            </button>
          )}
        </div>
      )}

      {/* Slot for extra filters (Selects etc.) */}
      {children}

      {/* Advanced filters button */}
      {onOpenAdvanced && (
        <button
          type="button"
          onClick={onOpenAdvanced}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-slate-300 bg-white text-sm text-slate-700 hover:bg-slate-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filtres avancés
        </button>
      )}
    </div>
  )
}
