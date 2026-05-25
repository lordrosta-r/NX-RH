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
        <>
          <button
            onClick={handleClose}
            className="border border-slate-200 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-medium"
          >
            Annuler
          </button>
          <button
            disabled={!campaignName || confirm !== campaignName || isPending}
            onClick={onDelete}
            className="bg-error-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-error-600 disabled:opacity-50"
          >
            {isPending ? "Suppression…" : "Supprimer définitivement"}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="flex items-center gap-2 text-sm text-slate-600">
          <AlertTriangle size={16} className="text-error-500 shrink-0" />
          Cette action est irréversible.
        </p>
        <p className="font-mono text-sm bg-slate-50 px-3 py-2 rounded">
          {campaignName}
        </p>
        <div>
          <label htmlFor="campaign-delete-confirm" className="block text-sm text-slate-600 mb-2">
            Saisissez le nom de la campagne pour confirmer :
          </label>
          <input
            id="campaign-delete-confirm"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-error-500"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={campaignName}
          />
        </div>
      </div>
    </Modal>
  );
}
