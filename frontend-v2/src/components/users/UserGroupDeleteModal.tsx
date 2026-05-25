import type { UserGroup } from '../../types'
import Modal from '../ui/Modal'

interface Props {
  group: UserGroup
  onClose: () => void
  onConfirm: () => void
  isPending: boolean
}

export function UserGroupDeleteModal({ group, onClose, onConfirm, isPending }: Props) {
  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Supprimer le groupe"
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
            disabled={isPending}
            onClick={onConfirm}
            className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? 'Suppression...' : 'Supprimer'}
          </button>
        </>
      }
    >
      <p className="text-sm text-slate-600">
        Êtes-vous sûr de vouloir supprimer <strong>{group.name}</strong> ?
        Cette action est irréversible.
      </p>
    </Modal>
  )
}
