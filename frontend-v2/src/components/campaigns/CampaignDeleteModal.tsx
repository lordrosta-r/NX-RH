import { useState } from "react";
import { AlertTriangle } from "lucide-react";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl mx-4">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">
          Supprimer la campagne
        </h3>
        <p className="flex items-center gap-2 text-sm text-slate-600 mb-3">
          <AlertTriangle size={16} className="text-error-500 shrink-0" />
          Cette action est irréversible.
        </p>
        <p className="text-sm text-slate-600 mb-2">
          Saisissez le nom de la campagne pour confirmer :
        </p>
        <p className="font-mono text-sm bg-slate-50 px-3 py-2 rounded mb-3">
          {campaignName}
        </p>
        <input
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-error-500"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder={campaignName}
        />
        <div className="flex gap-3 justify-end">
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
        </div>
      </div>
    </div>
  );
}
