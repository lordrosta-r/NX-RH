import { AlertTriangle } from 'lucide-react'
import type { User } from '../../types'
import Modal from '../ui/Modal'

interface Props {
  user: User
  confirmText: string
  onConfirmChange: (v: string) => void
  isPending: boolean
  onConfirm: () => void
  onClose: () => void
}

export function UserAnonymizeModal({
  user,
  confirmText,
  onConfirmChange,
  isPending,
  onConfirm,
  onClose,
}: Props) {
  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Anonymiser les données"
      size="sm"
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Annuler
          </button>
          <button
            disabled={confirmText !== 'CONFIRMER' || isPending}
            onClick={onConfirm}
            className="px-4 py-2 text-sm bg-error-500 text-white rounded-lg hover:bg-error-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? 'En cours...' : 'Anonymiser définitivement'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          <span className="inline-flex items-center gap-1">
            <AlertTriangle className="w-4 h-4 text-warning-500 shrink-0" /> Cette action est irréversible.
          </span>{' '}
          Les données personnelles de <strong>{user.firstName} {user.lastName}</strong> seront
          définitivement anonymisées conformément au RGPD.
        </p>
        <div>
          <label htmlFor="anonymize-confirm" className="block text-sm text-slate-600 mb-2">
            Saisissez <strong>CONFIRMER</strong> pour valider :
          </label>
          <input
            id="anonymize-confirm"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-error-500 focus:border-error-500 outline-none"
            value={confirmText}
            onChange={e => onConfirmChange(e.target.value)}
            placeholder="CONFIRMER"
            autoFocus
          />
        </div>
      </div>
    </Modal>
  )
}
