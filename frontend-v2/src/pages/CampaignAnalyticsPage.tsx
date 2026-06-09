import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BarChart2, FileText, Download, ChevronRight } from "lucide-react";
import { analyticsApi } from "../api/analytics";
import { PageHead, Tile, Callout, Badge } from "../components/shell";
import { useAuth } from "../contexts/AuthContext";

// ─── Couleurs institutionnelles pour les graphiques ──────────────────────────
const CHART_COLORS = {
  track: "var(--line)",
  gauge: "var(--blue)",
  score: {
    veryLow: "var(--red)",
    low: "var(--amber)",
    medium: "#b58a00",
    good: "#3a7d44",
    veryGood: "var(--green)",
  },
  status: {
    assigned: "var(--grey, #6a6a76)",
    in_progress: "var(--blue)",
    submitted: "var(--amber)",
    validated: "var(--green)",
  },
};

// ─── DonutChart ───────────────────────────────────────────────────────────────
interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

function DonutChart({ data }: { data: DonutSegment[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  let accumulated = 0;

  return (
    <div className="flex items-center gap-6 flex-wrap">
      <svg
        width="160"
        height="160"
        viewBox="0 0 160 160"
        className="flex-shrink-0"
      >
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          strokeWidth="20"
          stroke={CHART_COLORS.track}
        />
        {total > 0 &&
          data.map((segment) => {
            const dash = (segment.value / total) * circumference;
            const gap = circumference - dash;
            const offset = circumference - accumulated;
            accumulated += dash;
            return (
              <circle
                key={segment.label}
                cx="80"
                cy="80"
                r={radius}
                fill="none"
                strokeWidth="20"
                stroke={segment.color}
                strokeDasharray={`${dash} ${gap}`}
                strokeDashoffset={offset}
                transform="rotate(-90 80 80)"
              />
            );
          })}
        <text
          x="80"
          y="80"
          textAnchor="middle"
          dy="0.3em"
          fontSize="24"
          fontWeight="bold"
          fill="var(--ink)"
        >
          {total}
        </text>
      </svg>
      <div className="space-y-2">
        {data.map((d) => (
          <div
            key={d.label}
            className="flex items-center gap-2 text-sm min-w-[140px]"
          >
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: d.color }}
            />
            <span className="small">{d.label}</span>
            <span
              className="font-semibold ml-auto pl-4"
              style={{ color: "var(--ink)" }}
            >
              {d.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ScoreHistogram ───────────────────────────────────────────────────────────
function ScoreHistogram({
  distribution,
}: {
  distribution: Record<string, number>;
}) {
  const bars = [
    {
      range: "0-2",
      count: distribution["0-2"] || 0,
      color: CHART_COLORS.score.veryLow,
    },
    {
      range: "3-4",
      count: distribution["3-4"] || 0,
      color: CHART_COLORS.score.low,
    },
    {
      range: "5-6",
      count: distribution["5-6"] || 0,
      color: CHART_COLORS.score.medium,
    },
    {
      range: "7-8",
      count: distribution["7-8"] || 0,
      color: CHART_COLORS.score.good,
    },
    {
      range: "9-10",
      count: distribution["9-10"] || 0,
      color: CHART_COLORS.score.veryGood,
    },
  ];
  const max = Math.max(...bars.map((b) => b.count), 1);

  return (
    <div className="flex items-end gap-3 h-32">
      {bars.map((bar) => (
        <div
          key={bar.range}
          className="flex-1 flex flex-col items-center gap-1"
        >
          <span className="text-xs" style={{ color: "var(--ink-3)" }}>
            {bar.count}
          </span>
          <div
            className="w-full rounded-t-sm transition-all"
            style={{
              height: `${(bar.count / max) * 100}%`,
              backgroundColor: bar.color,
              minHeight: bar.count ? "4px" : "0",
            }}
          />
          <span className="text-xs" style={{ color: "var(--ink-3)" }}>
            {bar.range}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── SemiCircleGauge ──────────────────────────────────────────────────────────
function SemiCircleGauge({ value, max = 10 }: { value: number; max?: number }) {
  const radius = 55;
  const circumference = Math.PI * radius;
  const filled = Math.min(Math.max(value / max, 0), 1) * circumference;

  return (
    <svg width="160" height="90" viewBox="0 0 160 90">
      <path
        d={`M 25,80 A ${radius},${radius} 0 0 1 135,80`}
        fill="none"
        stroke={CHART_COLORS.track}
        strokeWidth="14"
        strokeLinecap="round"
      />
      <path
        d={`M 25,80 A ${radius},${radius} 0 0 1 135,80`}
        fill="none"
        stroke={CHART_COLORS.gauge}
        strokeWidth="14"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circumference}`}
        strokeDashoffset="0"
      />
    </svg>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CampaignAnalyticsPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  // Les exports (PDF/CSV) sont réservés admin/hr côté API ;
  // le manager peut consulter l'analytique mais pas exporter.
  const isAdminOrHr = user?.role === "admin" || user?.role === "hr";

  const {
    data: analytics,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["campaign-analytics", id],
    queryFn: () => analyticsApi.getCampaignAnalytics(id!).then((r) => r.data),
    enabled: !!id,
  });

  const campaignName = analytics?.campaignName ?? "…";

  const statusData = analytics?.statusDistribution ?? {};
  const donutData: DonutSegment[] = [
    {
      label: "Assignées",
      value: statusData.assigned ?? 0,
      color: CHART_COLORS.status.assigned,
    },
    {
      label: "En cours",
      value: statusData.in_progress ?? 0,
      color: CHART_COLORS.status.in_progress,
    },
    {
      label: "Soumises",
      value: statusData.submitted ?? 0,
      color: CHART_COLORS.status.submitted,
    },
    {
      label: "Validées",
      value: statusData.validated ?? 0,
      color: CHART_COLORS.status.validated,
    },
  ];

  const departmentCompletion = (analytics?.byDepartment ?? []).map((d) => ({
    ...d,
    percentage: d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0,
  }));

  const avgScore = analytics?.averageScore ?? 0;

  return (
    <div className="nx-app">
      <PageHead
        eyebrow={
          <span className="row" style={{ gap: 6, alignItems: "center" }}>
            <Link to="/" className="link">
              Accueil
            </Link>
            <ChevronRight style={{ width: 14, height: 14 }} />
            <Link to="/campaigns" className="link">
              Campagnes
            </Link>
            <ChevronRight style={{ width: 14, height: 14 }} />
            <Link to={`/campaigns/${id}`} className="link">
              {campaignName}
            </Link>
            <ChevronRight style={{ width: 14, height: 14 }} />
            <span>Analytique</span>
          </span>
        }
        title={`Analytique — ${campaignName}`}
        actions={
          isAdminOrHr ? (
            <>
              <button
                onClick={() =>
                  window.open(`/api/analytics/export/pdf?campaignId=${id}`)
                }
                disabled={isLoading}
                className="btn btn-ghost"
              >
                <FileText className="ico" style={{ width: 18, height: 18 }} />{" "}
                Exporter PDF
              </button>
              <button
                onClick={() =>
                  window.open(`/api/analytics/export/csv?campaignId=${id}`)
                }
                disabled={isLoading}
                className="btn btn-ghost"
              >
                <Download className="ico" style={{ width: 18, height: 18 }} />{" "}
                Exporter CSV
              </button>
            </>
          ) : undefined
        }
      />

      {/* Error state */}
      {isError && (
        <Callout tone="red" className="mb-6">
          <p className="body" style={{ color: "var(--ink)" }}>
            Impossible de charger les données analytiques
          </p>
          <button
            onClick={() => refetch()}
            className="link small"
            style={{ marginTop: 8 }}
          >
            Réessayer
          </button>
        </Callout>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-24">
          <div
            className="w-8 h-8 border-4 rounded-full animate-spin"
            style={{
              borderColor: "var(--blue)",
              borderTopColor: "transparent",
            }}
          />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && !analytics && (
        <Tile>
          <div className="text-center" style={{ padding: "48px 0" }}>
            <BarChart2
              className="mx-auto mb-4"
              style={{ width: 48, height: 48, color: "var(--ink-3)" }}
            />
            <p className="body">Aucune donnée analytique disponible.</p>
            <p className="small" style={{ marginTop: 8 }}>
              Lancez la campagne pour commencer.
            </p>
          </div>
        </Tile>
      )}

      {analytics && (
        <>
          {/* Row 1 : Donut + Histogramme */}
          <div className="grid grid-cols-12 gap-6 mb-6">
            <div className="col-span-12 md:col-span-6">
              <Tile style={{ height: "100%" }}>
                <h2 className="h2" style={{ marginBottom: 16 }}>
                  Distribution des statuts
                </h2>
                <DonutChart data={donutData} />
              </Tile>
            </div>

            <div className="col-span-12 md:col-span-6">
              <Tile style={{ height: "100%" }}>
                <h2 className="h2" style={{ marginBottom: 16 }}>
                  Distribution des scores
                </h2>
                <ScoreHistogram
                  distribution={analytics.scoreDistribution ?? {}}
                />
              </Tile>
            </div>
          </div>

          {/* Row 2 : Score moyen + Tableau */}
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 md:col-span-4">
              <Tile style={{ height: "100%" }}>
                <h2 className="h2" style={{ marginBottom: 16 }}>
                  Score moyen global
                </h2>
                <div
                  className="flex flex-col items-center justify-center"
                  style={{ padding: "8px 0" }}
                >
                  <SemiCircleGauge value={avgScore} />
                  <div className="flex items-baseline gap-1 mt-1">
                    <span
                      style={{
                        fontSize: 36,
                        fontWeight: 700,
                        color: "var(--ink)",
                      }}
                    >
                      {avgScore > 0 ? avgScore.toFixed(1) : "—"}
                    </span>
                    <span className="body" style={{ fontSize: 18 }}>
                      /10
                    </span>
                  </div>
                </div>
              </Tile>
            </div>

            <div className="col-span-12 md:col-span-8">
              <Tile style={{ height: "100%", padding: 0, overflow: "hidden" }}>
                <div
                  style={{
                    padding: "16px 20px",
                    borderBottom: "1px solid var(--line)",
                  }}
                >
                  <h2 className="h2">Complétion par département</h2>
                </div>
                <div className="overflow-x-auto hidden sm:block">
                  <table className="w-full text-sm">
                    <thead>
                      <tr
                        className="eyebrow"
                        style={{ background: "var(--surface-2, #f6f6f9)" }}
                      >
                        <th className="px-4 py-3 text-left">Département</th>
                        <th className="px-4 py-3 text-right">Total</th>
                        <th className="px-4 py-3 text-right">Complété</th>
                        <th className="px-4 py-3 text-right">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {departmentCompletion.map((row) => (
                        <tr
                          key={row.department}
                          style={{ borderTop: "1px solid var(--line)" }}
                        >
                          <td
                            className="px-4 py-3"
                            style={{ color: "var(--ink)" }}
                          >
                            {row.department}
                          </td>
                          <td
                            className="px-4 py-3 text-right"
                            style={{ color: "var(--ink)", fontWeight: 600 }}
                          >
                            {row.total}
                          </td>
                          <td
                            className="px-4 py-3 text-right"
                            style={{ color: "var(--ink)", fontWeight: 600 }}
                          >
                            {row.completed}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Badge
                              tone={
                                row.percentage >= 80
                                  ? "green"
                                  : row.percentage >= 50
                                    ? "amber"
                                    : "red"
                              }
                            >
                              {row.percentage}%
                            </Badge>
                          </td>
                        </tr>
                      ))}
                      {departmentCompletion.length === 0 && (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-4 py-8 text-center small"
                          >
                            Aucune donnée disponible
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Tile>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
