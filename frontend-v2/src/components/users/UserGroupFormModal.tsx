import { useState } from "react";
import type { UserGroup } from "../../types";
import Modal from "../ui/Modal";

interface Props {
  group?: UserGroup | null;
  onClose: () => void;
  onSave: (data: { name: string; description?: string }) => void;
  isPending: boolean;
}

export function UserGroupFormModal({
  group,
  onClose,
  onSave,
  isPending,
}: Props) {
  const [name, setName] = useState(group?.name ?? "");
  const [description, setDescription] = useState(group?.description ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name: name.trim(), description: description.trim() || undefined });
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={group ? "Modifier le groupe" : "Nouveau groupe"}
      size="sm"
    >
      <div className="nx-app">
        <form onSubmit={handleSubmit} className="section-gap">
          <div className="field">
            <label htmlFor="group-name">Nom *</label>
            <input
              id="group-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              className="input"
              placeholder="Nom du groupe"
            />
          </div>
          <div className="field">
            <label htmlFor="group-description">Description</label>
            <textarea
              id="group-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="input"
              placeholder="Description optionnelle"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost btn-sm"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isPending || !name.trim()}
              className="btn btn-primary btn-sm"
            >
              {isPending ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
