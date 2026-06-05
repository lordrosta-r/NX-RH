import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import Modal from "../ui/Modal";

interface CampaignDeleteModalProps {
  campaignName: string | undefined;
  isPending: boolean;
  onClose: () => void;
  onDelete: () => void;
}

export default function CampaignDeleteModal({
  campaignName,
  isPending,
  onClose,
  onDelete,
}: CampaignDeleteModalProps) {
  const [confirm, setConfirm] = useState("");

  function handleClose() {
    setConfirm("");
    onClose();
  }

  return (
    <Modal
      isOpen={true}
      onClose={handleClose}
      title="Supprimer la campagne"
      size="sm"
      footer={
        <div className="nx-app" style={{ display: "flex", gap: 12 }}>
          <button onClick={handleClose} className="btn btn-ghost">
            Annuler
          </button>
          <button
            disabled={!campaignName || confirm !== campaignName || isPending}
            onClick={onDelete}
            className="btn"
            style={{
              background: "var(--red)",
              color: "#fff",
              borderColor: "var(--red)",
            }}
          >
            {isPending ? "Suppression…" : "Supprimer définitivement"}
          </button>
        </div>
      }
    >
      <div
        className="nx-app"
        style={{ display: "flex", flexDirection: "column", gap: 16 }}
      >
        <div
          className="callout red body"
          style={{ display: "flex", alignItems: "center", gap: 8 }}
        >
          <AlertTriangle
            size={16}
            style={{ color: "var(--red)", flexShrink: 0 }}
            aria-hidden="true"
          />
          Cette action est irréversible.
        </div>
        <p
          className="small"
          style={{
            fontFamily: "monospace",
            background: "var(--bg-alt)",
            padding: "8px 12px",
            borderRadius: "var(--radius)",
          }}
        >
          {campaignName}
        </p>
        <div className="field">
          <label htmlFor="campaign-delete-confirm">
            Saisissez le nom de la campagne pour confirmer :
          </label>
          <input
            id="campaign-delete-confirm"
            className="input"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={campaignName}
            aria-label="Nom de la campagne à confirmer"
          />
        </div>
      </div>
    </Modal>
  );
}
