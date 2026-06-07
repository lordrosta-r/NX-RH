import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Download, Search } from "lucide-react";
import { adminApi } from "../api/admin";
import type { AuditLogEntry, PaginatedResponse } from "../types";
import { PageHead, Tile, Badge } from "../components/shell";

const COLS = "1.2fr 1.4fr 1fr 1.6fr";

const ACTION_TONE: Record<string, "blue" | "green" | "amber" | "red" | "grey"> =
  {
    create: "green",
    update: "blue",
    delete: "red",
    login: "amber",
    logout: "grey",
  };

function ActionBadge({ action }: { action: string }) {
  const base = action.toLowerCase().split("_")[0];
  return <Badge tone={ACTION_TONE[base] ?? "grey"}>{action}</Badge>;
}

export default function AdminAuditPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    action: "",
    targetType: "",
    actorId: "",
    from: "",
    to: "",
  });

  const { data, isLoading } = useQuery<PaginatedResponse<AuditLogEntry>>({
    queryKey: ["audit-log", page, filters],
    queryFn: () =>
      adminApi.getAuditLog({ page, limit: 20, ...filters }).then((r) => r.data),
    placeholderData: keepPreviousData,
  });

  async function exportCsv() {
    const res = await adminApi.exportAuditCsv({
      action: filters.action || undefined,
      actorId: filters.actorId || undefined,
      targetType: filters.targetType || undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
    });
    const url = URL.createObjectURL(res.data as Blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "audit.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const entries = data?.data ?? [];

  return (
    <div className="nx-app">
      <PageHead
        title={t("adminAudit.title")}
        actions={
          <button onClick={exportCsv} className="btn btn-ghost">
            <Download className="ico" style={{ width: 18, height: 18 }} />{" "}
            {t("adminAudit.actions.exportCsv")}
          </button>
        }
      />

      {/* Filtres */}
      <Tile style={{ marginBottom: 16 }}>
        <div className="row wrap" style={{ gap: 16, alignItems: "flex-end" }}>
          <div className="field" style={{ flex: "1 1 200px" }}>
            <label htmlFor="audit-actor">{t("adminAudit.filters.actor")}</label>
            <div style={{ position: "relative" }}>
              <Search
                className="ico"
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 16,
                  height: 16,
                  color: "var(--ink-3)",
                }}
              />
              <input
                id="audit-actor"
                className="input"
                style={{ paddingLeft: 36 }}
                placeholder={t("adminAudit.filters.actorPlaceholder")}
                value={filters.actorId}
                onChange={(e) => {
                  setFilters((f) => ({ ...f, actorId: e.target.value }));
                  setPage(1);
                }}
              />
            </div>
          </div>
          <div className="field" style={{ flex: "1 1 180px" }}>
            <label htmlFor="audit-action">{t("adminAudit.filters.action")}</label>
            <input
              id="audit-action"
              className="input"
              placeholder={t("adminAudit.filters.actionPlaceholder")}
              value={filters.action}
              onChange={(e) => {
                setFilters((f) => ({ ...f, action: e.target.value }));
                setPage(1);
              }}
            />
          </div>
          <div className="field" style={{ flex: "1 1 160px" }}>
            <label htmlFor="audit-target">
              {t("adminAudit.filters.targetType")}
            </label>
            <input
              id="audit-target"
              className="input"
              placeholder={t("adminAudit.filters.targetTypePlaceholder")}
              value={filters.targetType}
              onChange={(e) => {
                setFilters((f) => ({ ...f, targetType: e.target.value }));
                setPage(1);
              }}
            />
          </div>
          <div className="field" style={{ flex: "1 1 160px" }}>
            <label htmlFor="audit-from">{t("adminAudit.filters.from")}</label>
            <input
              id="audit-from"
              type="date"
              className="input"
              value={filters.from}
              onChange={(e) => {
                setFilters((f) => ({ ...f, from: e.target.value }));
                setPage(1);
              }}
            />
          </div>
          <div className="field" style={{ flex: "1 1 160px" }}>
            <label htmlFor="audit-to">{t("adminAudit.filters.to")}</label>
            <input
              id="audit-to"
              type="date"
              className="input"
              value={filters.to}
              onChange={(e) => {
                setFilters((f) => ({ ...f, to: e.target.value }));
                setPage(1);
              }}
            />
          </div>
        </div>
      </Tile>

      <Tile style={{ padding: 0, overflow: "hidden" }}>
        <div className="tbl-head" style={{ gridTemplateColumns: COLS }}>
          <div>{t("adminAudit.table.datetime")}</div>
          <div>{t("adminAudit.table.actor")}</div>
          <div>{t("adminAudit.table.action")}</div>
          <div>{t("adminAudit.table.target")}</div>
        </div>

        {isLoading ? (
          <div className="small" style={{ padding: 40, textAlign: "center" }}>
            {t("adminAudit.loading")}
          </div>
        ) : !entries.length ? (
          <div
            className="body"
            style={{ padding: 40, textAlign: "center", color: "var(--ink-3)" }}
          >
            {t("adminAudit.empty")}
          </div>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.id}
              className="tbl-row"
              style={{ gridTemplateColumns: COLS }}
            >
              <div className="small" style={{ whiteSpace: "nowrap" }}>
                {new Date(entry.createdAt).toLocaleString("fr-FR")}
              </div>
              <div
                style={{ fontWeight: 600, color: "var(--ink)", minWidth: 0 }}
              >
                {entry.actorName ?? entry.actorEmail ?? entry.actorId}
              </div>
              <div>
                <ActionBadge action={entry.action} />
              </div>
              <div style={{ color: "var(--ink-2)", minWidth: 0 }}>
                {entry.targetLabel ?? entry.targetId ?? "—"}
                {entry.targetType && (
                  <span className="small" style={{ marginLeft: 8 }}>
                    ({entry.targetType})
                  </span>
                )}
              </div>
            </div>
          ))
        )}

        {data && data.totalPages && data.totalPages > 1 && (
          <div
            className="row between"
            style={{ padding: "13px 22px", borderTop: "1px solid var(--line)" }}
          >
            <p className="small">
              {t("adminAudit.pagination.page", {
                page,
                total: data.totalPages,
              })}
            </p>
            <div className="row" style={{ gap: 8 }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn btn-ghost btn-sm"
              >
                {t("adminAudit.pagination.prev")}
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= (data.totalPages ?? 1)}
                className="btn btn-ghost btn-sm"
              >
                {t("adminAudit.pagination.next")}
              </button>
            </div>
          </div>
        )}
      </Tile>
    </div>
  );
}
