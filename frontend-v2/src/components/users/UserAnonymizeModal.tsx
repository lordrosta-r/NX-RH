import { AlertTriangle } from "lucide-react";
import type { User } from "../../types";
import Modal from "../ui/Modal";

interface Props {
  user: User;
  confirmText: string;
  onConfirmChange: (v: string) => void;
  isPending: boolean;
  onConfirm: () => void;
  onClose: () => void;
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
        <div className="nx-app">
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm"
            style={{ marginRight: 10 }}
          >
            Annuler
          </button>
          <button
            disabled={confirmText !== "CONFIRMER" || isPending}
            onClick={onConfirm}
            className="btn btn-sm"
            style={{ background: "var(--red)", color: "#fff" }}
          >
            {isPending ? "En cours..." : "Anonymiser définitivement"}
          </button>
        </div>
      }
    >
      <div
        className="nx-app"
        style={{ display: "flex", flexDirection: "column", gap: 16 }}
      >
        <div className="callout red">
          <p
            className="body"
            style={{ display: "flex", alignItems: "flex-start", gap: 8 }}
          >
            <AlertTriangle
              size={18}
              strokeWidth={1.5}
              aria-hidden="true"
              style={{ color: "var(--red)", flex: "none", marginTop: 2 }}
            />
            <span>
              <strong>Cette action est irréversible.</strong> Les données
              personnelles de{" "}
              <strong>
                {user.firstName} {user.lastName}
              </strong>{" "}
              seront définitivement anonymisées conformément au RGPD.
            </span>
          </p>
        </div>
        <div className="field">
          <label htmlFor="anonymize-confirm">
            Saisissez <strong>CONFIRMER</strong> pour valider :
          </label>
          <input
            id="anonymize-confirm"
            className="input"
            aria-label="Saisissez CONFIRMER pour valider l'anonymisation"
            value={confirmText}
            onChange={(e) => onConfirmChange(e.target.value)}
            placeholder="CONFIRMER"
            autoFocus
          />
        </div>
      </div>
    </Modal>
  );
}
