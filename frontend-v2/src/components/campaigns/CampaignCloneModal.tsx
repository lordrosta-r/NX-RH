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
          <button onClick={onClose} className="btn btn-ghost">
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="btn btn-primary"
          >
            {isPending ? "Clonage…" : "Cloner"}
          </button>
        </>
      }
    >
      <p className="body">
        Une copie de « {campaignName} » sera créée avec une nouvelle année.
      </p>
    </Modal>
  );
}
