import React from 'react'
import clsx from 'clsx'
import { InboxIcon } from 'lucide-react'

export interface EmptyStateProps {
  icon?: React.ReactNode
  title?: string
  description?: string
  /** Pass either a ReactNode (legacy) or { label, onClick } for a built-in button */
  action?: React.ReactNode | { label: string; onClick: () => void }
  className?: string
}

function isActionObject(a: EmptyStateProps['action']): a is { label: string; onClick: () => void } {
  return typeof a === 'object' && a !== null && !React.isValidElement(a) && 'label' in (a as object)
}

export default function EmptyState({
  icon,
  title = 'Aucun résultat',
  description = "Il n'y a rien à afficher pour le moment.",
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={clsx('flex flex-col items-center justify-center text-center py-12 px-4', className)}>
      <div className="p-4 bg-gray-100 rounded-full mb-4 text-gray-400">
        {icon ?? <InboxIcon className="w-8 h-8" />}
      </div>
      <h3 className="text-base font-semibold text-gray-700 mb-1">{title}</h3>
      {description && <p className="text-sm text-gray-500 max-w-xs">{description}</p>}
      {action && (
        isActionObject(action) ? (
          <button
            onClick={action.onClick}
            className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
          >
            {action.label}
          </button>
        ) : (
          <div className="mt-4">{action}</div>
        )
      )}
    </div>
  )
}
