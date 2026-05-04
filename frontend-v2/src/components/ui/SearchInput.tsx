import React, { useState, useEffect, useRef } from 'react'
import { Search, Loader2 } from 'lucide-react'
import clsx from 'clsx'

export interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  debounceMs?: number
  loading?: boolean
  className?: string
}

export default function SearchInput({
  value,
  onChange,
  placeholder = 'Rechercher…',
  debounceMs = 300,
  loading = false,
  className,
}: SearchInputProps) {
  const [localValue, setLocalValue] = useState(value)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [debouncing, setDebouncing] = useState(false)

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    setLocalValue(v)
    setDebouncing(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      onChange(v)
      setDebouncing(false)
    }, debounceMs)
  }

  const isLoading = loading || debouncing

  return (
    <div className={clsx('relative', className)}>
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
        <Search className="w-4 h-4" />
      </span>
      <input
        type="search"
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        className={clsx(
          'w-full h-10 rounded-lg border border-slate-300 pl-9 pr-9 py-2 text-sm text-slate-700 placeholder:text-slate-400',
          'focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-500 transition-colors',
          'bg-white'
        )}
      />
      {isLoading && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin" />
        </span>
      )}
    </div>
  )
}
