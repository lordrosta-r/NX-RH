import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { analyticsApi } from "@/api/analytics";
import { PageHead, Tile, StatTile, Bar } from "../components/shell";

const STATUS_KEYS = [
  "assigned",
  "in_progress",
  "submitted",
  "reviewed",
  "signed_evaluatee",
  "signed_manager",
  "signed_hr",
  "validated",
  "expired",
  "rejected",
  "archived",
] as const;

export default function AdminStatsPage() {
  const { t } = useTranslation();
  const statusLabels: Record<string, string> = Object.fromEntries(
    STATUS_KEYS.map((k) => [k, t(`adminStats.status.${k}`)]),
  );
  const { data, isLoading, isError } = useQuery({
    queryKey: ["analytics", "summary"],
    queryFn: () => analyticsApi.getSummary().then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div className="nx-app">
        <PageHead
          title={t("adminStats.title")}
          desc={t("adminStats.descShort")}
        />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-24 bg-slate-100 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="nx-app">
        <PageHead
          title={t("adminStats.title")}
          desc={t("adminStats.descShort")}
        />
        <p className="body" style={{ color: "var(--red)" }}>
          {t("adminStats.loadError")}
        </p>
      </div>
    );
  }

  const avg =
    data.averageScore ?? (data as { avgScore?: number }).avgScore ?? null;
  const byStatus = data.byStatus ?? {};
  const maxCount = Math.max(
    1,
    ...Object.values(byStatus).map((v) => Number(v) || 0),
  );

  return (
    <div className="nx-app">
      <PageHead
        eyebrow={t("adminStats.eyebrow")}
        title={t("adminStats.title")}
        desc={t("adminStats.desc")}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatTile
          value={data.totalCampaigns}
          label={t("adminStats.kpi.campaigns")}
          tone="var(--blue)"
        />
        <StatTile
          value={data.activeCampaigns}
          label={t("adminStats.kpi.activeCampaigns")}
          tone="var(--green)"
        />
        <StatTile
          value={data.totalEvaluations}
          label={t("adminStats.kpi.evaluations")}
          tone="var(--amber)"
        />
        <StatTile
          value={`${data.completionRate}%`}
          label={t("adminStats.kpi.completionRate")}
          tone="var(--green)"
        />
      </div>

      {avg != null && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatTile
            value={`${Math.round(avg)}/100`}
            label={t("adminStats.kpi.avgScore")}
            tone="var(--amber)"
          />
        </div>
      )}

      <Tile>
        <h2 className="h2" style={{ marginBottom: 16 }}>
          {t("adminStats.byStatusTitle")}
        </h2>
        <div className="section-gap" style={{ gap: 10 }}>
          {Object.entries(byStatus).map(([status, count]) => (
            <div key={status} className="row" style={{ gap: 12 }}>
              <span
                className="small"
                style={{
                  width: 160,
                  flex: "none",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {statusLabels[status] ?? status}
              </span>
              <div style={{ flex: 1 }}>
                <Bar
                  pct={(Number(count) / maxCount) * 100}
                  tone="var(--blue)"
                />
              </div>
              <span
                className="small"
                style={{ width: 32, textAlign: "right", fontWeight: 600 }}
              >
                {Number(count)}
              </span>
            </div>
          ))}
        </div>
      </Tile>
    </div>
  );
}
