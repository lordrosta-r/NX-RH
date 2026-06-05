import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/api/client";
import { queryKeys } from "../lib/queryKeys";
import MobilityTimeline from "@/components/mobility/MobilityTimeline";
import { PageHead, Tile, StatTile, Badge } from "../components/shell";

type MobilityStatus =
  | "pending"
  | "under_review"
  | "approved"
  | "rejected"
  | "on_hold";
type RequestType =
  | "internal_transfer"
  | "promotion"
  | "lateral_move"
  | "role_change"
  | "department_change"
  | "site_change"
  | "international"
  | "secondment";
type Priority = "low" | "medium" | "normal" | "high" | "urgent";
type ImplementationStatus = "pending" | "in_progress" | "completed";

interface MobilityDecision {
  decidedAt?: string;
  decidedBy?: { _id: string; firstName: string; lastName: string };
  effectiveDate?: string;
  comment?: string;
}

interface MobilityImplementation {
  status: ImplementationStatus;
  startedAt?: string;
  completedAt?: string;
  notes?: string;
}

interface MobilityRequest {
  _id: string;
  employeeId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    department?: string;
    position?: string;
  };
  targetPosition: string;
  targetDepartment?: string;
  requestType: RequestType;
  motivation?: string;
  status: MobilityStatus;
  priority: Priority;
  hrComment?: string;
  createdAt: string;
  targetDate?: string;
  reviewedAt?: string;
  decision?: MobilityDecision;
  implementation?: MobilityImplementation;
}

interface MobilityStats {
  total: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  approvalRate: number;
  avgProcessingDays: number | null;
}

type Tone = "blue" | "green" | "amber" | "red" | "grey";

const STATUS_LABELS: Record<MobilityStatus, string> = {
  pending: "En attente",
  under_review: "En cours d'examen",
  approved: "Approuvée",
  rejected: "Refusée",
  on_hold: "En suspens",
};

const STATUS_TONE: Record<MobilityStatus, Tone> = {
  pending: "amber",
  under_review: "blue",
  approved: "green",
  rejected: "red",
  on_hold: "grey",
};

const TYPE_LABELS: Record<RequestType, string> = {
  internal_transfer: "Mutation interne",
  promotion: "Promotion",
  lateral_move: "Mobilité latérale",
  role_change: "Changement de rôle",
  department_change: "Changement de département",
  site_change: "Changement de site",
  international: "Mobilité internationale",
  secondment: "Détachement",
};

const PRIORITY_LABELS: Record<Priority, string> = {
  low: "Faible",
  medium: "Moyenne",
  normal: "Normale",
  high: "Haute",
  urgent: "Urgente",
};

const PRIORITY_COLOR: Record<Priority, string> = {
  low: "var(--ink-3)",
  medium: "var(--blue)",
  normal: "var(--ink-3)",
  high: "var(--amber)",
  urgent: "var(--red)",
};

const EMPTY_FORM = {
  targetPosition: "",
  targetDepartment: "",
  requestType: "internal_transfer" as RequestType,
  motivation: "",
  priority: "normal" as Priority,
};

type Tab = "requests" | "history";

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 50,
  padding: 16,
};

export default function MobilityPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isHrAdmin = user && ["admin", "hr"].includes(user.role);

  const [activeTab, setActiveTab] = useState<Tab>("requests");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);
  const [selectedRequest, setSelectedRequest] =
    useState<MobilityRequest | null>(null);
  const [showTimeline, setShowTimeline] = useState<MobilityRequest | null>(
    null,
  );
  const [hrComment, setHrComment] = useState("");
  const [newRequest, setNewRequest] = useState(EMPTY_FORM);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.mobility.lists(),
    queryFn: () =>
      api
        .get("/mobility", {
          params: { status: statusFilter || undefined, limit: 50 },
        })
        .then((r) => r.data),
  });

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: queryKeys.mobility.history(user?.id ?? user?._id ?? ""),
    queryFn: () =>
      api.get(`/mobility/history/${user?.id ?? user?._id}`).then((r) => r.data),
    enabled: !isHrAdmin && activeTab === "history" && !!(user?.id ?? user?._id),
  });

  const { data: statsData } = useQuery({
    queryKey: queryKeys.mobility.stats(),
    queryFn: () =>
      api.get("/mobility/stats").then((r) => r.data.data as MobilityStats),
    enabled: !!isHrAdmin,
  });

  const requests: MobilityRequest[] = data?.data ?? [];
  const history: MobilityRequest[] = historyData?.data ?? [];
  const total: number = data?.total ?? 0;

  const filteredRequests = typeFilter
    ? requests.filter((r) => r.requestType === typeFilter)
    : requests;

  const createMutation = useMutation({
    mutationFn: (req: typeof newRequest) => api.post("/mobility", req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.mobility.lists() });
      setShowNewForm(false);
      setNewRequest(EMPTY_FORM);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({
      id,
      status,
      hrComment: comment,
    }: {
      id: string;
      status: string;
      hrComment?: string;
    }) => api.patch(`/mobility/${id}`, { status, hrComment: comment }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.mobility.lists() });
      setSelectedRequest(null);
    },
  });

  const completeMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      api.post(`/mobility/${id}/complete`, { notes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.mobility.lists() });
      qc.invalidateQueries({ queryKey: queryKeys.mobility.stats() });
    },
  });

  const reopenMutation = useMutation({
    mutationFn: (id: string) => api.post(`/mobility/${id}/reopen`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.mobility.lists() });
    },
  });

  const kpis = {
    total,
    pending: requests.filter((r) => r.status === "pending").length,
    approved: requests.filter((r) => r.status === "approved").length,
    rejected: requests.filter((r) => r.status === "rejected").length,
  };

  const columns = isHrAdmin
    ? "1.6fr 1.4fr 1.2fr 1fr 0.9fr 1fr 1fr 1.4fr"
    : "1.6fr 1.4fr 1.2fr 1fr 1fr 1.4fr";

  return (
    <div className="nx-app">
      <PageHead
        title="Mobilité interne"
        desc="Gestion des demandes de mobilité et mutations"
        actions={
          <button
            onClick={() => setShowNewForm(true)}
            className="btn btn-primary"
          >
            + Nouvelle demande
          </button>
        }
      />

      {/* KPIs */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
        }}
      >
        <StatTile value={kpis.total} label="Total" tone="var(--blue)" />
        <StatTile value={kpis.pending} label="En attente" tone="var(--amber)" />
        <StatTile
          value={kpis.approved}
          label="Approuvées"
          tone="var(--green)"
        />
        <StatTile value={kpis.rejected} label="Refusées" tone="var(--red)" />
      </div>

      {/* Stats HR dashboard */}
      {isHrAdmin && statsData && (
        <Tile>
          <h2 className="h3" style={{ marginBottom: 16 }}>
            Statistiques de mobilité
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 16,
            }}
          >
            <StatTile
              value={`${statsData.approvalRate}%`}
              label="Taux d'approbation"
              tone="var(--blue)"
            />
            <StatTile
              value={
                statsData.avgProcessingDays != null
                  ? `${statsData.avgProcessingDays}j`
                  : "—"
              }
              label="Délai moyen traitement"
            />
            <StatTile
              value={statsData.byStatus?.approved ?? 0}
              label="Approuvées"
              tone="var(--green)"
            />
            <StatTile value={statsData.total} label="Total demandes" />
          </div>
          {Object.keys(statsData.byType ?? {}).length > 0 && (
            <div
              className="row wrap"
              style={{
                gap: 8,
                marginTop: 16,
                paddingTop: 16,
                borderTop: "1px solid var(--line)",
              }}
            >
              {Object.entries(statsData.byType).map(([type, count]) => (
                <Badge key={type} tone="grey">
                  {TYPE_LABELS[type as RequestType] ?? type}: {count}
                </Badge>
              ))}
            </div>
          )}
        </Tile>
      )}

      {/* Tabs */}
      {!isHrAdmin && (
        <div
          className="row"
          style={{ gap: 0, borderBottom: "1px solid var(--line)" }}
        >
          {(["requests", "history"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="small"
              style={{
                padding: "12px 16px",
                background: "none",
                border: "none",
                borderBottom:
                  activeTab === tab
                    ? "2px solid var(--blue)"
                    : "2px solid transparent",
                color: activeTab === tab ? "var(--blue)" : "var(--ink-3)",
                fontWeight: activeTab === tab ? 700 : 500,
                cursor: "pointer",
              }}
            >
              {tab === "requests" ? "Mes demandes" : "Historique"}
            </button>
          ))}
        </div>
      )}

      {/* History tab (employee only) */}
      {!isHrAdmin && activeTab === "history" && (
        <div style={{ display: "grid", gap: 16 }}>
          {historyLoading ? (
            <div className="small" style={{ padding: 40, textAlign: "center" }}>
              Chargement…
            </div>
          ) : history.length === 0 ? (
            <Tile style={{ textAlign: "center", padding: 48 }}>
              <p className="body" style={{ fontWeight: 600 }}>
                Aucun historique de mobilité
              </p>
            </Tile>
          ) : (
            history.map((r) => (
              <Tile key={r._id}>
                <div
                  className="row between"
                  style={{ marginBottom: 12, gap: 12 }}
                >
                  <div style={{ minWidth: 0 }}>
                    <p className="body" style={{ fontWeight: 600 }}>
                      {r.targetPosition}
                    </p>
                    <p className="small" style={{ marginTop: 2 }}>
                      {TYPE_LABELS[r.requestType] ?? r.requestType}
                      {r.targetDepartment && ` · ${r.targetDepartment}`}
                    </p>
                  </div>
                  <Badge tone={STATUS_TONE[r.status]} dot>
                    {STATUS_LABELS[r.status]}
                  </Badge>
                </div>
                <MobilityTimeline
                  createdAt={r.createdAt}
                  status={r.status}
                  reviewedAt={r.reviewedAt}
                  hrComment={r.hrComment}
                  implementationStatus={r.implementation?.status}
                  implementationCompletedAt={r.implementation?.completedAt}
                />
                {r.status === "rejected" && (
                  <div
                    style={{
                      marginTop: 12,
                      paddingTop: 12,
                      borderTop: "1px solid var(--line)",
                    }}
                  >
                    <button
                      onClick={() => reopenMutation.mutate(r._id)}
                      disabled={reopenMutation.isPending}
                      className="link small"
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      ↩ Relancer cette demande
                    </button>
                  </div>
                )}
              </Tile>
            ))
          )}
        </div>
      )}

      {/* Main requests tab */}
      {(isHrAdmin || activeTab === "requests") && (
        <>
          {/* Filtres statut */}
          <div className="row wrap" style={{ gap: 8 }}>
            {(
              [
                "",
                "pending",
                "under_review",
                "approved",
                "rejected",
                "on_hold",
              ] as const
            ).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className="btn btn-sm"
                style={
                  statusFilter === s
                    ? { background: "var(--blue)", color: "#fff" }
                    : { background: "var(--bg-alt)", color: "var(--ink-3)" }
                }
              >
                {s ? STATUS_LABELS[s] : "Tous"}
              </button>
            ))}
          </div>

          {/* Filtres type (HR/admin) */}
          {isHrAdmin && (
            <div className="row wrap" style={{ gap: 8 }}>
              <button
                onClick={() => setTypeFilter("")}
                className="btn btn-sm"
                style={
                  typeFilter === ""
                    ? { background: "var(--ink)", color: "#fff" }
                    : { background: "var(--bg-alt)", color: "var(--ink-3)" }
                }
              >
                Tous types
              </button>
              {(Object.entries(TYPE_LABELS) as [RequestType, string][]).map(
                ([type, label]) => (
                  <button
                    key={type}
                    onClick={() =>
                      setTypeFilter(typeFilter === type ? "" : type)
                    }
                    className="btn btn-sm"
                    style={
                      typeFilter === type
                        ? { background: "var(--blue)", color: "#fff" }
                        : { background: "var(--bg-alt)", color: "var(--ink-3)" }
                    }
                  >
                    {label}
                  </button>
                ),
              )}
            </div>
          )}

          {/* Table */}
          {isLoading ? (
            <div className="small" style={{ padding: 40, textAlign: "center" }}>
              Chargement…
            </div>
          ) : filteredRequests.length === 0 ? (
            <Tile style={{ textAlign: "center", padding: 48 }}>
              <p className="body" style={{ fontWeight: 600 }}>
                Aucune demande de mobilité
              </p>
              <p className="small" style={{ marginTop: 4 }}>
                Les demandes apparaîtront ici
              </p>
            </Tile>
          ) : (
            <Tile style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <div
                  className="tbl-head"
                  style={{ gridTemplateColumns: columns }}
                >
                  <div>Collaborateur</div>
                  <div>Poste visé</div>
                  <div>Type</div>
                  <div>Statut</div>
                  {isHrAdmin && <div>Priorité</div>}
                  {isHrAdmin && <div>Date effective</div>}
                  <div>Date</div>
                  <div>Actions</div>
                </div>
                {filteredRequests.map((r) => (
                  <div
                    key={r._id}
                    className="tbl-row"
                    style={{ gridTemplateColumns: columns }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <p className="body" style={{ fontWeight: 600 }}>
                        {r.employeeId.firstName} {r.employeeId.lastName}
                      </p>
                      <p className="small">
                        {r.employeeId.department ??
                          r.employeeId.position ??
                          r.employeeId.email}
                      </p>
                    </div>
                    <div className="small">{r.targetPosition}</div>
                    <div>
                      <Badge tone="grey">
                        {TYPE_LABELS[r.requestType] ?? r.requestType}
                      </Badge>
                    </div>
                    <div>
                      <Badge tone={STATUS_TONE[r.status]} dot>
                        {STATUS_LABELS[r.status]}
                      </Badge>
                    </div>
                    {isHrAdmin && (
                      <div
                        className="small"
                        style={{
                          color: PRIORITY_COLOR[r.priority] ?? "var(--ink-3)",
                          fontWeight: r.priority === "urgent" ? 700 : 400,
                        }}
                      >
                        {PRIORITY_LABELS[r.priority] ?? r.priority}
                      </div>
                    )}
                    {isHrAdmin && (
                      <div className="small">
                        {r.decision?.effectiveDate
                          ? new Date(
                              r.decision.effectiveDate,
                            ).toLocaleDateString("fr-FR")
                          : "—"}
                      </div>
                    )}
                    <div className="small">
                      {new Date(r.createdAt).toLocaleDateString("fr-FR")}
                    </div>
                    <div className="row wrap" style={{ gap: 8 }}>
                      {isHrAdmin && (
                        <button
                          onClick={() => {
                            setSelectedRequest(r);
                            setHrComment(r.hrComment ?? "");
                          }}
                          className="link small"
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                          }}
                        >
                          Traiter →
                        </button>
                      )}
                      {isHrAdmin &&
                        r.status === "approved" &&
                        r.implementation?.status !== "completed" && (
                          <button
                            onClick={() =>
                              completeMutation.mutate({ id: r._id })
                            }
                            disabled={completeMutation.isPending}
                            className="link small"
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: "var(--green)",
                            }}
                          >
                            ✓ Implémenter
                          </button>
                        )}
                      {r.implementation?.status === "completed" && (
                        <span
                          className="small"
                          style={{ color: "var(--green)", fontWeight: 600 }}
                        >
                          ✓ Implémentée
                        </span>
                      )}
                      <button
                        onClick={() => setShowTimeline(r)}
                        className="small"
                        aria-label="Voir la timeline"
                        title="Voir la timeline"
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "var(--ink-3)",
                        }}
                      >
                        ⏱
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Tile>
          )}
        </>
      )}

      {/* Modal — timeline */}
      {showTimeline && (
        <div style={overlayStyle}>
          <Tile style={{ width: "100%", maxWidth: 448 }}>
            <h2 className="h3">Timeline de la demande</h2>
            <p className="small" style={{ marginTop: 8, marginBottom: 16 }}>
              <span style={{ fontWeight: 600 }}>
                {showTimeline.targetPosition}
              </span>
              {showTimeline.targetDepartment &&
                ` · ${showTimeline.targetDepartment}`}
            </p>
            <MobilityTimeline
              createdAt={showTimeline.createdAt}
              status={showTimeline.status}
              reviewedAt={showTimeline.reviewedAt}
              hrComment={showTimeline.hrComment}
              implementationStatus={showTimeline.implementation?.status}
              implementationCompletedAt={
                showTimeline.implementation?.completedAt
              }
            />
            <button
              onClick={() => setShowTimeline(null)}
              className="btn btn-ghost btn-block"
              style={{ marginTop: 16 }}
            >
              Fermer
            </button>
          </Tile>
        </div>
      )}

      {/* Modal — nouvelle demande */}
      {showNewForm && (
        <div style={overlayStyle}>
          <Tile style={{ width: "100%", maxWidth: 512 }}>
            <h2 className="h3" style={{ marginBottom: 16 }}>
              Nouvelle demande de mobilité
            </h2>
            <div style={{ display: "grid", gap: 16 }}>
              <div className="field">
                <label htmlFor="mob-target-position">Poste visé *</label>
                <input
                  id="mob-target-position"
                  aria-label="Poste visé"
                  value={newRequest.targetPosition}
                  onChange={(e) =>
                    setNewRequest((n) => ({
                      ...n,
                      targetPosition: e.target.value,
                    }))
                  }
                  className="input"
                  placeholder="Ex : Chef de projet senior"
                />
              </div>
              <div className="field">
                <label htmlFor="mob-target-dept">Département cible</label>
                <input
                  id="mob-target-dept"
                  aria-label="Département cible"
                  value={newRequest.targetDepartment}
                  onChange={(e) =>
                    setNewRequest((n) => ({
                      ...n,
                      targetDepartment: e.target.value,
                    }))
                  }
                  className="input"
                  placeholder="Ex : Ingénierie"
                />
              </div>
              <div className="field">
                <label htmlFor="mob-type">Type de demande</label>
                <select
                  id="mob-type"
                  aria-label="Type de demande"
                  value={newRequest.requestType}
                  onChange={(e) =>
                    setNewRequest((n) => ({
                      ...n,
                      requestType: e.target.value as RequestType,
                    }))
                  }
                  className="input"
                >
                  {(Object.entries(TYPE_LABELS) as [RequestType, string][]).map(
                    ([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ),
                  )}
                </select>
              </div>
              <div className="field">
                <label htmlFor="mob-motivation">Motivation</label>
                <textarea
                  id="mob-motivation"
                  aria-label="Motivation"
                  value={newRequest.motivation}
                  onChange={(e) =>
                    setNewRequest((n) => ({ ...n, motivation: e.target.value }))
                  }
                  rows={3}
                  className="input"
                  placeholder="Expliquez votre demande…"
                />
              </div>
            </div>
            <div className="row" style={{ gap: 12, marginTop: 16 }}>
              <button
                onClick={() => createMutation.mutate(newRequest)}
                disabled={
                  !newRequest.targetPosition || createMutation.isPending
                }
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                {createMutation.isPending ? "Envoi…" : "Soumettre"}
              </button>
              <button
                onClick={() => setShowNewForm(false)}
                className="btn btn-ghost"
              >
                Annuler
              </button>
            </div>
          </Tile>
        </div>
      )}

      {/* Modal — traitement RH */}
      {selectedRequest && isHrAdmin && (
        <div style={overlayStyle}>
          <Tile style={{ width: "100%", maxWidth: 512 }}>
            <h2 className="h3" style={{ marginBottom: 16 }}>
              Traiter la demande
            </h2>
            <div style={{ display: "grid", gap: 4 }}>
              <p className="small">
                <span style={{ fontWeight: 600 }}>Collaborateur : </span>
                {selectedRequest.employeeId.firstName}{" "}
                {selectedRequest.employeeId.lastName}
              </p>
              <p className="small">
                <span style={{ fontWeight: 600 }}>Poste visé : </span>
                {selectedRequest.targetPosition}
              </p>
              <p className="small">
                <span style={{ fontWeight: 600 }}>Type : </span>
                {TYPE_LABELS[selectedRequest.requestType] ??
                  selectedRequest.requestType}
              </p>
              <p className="small">
                <span style={{ fontWeight: 600 }}>Priorité : </span>
                <span
                  style={{
                    color:
                      PRIORITY_COLOR[selectedRequest.priority] ??
                      "var(--ink-3)",
                  }}
                >
                  {PRIORITY_LABELS[selectedRequest.priority] ??
                    selectedRequest.priority}
                </span>
              </p>
              {selectedRequest.motivation && (
                <p className="small" style={{ marginTop: 8 }}>
                  <span style={{ fontWeight: 600 }}>Motivation : </span>
                  {selectedRequest.motivation}
                </p>
              )}
            </div>
            <div className="field" style={{ marginTop: 16 }}>
              <label htmlFor="mob-hr-comment">Commentaire RH</label>
              <textarea
                id="mob-hr-comment"
                aria-label="Commentaire RH"
                value={hrComment}
                onChange={(e) => setHrComment(e.target.value)}
                rows={3}
                className="input"
              />
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
                marginTop: 16,
              }}
            >
              {(
                [
                  "under_review",
                  "approved",
                  "rejected",
                  "on_hold",
                ] as MobilityStatus[]
              ).map((s) => (
                <button
                  key={s}
                  onClick={() =>
                    updateStatusMutation.mutate({
                      id: selectedRequest._id,
                      status: s,
                      hrComment,
                    })
                  }
                  disabled={updateStatusMutation.isPending}
                  className="btn btn-ghost btn-sm"
                  style={
                    s === "approved"
                      ? { color: "var(--green)" }
                      : s === "rejected"
                        ? { color: "var(--red)" }
                        : undefined
                  }
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
            <button
              onClick={() => setSelectedRequest(null)}
              className="btn btn-ghost btn-block"
              style={{ marginTop: 16 }}
            >
              Fermer
            </button>
          </Tile>
        </div>
      )}
    </div>
  );
}
