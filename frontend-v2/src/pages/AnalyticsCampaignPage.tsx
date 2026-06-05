import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
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
import { ArrowLeft } from "lucide-react";
import { analyticsApi } from "../api/analytics";
import {
  PageHead,
  Tile,
  StatTile,
  Callout,
  Bar as ShellBar,
} from "../components/shell";

// ─── Couleurs institutionnelles pour les graphiques ──────────────────────────
const CHART = {
  blue: "#1b1b78",
  green: "#18753c",
  amber: "#b34000",
  red: "#d1001f",
  purple: "#5b00df",
  grey: "#6a6a76",
};

const CAMPAIGN_STATUS_COLORS = {
  notStarted: CHART.grey,
  submitted: CHART.amber,
  validated: CHART.green,
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

export default function AnalyticsCampaignPage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["analytics-campaign-detail", id],
    queryFn: () => analyticsApi.getCampaignAnalytics(id!).then((r) => r.data),
    enabled: Boolean(id),
  });

  const totalAssigned = data?.totalAssigned ?? 0;
  const submitted = data?.submitted ?? 0;
  const validated = data?.validated ?? 0;
  const completionPct = ((data?.completionRate ?? 0) * 100).toFixed(1);
  const submittedNotValidated = Math.max(0, submitted - validated);
  const notStarted = Math.max(0, totalAssigned - submitted);

  const statusData: PieEntry[] = [
    {
      name: "Non commencé",
      value: notStarted,
      color: CAMPAIGN_STATUS_COLORS.notStarted,
    },
    {
      name: "Soumis",
      value: submittedNotValidated,
      color: CAMPAIGN_STATUS_COLORS.submitted,
    },
    {
      name: "Validé",
      value: validated,
      color: CAMPAIGN_STATUS_COLORS.validated,
    },
  ].filter((d) => d.value > 0);

  const scoreData: BarEntry[] = data?.scoreDistribution
    ? Object.entries(data.scoreDistribution).map(([range, count]) => ({
        range,
        count,
      }))
    : [];

  return (
    <div className="nx-app">
      <PageHead
        eyebrow={
          <Link
            to="/analytics"
            className="link small inline-flex items-center gap-1"
          >
            <ArrowLeft style={{ width: 14, height: 14 }} />
            Retour à l’analytique
          </Link>
        }
        title={isLoading ? "Chargement…" : `Analytique — Campagne ${id}`}
        desc="Vue détaillée de l’avancement et des scores de la campagne."
      />

      {/* ── Error ─────────────────────────────────────────────────────────── */}
      {error && (
        <Callout tone="red" className="mb-6">
          <div className="row between wrap" style={{ gap: 12 }}>
            <p className="body" style={{ color: "var(--ink)" }}>
              Erreur lors du chargement des données de la campagne.
            </p>
            <button onClick={() => void refetch()} className="link small">
              Réessayer
            </button>
          </div>
        </Callout>
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
              value={totalAssigned}
              label="Total évaluations"
              tone="var(--blue)"
            />
            <StatTile
              value={submitted}
              label="Complétées"
              tone="var(--amber)"
            />
            <StatTile
              value={
                data?.averageScore != null
                  ? `${data.averageScore.toFixed(1)}/100`
                  : "—"
              }
              label="Score moyen"
              tone="var(--green)"
            />
            <StatTile
              value={`${completionPct} %`}
              label="Taux de complétion"
              tone="var(--purple, #5b00df)"
            />
          </>
        )}
      </div>

      {/* ── Charts ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Status donut */}
        <Tile>
          <h2 className="h2" style={{ marginBottom: 16 }}>
            Distribution des statuts
          </h2>
          {isLoading ? (
            <div className="h-72 animate-pulse rounded-xl bg-slate-200" />
          ) : statusData.length === 0 ? (
            <p className="small text-center" style={{ padding: "40px 0" }}>
              Aucune donnée disponible
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={288}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  dataKey="value"
                  nameKey="name"
                  paddingAngle={2}
                >
                  {statusData.map((entry, i) => (
                    <Cell key={`c-${i}`} fill={entry.color} />
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
            <div className="h-72 animate-pulse rounded-xl bg-slate-200" />
          ) : scoreData.length === 0 ? (
            <p className="small text-center" style={{ padding: "40px 0" }}>
              Aucune donnée de score disponible
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={288}>
              <BarChart
                data={scoreData}
                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--line)"
                />
                <XAxis
                  dataKey="range"
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip />
                <Bar
                  dataKey="count"
                  fill={CHART.blue}
                  radius={[4, 4, 0, 0]}
                  name="Évaluations"
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Tile>
      </div>

      {/* ── Department completion ──────────────────────────────────────────── */}
      <Tile>
        <h2 className="h2" style={{ marginBottom: 16 }}>
          Taux de complétion par département
        </h2>
        {isLoading ? (
          <div className="h-40 animate-pulse rounded-xl bg-slate-200" />
        ) : !data?.byDepartment?.length ? (
          <p className="small text-center" style={{ padding: "32px 0" }}>
            Aucune donnée disponible
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="tbl-head">
                  <th className="text-left">Département</th>
                  <th className="text-left">Total</th>
                  <th className="text-left">Complétés</th>
                  <th className="text-left" style={{ minWidth: 200 }}>
                    %
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.byDepartment.map((d) => {
                  const rate = d.total > 0 ? (d.completed / d.total) * 100 : 0;
                  return (
                    <tr key={d.department} className="tbl-row">
                      <td style={{ fontWeight: 600, color: "var(--ink)" }}>
                        {d.department}
                      </td>
                      <td>{d.total}</td>
                      <td>{d.completed}</td>
                      <td>
                        <div
                          className="row"
                          style={{ gap: 8, alignItems: "center" }}
                        >
                          <span
                            className="small"
                            style={{ width: 56, textAlign: "right" }}
                          >
                            {rate.toFixed(1)} %
                          </span>
                          <div style={{ flex: 1, minWidth: 80 }}>
                            <ShellBar pct={rate} tone="var(--blue)" />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Tile>
    </div>
  );
}
