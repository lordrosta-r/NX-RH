import type { UserGroup } from '../../types'

interface Props {
  group: UserGroup
  onClose: () => void
  onConfirm: () => void
  isPending: boolean
}

export function UserGroupDeleteModal({ group, onClose, onConfirm, isPending }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Supprimer le groupe</h3>
        <p className="text-sm text-slate-600 mb-5">
          Êtes-vous sûr de vouloir supprimer <strong>{group.name}</strong> ?
          Cette action est irréversible.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Annuler
          </button>
          <button
            disabled={isPending}
            onClick={onConfirm}
            className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? 'Suppression...' : 'Supprimer'}
          </button>
        </div>
      </div>
    </div>
  )
}
