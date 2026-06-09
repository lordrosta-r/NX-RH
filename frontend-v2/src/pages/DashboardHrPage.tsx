import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertCircle, Calendar, Download, Briefcase, Plus } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar as RBar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  useDashboardHr,
  useDashboardHrStats,
  useMonthlyTrend,
  useAnalyticsSummary,
} from "../hooks/useDashboard";
import { usePdfExport } from "../hooks/usePdfExport";
import Spinner from "../components/ui/Spinner";
import { PageHead, Tile, StatTile, Callout } from "../components/shell";
import PageGuide from "../components/shared/PageGuide";
import { CampaignCollectionWidget } from "../components/campaigns";
import type { Campaign } from "../types";

// ─── Couleurs institutionnelles pour les graphiques ──────────────────────────
const CHART = {
  blue: "#1b1b78",
  green: "#18753c",
  amber: "#b34000",
  red: "#d1001f",
  purple: "#5b00df",
  grey: "#6a6a76",
};

const STATUS_COLORS: Record<string, string> = {
  assigned: CHART.amber,
  in_progress: CHART.blue,
  submitted: CHART.purple,
  reviewed: "#3a3aa0",
  signed_evaluatee: "#2e2e8c",
  signed_manager: "#252578",
  signed_hr: "#1b1b78",
  validated: CHART.green,
  expired: CHART.red,
};

// ─── Campagne — carte compacte ────────────────────────────────────────────────
function CampaignCard({ campaign }: { campaign: Campaign }) {
  const start = campaign.startDate
    ? new Date(campaign.startDate).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";
  const end = campaign.endDate
    ? new Date(campaign.endDate).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";
  const { t } = useTranslation();
  return (
    <Link
      to={`/campaigns/${campaign.id}`}
      className="row between wrap"
      style={{
        gap: 12,
        padding: "14px 16px",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius)",
        color: "inherit",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 15, fontWeight: 700 }} className="truncate">
          {campaign.name}
        </p>
        <p className="small" style={{ marginTop: 2 }}>
          {start} → {end}
        </p>
      </div>
      <span className="link small" style={{ flex: "none" }}>
        {t("dashHr.seeLink")}
      </span>
    </Link>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardHrPage() {
  const { t } = useTranslation();
  const { campaigns } = useDashboardHr();
  const stats = useDashboardHrStats();
  const monthlyTrend = useMonthlyTrend();
  const analyticsSummary = useAnalyticsSummary();
  const { exportDashboardPdf, isExporting } = usePdfExport();

  const isLoading = campaigns.isLoading;
  const isError = campaigns.isError;

  if (isLoading) {
    return (
      <div className="nx-app">
        <div className="h-8 w-64 bg-slate-200 rounded animate-pulse mb-8" />
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-28 bg-slate-200 rounded-xl animate-pulse"
            />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 h-64 bg-slate-200 rounded-xl animate-pulse" />
          <div className="lg:col-span-5 h-64 bg-slate-200 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="nx-app">
        <Callout tone="red">
          <p className="body" style={{ color: "var(--ink)" }}>
            {t("dashHr.errorLoad")}
          </p>
          <button
            onClick={() => campaigns.refetch()}
            className="link small"
            style={{ marginTop: 8 }}
          >
            {t("dashHr.retry")}
          </button>
        </Callout>
      </div>
    );
  }

  const campaignList = campaigns.data?.data?.data ?? [];
  const s = stats.data;
  const byStatus = analyticsSummary.data?.byStatus as
    | Record<string, number>
    | undefined;
  const byDeptRaw = analyticsSummary.data?.byDepartmentCompletion as
    | Array<{
        department: string;
        total: number;
        submitted: number;
        validated: number;
        rate: number;
      }>
    | undefined;

  // ── Données graphiques ──────────────────────────────────────────────────────
  const pieData = byStatus
    ? Object.entries(byStatus)
        .filter(([, v]) => (v as number) > 0)
        .map(([key, value]) => ({ name: key, value: value as number }))
    : [];

  const barData = (byDeptRaw ?? [])
    .slice(0, 8)
    .map((d) => ({ department: d.department || "N/A", rate: d.rate }));

  // ── Données PDF ─────────────────────────────────────────────────────────────
  const kpiRows = [
    { [t("dashHr.pdf.colIndicator")]: t("dashHr.kpi.usersActive"), [t("dashHr.pdf.colValue")]: s?.users.active ?? "—" },
    { [t("dashHr.pdf.colIndicator")]: t("dashHr.kpi.usersInactive"), [t("dashHr.pdf.colValue")]: s?.users.inactive ?? "—" },
    { [t("dashHr.pdf.colIndicator")]: t("dashHr.kpi.campaignsActive"), [t("dashHr.pdf.colValue")]: s?.campaigns.active ?? "—" },
    { [t("dashHr.pdf.colIndicator")]: t("dashHr.kpi.campaignsCompleted"), [t("dashHr.pdf.colValue")]: s?.campaigns.completed ?? "—" },
    { [t("dashHr.pdf.colIndicator")]: t("dashHr.kpi.campaignsOverdue"), [t("dashHr.pdf.colValue")]: s?.campaigns.overdue ?? "—" },
    { [t("dashHr.pdf.colIndicator")]: t("dashHr.pdf.completionRatePct"), [t("dashHr.pdf.colValue")]: s?.evaluations.completionRate ?? "—" },
    { [t("dashHr.pdf.colIndicator")]: t("dashHr.pdf.signedBothPct"), [t("dashHr.pdf.colValue")]: s?.evaluations.signedBothRate ?? "—" },
    { [t("dashHr.pdf.colIndicator")]: t("dashHr.pdf.avgCompletionDays"), [t("dashHr.pdf.colValue")]: s?.evaluations.avgCompletionDays ?? "—" },
    { [t("dashHr.pdf.colIndicator")]: t("dashHr.pdf.mobilityPending"), [t("dashHr.pdf.colValue")]: s?.mobility.pending ?? "—" },
  ];
  const deptRows = (byDeptRaw ?? []).map((d) => ({
    [t("dashHr.pdf.colDept")]: d.department || "N/A",
    [t("dashHr.pdf.colTotal")]: d.total,
    [t("dashHr.pdf.colCompleted")]: d.validated,
    [t("dashHr.pdf.colRate")]: d.rate,
  }));

  return (
    <div className="nx-app">
      <PageHead
        eyebrow={t("eyebrow.hrSpace")}
        title={t("pageHead.dashHrTitle")}
        desc={t("pageHead.dashHrDesc")}
        actions={
          <>
            <button
              onClick={() =>
                exportDashboardPdf({
                  title: `${t("dashHr.pdf.reportTitle")} — ${new Date().toLocaleDateString("fr-FR")}`,
                  sections: [
                    {
                      title: t("dashHr.pdf.sectionKpi"),
                      data: kpiRows as Record<string, unknown>[],
                    },
                    {
                      title: t("dashHr.pdf.sectionDept"),
                      data: deptRows as Record<string, unknown>[],
                    },
                  ],
                })
              }
              disabled={isExporting}
              className="btn btn-ghost"
            >
              {isExporting ? (
                <Spinner size="sm" />
              ) : (
                <Download className="ico" style={{ width: 18, height: 18 }} />
              )}
              {t("dashHr.exportPdf")}
            </button>
            <Link to="/campaigns/new" className="btn btn-primary">
              <Plus className="ico" style={{ width: 18, height: 18 }} />{" "}
              {t("dashHr.newCampaign")}
            </Link>
          </>
        }
      />

      <PageGuide
        id="dashHr"
        title={t("guides.dashHr.title")}
        color="teal"
        steps={t("guides.dashHr.steps", { returnObjects: true }) as string[]}
      />

      {/* ── KPI — collaborateurs + campagnes ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4 mb-4">
        <StatTile
          value={s?.users.active ?? "—"}
          label={t("dashHr.kpi.usersActive")}
          tone="var(--green)"
          sub={t("dashHr.kpi.usersTotal", { total: s?.users.total ?? "—" })}
        />
        <StatTile
          value={s?.users.inactive ?? "—"}
          label={t("dashHr.kpi.usersInactive")}
          tone="var(--red)"
        />
        <StatTile
          value={s?.campaigns.active ?? "—"}
          label={t("dashHr.kpi.campaignsActive")}
          tone="var(--blue)"
        />
        <StatTile
          value={s?.campaigns.completed ?? "—"}
          label={t("dashHr.kpi.campaignsCompleted")}
          tone="var(--green)"
        />
        <StatTile
          value={s?.campaigns.overdue ?? "—"}
          label={t("dashHr.kpi.campaignsOverdue")}
          tone="var(--amber)"
        />
        <StatTile
          value={s?.mobility.pending ?? "—"}
          label={t("dashHr.kpi.mobilityPending")}
          tone="var(--amber)"
        />
      </div>

      {/* ── KPI — évaluations ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatTile
          value={
            s?.evaluations.completionRate != null
              ? `${s.evaluations.completionRate}%`
              : "—"
          }
          label={t("dashHr.kpi.completionRate")}
          tone="var(--purple, #5b00df)"
        />
        <StatTile
          value={
            s?.evaluations.signedBothRate != null
              ? `${s.evaluations.signedBothRate}%`
              : "—"
          }
          label={t("dashHr.kpi.signedBoth")}
          tone="var(--green)"
          sub={
            s?.evaluations.signedBoth != null
              ? t("dashHr.kpi.signedBothSub", { count: s.evaluations.signedBoth })
              : undefined
          }
        />
        <StatTile
          value={s?.evaluations.pending ?? "—"}
          label={t("dashHr.kpi.evalsPending")}
          tone="var(--amber)"
        />
        <StatTile
          value={
            s?.evaluations.avgCompletionDays != null
              ? `${s.evaluations.avgCompletionDays}j`
              : "—"
          }
          label={t("dashHr.kpi.avgCompletion")}
          tone="var(--blue)"
        />
      </div>

      {/* ── Collecte des formulaires des managers (workflow campagne) ── */}
      <CampaignCollectionWidget />

      {/* ── Graphiques ── */}
      <div className="grid grid-cols-12 gap-6 mb-6">
        <div className="col-span-12 lg:col-span-7">
          <Tile style={{ height: "100%" }}>
            <h2 className="h2" style={{ marginBottom: 16 }}>
              {t("dashHr.charts.trendTitle")}
            </h2>
            {monthlyTrend.isLoading ? (
              <div className="h-48 bg-slate-100 rounded animate-pulse" />
            ) : (monthlyTrend.data ?? []).length === 0 ? (
              <p className="small text-center" style={{ padding: "40px 0" }}>
                {t("dashHr.charts.noMonthlyData")}
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={monthlyTrend.data}>
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="total"
                    name={t("dashHr.charts.lineTotal")}
                    stroke={CHART.blue}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="completed"
                    name={t("dashHr.charts.lineCompleted")}
                    stroke={CHART.green}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Tile>
        </div>

        <div className="col-span-12 lg:col-span-5">
          <Tile style={{ height: "100%" }}>
            <h2 className="h2" style={{ marginBottom: 16 }}>
              {t("dashHr.charts.pieTitle")}
            </h2>
            {analyticsSummary.isLoading ? (
              <div className="h-48 bg-slate-100 rounded animate-pulse" />
            ) : pieData.length === 0 ? (
              <p className="small text-center" style={{ padding: "40px 0" }}>
                {t("dashHr.charts.noData")}
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    nameKey="name"
                  >
                    {pieData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={STATUS_COLORS[entry.name] ?? CHART.grey}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend iconSize={10} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Tile>
        </div>
      </div>

      {/* ── Top départements ── */}
      {barData.length > 0 && (
        <Tile className="mb-6">
          <h2 className="h2" style={{ marginBottom: 16 }}>
            {t("dashHr.charts.barTitle")}
          </h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={barData} layout="vertical" margin={{ left: 20 }}>
              <XAxis
                type="number"
                domain={[0, 100]}
                tick={{ fontSize: 11 }}
                unit="%"
              />
              <YAxis
                type="category"
                dataKey="department"
                tick={{ fontSize: 11 }}
                width={110}
              />
              <Tooltip formatter={(v) => [`${v}%`, t("dashHr.charts.barTooltipLabel")]} />
              <RBar
                dataKey="rate"
                name={t("dashHr.charts.barName")}
                fill={CHART.blue}
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </Tile>
      )}

      {/* ── Campagnes + alertes ── */}
      <div className="grid grid-cols-12 gap-6 mb-6">
        <div className="col-span-12 lg:col-span-8">
          <Tile style={{ height: "100%" }}>
            <div className="row between" style={{ marginBottom: 16 }}>
              <h2 className="h2">{t("dashHr.sections.activeCampaigns")}</h2>
              <Link to="/campaigns" className="link small">
                {t("dashHr.sections.seeAll")}
              </Link>
            </div>
            {campaignList.length === 0 ? (
              <p className="small text-center" style={{ padding: "24px 0" }}>
                {t("dashHr.sections.noCampaigns")}
              </p>
            ) : (
              <div className="section-gap" style={{ gap: 12 }}>
                {campaignList.map((c) => (
                  <CampaignCard key={c.id} campaign={c} />
                ))}
              </div>
            )}
          </Tile>
        </div>

        <div className="col-span-12 lg:col-span-4">
          <Tile style={{ height: "100%" }}>
            <h2 className="h2" style={{ marginBottom: 16 }}>
              {t("dashHr.sections.alerts")}
            </h2>
            <div className="section-gap" style={{ gap: 12 }}>
              {(s?.campaigns.overdue ?? 0) > 0 && (
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
                        {t("dashHr.alerts.overdueCount", { count: s!.campaigns.overdue })}
                      </p>
                      <Link to="/campaigns" className="link small">
                        {t("dashHr.alerts.seeCampaigns")}
                      </Link>
                    </div>
                  </div>
                </Callout>
              )}
              {(s?.evaluations.pending ?? 0) > 0 && (
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
                        {t("dashHr.alerts.pendingEvals", { count: s!.evaluations.pending })}
                      </p>
                      <Link to="/evaluations" className="link small">
                        {t("dashHr.alerts.seeEvaluations")}
                      </Link>
                    </div>
                  </div>
                </Callout>
              )}
              {(s?.mobility.pending ?? 0) > 0 && (
                <Callout tone="blue">
                  <div
                    className="row"
                    style={{ gap: 12, alignItems: "flex-start" }}
                  >
                    <Briefcase
                      className="ico"
                      style={{
                        width: 18,
                        height: 18,
                        color: "var(--blue)",
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
                        {t("dashHr.alerts.mobilityCount", { count: s!.mobility.pending })}
                      </p>
                      <Link to="/mobility" className="link small">
                        {t("dashHr.alerts.seeRequests")}
                      </Link>
                    </div>
                  </div>
                </Callout>
              )}
            </div>
          </Tile>
        </div>
      </div>

      {/* ── Stats rapides + événements ── */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 md:col-span-6">
          <Tile style={{ height: "100%" }}>
            <h2 className="h2" style={{ marginBottom: 16 }}>
              {t("dashHr.sections.quickStats")}
            </h2>
            <div>
              {[
                [t("dashHr.stats.totalEvals"), s?.evaluations.total],
                [t("dashHr.stats.completedEvals"), s?.evaluations.completed],
                [t("dashHr.stats.totalUsers"), s?.users.total],
              ].map(([label, value], i) => (
                <div
                  key={label as string}
                  className="row between"
                  style={{
                    padding: "12px 0",
                    borderTop: i ? "1px solid var(--line)" : "none",
                  }}
                >
                  <span className="small">{label}</span>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "var(--ink)",
                    }}
                  >
                    {value ?? "—"}
                  </span>
                </div>
              ))}
            </div>
          </Tile>
        </div>

        <div className="col-span-12 md:col-span-6">
          <Tile style={{ height: "100%" }}>
            <div className="row between" style={{ marginBottom: 16 }}>
              <h2 className="h2">{t("dashHr.sections.upcomingEvents")}</h2>
              <Link to="/events" className="link small">
                {t("dashHr.sections.seeAllEvents")}
              </Link>
            </div>
            <p
              className="small text-center row"
              style={{ padding: "24px 0", gap: 8, justifyContent: "center" }}
            >
              <Calendar
                className="ico"
                style={{ width: 16, height: 16, color: "var(--ink-3)" }}
              />
              {t("dashHr.sections.noEvents")}
            </p>
          </Tile>
        </div>
      </div>
    </div>
  );
}
