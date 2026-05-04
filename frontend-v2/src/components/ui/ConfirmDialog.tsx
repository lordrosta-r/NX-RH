
import { AlertTriangle, Trash2 } from 'lucide-react'
import Modal from './Modal'
import Button from './Button'

export interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning'
  loading?: boolean
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  variant = 'danger',
  loading = false,
}: ConfirmDialogProps) {
  const Icon = variant === 'danger' ? Trash2 : AlertTriangle
  const iconClass = variant === 'danger' ? 'text-error-500' : 'text-warning-500'

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex flex-col items-center text-center py-4">
        <div className={`mb-4 ${iconClass}`}>
          <Icon className="w-12 h-12" />
        </div>
        <p className="text-slate-600 text-sm leading-relaxed">{description}</p>
      </div>
    </Modal>
  )
}
