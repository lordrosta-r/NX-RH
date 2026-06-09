import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import {
  Search,
  Download,
  UserX,
  ShieldOff,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { adminApi } from "../api/admin";
import type { User, PaginatedEnvelope } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { useConfirm } from "../contexts/ConfirmContext";
import { useDebounce } from "../hooks/useDebounce";
import ActionMenu from "../components/ui/ActionMenu";
import { queryKeys } from "../lib/queryKeys";
import { PageHead, Tile, Badge, Callout } from "../components/shell";

const COLS = "1.6fr 1.8fr 0.8fr 0.8fr 1fr 1fr 1fr 48px";
const PER_PAGE = 20;

function pageNumbers(current: number, total: number): number[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 3) return [1, 2, 3, 4, 5];
  if (current >= total - 2)
    return [total - 4, total - 3, total - 2, total - 1, total];
  return [current - 2, current - 1, current, current + 1, current + 2];
}

const ROLE_TONE: Record<string, "blue" | "green" | "amber" | "red" | "grey"> = {
  admin: "red",
  hr: "amber",
  manager: "blue",
  employee: "grey",
};

function RoleBadge({ role }: { role: string }) {
  return <Badge tone={ROLE_TONE[role] ?? "grey"}>{role}</Badge>;
}

function AuthSourceBadge({ source }: { source: string }) {
  return <Badge tone={source === "ldap" ? "blue" : "grey"}>{source}</Badge>;
}

export default function AdminUsersPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { user: currentUser } = useAuth();
  const confirm = useConfirm();
  const [qInput, setQInput] = useState("");
  const q = useDebounce(qInput, 400);
  const [authSourceFilter, setAuthSourceFilter] = useState("");
  const [page, setPage] = useState(1);

  // Réinitialiser la page quand un filtre change (sinon on peut rester sur une
  // page vide après avoir restreint le périmètre).
  function setSearch(v: string) {
    setQInput(v);
    setPage(1);
  }
  function setAuthSource(v: string) {
    setAuthSourceFilter(v);
    setPage(1);
  }

  const isAdminOrHr =
    currentUser?.role === "admin" || currentUser?.role === "hr";

  const { data, isLoading } = useQuery<PaginatedEnvelope<User>>({
    queryKey: queryKeys.adminUsers.list({ q, authSourceFilter, page }),
    queryFn: () =>
      adminApi
        .getAdminUsers({
          q: q || undefined,
          ...(authSourceFilter ? { authSource: authSourceFilter } : {}),
          page,
          limit: PER_PAGE,
        })
        .then((r) => r.data),
    placeholderData: keepPreviousData,
  });

  // Le backend ne filtre pas par authSource : on restreint la page courante
  // côté client (filtre secondaire, jeu de données réduit).
  const rows = authSourceFilter
    ? (data?.data ?? []).filter((u) => u.authSource === authSourceFilter)
    : (data?.data ?? []);

  const total = data?.meta?.total ?? 0;
  const totalPages = data?.meta?.pages ?? 1;

  const anonymizeMut = useMutation({
    mutationFn: (id: string) => adminApi.anonymizeUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.adminUsers.all });
    },
  });

  const forceDeactivateMut = useMutation({
    mutationFn: (id: string) => adminApi.forceDeactivateUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.adminUsers.all });
    },
  });

  async function handleAnonymize(user: User) {
    if (
      await confirm({
        title: t("adminUsers.anonymize.confirmTitle"),
        description: t("adminUsers.anonymize.confirmDescription"),
        variant: "danger",
        confirmLabel: t("adminUsers.anonymize.confirmLabel"),
      })
    ) {
      anonymizeMut.mutate(user.id);
    }
  }

  async function handleDeactivate(user: User) {
    if (
      await confirm({
        title: t("adminUsers.deactivate.confirmTitle"),
        description: t("adminUsers.deactivate.confirmDescription"),
        variant: "warning",
        confirmLabel: t("adminUsers.deactivate.confirmLabel"),
      })
    ) {
      forceDeactivateMut.mutate(user.id);
    }
  }

  async function exportGdpr(user: User) {
    const res = await adminApi.exportUserGdpr(user.id);
    const url = URL.createObjectURL(res.data as Blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gdpr-${user.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="nx-app">
      <PageHead
        eyebrow={t("adminUsers.eyebrow")}
        title={t("adminUsers.title")}
      />

      <Callout tone="blue" style={{ marginBottom: 16 }}>
        <p className="small" style={{ margin: 0 }}>
          {t("adminUsers.gdprNotice")}
        </p>
      </Callout>

      <div
        className="row wrap"
        style={{ gap: 12, marginBottom: 16, alignItems: "flex-end" }}
      >
        <div className="field" style={{ flex: "1 1 320px", minWidth: 0 }}>
          <label htmlFor="admin-users-search">
            {t("adminUsers.filters.searchLabel")}
          </label>
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
              id="admin-users-search"
              className="input"
              style={{ paddingLeft: 36 }}
              placeholder={t("adminUsers.filters.searchPlaceholder")}
              value={qInput}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="field" style={{ flex: "0 1 220px" }}>
          <label htmlFor="admin-users-source">
            {t("adminUsers.filters.authSourceLabel")}
          </label>
          <select
            id="admin-users-source"
            className="input"
            value={authSourceFilter}
            onChange={(e) => setAuthSource(e.target.value)}
          >
            <option value="">{t("adminUsers.filters.authSourceAll")}</option>
            <option value="local">{t("adminUsers.filters.authSourceLocal")}</option>
            <option value="ldap">{t("adminUsers.filters.authSourceLdap")}</option>
          </select>
        </div>
      </div>

      <Tile style={{ padding: 0, overflow: "hidden" }}>
        <div className="tbl-head" style={{ gridTemplateColumns: COLS }}>
          <div>{t("adminUsers.table.name")}</div>
          <div>{t("adminUsers.table.email")}</div>
          <div>{t("adminUsers.table.role")}</div>
          <div>{t("adminUsers.table.auth")}</div>
          <div>{t("adminUsers.table.department")}</div>
          <div>{t("adminUsers.table.createdAt")}</div>
          <div>{t("adminUsers.table.deactivatedAt")}</div>
          <div />
        </div>

        {isLoading ? (
          <div className="small" style={{ padding: 40, textAlign: "center" }}>
            {t("adminUsers.loading")}
          </div>
        ) : !rows.length ? (
          <div
            className="body"
            style={{ padding: 64, textAlign: "center", color: "var(--ink-3)" }}
          >
            {t("adminUsers.empty")}
          </div>
        ) : (
          rows.map((user) => (
            <div
              key={user.id}
              className="tbl-row"
              style={{
                gridTemplateColumns: COLS,
              }}
            >
              <div
                className="row"
                style={{ gap: 10, alignItems: "center", minWidth: 0 }}
              >
                <span className="avatar">
                  {user.firstName[0]}
                  {user.lastName[0]}
                </span>
                <span style={{ fontWeight: 600, color: "var(--ink)" }}>
                  {user.firstName} {user.lastName}
                </span>
                {user.gdprAnonymized && (
                  <span className="small" style={{ fontStyle: "italic" }}>
                    {t("adminUsers.anonymizedTag")}
                  </span>
                )}
              </div>
              <div
                className="small"
                style={{
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {user.email}
              </div>
              <div>
                <RoleBadge role={user.role} />
              </div>
              <div>
                <AuthSourceBadge source={user.authSource} />
              </div>
              <div className="small">{user.department ?? "—"}</div>
              <div className="small">
                {user.createdAt
                  ? new Date(user.createdAt).toLocaleDateString("fr-FR")
                  : "—"}
              </div>
              <div className="small">
                {!user.isActive
                  ? user.deactivatedAt
                    ? new Date(user.deactivatedAt).toLocaleDateString("fr-FR")
                    : "—"
                  : "—"}
              </div>
              <div style={{ textAlign: "right" }}>
                <ActionMenu
                  align="right"
                  items={[
                    {
                      label: t("adminUsers.actions.exportGdpr"),
                      icon: <Download size={14} />,
                      onClick: () => exportGdpr(user),
                    },
                    {
                      label: t("adminUsers.actions.anonymize"),
                      icon: <UserX size={14} />,
                      onClick: () => handleAnonymize(user),
                      disabled: !!user.gdprAnonymized,
                      danger: true,
                    },
                    ...(isAdminOrHr
                      ? [
                          {
                            label: t("adminUsers.actions.forceDeactivate"),
                            icon: <ShieldOff size={14} />,
                            onClick: () => handleDeactivate(user),
                            disabled: !user.isActive,
                            danger: true,
                            separator: true,
                          },
                        ]
                      : []),
                  ]}
                />
              </div>
            </div>
          ))
        )}

        {totalPages > 1 && (
          <div
            className="row between"
            style={{
              padding: "16px 22px",
              borderTop: "1px solid var(--line)",
            }}
          >
            <p className="small">
              {t("adminUsers.pagination.summary", {
                page,
                totalPages,
                total,
              })}
            </p>
            <div className="row" style={{ gap: 4 }}>
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                aria-label={t("adminUsers.pagination.previous")}
                className="btn btn-ghost btn-sm"
                style={{ padding: 6 }}
              >
                <ChevronLeft className="ico" style={{ width: 16, height: 16 }} />
              </button>
              {pageNumbers(page, totalPages).map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`btn btn-sm ${n === page ? "btn-primary" : "btn-ghost"}`}
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                aria-label={t("adminUsers.pagination.next")}
                className="btn btn-ghost btn-sm"
                style={{ padding: 6 }}
              >
                <ChevronRight
                  className="ico"
                  style={{ width: 16, height: 16 }}
                />
              </button>
            </div>
          </div>
        )}
      </Tile>
    </div>
  );
}
