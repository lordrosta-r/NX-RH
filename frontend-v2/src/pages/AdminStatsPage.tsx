import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "@/api/analytics";
import { PageHead, Tile, StatTile, Bar } from "../components/shell";

const STATUS_LABELS: Record<string, string> = {
  assigned: "Assignées",
  in_progress: "En cours",
  submitted: "Soumises",
  reviewed: "Relues",
  signed_evaluatee: "Signées (évalué)",
  signed_manager: "Signées (manager)",
  signed_hr: "Signées (RH)",
  validated: "Validées",
  expired: "Expirées",
  rejected: "Rejetées",
  archived: "Archivées",
};

export default function AdminStatsPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["analytics", "summary"],
    queryFn: () => analyticsApi.getSummary().then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div className="nx-app">
        <PageHead title="Statistiques" desc="Vue d'ensemble RH" />
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
        <PageHead title="Statistiques" desc="Vue d'ensemble RH" />
        <p className="body" style={{ color: "var(--red)" }}>
          Impossible de charger les statistiques.
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
        eyebrow="Administration"
        title="Statistiques"
        desc="Vue d'ensemble RH (campagnes & évaluations)"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatTile
          value={data.totalCampaigns}
          label="Campagnes"
          tone="var(--blue)"
        />
        <StatTile
          value={data.activeCampaigns}
          label="Campagnes actives"
          tone="var(--green)"
        />
        <StatTile
          value={data.totalEvaluations}
          label="Évaluations"
          tone="var(--amber)"
        />
        <StatTile
          value={`${data.completionRate}%`}
          label="Taux de complétion"
          tone="var(--green)"
        />
      </div>

      {avg != null && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatTile
            value={`${Math.round(avg)}/100`}
            label="Score moyen (validées)"
            tone="var(--amber)"
          />
        </div>
      )}

      <Tile>
        <h2 className="h2" style={{ marginBottom: 16 }}>
          Évaluations par statut
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
                {STATUS_LABELS[status] ?? status}
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
