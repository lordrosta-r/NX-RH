import type { UserGroup } from "../../types";
import Modal from "../ui/Modal";

interface Props {
  group: UserGroup;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
}

export function UserGroupDeleteModal({
  group,
  onClose,
  onConfirm,
  isPending,
}: Props) {
  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Supprimer le groupe"
      size="sm"
      footer={
        <div className="nx-app">
          <button
            onClick={onClose}
            aria-label="Annuler la suppression"
            className="btn btn-ghost btn-sm"
          >
            Annuler
          </button>
          <button
            disabled={isPending}
            onClick={onConfirm}
            aria-label="Confirmer la suppression"
            className="btn btn-sm"
            style={{ background: "var(--red)", color: "#fff" }}
          >
            {isPending ? "Suppression..." : "Supprimer"}
          </button>
        </div>
      }
    >
      <div className="nx-app">
        <div className="callout red">
          <p className="body">
            Êtes-vous sûr de vouloir supprimer <strong>{group.name}</strong> ?
            Cette action est irréversible.
          </p>
        </div>
      </div>
    </Modal>
  );
}
