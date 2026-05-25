import { useState } from 'react'
import type { UserGroup } from '../../types'
import Modal from '../ui/Modal'

interface Props {
  group?: UserGroup | null
  onClose: () => void
  onSave: (data: { name: string; description?: string }) => void
  isPending: boolean
}

export function UserGroupFormModal({ group, onClose, onSave, isPending }: Props) {
  const [name, setName] = useState(group?.name ?? '')
  const [description, setDescription] = useState(group?.description ?? '')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    onSave({ name: name.trim(), description: description.trim() || undefined })
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={group ? 'Modifier le groupe' : 'Nouveau groupe'}
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="group-name" className="block text-sm font-medium text-slate-700 mb-1">Nom *</label>
          <input
            id="group-name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            autoFocus
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            placeholder="Nom du groupe"
          />
        </div>
        <div>
          <label htmlFor="group-description" className="block text-sm font-medium text-slate-700 mb-1">Description</label>
          <textarea
            id="group-description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none resize-none"
            placeholder="Description optionnelle"
          />
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isPending || !name.trim()}
            className="px-4 py-2 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
