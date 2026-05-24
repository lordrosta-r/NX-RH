import React, { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import clsx from 'clsx'
import { useFocusTrap } from '../../hooks/useFocusTrap'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  children: React.ReactNode
  footer?: React.ReactNode
}

const SIZE_CLASSES = {
  sm: 'max-w-[480px]',
  md: 'max-w-[640px]',
  lg: 'max-w-[800px]',
  xl: 'max-w-[1024px]',
}

export default function Modal({ isOpen, onClose, title, size = 'md', children, footer }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useFocusTrap(dialogRef, isOpen)

  useEffect(() => {
    if (!isOpen) return

    document.body.style.overflow = 'hidden'

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby="modal-title"
    >
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={dialogRef}
        className={clsx(
          'relative w-full bg-white rounded-2xl shadow-xl flex flex-col max-h-[90vh]',
          SIZE_CLASSES[size]
        )}
      >
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
          <h2 id="modal-title" className="text-lg font-semibold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors rounded-lg p-1 focus-visible:ring-2 focus-visible:ring-primary-300"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-4 overflow-y-auto flex-1">
          {children}
        </div>
        {footer && (
          <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
