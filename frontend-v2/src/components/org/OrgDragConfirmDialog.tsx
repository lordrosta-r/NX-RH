import type { OrgNodeData } from "../../hooks/useOrgLayout";

export interface DragTarget {
  nodeId: string;
  newManagerId: string;
}

interface OrgDragConfirmDialogProps {
  target: DragTarget;
  allUsers: OrgNodeData[];
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function OrgDragConfirmDialog({
  target,
  allUsers,
  isPending,
  onConfirm,
  onCancel,
}: OrgDragConfirmDialogProps) {
  const person = allUsers.find((u) => u.id === target.nodeId);
  const newMgr = allUsers.find((u) => u.id === target.newManagerId);

  return (
    <div
      className="nx-app absolute inset-0 flex items-center justify-center z-50"
      style={{ background: "rgba(22, 22, 40, 0.3)" }}
    >
      <div
        className="p-6 max-w-sm w-full mx-4"
        style={{
          background: "#fff",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <h3 className="h3 mb-2">Changer le manager ?</h3>
        <div className="callout amber mb-5">
          <p className="body">
            Réaffecter <strong>{person?.firstName}</strong> sous{" "}
            <strong>
              {newMgr?.firstName} {newMgr?.lastName}
            </strong>{" "}
            ?
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            aria-label="Annuler le déplacement"
            className="btn btn-ghost flex-1"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            aria-label="Confirmer le déplacement"
            className="btn btn-primary flex-1"
          >
            {isPending ? "En cours…" : "Confirmer"}
          </button>
        </div>
      </div>
    </div>
  );
}
