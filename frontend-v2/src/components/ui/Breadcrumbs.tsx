import React from 'react'
import { ChevronRight } from 'lucide-react'
import clsx from 'clsx'

export interface BreadcrumbItem {
  label: string
  href?: string
  onClick?: () => void
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  className?: string
}

export default function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav aria-label="Fil d'ariane" className={clsx('mb-4', className)}>
      <ol className="flex items-center flex-wrap gap-1">
        {items.map((item, i) => {
          const isLast = i === items.length - 1
          return (
            <React.Fragment key={item.label}>
              <li>
                {isLast || !item.href ? (
                  <span
                    className={clsx(
                      'text-sm',
                      isLast ? 'text-slate-700 font-medium' : 'text-slate-500'
                    )}
                    aria-current={isLast ? 'page' : undefined}
                  >
                    {item.label}
                  </span>
                ) : (
                  <a
                    href={item.href}
                    onClick={item.onClick ? (e) => { e.preventDefault(); item.onClick?.() } : undefined}
                    className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    {item.label}
                  </a>
                )}
              </li>
              {!isLast && (
                <li aria-hidden>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                </li>
              )}
            </React.Fragment>
          )
        })}
      </ol>
    </nav>
  )
}
