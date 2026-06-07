import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Download, FileText } from "lucide-react";
import { analyticsApi } from "../api/analytics";
import { PageHead, Tile, StatTile } from "../components/shell";
import type { EvaluationStatus } from "../types";

// ─── Palette institutionnelle ─────────────────────────────────────────────────
const CHART = {
  blue: "#1b1b78",
  green: "#18753c",
  amber: "#b34000",
  red: "#d1001f",
  purple: "#5b00df",
  grey: "#6a6a76",
};

const CHART_COLORS = {
  bar: CHART.blue,
  gridStroke: "var(--line)",
  axisText: "var(--ink-3)",
};

const STATUS_COLORS: Record<EvaluationStatus, string> = {
  assigned: CHART.grey,
  in_progress: CHART.blue,
  submitted: CHART.amber,
  reviewed: "#3a3aa0",
  disputed: CHART.red,
  signed_evaluatee: "#2e2e8c",
  signed_manager: "#252578",
  signed_hr: CHART.purple,
  validated: CHART.green,
  expired: CHART.red,
  archived: CHART.grey,
};

const STATUS_LABELS: Record<EvaluationStatus, string> = {
  assigned: "Assigné",
  in_progress: "En cours",
  submitted: "Soumis",
  reviewed: "Révisé",
  disputed: "En litige",
  signed_evaluatee: "Signé (évalué)",
  signed_manager: "Signé (responsable)",
  signed_hr: "Signé (RH)",
  validated: "Validé",
  expired: "Expiré",
  archived: "Archivé",
};

interface PieEntry {
  name: string;
  value: number;
  color: string;
}

interface BarEntry {
  range: string;
  count: number;
}

export default function AnalyticsPage() {
  const { t } = useTranslation();
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [isExporting, setIsExporting] = useState<"pdf" | "csv" | null>(null);

  const { data: campaignsPage } = useQuery({
    queryKey: ["analytics-campaigns-list"],
    queryFn: () => analyticsApi.getCampaigns().then((r) => r.data),
  });
  const campaigns = campaignsPage?.data;

  const {
    data: summary,
    isLoading: summaryLoading,
    error: summaryError,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: ["analytics-summary"],
    queryFn: () => analyticsApi.getSummary().then((r) => r.data),
    enabled: !selectedCampaignId,
  });

  const {
    data: campaignAnalytics,
    isLoading: campaignLoading,
    error: campaignError,
    refetch: refetchCampaign,
  } = useQuery({
    queryKey: ["analytics-campaign", selectedCampaignId],
    queryFn: () =>
      analyticsApi.getCampaignAnalytics(selectedCampaignId).then((r) => r.data),
    enabled: Boolean(selectedCampaignId),
    placeholderData: keepPreviousData,
  });

  const isLoading = selectedCampaignId ? campaignLoading : summaryLoading;
  const hasError = selectedCampaignId
    ? Boolean(campaignError)
    : Boolean(summaryError);

  const handleRetry = () => {
    if (selectedCampaignId) void refetchCampaign();
    else void refetchSummary();
  };

  // KPIs — unified view for both modes
  const totalEvaluations = selectedCampaignId
    ? (campaignAnalytics?.totalAssigned ?? 0)
    : (summary?.totalEvaluations ?? 0);
  const averageScore = selectedCampaignId
    ? campaignAnalytics?.averageScore
    : summary?.averageScore;
  const completionRate = selectedCampaignId
    ? (campaignAnalytics?.completionRate ?? 0)
    : (summary?.completionRate ?? 0);
  const validatedCount = selectedCampaignId
    ? (campaignAnalytics?.validated ?? 0)
    : (summary?.byStatus?.validated ?? 0);

  // Status distribution (from global summary only)
  const statusChartData: PieEntry[] = summary?.byStatus
    ? (Object.entries(summary.byStatus) as Array<[EvaluationStatus, number]>)
        .filter(([, v]) => v > 0)
        .map(([key, value]) => ({
          name: STATUS_LABELS[key],
          value,
          color: STATUS_COLORS[key],
        }))
    : [];

  // Score distribution (from campaign analytics)
  const scoreChartData: BarEntry[] = campaignAnalytics?.scoreDistribution
    ? Object.entries(campaignAnalytics.scoreDistribution).map(
        ([range, count]) => ({ range, count }),
      )
    : [];

  const handleExport = async (type: "pdf" | "csv") => {
    setIsExporting(type);
    try {
      const campaignId = selectedCampaignId || undefined;
      const res =
        type === "pdf"
          ? await analyticsApi.exportPdf(campaignId)
          : await analyticsApi.exportCsv(campaignId);
      const blob = res.data as Blob;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        type === "pdf" ? "analytics-rapport.pdf" : "analytics-export.csv";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <div className="nx-app">
      <PageHead
        eyebrow={t("eyebrow.hrSpace")}
        title={t("pageHead.analyticsTitle")}
        desc={t("pageHead.analyticsDesc")}
        actions={
          <>
            <select
              aria-label="Filtrer par campagne"
              value={selectedCampaignId}
              onChange={(e) => setSelectedCampaignId(e.target.value)}
              className="rounded-xl border px-4 py-2 text-sm"
              style={{
                borderColor: "var(--line)",
                background: "#fff",
                color: "var(--ink)",
              }}
            >
              <option value="">Toutes les campagnes</option>
              {campaigns?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <button
              onClick={() => void handleExport("pdf")}
              disabled={Boolean(isExporting)}
              className="btn btn-ghost"
            >
              <FileText className="ico" style={{ width: 18, height: 18 }} />
              {isExporting === "pdf" ? "Export…" : "Exporter PDF"}
            </button>

            <button
              onClick={() => void handleExport("csv")}
              disabled={Boolean(isExporting)}
              className="btn btn-primary"
            >
              <Download className="ico" style={{ width: 18, height: 18 }} />
              {isExporting === "csv" ? "Export…" : "Exporter CSV"}
            </button>
          </>
        }
      />

      {/* ── Error banner ───────────────────────────────────────────────────── */}
      {hasError && (
        <div
          className="row between"
          style={{
            gap: 16,
            padding: "12px 16px",
            border: "1px solid var(--red)",
            borderRadius: "var(--radius)",
            background: "rgba(209,0,31,.06)",
            marginBottom: 24,
          }}
        >
          <p className="small" style={{ color: "var(--red)" }}>
            Erreur lors du chargement des données analytiques.
          </p>
          <button onClick={handleRetry} className="link small">
            Réessayer
          </button>
        </div>
      )}

      {/* ── KPI cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-28 bg-slate-200 rounded-xl animate-pulse"
            />
          ))
        ) : (
          <>
            <StatTile
              value={totalEvaluations}
              label="Total évaluations"
              tone="var(--blue)"
            />
            <StatTile
              value={
                averageScore != null ? `${averageScore.toFixed(1)}/100` : "—"
              }
              label="Score moyen"
              tone="var(--green)"
            />
            <StatTile
              value={`${(completionRate * 100).toFixed(1)} %`}
              label="Taux de complétion"
              tone="var(--amber)"
            />
            <StatTile
              value={validatedCount}
              label="Évals validées"
              tone="var(--purple, #5b00df)"
            />
          </>
        )}
      </div>

      {/* ── Charts row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Status donut */}
        <Tile>
          <h2 className="h2" style={{ marginBottom: 16 }}>
            Distribution des statuts
          </h2>
          {isLoading ? (
            <div className="h-72 bg-slate-100 rounded animate-pulse" />
          ) : statusChartData.length === 0 ? (
            <p className="small text-center" style={{ padding: "40px 0" }}>
              Aucune donnée de statut disponible
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={288}>
              <PieChart>
                <Pie
                  data={statusChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  dataKey="value"
                  paddingAngle={2}
                >
                  {statusChartData.map((entry, i) => (
                    <Cell key={`s-${i}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Tile>

        {/* Score bar */}
        <Tile>
          <h2 className="h2" style={{ marginBottom: 16 }}>
            Distribution des scores
          </h2>
          {isLoading ? (
            <div className="h-72 bg-slate-100 rounded animate-pulse" />
          ) : scoreChartData.length === 0 ? (
            <p className="small text-center" style={{ padding: "40px 0" }}>
              Aucune donnée de score disponible
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={288}>
              <BarChart
                data={scoreChartData}
                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke={CHART_COLORS.gridStroke}
                />
                <XAxis
                  dataKey="range"
                  tick={{ fontSize: 12, fill: CHART_COLORS.axisText }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: CHART_COLORS.axisText }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip />
                <Bar
                  dataKey="count"
                  fill={CHART_COLORS.bar}
                  radius={[4, 4, 0, 0]}
                  name="Évaluations"
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Tile>
      </div>

      {/* ── Top 5 performers ───────────────────────────────────────────────── */}
      <Tile className="mb-6">
        <h2 className="h2" style={{ marginBottom: 16 }}>
          Top 5 performances
        </h2>
        {isLoading ? (
          <div className="h-40 bg-slate-100 rounded animate-pulse" />
        ) : !summary?.topPerformers?.length ? (
          <p className="small text-center" style={{ padding: "32px 0" }}>
            Aucune donnée disponible
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="tbl-head">
                  <th className="w-10 pb-3 pr-4 text-left">#</th>
                  <th className="pb-3 pr-4 text-left">Collaborateur</th>
                  <th className="pb-3 pr-4 text-left">Score</th>
                  <th className="pb-3 text-left">Campagne</th>
                </tr>
              </thead>
              <tbody>
                {summary.topPerformers.slice(0, 5).map((p, i) => (
                  <tr key={p.userId} className="tbl-row">
                    <td
                      className="py-3 pr-4 font-medium"
                      style={{ color: "var(--ink-3)" }}
                    >
                      {i + 1}
                    </td>
                    <td
                      className="py-3 pr-4 font-medium"
                      style={{ color: "var(--ink)" }}
                    >
                      {p.name}
                    </td>
                    <td className="py-3 pr-4">
                      <span className="badge green">{p.score}/100</span>
                    </td>
                    <td className="py-3" style={{ color: "var(--ink-2)" }}>
                      {p.campaignName}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Tile>

      {/* ── Department completion ──────────────────────────────────────────── */}
      <Tile>
        <h2 className="h2" style={{ marginBottom: 16 }}>
          Taux de complétion par département
        </h2>
        {isLoading ? (
          <div className="h-40 bg-slate-100 rounded animate-pulse" />
        ) : !summary?.byDepartmentCompletion?.length ? (
          <p className="small text-center" style={{ padding: "32px 0" }}>
            Aucune donnée disponible
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="tbl-head">
                  <th className="pb-3 pr-4 text-left">Département</th>
                  <th className="pb-3 pr-4 text-left">Total</th>
                  <th className="pb-3 pr-4 text-left">Soumis</th>
                  <th className="pb-3 pr-4 text-left">Validés</th>
                  <th className="min-w-[200px] pb-3 text-left">%</th>
                </tr>
              </thead>
              <tbody>
                {summary.byDepartmentCompletion.map((d) => (
                  <tr key={d.department} className="tbl-row">
                    <td
                      className="py-3 pr-4 font-medium"
                      style={{ color: "var(--ink)" }}
                    >
                      {d.department}
                    </td>
                    <td className="py-3 pr-4" style={{ color: "var(--ink-2)" }}>
                      {d.total}
                    </td>
                    <td className="py-3 pr-4" style={{ color: "var(--ink-2)" }}>
                      {d.submitted}
                    </td>
                    <td className="py-3 pr-4" style={{ color: "var(--ink-2)" }}>
                      {d.validated}
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-14 text-right text-sm"
                          style={{ color: "var(--ink)" }}
                        >
                          {d.rate.toFixed(1)} %
                        </span>
                        <div
                          className="h-1 min-w-[80px] flex-1 rounded"
                          style={{ background: "var(--line)" }}
                        >
                          <div
                            className="h-1 rounded"
                            style={{
                              width: `${Math.min(d.rate, 100)}%`,
                              background: CHART.blue,
                            }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Tile>
    </div>
  );
}
