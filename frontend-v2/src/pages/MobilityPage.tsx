import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/api/client";
import { queryKeys } from "../lib/queryKeys";
import MobilityTimeline from "@/components/mobility/MobilityTimeline";

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

const STATUS_LABELS: Record<MobilityStatus, string> = {
  pending: "En attente",
  under_review: "En cours d'examen",
  approved: "Approuvée",
  rejected: "Refusée",
  on_hold: "En suspens",
};

const STATUS_COLORS: Record<MobilityStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  under_review: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  on_hold: "bg-gray-100 text-gray-600",
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

const TYPE_COLORS: Record<RequestType, string> = {
  internal_transfer: "bg-blue-50 text-blue-700",
  promotion: "bg-purple-50 text-purple-700",
  lateral_move: "bg-gray-50 text-gray-700",
  role_change: "bg-indigo-50 text-indigo-700",
  department_change: "bg-orange-50 text-orange-700",
  site_change: "bg-teal-50 text-teal-700",
  international: "bg-rose-50 text-rose-700",
  secondment: "bg-amber-50 text-amber-700",
};

const PRIORITY_LABELS: Record<Priority, string> = {
  low: "Faible",
  medium: "Moyenne",
  normal: "Normale",
  high: "Haute",
  urgent: "Urgente",
};

const PRIORITY_COLORS: Record<Priority, string> = {
  low: "text-gray-400",
  medium: "text-blue-500",
  normal: "text-gray-500",
  high: "text-orange-500",
  urgent: "text-red-600 font-semibold",
};

const EMPTY_FORM = {
  targetPosition: "",
  targetDepartment: "",
  requestType: "internal_transfer" as RequestType,
  motivation: "",
  priority: "normal" as Priority,
};

type Tab = "requests" | "history";

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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mobilité interne</h1>
          <p className="text-gray-500 text-sm mt-1">
            Gestion des demandes de mobilité et mutations
          </p>
        </div>
        <button
          onClick={() => setShowNewForm(true)}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Nouvelle demande
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total", value: kpis.total, color: "blue" },
          { label: "En attente", value: kpis.pending, color: "yellow" },
          { label: "Approuvées", value: kpis.approved, color: "green" },
          { label: "Refusées", value: kpis.rejected, color: "red" },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="bg-white p-4 rounded-xl border border-gray-200"
          >
            <p className="text-sm text-gray-500">{label}</p>
            <p className={`text-2xl font-bold text-${color}-600 mt-1`}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Stats HR dashboard */}
      {isHrAdmin && statsData && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            📊 Statistiques de mobilité
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-600">
                {statsData.approvalRate}%
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Taux d'approbation</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">
                {statsData.avgProcessingDays != null
                  ? `${statsData.avgProcessingDays}j`
                  : "—"}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Délai moyen traitement
              </p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">
                {statsData.byStatus?.approved ?? 0}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Approuvées</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-600">
                {statsData.total}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Total demandes</p>
            </div>
          </div>
          {Object.keys(statsData.byType ?? {}).length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-2">
              {Object.entries(statsData.byType).map(([type, count]) => (
                <span
                  key={type}
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[type as RequestType] ?? "bg-gray-100 text-gray-600"}`}
                >
                  {TYPE_LABELS[type as RequestType] ?? type}: {count}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      {!isHrAdmin && (
        <div className="flex gap-1 border-b border-gray-200">
          {(["requests", "history"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab === "requests" ? "Mes demandes" : "Historique"}
            </button>
          ))}
        </div>
      )}

      {/* History tab (employee only) */}
      {!isHrAdmin && activeTab === "history" && (
        <div className="space-y-4">
          {historyLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-32 bg-gray-200 animate-pulse rounded-lg"
                />
              ))}
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-16 text-gray-600">
              <p className="text-4xl mb-3">📋</p>
              <p className="font-medium">Aucun historique de mobilité</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((r) => (
                <div
                  key={r._id}
                  className="bg-white rounded-xl border border-gray-200 p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-medium text-gray-800">
                        {r.targetPosition}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {TYPE_LABELS[r.requestType] ?? r.requestType}
                        {r.targetDepartment && ` · ${r.targetDepartment}`}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status]}`}
                    >
                      {STATUS_LABELS[r.status]}
                    </span>
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
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <button
                        onClick={() => reopenMutation.mutate(r._id)}
                        disabled={reopenMutation.isPending}
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium disabled:opacity-50"
                      >
                        ↩ Relancer cette demande
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main requests tab */}
      {(isHrAdmin || activeTab === "requests") && (
        <>
          {/* Filtres statut */}
          <div className="flex flex-wrap gap-2">
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
                className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                  statusFilter === s
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {s ? STATUS_LABELS[s] : "Tous"}
              </button>
            ))}
          </div>

          {/* Filtres type (HR/admin) */}
          {isHrAdmin && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setTypeFilter("")}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  typeFilter === ""
                    ? "bg-gray-700 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
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
                    className={`px-3 py-1 text-xs rounded-full transition-colors ${
                      typeFilter === type
                        ? TYPE_COLORS[type] + " ring-1 ring-current"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {label}
                  </button>
                ),
              )}
            </div>
          )}

          {/* Table */}
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="h-14 bg-gray-200 animate-pulse rounded-lg"
                />
              ))}
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-16 text-gray-600">
              <p className="text-4xl mb-3">📋</p>
              <p className="font-medium">Aucune demande de mobilité</p>
              <p className="text-sm mt-1">Les demandes apparaîtront ici</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto hidden sm:block">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">
                        Collaborateur
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">
                        Poste visé
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">
                        Type
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">
                        Statut
                      </th>
                      {isHrAdmin && (
                        <th className="text-left px-4 py-3 font-medium text-gray-600">
                          Priorité
                        </th>
                      )}
                      {isHrAdmin && (
                        <th className="text-left px-4 py-3 font-medium text-gray-600">
                          Date effective
                        </th>
                      )}
                      <th className="text-left px-4 py-3 font-medium text-gray-600">
                        Date
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredRequests.map((r) => (
                      <tr
                        key={r._id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-800">
                            {r.employeeId.firstName} {r.employeeId.lastName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {r.employeeId.department ??
                              r.employeeId.position ??
                              r.employeeId.email}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {r.targetPosition}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[r.requestType] ?? "bg-gray-50 text-gray-600"}`}
                          >
                            {TYPE_LABELS[r.requestType] ?? r.requestType}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status]}`}
                          >
                            {STATUS_LABELS[r.status]}
                          </span>
                        </td>
                        {isHrAdmin && (
                          <td className="px-4 py-3">
                            <span
                              className={`text-xs ${PRIORITY_COLORS[r.priority] ?? "text-gray-500"}`}
                            >
                              {PRIORITY_LABELS[r.priority] ?? r.priority}
                            </span>
                          </td>
                        )}
                        {isHrAdmin && (
                          <td className="px-4 py-3 text-gray-500 text-xs">
                            {r.decision?.effectiveDate
                              ? new Date(
                                  r.decision.effectiveDate,
                                ).toLocaleDateString("fr-FR")
                              : "—"}
                          </td>
                        )}
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {new Date(r.createdAt).toLocaleDateString("fr-FR")}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {isHrAdmin && (
                              <button
                                onClick={() => {
                                  setSelectedRequest(r);
                                  setHrComment(r.hrComment ?? "");
                                }}
                                className="text-blue-600 hover:text-blue-800 text-xs font-medium"
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
                                  className="text-green-600 hover:text-green-800 text-xs font-medium disabled:opacity-50"
                                >
                                  ✓ Implémenter
                                </button>
                              )}
                            {r.implementation?.status === "completed" && (
                              <span className="text-xs text-green-600 font-medium">
                                ✓ Implémentée
                              </span>
                            )}
                            <button
                              onClick={() => setShowTimeline(r)}
                              className="text-gray-400 hover:text-gray-600 text-xs"
                              title="Voir la timeline"
                            >
                              ⏱
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="sm:hidden divide-y divide-gray-100">
                {filteredRequests.map((r) => (
                  <div key={r._id} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-gray-800">
                          {r.employeeId.firstName} {r.employeeId.lastName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {r.employeeId.department ??
                            r.employeeId.position ??
                            r.employeeId.email}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status]}`}
                      >
                        {STATUS_LABELS[r.status]}
                      </span>
                    </div>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      <dt className="text-gray-500">Poste visé</dt>
                      <dd className="text-gray-700 truncate">
                        {r.targetPosition}
                      </dd>
                      <dt className="text-gray-500">Type</dt>
                      <dd className="text-xs">
                        <span
                          className={`px-1.5 py-0.5 rounded-full ${TYPE_COLORS[r.requestType] ?? "bg-gray-50 text-gray-600"}`}
                        >
                          {TYPE_LABELS[r.requestType] ?? r.requestType}
                        </span>
                      </dd>
                      <dt className="text-gray-500">Priorité</dt>
                      <dd
                        className={`text-xs ${PRIORITY_COLORS[r.priority] ?? "text-gray-500"}`}
                      >
                        {PRIORITY_LABELS[r.priority] ?? r.priority}
                      </dd>
                      <dt className="text-gray-500">Date</dt>
                      <dd className="text-gray-500 text-xs">
                        {new Date(r.createdAt).toLocaleDateString("fr-FR")}
                      </dd>
                    </dl>
                    <div className="mt-3 pt-3 border-t border-gray-100 flex gap-3">
                      {isHrAdmin && (
                        <button
                          onClick={() => {
                            setSelectedRequest(r);
                            setHrComment(r.hrComment ?? "");
                          }}
                          className="text-blue-600 hover:text-blue-800 text-xs font-medium"
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
                            className="text-green-600 hover:text-green-800 text-xs font-medium disabled:opacity-50"
                          >
                            ✓ Implémenter
                          </button>
                        )}
                      <button
                        onClick={() => setShowTimeline(r)}
                        className="text-gray-400 hover:text-gray-600 text-xs"
                      >
                        ⏱ Timeline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal — timeline */}
      {showTimeline && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-800">
              Timeline de la demande
            </h2>
            <p className="text-sm text-gray-600">
              <span className="font-medium">{showTimeline.targetPosition}</span>
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
              className="w-full px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Modal — nouvelle demande */}
      {showNewForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-800">
              Nouvelle demande de mobilité
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Poste visé *
                </label>
                <input
                  value={newRequest.targetPosition}
                  onChange={(e) =>
                    setNewRequest((n) => ({
                      ...n,
                      targetPosition: e.target.value,
                    }))
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="Ex : Chef de projet senior"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Département cible
                </label>
                <input
                  value={newRequest.targetDepartment}
                  onChange={(e) =>
                    setNewRequest((n) => ({
                      ...n,
                      targetDepartment: e.target.value,
                    }))
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="Ex : Ingénierie"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type de demande
                </label>
                <select
                  value={newRequest.requestType}
                  onChange={(e) =>
                    setNewRequest((n) => ({
                      ...n,
                      requestType: e.target.value as RequestType,
                    }))
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motivation
                </label>
                <textarea
                  value={newRequest.motivation}
                  onChange={(e) =>
                    setNewRequest((n) => ({ ...n, motivation: e.target.value }))
                  }
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
                  placeholder="Expliquez votre demande…"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => createMutation.mutate(newRequest)}
                disabled={
                  !newRequest.targetPosition || createMutation.isPending
                }
                className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {createMutation.isPending ? "Envoi…" : "Soumettre"}
              </button>
              <button
                onClick={() => setShowNewForm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal — traitement RH */}
      {selectedRequest && isHrAdmin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-800">
              Traiter la demande
            </h2>
            <div>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Collaborateur : </span>
                {selectedRequest.employeeId.firstName}{" "}
                {selectedRequest.employeeId.lastName}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Poste visé : </span>
                {selectedRequest.targetPosition}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Type : </span>
                {TYPE_LABELS[selectedRequest.requestType] ??
                  selectedRequest.requestType}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Priorité : </span>
                <span
                  className={
                    PRIORITY_COLORS[selectedRequest.priority] ?? "text-gray-500"
                  }
                >
                  {PRIORITY_LABELS[selectedRequest.priority] ??
                    selectedRequest.priority}
                </span>
              </p>
              {selectedRequest.motivation && (
                <p className="text-sm text-gray-600 mt-2">
                  <span className="font-medium">Motivation : </span>
                  {selectedRequest.motivation}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Commentaire RH
              </label>
              <textarea
                value={hrComment}
                onChange={(e) => setHrComment(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
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
                  className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                    s === "approved"
                      ? "border-green-300 text-green-700 hover:bg-green-50"
                      : s === "rejected"
                        ? "border-red-300 text-red-700 hover:bg-red-50"
                        : "border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
            <button
              onClick={() => setSelectedRequest(null)}
              className="w-full px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
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
  priority: string;
  hrComment?: string;
  createdAt: string;
  targetDate?: string;
}

const STATUS_LABELS: Record<MobilityStatus, string> = {
  pending: "En attente",
  under_review: "En cours d'examen",
  approved: "Approuvée",
  rejected: "Refusée",
  on_hold: "En suspens",
};

const STATUS_COLORS: Record<MobilityStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  under_review: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  on_hold: "bg-gray-100 text-gray-600",
};

const TYPE_LABELS: Record<RequestType, string> = {
  internal_transfer: "Mutation interne",
  promotion: "Promotion",
  lateral_move: "Mobilité latérale",
  site_change: "Changement de site",
  department_change: "Changement de département",
};

const EMPTY_FORM = {
  targetPosition: "",
  targetDepartment: "",
  requestType: "internal_transfer" as RequestType,
  motivation: "",
  priority: "normal",
};

export default function MobilityPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isHrAdmin = user && ["admin", "hr"].includes(user.role);

  const [statusFilter, setStatusFilter] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);
  const [selectedRequest, setSelectedRequest] =
    useState<MobilityRequest | null>(null);
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

  const requests: MobilityRequest[] = data?.data ?? [];
  const total: number = data?.total ?? 0;

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

  const kpis = {
    total,
    pending: requests.filter((r) => r.status === "pending").length,
    approved: requests.filter((r) => r.status === "approved").length,
    rejected: requests.filter((r) => r.status === "rejected").length,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mobilité interne</h1>
          <p className="text-gray-500 text-sm mt-1">
            Gestion des demandes de mobilité et mutations
          </p>
        </div>
        <button
          onClick={() => setShowNewForm(true)}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Nouvelle demande
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total", value: kpis.total, color: "blue" },
          { label: "En attente", value: kpis.pending, color: "yellow" },
          { label: "Approuvées", value: kpis.approved, color: "green" },
          { label: "Refusées", value: kpis.rejected, color: "red" },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="bg-white p-4 rounded-xl border border-gray-200"
          >
            <p className="text-sm text-gray-500">{label}</p>
            <p className={`text-2xl font-bold text-${color}-600 mt-1`}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-2">
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
            className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
              statusFilter === s
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {s ? STATUS_LABELS[s] : "Tous"}
          </button>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-14 bg-gray-200 animate-pulse rounded-lg"
            />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <p className="text-4xl mb-3">📋</p>
          <p className="font-medium">Aucune demande de mobilité</p>
          <p className="text-sm mt-1">Les demandes apparaîtront ici</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto hidden sm:block">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">
                    Collaborateur
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">
                    Poste visé
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">
                    Type
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">
                    Statut
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">
                    Date
                  </th>
                  {isHrAdmin && (
                    <th className="text-left px-4 py-3 font-medium text-gray-600">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {requests.map((r) => (
                  <tr
                    key={r._id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">
                        {r.employeeId.firstName} {r.employeeId.lastName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {r.employeeId.department ??
                          r.employeeId.position ??
                          r.employeeId.email}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {r.targetPosition}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {TYPE_LABELS[r.requestType] ?? r.requestType}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status]}`}
                      >
                        {STATUS_LABELS[r.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(r.createdAt).toLocaleDateString("fr-FR")}
                    </td>
                    {isHrAdmin && (
                      <td className="px-4 py-3">
                        <button
                          onClick={() => {
                            setSelectedRequest(r);
                            setHrComment(r.hrComment ?? "");
                          }}
                          className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                        >
                          Traiter →
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden divide-y divide-gray-100">
            {requests.map((r) => (
              <div key={r._id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-gray-800">
                      {r.employeeId.firstName} {r.employeeId.lastName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {r.employeeId.department ??
                        r.employeeId.position ??
                        r.employeeId.email}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status]}`}
                  >
                    {STATUS_LABELS[r.status]}
                  </span>
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <dt className="text-gray-500">Poste visé</dt>
                  <dd className="text-gray-700 truncate">{r.targetPosition}</dd>
                  <dt className="text-gray-500">Type</dt>
                  <dd className="text-gray-500 text-xs">
                    {TYPE_LABELS[r.requestType] ?? r.requestType}
                  </dd>
                  <dt className="text-gray-500">Date</dt>
                  <dd className="text-gray-500 text-xs">
                    {new Date(r.createdAt).toLocaleDateString("fr-FR")}
                  </dd>
                </dl>
                {isHrAdmin && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => {
                        setSelectedRequest(r);
                        setHrComment(r.hrComment ?? "");
                      }}
                      className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                    >
                      Traiter →
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal — nouvelle demande */}
      {showNewForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-800">
              Nouvelle demande de mobilité
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Poste visé *
                </label>
                <input
                  value={newRequest.targetPosition}
                  onChange={(e) =>
                    setNewRequest((n) => ({
                      ...n,
                      targetPosition: e.target.value,
                    }))
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="Ex : Chef de projet senior"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Département cible
                </label>
                <input
                  value={newRequest.targetDepartment}
                  onChange={(e) =>
                    setNewRequest((n) => ({
                      ...n,
                      targetDepartment: e.target.value,
                    }))
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="Ex : Ingénierie"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type de demande
                </label>
                <select
                  value={newRequest.requestType}
                  onChange={(e) =>
                    setNewRequest((n) => ({
                      ...n,
                      requestType: e.target.value as RequestType,
                    }))
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motivation
                </label>
                <textarea
                  value={newRequest.motivation}
                  onChange={(e) =>
                    setNewRequest((n) => ({ ...n, motivation: e.target.value }))
                  }
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
                  placeholder="Expliquez votre demande…"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => createMutation.mutate(newRequest)}
                disabled={
                  !newRequest.targetPosition || createMutation.isPending
                }
                className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {createMutation.isPending ? "Envoi…" : "Soumettre"}
              </button>
              <button
                onClick={() => setShowNewForm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal — traitement RH */}
      {selectedRequest && isHrAdmin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-800">
              Traiter la demande
            </h2>
            <div>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Collaborateur : </span>
                {selectedRequest.employeeId.firstName}{" "}
                {selectedRequest.employeeId.lastName}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Poste visé : </span>
                {selectedRequest.targetPosition}
              </p>
              {selectedRequest.motivation && (
                <p className="text-sm text-gray-600 mt-2">
                  <span className="font-medium">Motivation : </span>
                  {selectedRequest.motivation}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Commentaire RH
              </label>
              <textarea
                value={hrComment}
                onChange={(e) => setHrComment(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
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
                  className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                    s === "approved"
                      ? "border-green-300 text-green-700 hover:bg-green-50"
                      : s === "rejected"
                        ? "border-red-300 text-red-700 hover:bg-red-50"
                        : "border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
            <button
              onClick={() => setSelectedRequest(null)}
              className="w-full px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
