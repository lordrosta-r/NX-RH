import React, { useState, useRef, useEffect } from 'react'
import { MoreVertical } from 'lucide-react'
import clsx from 'clsx'

export interface ActionMenuItem {
  label: string
  icon?: React.ReactNode
  onClick: () => void
  danger?: boolean
  disabled?: boolean
  separator?: boolean
}

export interface ActionMenuProps {
  items: ActionMenuItem[]
  align?: 'left' | 'right'
}

export default function ActionMenu({ items, align = 'right' }: ActionMenuProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function keyHandler(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false)
        return
      }
      if (!open) return
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const items = containerRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)')
        if (!items || items.length === 0) return
        const focused = document.activeElement
        const arr = Array.from(items)
        const idx = arr.indexOf(focused as HTMLElement)
        if (e.key === 'ArrowDown') {
          const next = idx < arr.length - 1 ? arr[idx + 1] : arr[0]
          next?.focus()
        } else {
          const prev = idx > 0 ? arr[idx - 1] : arr[arr.length - 1]
          prev?.focus()
        }
      }
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', keyHandler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', keyHandler)
    }
  }, [open])

  useEffect(() => {
    if (open) {
      const firstItem = containerRef.current?.querySelector<HTMLElement>('[role="menuitem"]:not(:disabled)')
      setTimeout(() => firstItem?.focus(), 0)
    }
  }, [open])

  return (
    <div className="relative inline-flex" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Actions"
        className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {open && (
        <div
          role="menu"
          className={clsx(
            'absolute top-full mt-1 z-50 bg-white rounded-xl shadow-lg border border-slate-200 py-1 min-w-48',
            align === 'right' ? 'right-0' : 'left-0'
          )}
        >
          {items.map((item) => (
            <React.Fragment key={item.label}>
              {item.separator && <hr className="my-1 border-slate-100" />}
              <button
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  if (!item.disabled) {
                    item.onClick()
                    setOpen(false)
                  }
                }}
                className={clsx(
                  'w-full flex items-center gap-2.5 px-4 py-2 text-sm text-left transition-colors',
                  item.danger
                    ? 'text-error-600 hover:bg-error-50'
                    : 'text-slate-700 hover:bg-slate-50',
                  item.disabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                {item.icon && <span className="w-4 h-4 flex-shrink-0">{item.icon}</span>}
                {item.label}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  )
}
