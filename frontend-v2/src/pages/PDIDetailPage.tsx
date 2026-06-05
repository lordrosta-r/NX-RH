import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/api/client";
import { queryKeys } from "@/lib/queryKeys";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Clock,
  XCircle,
  PlusCircle,
  PenSquare,
  FileSignature,
} from "lucide-react";

type PDIStatus = "draft" | "active" | "completed" | "archived";
type ActionStatus = "planned" | "in_progress" | "completed" | "cancelled";
type ActionType =
  | "formation"
  | "coaching"
  | "projet"
  | "lecture"
  | "certification"
  | "autre";

interface Action {
  _id: string;
  title: string;
  type: ActionType;
  description?: string;
  targetDate?: string;
  status: ActionStatus;
  completedAt?: string;
  comment?: string;
}

interface PDI {
  _id: string;
  employee: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    department?: string;
    position?: string;
  };
  manager: { _id: string; firstName: string; lastName: string; email: string };
  period: { start: string; end: string };
  objectives: string[];
  actions: Action[];
  status: PDIStatus;
  employeeSignedAt?: string;
  managerSignedAt?: string;
  notes?: string;
  createdAt: string;
}

const PDI_STATUS_LABELS: Record<PDIStatus, string> = {
  draft: "Brouillon",
  active: "Actif",
  completed: "Terminé",
  archived: "Archivé",
};

const PDI_STATUS_COLORS: Record<PDIStatus, string> = {
  draft:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  active:
    "bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300",
  completed:
    "bg-success-100 text-success-800 dark:bg-success-900/30 dark:text-success-300",
  archived:
    "bg-surface-200 text-surface-600 dark:bg-surface-700 dark:text-surface-400",
};

const ACTION_STATUS_LABELS: Record<ActionStatus, string> = {
  planned: "Prévu",
  in_progress: "En cours",
  completed: "Terminé",
  cancelled: "Annulé",
};

const ACTION_TYPE_LABELS: Record<ActionType, string> = {
  formation: "Formation",
  coaching: "Coaching",
  projet: "Projet",
  lecture: "Lecture",
  certification: "Certification",
  autre: "Autre",
};

function ActionStatusIcon({ status }: { status: ActionStatus }) {
  if (status === "completed")
    return <CheckCircle2 className="w-4 h-4 text-success-500 flex-shrink-0" />;
  if (status === "in_progress")
    return <Clock className="w-4 h-4 text-primary-500 flex-shrink-0" />;
  if (status === "cancelled")
    return <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />;
  return <Circle className="w-4 h-4 text-surface-400 flex-shrink-0" />;
}

const EMPTY_ACTION = {
  title: "",
  type: "formation" as ActionType,
  description: "",
  targetDate: "",
};

export default function PDIDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [showNewAction, setShowNewAction] = useState(false);
  const [newAction, setNewAction] = useState(EMPTY_ACTION);
  const [editingObjective, setEditingObjective] = useState(false);
  const [objectivesText, setObjectivesText] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.pdi.detail(id!),
    queryFn: () => api.get(`/pdi/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  const pdi: PDI | undefined = data?.data;

  const addActionMutation = useMutation({
    mutationFn: (payload: typeof newAction) =>
      api.post(`/pdi/${id}/actions`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.pdi.detail(id!) });
      setShowNewAction(false);
      setNewAction(EMPTY_ACTION);
    },
  });

  const updateActionMutation = useMutation({
    mutationFn: ({
      actionId,
      update,
    }: {
      actionId: string;
      update: Partial<Action>;
    }) => api.patch(`/pdi/${id}/actions/${actionId}`, update),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.pdi.detail(id!) }),
  });

  const signMutation = useMutation({
    mutationFn: () => api.post(`/pdi/${id}/sign`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.pdi.detail(id!) }),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isError || !pdi) {
    return (
      <div className="px-4 py-8 text-center text-surface-500">
        PDI introuvable ou accès refusé.
      </div>
    );
  }

  const completedActions = pdi.actions.filter(
    (a) => a.status === "completed",
  ).length;
  const progressPct =
    pdi.actions.length > 0
      ? Math.round((completedActions / pdi.actions.length) * 100)
      : 0;

  const isEmployee =
    user?._id === pdi.employee._id || user?.id === pdi.employee._id;
  const isManager =
    user?._id === pdi.manager._id || user?.id === pdi.manager._id;
  const canSign =
    (isEmployee && !pdi.employeeSignedAt) ||
    (isManager && !pdi.managerSignedAt) ||
    (["admin", "hr"].includes(user?.role ?? "") && !pdi.managerSignedAt);

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Back */}
      <Link
        to="/pdi"
        className="inline-flex items-center gap-1 text-sm text-surface-500 hover:text-primary-600 dark:text-surface-400 dark:hover:text-primary-400 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour aux PDIs
      </Link>

      {/* Header card */}
      <div className="bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-surface-900 dark:text-surface-50">
              PDI — {pdi.employee.firstName} {pdi.employee.lastName}
            </h1>
            <p className="text-sm text-surface-500 dark:text-surface-400 mt-0.5">
              {pdi.employee.position && <span>{pdi.employee.position} · </span>}
              {pdi.employee.department}
            </p>
          </div>
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${PDI_STATUS_COLORS[pdi.status]}`}
          >
            {PDI_STATUS_LABELS[pdi.status]}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          <div>
            <p className="text-xs text-surface-500 dark:text-surface-400 mb-0.5">
              Manager
            </p>
            <p className="font-medium text-surface-800 dark:text-surface-200">
              {pdi.manager.firstName} {pdi.manager.lastName}
            </p>
          </div>
          <div>
            <p className="text-xs text-surface-500 dark:text-surface-400 mb-0.5">
              Début
            </p>
            <p className="font-medium text-surface-800 dark:text-surface-200">
              {new Date(pdi.period.start).toLocaleDateString("fr-FR")}
            </p>
          </div>
          <div>
            <p className="text-xs text-surface-500 dark:text-surface-400 mb-0.5">
              Fin
            </p>
            <p className="font-medium text-surface-800 dark:text-surface-200">
              {new Date(pdi.period.end).toLocaleDateString("fr-FR")}
            </p>
          </div>
        </div>

        {/* Signatures */}
        <div className="flex flex-wrap gap-3 pt-1">
          <div
            className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-full ${
              pdi.employeeSignedAt
                ? "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300"
                : "bg-surface-100 text-surface-500 dark:bg-surface-700 dark:text-surface-400"
            }`}
          >
            <FileSignature className="w-3.5 h-3.5" />
            Employé{" "}
            {pdi.employeeSignedAt
              ? `signé le ${new Date(pdi.employeeSignedAt).toLocaleDateString("fr-FR")}`
              : "non signé"}
          </div>
          <div
            className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-full ${
              pdi.managerSignedAt
                ? "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300"
                : "bg-surface-100 text-surface-500 dark:bg-surface-700 dark:text-surface-400"
            }`}
          >
            <FileSignature className="w-3.5 h-3.5" />
            Manager{" "}
            {pdi.managerSignedAt
              ? `signé le ${new Date(pdi.managerSignedAt).toLocaleDateString("fr-FR")}`
              : "non signé"}
          </div>
          {canSign && (
            <button
              onClick={() => signMutation.mutate()}
              disabled={signMutation.isPending}
              className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-50 transition-colors font-medium"
            >
              <FileSignature className="w-3.5 h-3.5" />
              {signMutation.isPending ? "Signature…" : "Signer"}
            </button>
          )}
        </div>
      </div>

      {/* Progress */}
      {pdi.actions.length > 0 && (
        <div className="bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-surface-700 dark:text-surface-300">
              Progression des actions
            </span>
            <span className="text-sm font-bold text-primary-600 dark:text-primary-400">
              {progressPct}% ({completedActions}/{pdi.actions.length})
            </span>
          </div>
          <div className="h-2.5 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-success-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Objectives */}
      <div className="bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-surface-800 dark:text-surface-100">
            Objectifs
          </h2>
          <button
            onClick={() => {
              setObjectivesText(pdi.objectives.join("\n"));
              setEditingObjective((v) => !v);
            }}
            className="text-xs text-primary-600 hover:underline dark:text-primary-400 flex items-center gap-1"
          >
            <PenSquare className="w-3.5 h-3.5" />
            Éditer
          </button>
        </div>

        {editingObjective ? (
          <div className="space-y-2">
            <textarea
              rows={4}
              className="w-full border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-900 rounded-lg px-3 py-2 text-sm text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              value={objectivesText}
              onChange={(e) => setObjectivesText(e.target.value)}
              placeholder="Un objectif par ligne"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditingObjective(false)}
                className="px-3 py-1.5 text-xs rounded-lg border border-surface-300 dark:border-surface-600 text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        ) : pdi.objectives.length === 0 ? (
          <p className="text-sm text-surface-400 dark:text-surface-500 italic">
            Aucun objectif défini
          </p>
        ) : (
          <ul className="space-y-1.5">
            {pdi.objectives.map((obj, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-surface-700 dark:text-surface-300"
              >
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-primary-500 flex-shrink-0" />
                {obj}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Actions */}
      <div className="bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-surface-800 dark:text-surface-100">
            Actions ({pdi.actions.length})
          </h2>
          <button
            onClick={() => setShowNewAction((v) => !v)}
            className="flex items-center gap-1 text-xs text-primary-600 hover:underline dark:text-primary-400"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Ajouter une action
          </button>
        </div>

        {/* New action form */}
        {showNewAction && (
          <div className="bg-surface-50 dark:bg-surface-900 rounded-lg border border-surface-200 dark:border-surface-700 p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-surface-600 dark:text-surface-400 mb-1">
                  Titre *
                </label>
                <input
                  className="w-full border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 rounded-lg px-3 py-2 text-sm text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={newAction.title}
                  onChange={(e) =>
                    setNewAction((a) => ({ ...a, title: e.target.value }))
                  }
                  placeholder="Titre de l'action"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-600 dark:text-surface-400 mb-1">
                  Type
                </label>
                <select
                  className="w-full border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 rounded-lg px-3 py-2 text-sm text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={newAction.type}
                  onChange={(e) =>
                    setNewAction((a) => ({
                      ...a,
                      type: e.target.value as ActionType,
                    }))
                  }
                >
                  {(Object.keys(ACTION_TYPE_LABELS) as ActionType[]).map(
                    (t) => (
                      <option key={t} value={t}>
                        {ACTION_TYPE_LABELS[t]}
                      </option>
                    ),
                  )}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-600 dark:text-surface-400 mb-1">
                  Date cible
                </label>
                <input
                  type="date"
                  className="w-full border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 rounded-lg px-3 py-2 text-sm text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={newAction.targetDate}
                  onChange={(e) =>
                    setNewAction((a) => ({ ...a, targetDate: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-600 dark:text-surface-400 mb-1">
                  Description
                </label>
                <input
                  className="w-full border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 rounded-lg px-3 py-2 text-sm text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={newAction.description}
                  onChange={(e) =>
                    setNewAction((a) => ({ ...a, description: e.target.value }))
                  }
                  placeholder="Description optionnelle"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowNewAction(false)}
                className="px-3 py-1.5 text-xs rounded-lg border border-surface-300 dark:border-surface-600 text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
              >
                Annuler
              </button>
              <button
                disabled={addActionMutation.isPending || !newAction.title}
                onClick={() => addActionMutation.mutate(newAction)}
                className="px-3 py-1.5 text-xs bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
              >
                {addActionMutation.isPending ? "Ajout…" : "Ajouter"}
              </button>
            </div>
          </div>
        )}

        {/* Action list */}
        {pdi.actions.length === 0 && !showNewAction ? (
          <p className="text-sm text-surface-400 dark:text-surface-500 italic text-center py-4">
            Aucune action définie
          </p>
        ) : (
          <div className="divide-y divide-surface-100 dark:divide-surface-700">
            {pdi.actions.map((action) => (
              <div key={action._id} className="py-3 flex items-start gap-3">
                <ActionStatusIcon status={action.status} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-2">
                    <span className="text-sm font-medium text-surface-800 dark:text-surface-200">
                      {action.title}
                    </span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-400">
                      {ACTION_TYPE_LABELS[action.type]}
                    </span>
                  </div>
                  {action.description && (
                    <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
                      {action.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-x-3 mt-1 text-xs text-surface-400 dark:text-surface-500">
                    <span>{ACTION_STATUS_LABELS[action.status]}</span>
                    {action.targetDate && (
                      <span>
                        Cible :{" "}
                        {new Date(action.targetDate).toLocaleDateString(
                          "fr-FR",
                        )}
                      </span>
                    )}
                    {action.completedAt && (
                      <span>
                        Terminé :{" "}
                        {new Date(action.completedAt).toLocaleDateString(
                          "fr-FR",
                        )}
                      </span>
                    )}
                  </div>
                </div>
                {/* Quick status update */}
                {action.status !== "completed" &&
                  action.status !== "cancelled" && (
                    <button
                      onClick={() =>
                        updateActionMutation.mutate({
                          actionId: action._id,
                          update: {
                            status:
                              action.status === "planned"
                                ? "in_progress"
                                : "completed",
                          },
                        })
                      }
                      disabled={updateActionMutation.isPending}
                      className="text-xs text-primary-600 hover:underline dark:text-primary-400 flex-shrink-0 disabled:opacity-50"
                    >
                      {action.status === "planned"
                        ? "▶ Démarrer"
                        : "✓ Terminer"}
                    </button>
                  )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notes */}
      {pdi.notes && (
        <div className="bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 p-5">
          <h2 className="font-semibold text-surface-800 dark:text-surface-100 mb-2">
            Notes
          </h2>
          <p className="text-sm text-surface-600 dark:text-surface-400 whitespace-pre-wrap">
            {pdi.notes}
          </p>
        </div>
      )}
    </div>
  );
}
