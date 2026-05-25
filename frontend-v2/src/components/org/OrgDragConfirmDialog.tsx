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
    <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
        <h3 className="font-semibold text-slate-900 mb-2">
          Changer le manager ?
        </h3>
        <p className="text-sm text-slate-600 mb-5">
          Réaffecter <strong>{person?.firstName}</strong> sous{" "}
          <strong>
            {newMgr?.firstName} {newMgr?.lastName}
          </strong>{" "}
          ?
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 disabled:opacity-60"
          >
            {isPending ? "En cours…" : "Confirmer"}
          </button>
        </div>
      </div>
    </div>
  );
}
