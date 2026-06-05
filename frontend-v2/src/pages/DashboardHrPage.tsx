import { Link } from "react-router-dom";
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
        Voir →
      </span>
    </Link>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardHrPage() {
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
            Impossible de charger les données du tableau de bord.
          </p>
          <button
            onClick={() => campaigns.refetch()}
            className="link small"
            style={{ marginTop: 8 }}
          >
            Réessayer
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
    { Indicateur: "Collaborateurs actifs", Valeur: s?.users.active ?? "—" },
    { Indicateur: "Collaborateurs inactifs", Valeur: s?.users.inactive ?? "—" },
    { Indicateur: "Campagnes en cours", Valeur: s?.campaigns.active ?? "—" },
    {
      Indicateur: "Campagnes terminées",
      Valeur: s?.campaigns.completed ?? "—",
    },
    { Indicateur: "Campagnes en retard", Valeur: s?.campaigns.overdue ?? "—" },
    {
      Indicateur: "Taux de complétion éval. (%)",
      Valeur: s?.evaluations.completionRate ?? "—",
    },
    {
      Indicateur: "Évals signées des 2 côtés (%)",
      Valeur: s?.evaluations.signedBothRate ?? "—",
    },
    {
      Indicateur: "Temps moyen complétion (jours)",
      Valeur: s?.evaluations.avgCompletionDays ?? "—",
    },
    {
      Indicateur: "Demandes mobilité en attente",
      Valeur: s?.mobility.pending ?? "—",
    },
  ];
  const deptRows = (byDeptRaw ?? []).map((d) => ({
    Département: d.department || "N/A",
    Total: d.total,
    Complétées: d.validated,
    "Taux (%)": d.rate,
  }));

  return (
    <div className="nx-app">
      <PageHead
        eyebrow="Espace RH"
        title="Tableau de bord RH"
        desc="Vue d’ensemble de l’avancement des campagnes et des collaborateurs."
        actions={
          <>
            <button
              onClick={() =>
                exportDashboardPdf({
                  title: `Rapport RH — ${new Date().toLocaleDateString("fr-FR")}`,
                  sections: [
                    {
                      title: "KPIs clés",
                      data: kpiRows as Record<string, unknown>[],
                    },
                    {
                      title: "Évaluations par département",
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
              Exporter PDF
            </button>
            <Link to="/campaigns/new" className="btn btn-primary">
              <Plus className="ico" style={{ width: 18, height: 18 }} />{" "}
              Nouvelle campagne
            </Link>
          </>
        }
      />

      {/* ── KPI — collaborateurs + campagnes ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4 mb-4">
        <StatTile
          value={s?.users.active ?? "—"}
          label="Collaborateurs actifs"
          tone="var(--green)"
          sub={`Total : ${s?.users.total ?? "—"}`}
        />
        <StatTile
          value={s?.users.inactive ?? "—"}
          label="Collaborateurs inactifs"
          tone="var(--red)"
        />
        <StatTile
          value={s?.campaigns.active ?? "—"}
          label="Campagnes en cours"
          tone="var(--blue)"
        />
        <StatTile
          value={s?.campaigns.completed ?? "—"}
          label="Campagnes terminées"
          tone="var(--green)"
        />
        <StatTile
          value={s?.campaigns.overdue ?? "—"}
          label="Campagnes en retard"
          tone="var(--amber)"
        />
        <StatTile
          value={s?.mobility.pending ?? "—"}
          label="Mobilités en attente"
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
          label="Taux de complétion"
          tone="var(--purple, #5b00df)"
        />
        <StatTile
          value={
            s?.evaluations.signedBothRate != null
              ? `${s.evaluations.signedBothRate}%`
              : "—"
          }
          label="Signées des 2 côtés"
          tone="var(--green)"
          sub={
            s?.evaluations.signedBoth != null
              ? `${s.evaluations.signedBoth} évals`
              : undefined
          }
        />
        <StatTile
          value={s?.evaluations.pending ?? "—"}
          label="Évals en attente"
          tone="var(--amber)"
        />
        <StatTile
          value={
            s?.evaluations.avgCompletionDays != null
              ? `${s.evaluations.avgCompletionDays}j`
              : "—"
          }
          label="Temps moyen complétion"
          tone="var(--blue)"
        />
      </div>

      {/* ── Graphiques ── */}
      <div className="grid grid-cols-12 gap-6 mb-6">
        <div className="col-span-12 lg:col-span-7">
          <Tile style={{ height: "100%" }}>
            <h2 className="h2" style={{ marginBottom: 16 }}>
              Évolution des évaluations (6 mois)
            </h2>
            {monthlyTrend.isLoading ? (
              <div className="h-48 bg-slate-100 rounded animate-pulse" />
            ) : (monthlyTrend.data ?? []).length === 0 ? (
              <p className="small text-center" style={{ padding: "40px 0" }}>
                Aucune donnée mensuelle
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
                    name="Total"
                    stroke={CHART.blue}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="completed"
                    name="Complétées"
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
              Répartition par statut
            </h2>
            {analyticsSummary.isLoading ? (
              <div className="h-48 bg-slate-100 rounded animate-pulse" />
            ) : pieData.length === 0 ? (
              <p className="small text-center" style={{ padding: "40px 0" }}>
                Aucune donnée
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
            Top départements — taux de complétion
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
              <Tooltip formatter={(v) => [`${v}%`, "Taux"]} />
              <RBar
                dataKey="rate"
                name="Taux de complétion"
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
              <h2 className="h2">Campagnes en cours</h2>
              <Link to="/campaigns" className="link small">
                Voir toutes →
              </Link>
            </div>
            {campaignList.length === 0 ? (
              <p className="small text-center" style={{ padding: "24px 0" }}>
                Aucune campagne active
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
              Alertes
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
                        {s!.campaigns.overdue} campagne
                        {s!.campaigns.overdue > 1 ? "s" : ""} en retard
                      </p>
                      <Link to="/campaigns" className="link small">
                        Voir les campagnes →
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
                        {s!.evaluations.pending} évaluation
                        {s!.evaluations.pending > 1 ? "s" : ""} en attente
                      </p>
                      <Link to="/evaluations" className="link small">
                        Voir les évaluations →
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
                        {s!.mobility.pending} demande
                        {s!.mobility.pending > 1 ? "s" : ""} de mobilité
                      </p>
                      <Link to="/mobility" className="link small">
                        Voir les demandes →
                      </Link>
                    </div>
                  </div>
                </Callout>
              )}
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
                      Offboardings en cours
                    </p>
                    <Link to="/offboarding" className="link small">
                      Voir les offboardings →
                    </Link>
                  </div>
                </div>
              </Callout>
            </div>
          </Tile>
        </div>
      </div>

      {/* ── Stats rapides + événements ── */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 md:col-span-6">
          <Tile style={{ height: "100%" }}>
            <h2 className="h2" style={{ marginBottom: 16 }}>
              Stats rapides
            </h2>
            <div>
              {[
                ["Total évaluations", s?.evaluations.total],
                ["Évaluations complétées", s?.evaluations.completed],
                ["Total collaborateurs", s?.users.total],
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
              <h2 className="h2">Prochains événements</h2>
              <Link to="/events" className="link small">
                Voir tous →
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
              Aucun événement à venir
            </p>
          </Tile>
        </div>
      </div>
    </div>
  );
}
