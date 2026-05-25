import Modal from "../ui/Modal";

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
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Cloner la campagne"
      size="sm"
      footer={
        <>
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
        </>
      }
    >
      <p className="text-sm text-slate-600">
        Une copie de « {campaignName} » sera créée avec une nouvelle année.
      </p>
    </Modal>
  );
}
