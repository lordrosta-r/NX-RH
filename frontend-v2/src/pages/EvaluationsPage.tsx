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
import Breadcrumbs from "../components/ui/Breadcrumbs";
import { queryKeys } from "../lib/queryKeys";
import { useTranslation } from "react-i18next";
import { PageHead, Tile, Badge } from "../components/shell";

type Tone = "blue" | "green" | "amber" | "red" | "grey";

const EVAL_STATUS_TONE: Record<string, Tone> = {
  assigned: "amber",
  in_progress: "blue",
  submitted: "blue",
  reviewed: "blue",
  signed_evaluatee: "blue",
  signed_manager: "blue",
  signed_hr: "blue",
  validated: "green",
  expired: "grey",
  archived: "grey",
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
  // eslint-disable-next-line react-hooks/set-state-in-effect -- reset volontaire de la pagination quand la recherche change
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
      toast.error(t("evaluations.reassignError"), t("evaluations.tryAgain")),
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
      toast.error(t("evaluations.expireError"), t("evaluations.tryAgain"));
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
        t("evaluations.archivedCount", { count: res.data.success }),
        res.data.skipped > 0
          ? t("evaluations.skippedCount", { count: res.data.skipped })
          : undefined,
      );
    },
    onError: () => {
      toast.error(t("evaluations.archiveError"), t("evaluations.tryAgain"));
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
        t("evaluations.signedHrCount", { count: res.data.success }),
        res.data.skipped > 0
          ? t("evaluations.skippedCount", { count: res.data.skipped })
          : undefined,
      );
    },
    onError: () => {
      toast.error(t("evaluations.signHrError"), t("evaluations.tryAgain"));
    },
  });

  const evaluations: Evaluation[] = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  function exportToCSV(rows: Evaluation[]) {
    const BOM = "﻿";
    const headers = [
      t("evaluations.colEvaluatee"),
      t("evaluations.colEvaluator"),
      t("evaluations.colCampaign"),
      t("evaluations.colStatus"),
      t("evaluations.colCreatedAt"),
      t("evaluations.colSubmittedAt"),
      t("evaluations.colScore"),
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
    link.download = `${t("evaluations.csvFile")}-${date}.csv`;
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

  const tblCols = isAdminOrHr
    ? "32px 1.6fr 1.2fr 1.4fr 130px 110px 40px"
    : "1.6fr 1.2fr 1.4fr 130px 110px 40px";

  return (
    <div className="nx-app">
      <Breadcrumbs
        items={[
          { label: t("common.home"), href: "/" },
          { label: isEmployee ? t("evaluations.myTitle") : t("evaluations.title") },
        ]}
      />

      <PageGuide
        id="evaluations"
        title={t("guides.evaluations.title")}
        color="teal"
        steps={
          t("guides.evaluations.steps", { returnObjects: true }) as string[]
        }
      />

      <PageHead
        eyebrow={t("evaluations.eyebrow")}
        title={isEmployee ? t("evaluations.myTitle") : t("evaluations.title")}
        actions={
          <>
            {isAdminOrHr && selected.length > 0 && (
              <>
                <span className="small">
                  {t("evaluations.selected", { count: selected.length })}
                </span>
                <button
                  onClick={() => setBulkModal("archive")}
                  disabled={
                    bulkArchiveMutation.isPending ||
                    bulkSignHrMutation.isPending
                  }
                  className="btn btn-ghost btn-sm"
                >
                  {t("evaluations.archiveSelected")}
                </button>
                <button
                  onClick={() => setBulkModal("sign")}
                  disabled={
                    bulkArchiveMutation.isPending ||
                    bulkSignHrMutation.isPending
                  }
                  className="btn btn-ghost btn-sm"
                >
                  {t("evaluations.signHr")}
                </button>
              </>
            )}
            {isAdminOrHr && (
              <>
                <button
                  onClick={() => exportToCSV(evaluations)}
                  disabled={isLoading}
                  className="btn btn-ghost btn-sm"
                >
                  <Download className="ico" /> {t("evaluations.exportCsv")}
                </button>
                <button
                  onClick={() => exportListPdf(evaluations)}
                  disabled={isLoading}
                  className="btn btn-ghost btn-sm"
                >
                  <Download className="ico" /> {t("evaluations.exportPdf")}
                </button>
              </>
            )}
          </>
        }
      />

      {/* Filtres */}
      <div className="row wrap" style={{ gap: 12, marginBottom: 24 }}>
        <select
          value={campaignFilter}
          onChange={(e) => {
            setCampaignFilter(e.target.value);
            setPage(1);
          }}
          aria-label={t("evaluations.allCampaigns")}
          className="input"
          style={{ width: "auto", minWidth: 180 }}
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
          aria-label={t("evaluations.filterStatus")}
          className="input"
          style={{
            width: "auto",
            minWidth: 140,
            height: "auto",
            minHeight: "2.75rem",
            maxHeight: "7rem",
          }}
        >
          {Object.keys(EVAL_STATUS_TONE).map((k) => (
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
            aria-label={t("evaluations.filterDepartment")}
            className="input"
            style={{ width: 160 }}
          />
        )}
        {!isEmployee && (
          <input
            type="text"
            placeholder={t("evaluations.filterSearch")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label={t("evaluations.filterSearch")}
            className="input"
            style={{ width: 220 }}
          />
        )}
      </div>

      {/* Table (admin / hr / manager) */}
      {!isEmployee && (
        <Tile style={{ padding: 0, overflow: "hidden" }}>
          <div className="tbl-head" style={{ gridTemplateColumns: tblCols }}>
            {isAdminOrHr && (
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                aria-label={t("evaluations.selectAll")}
              />
            )}
            <span>{t("evaluations.colEvaluatee")}</span>
            <span>{t("evaluations.colEvaluator")}</span>
            <span>{t("evaluations.colCampaign")}</span>
            <span>{t("evaluations.colStatus")}</span>
            <span>{t("evaluations.colDate")}</span>
            <span />
          </div>

          {isLoading ? (
            [...Array(5)].map((_, i) => (
              <div
                key={i}
                className="tbl-row"
                style={{ gridTemplateColumns: "1fr" }}
              >
                <div className="h-5 bg-slate-100 rounded animate-pulse" />
              </div>
            ))
          ) : evaluations.length === 0 ? (
            <div style={{ padding: 24 }}>
              <EmptyState
                icon={<ClipboardList className="w-8 h-8" />}
                title={t("evaluations.empty")}
                description={t("evaluations.emptyTableDescription")}
              />
            </div>
          ) : (
            evaluations.map((ev) => (
              <div
                key={ev.id}
                className="tbl-row"
                style={{
                  gridTemplateColumns: tblCols,
                  background: selected.includes(ev.id)
                    ? "var(--blue-soft)"
                    : undefined,
                }}
              >
                {isAdminOrHr && (
                  <input
                    type="checkbox"
                    checked={selected.includes(ev.id)}
                    onChange={() => toggleOne(ev.id)}
                    aria-label={t("evaluations.selectOne")}
                  />
                )}
                <div className="row" style={{ gap: 8, minWidth: 0 }}>
                  <span
                    className="avatar"
                    style={{ width: 28, height: 28, fontSize: 11 }}
                  >
                    {ev.evaluatee?.firstName?.[0]}
                    {ev.evaluatee?.lastName?.[0]}
                  </span>
                  <Link to={`/evaluations/${ev.id}`} className="link truncate">
                    {ev.evaluatee?.firstName} {ev.evaluatee?.lastName}
                  </Link>
                </div>
                <span className="small truncate">
                  {ev.evaluator?.firstName} {ev.evaluator?.lastName}
                </span>
                <span className="small truncate">
                  {typeof ev.campaignId === "string"
                    ? ev.campaignId
                    : ev.campaignId.name}
                </span>
                <span>
                  <Badge tone={EVAL_STATUS_TONE[ev.status] ?? "grey"} dot>
                    {t(`evaluations.status.${ev.status}`)}
                  </Badge>
                </span>
                <span className="small">
                  {ev.updatedAt
                    ? new Date(ev.updatedAt).toLocaleDateString("fr-FR")
                    : "—"}
                </span>
                <div className="relative group">
                  <button
                    aria-label={t("evaluations.rowActions")}
                    className="icon-btn"
                    style={{ width: 32, height: 32 }}
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                  <div
                    className="menu-pop hidden group-hover:block"
                    style={{ right: 0 }}
                  >
                    <Link to={`/evaluations/${ev.id}`} className="menu-item">
                      {t("common.view")}
                    </Link>
                    <button
                      onClick={() =>
                        window.open(`/api/evaluations/${ev.id}/pdf`, "_blank")
                      }
                      className="menu-item"
                    >
                      PDF
                    </button>
                    {isAdminOrHr && (
                      <>
                        <hr className="divider-h" />
                        <button
                          onClick={() => {
                            setReassignTarget(ev.id);
                            setReassignUserId("");
                          }}
                          className="menu-item"
                        >
                          {t("evaluations.reassign")}
                        </button>
                        <button
                          onClick={() => setExpireConfirm(ev.id)}
                          className="menu-item danger"
                        >
                          {t("evaluations.expire")}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              className="row between"
              style={{
                padding: "13px 22px",
                borderTop: "1px solid var(--line)",
              }}
            >
              <span className="small">
                {t("evaluations.resultsCount", { count: total })}
              </span>
              <div className="row" style={{ gap: 8 }}>
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  aria-label={t("evaluations.prevPage")}
                  className="btn btn-ghost btn-sm"
                >
                  ←
                </button>
                <span className="small">
                  {page} / {totalPages}
                </span>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  aria-label={t("evaluations.nextPage")}
                  className="btn btn-ghost btn-sm"
                >
                  →
                </button>
              </div>
            </div>
          )}
        </Tile>
      )}

      {/* Cards employee */}
      {isEmployee && (
        <div className="section-gap" style={{ gap: 12 }}>
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
              description={t("evaluations.emptyEmployeeDescription")}
            />
          ) : (
            evaluations.map((ev) => (
              <Tile
                key={ev.id}
                className="row between wrap"
                style={{ gap: 12 }}
              >
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontWeight: 700, fontSize: 15 }}>
                    {typeof ev.campaignId === "string"
                      ? ev.campaignId
                      : ev.campaignId.name}
                  </p>
                  <p className="small" style={{ marginTop: 2 }}>
                    {ev.form?.title ?? ev.formId}
                  </p>
                  {ev.deadline && (
                    <p className="small" style={{ marginTop: 2 }}>
                      {t("evaluations.deadline")}{" "}
                      {new Date(ev.deadline).toLocaleDateString("fr-FR")}
                    </p>
                  )}
                </div>
                <div className="row" style={{ gap: 12 }}>
                  <Badge tone={EVAL_STATUS_TONE[ev.status] ?? "grey"} dot>
                    {t(`evaluations.status.${ev.status}`)}
                  </Badge>
                  <Link
                    to={`/evaluations/${ev.id}`}
                    className={`btn btn-sm ${
                      ["assigned", "in_progress"].includes(ev.status)
                        ? "btn-primary"
                        : "btn-ghost"
                    }`}
                  >
                    {["assigned", "in_progress"].includes(ev.status)
                      ? t("evaluations.fill")
                      : t("common.view")}
                  </Link>
                </div>
              </Tile>
            ))
          )}
        </div>
      )}

      {/* Modal bulk */}
      {bulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Tile
            className="w-full max-w-md"
            style={{ boxShadow: "var(--shadow-lg)" }}
          >
            <h3 className="h3" style={{ marginBottom: 8 }}>
              {bulkModal === "archive"
                ? t("evaluations.archiveSelected")
                : t("evaluations.signHr")}{" "}
              {t("evaluations.bulkConfirmCount", { count: selected.length })}
            </h3>
            <p className="small" style={{ marginBottom: 16 }}>
              {t("evaluations.bulkConfirmHint")}
            </p>
            <div
              className="row"
              style={{ gap: 12, justifyContent: "flex-end" }}
            >
              <button
                onClick={() => setBulkModal(null)}
                disabled={
                  bulkArchiveMutation.isPending || bulkSignHrMutation.isPending
                }
                className="btn btn-ghost btn-sm"
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
                className="btn btn-primary btn-sm"
              >
                {bulkArchiveMutation.isPending || bulkSignHrMutation.isPending
                  ? t("common.processing")
                  : t("common.confirm")}
              </button>
            </div>
          </Tile>
        </div>
      )}

      {/* Modal Réaffecter */}
      {reassignTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Tile
            className="w-full max-w-md"
            style={{ boxShadow: "var(--shadow-lg)" }}
          >
            <h3 className="h3" style={{ marginBottom: 16 }}>
              {t("evaluations.reassignTitle")}
            </h3>
            <div className="field" style={{ marginBottom: 16 }}>
              <label htmlFor="reassign-user">
                {t("evaluations.newEvaluator")}
              </label>
              <select
                id="reassign-user"
                value={reassignUserId}
                onChange={(e) => setReassignUserId(e.target.value)}
                className="input"
              >
                <option value="">{t("evaluations.selectEvaluator")}</option>
                {usersList.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.firstName} {u.lastName} ({u.role})
                  </option>
                ))}
              </select>
            </div>
            <div
              className="row"
              style={{ gap: 12, justifyContent: "flex-end" }}
            >
              <button
                onClick={() => setReassignTarget(null)}
                className="btn btn-ghost btn-sm"
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
                className="btn btn-primary btn-sm"
              >
                {reassignMutation.isPending
                  ? t("common.processing")
                  : t("evaluations.reassign")}
              </button>
            </div>
          </Tile>
        </div>
      )}

      {/* Modal Expirer */}
      {expireConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Tile
            className="w-full max-w-sm"
            style={{ boxShadow: "var(--shadow-lg)" }}
          >
            <h3 className="h3" style={{ marginBottom: 8 }}>
              {t("evaluations.expireTitle")}
            </h3>
            <p className="small" style={{ marginBottom: 16 }}>
              {t("evaluations.expireHint")}
            </p>
            <div
              className="row"
              style={{ gap: 12, justifyContent: "flex-end" }}
            >
              <button
                onClick={() => setExpireConfirm(null)}
                className="btn btn-ghost btn-sm"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={() => expireMutation.mutate(expireConfirm)}
                disabled={expireMutation.isPending}
                className="btn btn-sm"
                style={{ background: "var(--red)", color: "#fff" }}
              >
                {expireMutation.isPending
                  ? t("common.processing")
                  : t("evaluations.expire")}
              </button>
            </div>
          </Tile>
        </div>
      )}
    </div>
  );
}
