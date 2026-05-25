interface CampaignCloneModalProps {
  campaignName: string | undefined;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function CampaignCloneModal({
  campaignName,
  isPending,
  onClose,
  onConfirm,
}: CampaignCloneModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl mx-4">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">
          Cloner la campagne
        </h3>
        <p className="text-sm text-slate-600 mb-4">
          Une copie de « {campaignName} » sera créée avec une nouvelle année.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="border border-slate-200 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-medium"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {isPending ? "Clonage…" : "Cloner"}
          </button>
        </div>
      </div>
    </div>
  );
}
