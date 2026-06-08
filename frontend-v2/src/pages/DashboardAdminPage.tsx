import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  Inbox,
  UserX,
  PlayCircle,
  PlusCircle,
  UserPlus,
  Upload,
  SlidersHorizontal,
  Rocket,
  Circle,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import { useDashboardAdmin } from "../hooks/useDashboard";
import { useSetupChecklist } from "../hooks/useSetupChecklist";
import { adminApi } from "../api/admin";
import type { Campaign } from "../types";
import {
  PageHead,
  Tile,
  StatTile,
  Badge,
  Callout,
  Bar,
} from "../components/shell";

// ─── Widget de complétude de la configuration (onboarding admin) ───────────────

function SetupCompletenessCard() {
  const { t } = useTranslation();
  const { steps, completed, total, percent, isLoading, allDone } =
    useSetupChecklist();
  if (isLoading || allDone) return null;

  const nextSteps = steps.filter((s) => !s.done).slice(0, 3);

  return (
    <Tile className="mb-6">
      <div className="row between" style={{ marginBottom: 12 }}>
        <div className="row" style={{ gap: 10 }}>
          <Rocket
            className="ico"
            style={{ width: 20, height: 20, color: "var(--blue)" }}
          />
          <h2 className="h2">{t("dashAdmin.setup.title")}</h2>
        </div>
        <Link to="/admin/setup" className="link small">
          {t("dashAdmin.setup.seeAll")}
        </Link>
      </div>
      <div className="row" style={{ gap: 12, marginBottom: 10 }}>
        <span style={{ fontSize: 28, fontWeight: 800, color: "var(--ink)" }}>
          {percent}%
        </span>
        <span className="small">
          {t("dashAdmin.setup.stepsCount", { completed, total })}
        </span>
      </div>
      <div style={{ marginBottom: 16 }}>
        <Bar pct={percent} />
      </div>
      <ul
        className="section-gap"
        style={{ listStyle: "none", margin: 0, padding: 0, gap: 10 }}
      >
        {nextSteps.map((step) => (
          <li key={step.id}>
            <Link
              to={step.actionHref}
              className="row between"
              style={{
                gap: 12,
                padding: "12px 14px",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius)",
                color: "inherit",
              }}
            >
              <span
                className="row"
                style={{
                  gap: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--ink-2)",
                }}
              >
                <Circle
                  className="ico"
                  style={{ width: 16, height: 16, color: "var(--line-strong)" }}
                />
                {step.title}
              </span>
              <span className="link small" style={{ flex: "none" }}>
                {step.actionLabel}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Tile>
  );
}

// ─── StatusBadge campagne ──────────────────────────────────────────────────────

type Tone = "blue" | "green" | "amber" | "red" | "grey";
const statusTone: Record<string, Tone> = {
  draft: "grey",
  active: "green",
  closed: "grey",
  archived: "grey",
};

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  return (
    <Badge tone={statusTone[status] ?? "grey"}>
      {t(`dashAdmin.campaignStatus.${status}`, { defaultValue: status })}
    </Badge>
  );
}

// ─── Liste des campagnes ───────────────────────────────────────────────────────

function CampaignList({
  campaigns,
  isLoading,
}: {
  campaigns: Campaign[];
  isLoading: boolean;
}) {
  const { t } = useTranslation();
  if (isLoading) {
    return (
      <div className="section-gap" style={{ gap: 12 }}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <p className="small text-center" style={{ padding: "24px 0" }}>
        {t("dashAdmin.campaigns.empty")}
      </p>
    );
  }

  return (
    <div className="section-gap" style={{ gap: 12 }}>
      {campaigns.map((row) => (
        <div
          key={row.id}
          className="row between wrap"
          style={{
            gap: 12,
            padding: "14px 16px",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius)",
          }}
        >
          <Link
            to={`/campaigns/${row.id}`}
            className="link"
            style={{ fontSize: 15, fontWeight: 700, flex: 1, minWidth: 0 }}
          >
            {row.name}
          </Link>
          <StatusBadge status={row.status} />
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardAdminPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { campaigns, evaluations, users } = useDashboardAdmin();

  const { data: pendingFlagsCount } = useQuery({
    queryKey: ["hr-flags-pending-count"],
    queryFn: () =>
      adminApi
        .getFlags({ status: "pending" })
        .then((r) => (r.data as { total?: number })?.total ?? 0),
  });

  // Journal d'audit — 5 dernières entrées réelles.
  const { data: auditRecent, isLoading: auditLoading } = useQuery({
    queryKey: ["admin-audit-recent"],
    queryFn: () =>
      adminApi.getAuditLog({ limit: 5 }).then((r) => r.data?.data ?? []),
  });

  const isLoading =
    campaigns.isLoading || evaluations.isLoading || users.isLoading;
  const isError = campaigns.isError || evaluations.isError || users.isError;

  if (isLoading) {
    return (
      <div className="nx-app">
        <div className="h-8 w-64 bg-slate-200 rounded animate-pulse mb-8" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-28 bg-slate-200 rounded-xl animate-pulse"
            />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 h-64 bg-slate-200 rounded-xl animate-pulse" />
          <div className="lg:col-span-4 h-64 bg-slate-200 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (isError) {
    const refetch = () => {
      campaigns.refetch();
      evaluations.refetch();
      users.refetch();
    };
    return (
      <div className="nx-app">
        <Callout tone="red">
          <p className="body" style={{ color: "var(--ink)" }}>
            {t("dashAdmin.error.loadFailed")}
          </p>
          <button
            onClick={refetch}
            className="link small"
            style={{ marginTop: 8 }}
          >
            {t("dashAdmin.error.retry")}
          </button>
        </Callout>
      </div>
    );
  }

  const totalUsers = users.data?.data?.total ?? 0;
  const totalCampaigns = campaigns.data?.data?.total ?? 0;
  const totalEvals = evaluations.data?.data?.total ?? 0;
  const campaignList = campaigns.data?.data?.data ?? [];

  return (
    <div className="nx-app">
      <PageHead
        eyebrow={t("eyebrow.administration")}
        title={t("pageHead.dashAdminTitle", { name: user?.firstName ?? "…" })}
        desc={t("pageHead.dashAdminDesc")}
        actions={
          <button disabled className="btn btn-ghost">
            {t("dashAdmin.actions.exportPdf")}
          </button>
        }
      />

      {/* Complétude de la configuration (masqué une fois 100%) */}
      <SetupCompletenessCard />

      {/* Actions requises */}
      <Tile className="mb-6">
        <div className="row" style={{ gap: 10, marginBottom: 16 }}>
          <AlertCircle
            className="ico"
            style={{ width: 20, height: 20, color: "var(--amber)" }}
          />
          <h2 className="h2">{t("dashAdmin.requiredActions.title")}</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            to="/hr/flags?status=pending"
            className="row between"
            style={{
              gap: 12,
              padding: "14px 16px",
              border: "1px solid var(--amber)",
              borderRadius: "var(--radius)",
              background: "var(--amber-soft)",
              color: "inherit",
            }}
          >
            <span className="row" style={{ gap: 12 }}>
              <Inbox
                className="ico"
                style={{ width: 18, height: 18, color: "var(--amber)" }}
              />
              <span
                style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}
              >
                {t("dashAdmin.requiredActions.pendingHrRequests")}
              </span>
            </span>
            {pendingFlagsCount != null && pendingFlagsCount > 0 && (
              <span
                style={{
                  minWidth: 24,
                  height: 24,
                  padding: "0 7px",
                  borderRadius: 999,
                  background: "var(--amber)",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 800,
                  display: "grid",
                  placeItems: "center",
                  flex: "none",
                }}
              >
                {pendingFlagsCount}
              </span>
            )}
          </Link>
          <Link
            to="/users"
            className="row"
            style={{
              gap: 12,
              padding: "14px 16px",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius)",
              background: "var(--bg-alt)",
              color: "inherit",
            }}
          >
            <UserX
              className="ico"
              style={{ width: 18, height: 18, color: "var(--ink-3)" }}
            />
            <span
              style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}
            >
              {t("dashAdmin.requiredActions.usersWithoutManager")}
            </span>
          </Link>
          <Link
            to="/campaigns?status=active"
            className="row"
            style={{
              gap: 12,
              padding: "14px 16px",
              border: "1px solid var(--blue-soft-2)",
              borderRadius: "var(--radius)",
              background: "var(--blue-soft)",
              color: "inherit",
            }}
          >
            <PlayCircle
              className="ico"
              style={{ width: 18, height: 18, color: "var(--blue)" }}
            />
            <span
              style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}
            >
              {t("dashAdmin.requiredActions.activeCampaigns")}
            </span>
          </Link>
        </div>
      </Tile>

      {/* Raccourcis */}
      <Tile className="mb-6">
        <h2 className="h2" style={{ marginBottom: 16 }}>
          {t("dashAdmin.shortcuts.title")}
        </h2>
        <div className="row wrap" style={{ gap: 12 }}>
          <Link to="/campaigns/new" className="btn btn-primary">
            <PlusCircle className="ico" style={{ width: 18, height: 18 }} />{" "}
            {t("dashAdmin.shortcuts.newCampaign")}
          </Link>
          <Link to="/users/new" className="btn btn-ghost">
            <UserPlus className="ico" style={{ width: 18, height: 18 }} />{" "}
            {t("dashAdmin.shortcuts.addUser")}
          </Link>
          <Link to="/admin/users/import" className="btn btn-ghost">
            <Upload className="ico" style={{ width: 18, height: 18 }} />{" "}
            {t("dashAdmin.shortcuts.importCsv")}
          </Link>
          <Link to="/admin/settings" className="btn btn-ghost">
            <SlidersHorizontal
              className="ico"
              style={{ width: 18, height: 18 }}
            />{" "}
            {t("dashAdmin.shortcuts.hrSettings")}
          </Link>
        </div>
      </Tile>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatTile
          value={totalUsers}
          label={t("dashAdmin.kpi.activeUsers")}
          tone="var(--blue)"
        />
        <StatTile
          value={totalCampaigns}
          label={t("dashAdmin.kpi.activeCampaigns")}
          tone="var(--green)"
        />
        <StatTile
          value={totalEvals}
          label={t("dashAdmin.kpi.pendingEvaluations")}
          tone="var(--amber)"
        />
      </div>

      {/* Campagnes + actions urgentes */}
      <div className="grid grid-cols-12 gap-6 mb-6">
        <div className="col-span-12 lg:col-span-8">
          <Tile style={{ height: "100%" }}>
            <div className="row between" style={{ marginBottom: 16 }}>
              <h2 className="h2">{t("dashAdmin.campaigns.title")}</h2>
              <Link to="/campaigns" className="link small">
                {t("dashAdmin.campaigns.seeAll")}
              </Link>
            </div>
            <CampaignList
              campaigns={campaignList}
              isLoading={campaigns.isLoading}
            />
          </Tile>
        </div>

        <div className="col-span-12 lg:col-span-4">
          <Tile style={{ height: "100%" }}>
            <h2 className="h2" style={{ marginBottom: 16 }}>
              {t("dashAdmin.urgentActions.title")}
            </h2>
            <div className="section-gap" style={{ gap: 12 }}>
              <Callout tone="red">
                <div
                  className="row"
                  style={{ gap: 12, alignItems: "flex-start" }}
                >
                  <AlertCircle
                    className="ico"
                    style={{
                      width: 18,
                      height: 18,
                      color: "var(--red)",
                      flex: "none",
                      marginTop: 2,
                    }}
                  />
                  <div>
                    <p
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: "var(--ink)",
                      }}
                    >
                      {t("dashAdmin.urgentActions.expiredEvaluations")}
                    </p>
                    <Link to="/evaluations" className="link small">
                      {t("dashAdmin.urgentActions.seeEvaluations")}
                    </Link>
                  </div>
                </div>
              </Callout>
              <Callout tone="amber">
                <div
                  className="row"
                  style={{ gap: 12, alignItems: "flex-start" }}
                >
                  <AlertCircle
                    className="ico"
                    style={{
                      width: 18,
                      height: 18,
                      color: "var(--amber)",
                      flex: "none",
                      marginTop: 2,
                    }}
                  />
                  <div>
                    <p
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: "var(--ink)",
                      }}
                    >
                      {t("dashAdmin.urgentActions.evaluationsPendingHrSignature")}
                    </p>
                    <Link to="/hr/flags" className="link small">
                      {t("dashAdmin.urgentActions.seeHrAlerts")}
                    </Link>
                  </div>
                </div>
              </Callout>
            </div>
          </Tile>
        </div>
      </div>

      {/* Activité récente */}
      <Tile>
        <div className="row between" style={{ marginBottom: 16 }}>
          <h2 className="h2">{t("dashAdmin.recentActivity.title")}</h2>
          <Link to="/admin/audit" className="link small">
            {t("dashAdmin.recentActivity.seeFullLog")}
          </Link>
        </div>
        {auditLoading ? (
          <div className="section-gap" style={{ gap: 10 }}>
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-10 bg-slate-100 rounded animate-pulse"
              />
            ))}
          </div>
        ) : (auditRecent?.length ?? 0) === 0 ? (
          <p className="small text-center" style={{ padding: "24px 0" }}>
            {t("dashAdmin.recentActivity.empty")}
          </p>
        ) : (
          <div>
            {auditRecent!.map((a, i) => (
              <div
                key={a.id}
                className="row between wrap"
                style={{
                  gap: 12,
                  padding: "12px 0",
                  borderTop: i ? "1px solid var(--line)" : "none",
                }}
              >
                <div className="row" style={{ gap: 12, minWidth: 0 }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: a.action.includes("failed")
                        ? "var(--red)"
                        : "var(--blue)",
                      flex: "none",
                    }}
                  />
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "var(--ink)",
                    }}
                  >
                    {t(`dashAdmin.audit.${a.action}`, { defaultValue: a.action })}
                    {(a.actorName || a.actorEmail) && (
                      <span className="small" style={{ fontWeight: 400 }}>
                        {" "}
                        · {a.actorName ?? a.actorEmail}
                      </span>
                    )}
                  </span>
                </div>
                <span className="small" style={{ flex: "none" }}>
                  {new Date(a.createdAt).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
      </Tile>
    </div>
  );
}
