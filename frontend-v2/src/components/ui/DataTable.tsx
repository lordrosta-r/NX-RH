import React from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import clsx from 'clsx'

export interface ColumnDef<T> {
  key: string
  header: string
  render?: (row: T) => React.ReactNode
  sortable?: boolean
  width?: string
  align?: 'left' | 'center' | 'right'
}

export interface DataTableProps<T extends { id: string }> {
  columns: ColumnDef<T>[]
  data: T[]
  loading?: boolean
  emptyState?: React.ReactNode
  selectable?: boolean
  selectedIds?: string[]
  onSelectionChange?: (ids: string[]) => void
  rowActions?: (row: T) => React.ReactNode
  onSort?: (key: string, direction: 'asc' | 'desc') => void
  sortKey?: string
  sortDirection?: 'asc' | 'desc'
  getRowId?: (row: T) => string
  className?: string
}

function SkeletonRow({ cols, selectable }: { cols: number; selectable: boolean }) {
  return (
    <tr>
      {selectable && (
        <td className="px-4 py-3">
          <div className="h-4 w-4 bg-slate-200 rounded animate-pulse" />
        </td>
      )}
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-slate-200 rounded animate-pulse" style={{ width: `${60 + Math.random() * 30}%` }} />
        </td>
      ))}
    </tr>
  )
}

export default function DataTable<T extends { id: string }>({
  columns,
  data,
  loading = false,
  emptyState,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  rowActions,
  onSort,
  sortKey,
  sortDirection,
  getRowId,
  className,
}: DataTableProps<T>) {
  function toggleAll() {
    if (!onSelectionChange) return
    if (selectedIds.length === data.length) {
      onSelectionChange([])
    } else {
      onSelectionChange(data.map(r => getRowId ? getRowId(r) : r.id))
    }
  }

  function toggleRow(id: string) {
    if (!onSelectionChange) return
    onSelectionChange(
      selectedIds.includes(id)
        ? selectedIds.filter(x => x !== id)
        : [...selectedIds, id]
    )
  }

  function handleSort(key: string) {
    if (!onSort) return
    const newDir = sortKey === key && sortDirection === 'asc' ? 'desc' : 'asc'
    onSort(key, newDir)
  }

  const allSelected = data.length > 0 && selectedIds.length === data.length
  const someSelected = selectedIds.length > 0 && selectedIds.length < data.length

  return (
    <div className={clsx('w-full overflow-x-auto rounded-xl border border-slate-200 bg-white', className)}>
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            {selectable && (
              <th className="px-4 py-3 w-10" scope="col">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={el => { if (el) el.indeterminate = someSelected }}
                  onChange={toggleAll}
                  aria-label="Tout sélectionner"
                  className="h-4 w-4 rounded border-slate-300 text-primary-500 focus:ring-primary-200"
                />
              </th>
            )}
            {columns.map(col => (
              <th
                key={col.key}
                scope="col"
                aria-sort={
                  col.sortable
                    ? sortKey === col.key
                      ? sortDirection === 'asc' ? 'ascending' : 'descending'
                      : 'none'
                    : undefined
                }
                className={clsx(
                  'px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap',
                  col.align === 'center' && 'text-center',
                  col.align === 'right' && 'text-right',
                  col.sortable && 'cursor-pointer hover:text-slate-700 select-none',
                  col.width
                )}
                onClick={col.sortable ? () => handleSort(col.key) : undefined}
              >
                <span className="inline-flex items-center gap-1">
                  {col.header}
                  {col.sortable && (
                    sortKey === col.key
                      ? sortDirection === 'asc'
                        ? <ChevronUp className="w-3.5 h-3.5" />
                        : <ChevronDown className="w-3.5 h-3.5" />
                      : <ChevronsUpDown className="w-3.5 h-3.5 text-slate-300" />
                  )}
                </span>
              </th>
            ))}
            {rowActions && <th className="px-4 py-3 w-12" scope="col" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <SkeletonRow key={i} cols={columns.length} selectable={selectable} />
            ))
          ) : data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0)}
                className="px-4 py-16 text-center text-sm text-slate-600"
              >
                {emptyState ?? 'Aucun résultat.'}
              </td>
            </tr>
          ) : (
            data.map(row => {
              const rowId = getRowId ? getRowId(row) : row.id
              return (
              <tr
                key={rowId}
                className={clsx(
                  'hover:bg-slate-50 transition-colors',
                  selectedIds.includes(rowId) && 'bg-primary-50'
                )}
              >
                {selectable && (
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(rowId)}
                      onChange={() => toggleRow(rowId)}
                      aria-label="Sélectionner la ligne"
                      className="h-4 w-4 rounded border-slate-300 text-primary-500 focus:ring-primary-200"
                    />
                  </td>
                )}
                {columns.map(col => (
                  <td
                    key={col.key}
                    className={clsx(
                      'px-4 py-3 text-slate-700',
                      col.align === 'center' && 'text-center',
                      col.align === 'right' && 'text-right'
                    )}
                  >
                    {col.render
                      ? col.render(row)
                      : String((row as Record<string, unknown>)[col.key] ?? '')}
                  </td>
                ))}
                {rowActions && (
                  <td className="px-4 py-3 text-right">
                    {rowActions(row)}
                  </td>
                )}
              </tr>
            )})
          )}
        </tbody>
      </table>
    </div>
  )
}
