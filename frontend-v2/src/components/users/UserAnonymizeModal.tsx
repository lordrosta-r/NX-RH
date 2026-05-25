import { AlertTriangle } from 'lucide-react'
import type { User } from '../../types'

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Anonymiser les données</h3>
        <p className="text-sm text-slate-600 mb-4">
          <span className="inline-flex items-center gap-1">
            <AlertTriangle className="w-4 h-4 text-warning-500 shrink-0" /> Cette action est irréversible.
          </span>{' '}
          Les données personnelles de <strong>{user.firstName} {user.lastName}</strong> seront
          définitivement anonymisées conformément au RGPD.
        </p>
        <p className="text-sm text-slate-600 mb-2">
          Saisissez <strong>CONFIRMER</strong> pour valider :
        </p>
        <input
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-4 focus:ring-2 focus:ring-error-500 focus:border-error-500 outline-none"
          value={confirmText}
          onChange={e => onConfirmChange(e.target.value)}
          placeholder="CONFIRMER"
          autoFocus
        />
        <div className="flex gap-3 justify-end">
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
        </div>
      </div>
    </div>
  )
}
