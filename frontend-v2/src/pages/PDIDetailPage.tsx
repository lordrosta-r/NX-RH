import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/api/client";
import { queryKeys } from "@/lib/queryKeys";
import { PageHead, Tile, Badge, Bar } from "@/components/shell";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import {
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

type BadgeTone = "blue" | "green" | "amber" | "red" | "grey";

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

const PDI_STATUS_TONES: Record<PDIStatus, BadgeTone> = {
  draft: "amber",
  active: "blue",
  completed: "green",
  archived: "grey",
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
    return (
      <CheckCircle2
        className="w-4 h-4 flex-shrink-0"
        style={{ color: "var(--green)" }}
      />
    );
  if (status === "in_progress")
    return (
      <Clock
        className="w-4 h-4 flex-shrink-0"
        style={{ color: "var(--blue)" }}
      />
    );
  if (status === "cancelled")
    return (
      <XCircle
        className="w-4 h-4 flex-shrink-0"
        style={{ color: "var(--red)" }}
      />
    );
  return (
    <Circle
      className="w-4 h-4 flex-shrink-0"
      style={{ color: "var(--ink-3)" }}
    />
  );
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
      <div className="nx-app">
        <div className="row" style={{ justifyContent: "center", padding: 96 }}>
          <div className="w-8 h-8 border-2 border-[#1b1b78] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (isError || !pdi) {
    return (
      <div className="nx-app">
        <Tile style={{ textAlign: "center", padding: 32 }}>
          <p className="body">PDI introuvable ou accès refusé.</p>
        </Tile>
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
    <div className="nx-app">
      <Breadcrumbs
        items={[
          { label: "Accueil", href: "/" },
          { label: "PDI", href: "/pdi" },
          { label: `${pdi.employee.firstName} ${pdi.employee.lastName}` },
        ]}
      />

      <PageHead
        title={`PDI — ${pdi.employee.firstName} ${pdi.employee.lastName}`}
        desc={
          <>
            {pdi.employee.position && <span>{pdi.employee.position} · </span>}
            {pdi.employee.department}
          </>
        }
        actions={
          <Badge tone={PDI_STATUS_TONES[pdi.status]}>
            {PDI_STATUS_LABELS[pdi.status]}
          </Badge>
        }
      />

      {/* Header info + signatures */}
      <Tile style={{ marginBottom: 24 }}>
        <div className="row wrap" style={{ gap: 24, marginBottom: 16 }}>
          <div style={{ minWidth: 140 }}>
            <p className="small" style={{ marginBottom: 2 }}>
              Manager
            </p>
            <p className="body" style={{ fontWeight: 600 }}>
              {pdi.manager.firstName} {pdi.manager.lastName}
            </p>
          </div>
          <div style={{ minWidth: 100 }}>
            <p className="small" style={{ marginBottom: 2 }}>
              Début
            </p>
            <p className="body" style={{ fontWeight: 600 }}>
              {new Date(pdi.period.start).toLocaleDateString("fr-FR")}
            </p>
          </div>
          <div style={{ minWidth: 100 }}>
            <p className="small" style={{ marginBottom: 2 }}>
              Fin
            </p>
            <p className="body" style={{ fontWeight: 600 }}>
              {new Date(pdi.period.end).toLocaleDateString("fr-FR")}
            </p>
          </div>
        </div>

        {/* Signatures */}
        <div className="row wrap" style={{ gap: 12, alignItems: "center" }}>
          <Badge tone={pdi.employeeSignedAt ? "green" : "grey"}>
            <FileSignature className="w-3.5 h-3.5" />
            Employé{" "}
            {pdi.employeeSignedAt
              ? `signé le ${new Date(pdi.employeeSignedAt).toLocaleDateString("fr-FR")}`
              : "non signé"}
          </Badge>
          <Badge tone={pdi.managerSignedAt ? "green" : "grey"}>
            <FileSignature className="w-3.5 h-3.5" />
            Manager{" "}
            {pdi.managerSignedAt
              ? `signé le ${new Date(pdi.managerSignedAt).toLocaleDateString("fr-FR")}`
              : "non signé"}
          </Badge>
          {canSign && (
            <button
              onClick={() => signMutation.mutate()}
              disabled={signMutation.isPending}
              className="btn btn-primary btn-sm"
            >
              <FileSignature className="w-3.5 h-3.5" />
              {signMutation.isPending ? "Signature…" : "Signer"}
            </button>
          )}
        </div>
      </Tile>

      {/* Progress */}
      {pdi.actions.length > 0 && (
        <Tile style={{ marginBottom: 24 }}>
          <div
            className="row between"
            style={{ alignItems: "center", marginBottom: 8 }}
          >
            <span className="body" style={{ fontWeight: 600 }}>
              Progression des actions
            </span>
            <span
              className="body"
              style={{ fontWeight: 700, color: "var(--blue)" }}
            >
              {progressPct}% ({completedActions}/{pdi.actions.length})
            </span>
          </div>
          <Bar pct={progressPct} tone="var(--green)" height={10} />
        </Tile>
      )}

      {/* Objectives */}
      <Tile style={{ marginBottom: 24 }}>
        <div
          className="row between"
          style={{ alignItems: "center", marginBottom: 12 }}
        >
          <h2 className="h2">Objectifs</h2>
          <button
            onClick={() => {
              setObjectivesText(pdi.objectives.join("\n"));
              setEditingObjective((v) => !v);
            }}
            className="btn btn-ghost btn-sm"
          >
            <PenSquare className="w-3.5 h-3.5" />
            Éditer
          </button>
        </div>

        {editingObjective ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <textarea
              rows={4}
              className="input"
              aria-label="Objectifs, un par ligne"
              value={objectivesText}
              onChange={(e) => setObjectivesText(e.target.value)}
              placeholder="Un objectif par ligne"
            />
            <div className="row" style={{ justifyContent: "flex-end", gap: 8 }}>
              <button
                onClick={() => setEditingObjective(false)}
                className="btn btn-ghost btn-sm"
              >
                Annuler
              </button>
            </div>
          </div>
        ) : pdi.objectives.length === 0 ? (
          <p className="small" style={{ fontStyle: "italic" }}>
            Aucun objectif défini
          </p>
        ) : (
          <ul style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {pdi.objectives.map((obj, i) => (
              <li
                key={i}
                className="body"
                style={{ display: "flex", alignItems: "flex-start", gap: 8 }}
              >
                <span
                  style={{
                    marginTop: 7,
                    width: 6,
                    height: 6,
                    borderRadius: "9999px",
                    background: "var(--blue)",
                    flexShrink: 0,
                  }}
                />
                {obj}
              </li>
            ))}
          </ul>
        )}
      </Tile>

      {/* Actions */}
      <Tile style={{ marginBottom: 24 }}>
        <div
          className="row between"
          style={{ alignItems: "center", marginBottom: 16 }}
        >
          <h2 className="h2">Actions ({pdi.actions.length})</h2>
          <button
            onClick={() => setShowNewAction((v) => !v)}
            className="btn btn-ghost btn-sm"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Ajouter une action
          </button>
        </div>

        {/* New action form */}
        {showNewAction && (
          <div
            style={{
              background: "var(--bg-alt)",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius)",
              padding: 16,
              marginBottom: 16,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="field">
                <label htmlFor="pdi-action-title">Titre *</label>
                <input
                  id="pdi-action-title"
                  className="input"
                  aria-label="Titre de l'action"
                  value={newAction.title}
                  onChange={(e) =>
                    setNewAction((a) => ({ ...a, title: e.target.value }))
                  }
                  placeholder="Titre de l'action"
                />
              </div>
              <div className="field">
                <label htmlFor="pdi-action-type">Type</label>
                <select
                  id="pdi-action-type"
                  className="input"
                  aria-label="Type d'action"
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
              <div className="field">
                <label htmlFor="pdi-action-date">Date cible</label>
                <input
                  id="pdi-action-date"
                  type="date"
                  className="input"
                  aria-label="Date cible de l'action"
                  value={newAction.targetDate}
                  onChange={(e) =>
                    setNewAction((a) => ({ ...a, targetDate: e.target.value }))
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="pdi-action-desc">Description</label>
                <input
                  id="pdi-action-desc"
                  className="input"
                  aria-label="Description de l'action"
                  value={newAction.description}
                  onChange={(e) =>
                    setNewAction((a) => ({ ...a, description: e.target.value }))
                  }
                  placeholder="Description optionnelle"
                />
              </div>
            </div>
            <div className="row" style={{ justifyContent: "flex-end", gap: 8 }}>
              <button
                onClick={() => setShowNewAction(false)}
                className="btn btn-ghost btn-sm"
              >
                Annuler
              </button>
              <button
                disabled={addActionMutation.isPending || !newAction.title}
                onClick={() => addActionMutation.mutate(newAction)}
                className="btn btn-primary btn-sm"
              >
                {addActionMutation.isPending ? "Ajout…" : "Ajouter"}
              </button>
            </div>
          </div>
        )}

        {/* Action list */}
        {pdi.actions.length === 0 && !showNewAction ? (
          <p
            className="small"
            style={{ fontStyle: "italic", textAlign: "center", padding: 16 }}
          >
            Aucune action définie
          </p>
        ) : (
          <div>
            {pdi.actions.map((action, idx) => (
              <div
                key={action._id}
                className="row"
                style={{
                  alignItems: "flex-start",
                  gap: 12,
                  padding: "12px 0",
                  borderTop: idx === 0 ? "none" : "1px solid var(--line)",
                }}
              >
                <span style={{ marginTop: 2 }}>
                  <ActionStatusIcon status={action.status} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    className="row wrap"
                    style={{ alignItems: "center", gap: 8 }}
                  >
                    <span className="body" style={{ fontWeight: 600 }}>
                      {action.title}
                    </span>
                    <Badge tone="grey">{ACTION_TYPE_LABELS[action.type]}</Badge>
                  </div>
                  {action.description && (
                    <p className="small" style={{ marginTop: 2 }}>
                      {action.description}
                    </p>
                  )}
                  <div
                    className="row wrap small"
                    style={{ gap: 12, marginTop: 4 }}
                  >
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
                      className="btn btn-ghost btn-sm"
                      style={{ flexShrink: 0 }}
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
      </Tile>

      {/* Notes */}
      {pdi.notes && (
        <Tile>
          <h2 className="h2" style={{ marginBottom: 8 }}>
            Notes
          </h2>
          <p className="body" style={{ whiteSpace: "pre-wrap" }}>
            {pdi.notes}
          </p>
        </Tile>
      )}
    </div>
  );
}
