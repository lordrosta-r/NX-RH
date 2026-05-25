import { useState, useEffect } from "react";
import { useDebounce } from "../hooks/useDebounce";
import { Link } from "react-router-dom";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { ClipboardList, Download, MoreHorizontal } from "lucide-react";
import EmptyState from "../components/ui/EmptyState";
import { useAuth } from "../contexts/AuthContext";
import { evaluationsApi } from "../api/evaluations";
import { usersApi } from "../api/users";
import { toast } from "../hooks/useToast";
import { usePdfExport } from "../hooks/usePdfExport";
import type { Evaluation } from "../types";
import PageGuide from "../components/shared/PageGuide";
import { queryKeys } from "../lib/queryKeys";
import { useTranslation } from "react-i18next";

const EVAL_STATUS_COLOR: Record<string, string> = {
  assigned: "bg-slate-100 text-slate-600",
  in_progress: "bg-primary-50 text-primary-700",
  submitted: "bg-warning-50 text-warning-700",
  reviewed: "bg-info-50 text-info-700",
  signed_evaluatee: "bg-purple-50 text-purple-700",
  signed_manager: "bg-indigo-50 text-indigo-700",
  signed_hr: "bg-teal-50 text-teal-700",
  validated: "bg-success-50 text-success-700",
  expired: "bg-error-50 text-error-600",
  archived: "bg-slate-50 text-slate-500",
};

export default function EvaluationsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdminOrHr = user?.role === "admin" || user?.role === "hr";
  const isEmployee = user?.role === "employee";
  const { exportListPdf } = usePdfExport();

  const [campaignFilter, setCampaignFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [deptFilter, setDeptFilter] = useState("");
  const [search, setSearch] = useState("");
  const searchDebounced = useDebounce(search, 400);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkModal, setBulkModal] = useState<"archive" | "sign" | null>(null);
  const [reassignTarget, setReassignTarget] = useState<string | null>(null);
  const [reassignUserId, setReassignUserId] = useState("");
  const [expireConfirm, setExpireConfirm] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Reset page when debounced search changes
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setPage(1), [searchDebounced]);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.evaluations.list({
      campaignFilter,
      statusFilter,
      deptFilter,
      q: searchDebounced,
      page,
    }),
    queryFn: () =>
      (isEmployee
        ? evaluationsApi.getMyEvaluations({
            page,
            limit: 20,
            campaignId: campaignFilter || undefined,
            status: statusFilter.length === 1 ? statusFilter[0] : undefined,
          })
        : evaluationsApi.getEvaluations({
            page,
            limit: 20,
            campaignId: campaignFilter || undefined,
            status: statusFilter.length === 1 ? statusFilter[0] : undefined,
            department: deptFilter || undefined,
            q: searchDebounced || undefined,
          })
      ).then((r) => r.data),
    placeholderData: keepPreviousData,
  });

  const { data: usersData } = useQuery({
    queryKey: queryKeys.users.evaluators(),
    queryFn: () => usersApi.getUsers({ limit: 200 }).then((r) => r.data),
    enabled: isAdminOrHr,
  });
  const usersList = usersData?.data ?? [];

  const reassignMutation = useMutation({
    mutationFn: ({ id, evaluatorId }: { id: string; evaluatorId: string }) =>
      evaluationsApi.updateEvaluation(id, { evaluatorId }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.evaluations.lists(),
      });
      setReassignTarget(null);
      setReassignUserId("");
    },
    onError: () =>
      toast.error("Erreur lors de la réaffectation", "Veuillez réessayer."),
  });

  const expireMutation = useMutation({
    mutationFn: (id: string) =>
      evaluationsApi.updateEvaluation(id, { status: "expired" }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.evaluations.lists(),
      });
      const listKey = queryKeys.evaluations.list({
        campaignFilter,
        statusFilter,
        deptFilter,
        q: searchDebounced,
        page,
      });
      const previous = queryClient.getQueryData<{
        data: Evaluation[];
        total: number;
        totalPages: number;
      }>(listKey);
      queryClient.setQueryData<{
        data: Evaluation[];
        total: number;
        totalPages: number;
      }>(listKey, (old) =>
        old
          ? {
              ...old,
              data: old.data.map((e) =>
                e.id === id ? { ...e, status: "expired" as const } : e,
              ),
            }
          : old,
      );
      return { previous, listKey };
    },
    onError: (_err, _id, context) => {
      if (context?.previous)
        queryClient.setQueryData(context.listKey, context.previous);
      toast.error("Erreur lors de l'expiration", "Veuillez réessayer.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.evaluations.lists(),
      });
      setExpireConfirm(null);
    },
  });

  const bulkArchiveMutation = useMutation({
    mutationFn: (ids: string[]) =>
      evaluationsApi.bulkAction({ ids, action: "archive" }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.evaluations.lists(),
      });
      setBulkModal(null);
      setSelected([]);
      toast.success(
        `${res.data.success} évaluation(s) archivée(s)`,
        res.data.skipped > 0
          ? `${res.data.skipped} ignorée(s) (statut incompatible)`
          : undefined,
      );
    },
    onError: () => {
      toast.error("Erreur lors de l'archivage", "Veuillez réessayer.");
    },
  });

  const bulkSignHrMutation = useMutation({
    mutationFn: (ids: string[]) =>
      evaluationsApi.bulkAction({ ids, action: "sign_hr" }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.evaluations.lists(),
      });
      setBulkModal(null);
      setSelected([]);
      toast.success(
        `${res.data.success} évaluation(s) signée(s) RH`,
        res.data.skipped > 0
          ? `${res.data.skipped} ignorée(s) (statut incompatible)`
          : undefined,
      );
    },
    onError: () => {
      toast.error("Erreur lors de la signature RH", "Veuillez réessayer.");
    },
  });

  const evaluations: Evaluation[] = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  function exportToCSV(rows: Evaluation[]) {
    const BOM = "\uFEFF";
    const headers = [
      "Évalué",
      "Évaluateur",
      "Campagne",
      "Statut",
      "Date création",
      "Date soumission",
      "Score",
    ];

    const csvRows = rows.map((ev) => {
      const evaluateeName =
        `${ev.evaluatee?.firstName ?? ""} ${ev.evaluatee?.lastName ?? ""}`.trim();
      const evaluatorName =
        `${ev.evaluator?.firstName ?? ""} ${ev.evaluator?.lastName ?? ""}`.trim();
      const campaign =
        (ev.campaignId as { name?: string })?.name ??
        (typeof ev.campaignId === "string" ? ev.campaignId : "");
      const status = t(`evaluations.status.${ev.status}`);
      const createdAt = ev.createdAt
        ? new Date(ev.createdAt).toLocaleDateString("fr-FR")
        : "";
      const submittedAt = ev.signedByEvaluateeAt
        ? new Date(ev.signedByEvaluateeAt).toLocaleDateString("fr-FR")
        : "";
      const score = ev.reviewerScore != null ? String(ev.reviewerScore) : "";
      return [
        evaluateeName,
        evaluatorName,
        campaign,
        status,
        createdAt,
        submittedAt,
        score,
      ];
    });

    const csvContent =
      BOM +
      [headers, ...csvRows]
        .map((row) =>
          row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(";"),
        )
        .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const date = new Date().toISOString().slice(0, 10);
    const link = document.createElement("a");
    link.href = url;
    link.download = `evaluations-${date}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const allSelected =
    evaluations.length > 0 && selected.length === evaluations.length;
  const toggleAll = () =>
    setSelected(allSelected ? [] : evaluations.map((e) => e.id));
  const toggleOne = (id: string) =>
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id],
    );

  return (
    <div>
      <PageGuide
        id="evaluations"
        title="Les évaluations"
        color="teal"
        steps={[
          "Les évaluations sont générées automatiquement à l'activation d'une campagne",
          "Chaque collaborateur reçoit une notification par email pour compléter son évaluation",
          "Vous pouvez suivre l'avancement ici et envoyer des rappels groupés",
        ]}
      />
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-slate-900">
          {isEmployee ? t("evaluations.myTitle") : t("evaluations.title")}
        </h1>
        <div className="flex items-center gap-2">
          {isAdminOrHr && selected.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">
                {t("evaluations.selected", { count: selected.length })}
              </span>
              <button
                onClick={() => setBulkModal("archive")}
                disabled={
                  bulkArchiveMutation.isPending || bulkSignHrMutation.isPending
                }
                className="text-sm px-3 py-1.5 border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50"
              >
                {t("evaluations.archiveSelected")}
              </button>
              <button
                onClick={() => setBulkModal("sign")}
                disabled={
                  bulkArchiveMutation.isPending || bulkSignHrMutation.isPending
                }
                className="text-sm px-3 py-1.5 border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50"
              >
                {t("evaluations.signHr")}
              </button>
            </div>
          )}
          {isAdminOrHr && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => exportToCSV(evaluations)}
                disabled={isLoading}
                className="inline-flex items-center gap-2 border border-slate-200 hover:bg-slate-50 px-3 py-1.5 rounded-md text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" /> {t("evaluations.exportCsv")}
              </button>
              <button
                onClick={() => exportListPdf(evaluations)}
                disabled={isLoading}
                className="inline-flex items-center gap-2 border border-slate-200 hover:bg-slate-50 px-3 py-1.5 rounded-md text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" /> {t("evaluations.exportPdf")}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={campaignFilter}
          onChange={(e) => {
            setCampaignFilter(e.target.value);
            setPage(1);
          }}
          className="h-9 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
        >
          <option value="">{t("evaluations.allCampaigns")}</option>
        </select>
        <select
          multiple
          size={1}
          value={statusFilter}
          onChange={(e) => {
            const sel = Array.from(e.target.selectedOptions).map(
              (o) => o.value,
            );
            setStatusFilter(sel);
            setPage(1);
          }}
          aria-label="Filtrer par statut"
          className="h-9 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-200 min-w-[140px]"
          style={{ height: "auto", minHeight: "2.25rem", maxHeight: "7rem" }}
        >
          {Object.keys(EVAL_STATUS_COLOR).map((k) => (
            <option key={k} value={k}>
              {t(`evaluations.status.${k}`)}
            </option>
          ))}
        </select>
        {!isEmployee && (
          <input
            type="text"
            placeholder={t("evaluations.filterDepartment")}
            value={deptFilter}
            onChange={(e) => {
              setDeptFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-200 w-36"
          />
        )}
        {!isEmployee && (
          <input
            type="text"
            placeholder={t("evaluations.filterSearch")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-200 w-48"
          />
        )}
      </div>

      {/* Table (admin / hr / manager) */}
      {!isEmployee && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto hidden sm:block">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {isAdminOrHr && (
                    <th className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleAll}
                        className="rounded border-slate-300"
                      />
                    </th>
                  )}
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Évalué
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Évaluateur
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Campagne
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Statut
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Date
                  </th>
                  <th className="w-10 px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i}>
                      <td colSpan={isAdminOrHr ? 7 : 6} className="px-4 py-3">
                        <div className="h-5 bg-slate-100 rounded animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : evaluations.length === 0 ? (
                  <tr>
                    <td colSpan={isAdminOrHr ? 7 : 6} className="px-4 py-4">
                      <EmptyState
                        icon={<ClipboardList className="w-8 h-8" />}
                        title={t("evaluations.empty")}
                        description="Aucune évaluation ne correspond aux critères sélectionnés."
                      />
                    </td>
                  </tr>
                ) : (
                  evaluations.map((ev) => (
                    <tr
                      key={ev.id}
                      className={`hover:bg-slate-50 ${selected.includes(ev.id) ? "bg-primary-50" : ""}`}
                    >
                      {isAdminOrHr && (
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selected.includes(ev.id)}
                            onChange={() => toggleOne(ev.id)}
                            className="rounded border-slate-300"
                          />
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 text-xs font-semibold flex items-center justify-center flex-shrink-0">
                            {ev.evaluatee?.firstName?.[0]}
                            {ev.evaluatee?.lastName?.[0]}
                          </div>
                          <Link
                            to={`/evaluations/${ev.id}`}
                            className="font-medium text-slate-900 hover:text-primary-600"
                          >
                            {ev.evaluatee?.firstName} {ev.evaluatee?.lastName}
                          </Link>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {ev.evaluator?.firstName} {ev.evaluator?.lastName}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {typeof ev.campaignId === "string"
                          ? ev.campaignId
                          : ev.campaignId.name}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${EVAL_STATUS_COLOR[ev.status] ?? "bg-slate-100 text-slate-600"}`}
                        >
                          {t(`evaluations.status.${ev.status}`)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {ev.updatedAt
                          ? new Date(ev.updatedAt).toLocaleDateString("fr-FR")
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="relative group">
                          <button
                            aria-label="Actions évaluation"
                            className="p-1 text-slate-400 hover:text-slate-600 rounded"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                          <div className="absolute right-0 top-8 bg-white border border-slate-200 rounded-lg shadow-lg z-10 min-w-36 py-1 hidden group-hover:block">
                            <Link
                              to={`/evaluations/${ev.id}`}
                              className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                            >
                              {t("common.view")}
                            </Link>
                            <button
                              onClick={() =>
                                window.open(
                                  `/api/evaluations/${ev.id}/pdf`,
                                  "_blank",
                                )
                              }
                              className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                            >
                              PDF
                            </button>
                            {isAdminOrHr && (
                              <>
                                <hr className="my-1 border-slate-100" />
                                <button
                                  onClick={() => {
                                    setReassignTarget(ev.id);
                                    setReassignUserId("");
                                  }}
                                  className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                >
                                  Réaffecter
                                </button>
                                <button
                                  onClick={() => setExpireConfirm(ev.id)}
                                  className="block w-full text-left px-4 py-2 text-sm text-error-600 hover:bg-error-50"
                                >
                                  Expirer
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden divide-y divide-slate-100">
            {isLoading ? (
              [...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-20 bg-slate-100 rounded m-3 animate-pulse"
                />
              ))
            ) : evaluations.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={<ClipboardList className="w-8 h-8" />}
                  title={t("evaluations.empty")}
                  description="Aucune évaluation ne correspond aux critères sélectionnés."
                />
              </div>
            ) : (
              evaluations.map((ev) => (
                <div
                  key={ev.id}
                  className={`p-4 ${selected.includes(ev.id) ? "bg-primary-50" : ""}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {isAdminOrHr && (
                        <input
                          type="checkbox"
                          checked={selected.includes(ev.id)}
                          onChange={() => toggleOne(ev.id)}
                          className="rounded border-slate-300 mt-0.5"
                        />
                      )}
                      <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 text-xs font-semibold flex items-center justify-center flex-shrink-0">
                        {ev.evaluatee?.firstName?.[0]}
                        {ev.evaluatee?.lastName?.[0]}
                      </div>
                      <Link
                        to={`/evaluations/${ev.id}`}
                        className="font-medium text-slate-900 hover:text-primary-600 text-sm"
                      >
                        {ev.evaluatee?.firstName} {ev.evaluatee?.lastName}
                      </Link>
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${EVAL_STATUS_COLOR[ev.status] ?? "bg-slate-100 text-slate-600"}`}
                    >
                      {t(`evaluations.status.${ev.status}`)}
                    </span>
                  </div>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mt-2">
                    <dt className="text-slate-500">Évaluateur</dt>
                    <dd className="text-slate-700">
                      {ev.evaluator?.firstName} {ev.evaluator?.lastName}
                    </dd>
                    <dt className="text-slate-500">Campagne</dt>
                    <dd className="text-slate-700 truncate">
                      {typeof ev.campaignId === "string"
                        ? ev.campaignId
                        : ev.campaignId.name}
                    </dd>
                    <dt className="text-slate-500">Date</dt>
                    <dd className="text-slate-500 text-xs">
                      {ev.updatedAt
                        ? new Date(ev.updatedAt).toLocaleDateString("fr-FR")
                        : "—"}
                    </dd>
                  </dl>
                  <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                    <Link
                      to={`/evaluations/${ev.id}`}
                      className="flex-1 text-center px-3 py-1.5 text-xs border border-slate-200 rounded-md hover:bg-slate-50 text-slate-700"
                    >
                      {t("common.view")}
                    </Link>
                    {isAdminOrHr && (
                      <>
                        <button
                          onClick={() => {
                            setReassignTarget(ev.id);
                            setReassignUserId("");
                          }}
                          className="px-3 py-1.5 text-xs border border-slate-200 rounded-md hover:bg-slate-50 text-slate-700"
                        >
                          Réaffecter
                        </button>
                        <button
                          onClick={() => setExpireConfirm(ev.id)}
                          className="px-3 py-1.5 text-xs border border-error-200 rounded-md hover:bg-error-50 text-error-600"
                        >
                          Expirer
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
              <span className="text-sm text-slate-500">{total} résultats</span>
              <div className="flex items-center gap-1">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  aria-label="Page précédente"
                  className="px-3 py-1.5 text-sm border border-slate-200 rounded-md disabled:opacity-40 hover:bg-slate-50"
                >
                  ←
                </button>
                <span className="px-3 py-1.5 text-sm">
                  {page} / {totalPages}
                </span>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  aria-label="Page suivante"
                  className="px-3 py-1.5 text-sm border border-slate-200 rounded-md disabled:opacity-40 hover:bg-slate-50"
                >
                  →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cards employee */}
      {isEmployee && (
        <div className="space-y-3">
          {isLoading ? (
            [...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-20 bg-slate-100 rounded-xl animate-pulse"
              />
            ))
          ) : evaluations.length === 0 ? (
            <EmptyState
              icon={<ClipboardList className="w-8 h-8" />}
              title={t("evaluations.empty")}
              description="Vous n'avez pas d'évaluation active pour le moment."
            />
          ) : (
            evaluations.map((ev) => (
              <div
                key={ev.id}
                className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between"
              >
                <div>
                  <p className="font-medium text-slate-900">
                    {typeof ev.campaignId === "string"
                      ? ev.campaignId
                      : ev.campaignId.name}
                  </p>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {ev.form?.title ?? ev.formId}
                  </p>
                  {ev.deadline && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      Deadline :{" "}
                      {new Date(ev.deadline).toLocaleDateString("fr-FR")}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${EVAL_STATUS_COLOR[ev.status] ?? "bg-slate-100 text-slate-600"}`}
                  >
                    {t(`evaluations.status.${ev.status}`)}
                  </span>
                  <Link
                    to={`/evaluations/${ev.id}`}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                      ["assigned", "in_progress"].includes(ev.status)
                        ? "bg-primary-500 text-white hover:bg-primary-600"
                        : "border border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {["assigned", "in_progress"].includes(ev.status)
                      ? "Remplir"
                      : t("common.view")}
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal bulk */}
      {bulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              {bulkModal === "archive"
                ? t("evaluations.archiveSelected")
                : t("evaluations.signHr")}{" "}
              {selected.length} évaluation(s) ?
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Cette action s'appliquera aux évaluations sélectionnées.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setBulkModal(null)}
                disabled={
                  bulkArchiveMutation.isPending || bulkSignHrMutation.isPending
                }
                className="px-4 py-2 text-sm border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={() => {
                  if (bulkModal === "archive")
                    bulkArchiveMutation.mutate(selected);
                  else bulkSignHrMutation.mutate(selected);
                }}
                disabled={
                  bulkArchiveMutation.isPending || bulkSignHrMutation.isPending
                }
                className="px-4 py-2 text-sm bg-primary-500 text-white rounded-md hover:bg-primary-600 disabled:opacity-50"
              >
                {bulkArchiveMutation.isPending || bulkSignHrMutation.isPending
                  ? "Traitement…"
                  : t("common.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Réaffecter */}
      {reassignTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              Réaffecter l'évaluation
            </h3>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nouvel évaluateur
            </label>
            <select
              value={reassignUserId}
              onChange={(e) => setReassignUserId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-200 mb-4"
            >
              <option value="">Sélectionner un évaluateur…</option>
              {usersList.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.firstName} {u.lastName} ({u.role})
                </option>
              ))}
            </select>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setReassignTarget(null)}
                className="px-4 py-2 text-sm border border-slate-200 rounded-md hover:bg-slate-50"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={() =>
                  reassignMutation.mutate({
                    id: reassignTarget,
                    evaluatorId: reassignUserId,
                  })
                }
                disabled={!reassignUserId || reassignMutation.isPending}
                className="px-4 py-2 text-sm bg-primary-500 text-white rounded-md hover:bg-primary-600 disabled:opacity-50"
              >
                {reassignMutation.isPending ? "Traitement…" : "Réaffecter"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Expirer */}
      {expireConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Expirer cette évaluation ?
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Cette action est irréversible. L'évaluation sera marquée comme
              expirée.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setExpireConfirm(null)}
                className="px-4 py-2 text-sm border border-slate-200 rounded-md hover:bg-slate-50"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={() => expireMutation.mutate(expireConfirm)}
                disabled={expireMutation.isPending}
                className="px-4 py-2 text-sm bg-error-500 text-white rounded-md hover:bg-error-600 disabled:opacity-50"
              >
                {expireMutation.isPending ? "Traitement…" : "Expirer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
