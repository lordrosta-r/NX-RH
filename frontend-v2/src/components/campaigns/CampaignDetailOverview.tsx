import type { Campaign } from "../../types";
import { StatTile, Tile } from "../shell";

interface CampaignAnalytics {
  statusDistribution?: {
    in_progress?: number;
    submitted?: number;
    validated?: number;
  };
  totalEvaluations?: number;
  completedEvaluations?: number;
}

interface CampaignDetailOverviewProps {
  analytics: CampaignAnalytics | undefined;
  analyticsLoading: boolean;
  campaign: Campaign;
}

export default function CampaignDetailOverview({
  analytics,
  analyticsLoading,
  campaign,
}: CampaignDetailOverviewProps) {
  const statusDist = analytics?.statusDistribution ?? {};
  const kpiTotal = analytics?.totalEvaluations ?? 0;
  const kpiInProgress = statusDist.in_progress ?? 0;
  const kpiSubmitted = statusDist.submitted ?? 0;
  const kpiValidated =
    analytics?.completedEvaluations ?? statusDist.validated ?? 0;

  return (
    <div className="section-gap">
      {analyticsLoading ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 16,
          }}
        >
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              style={{
                height: 96,
                background: "var(--bg-alt-2)",
                borderRadius: "var(--radius-lg)",
              }}
            />
          ))}
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 16,
          }}
        >
          {[
            { label: "Total", value: kpiTotal, tone: undefined },
            { label: "En cours", value: kpiInProgress, tone: "var(--blue)" },
            { label: "Soumis", value: kpiSubmitted, tone: "var(--amber)" },
            { label: "Validés", value: kpiValidated, tone: "var(--green)" },
          ].map((kpi) => (
            <StatTile
              key={kpi.label}
              value={kpi.value}
              label={kpi.label}
              tone={kpi.tone}
            />
          ))}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: 16,
        }}
      >
        <Tile>
          <p className="small" style={{ fontWeight: 600, marginBottom: 12 }}>
            Progression globale
          </p>
          <div
            className="track"
            style={{ height: 10, display: "flex" }}
            role="img"
            aria-label="Répartition de la progression"
          >
            {kpiTotal > 0 ? (
              <>
                <i
                  style={{
                    width: `${(kpiInProgress / kpiTotal) * 100}%`,
                    background: "var(--blue)",
                    borderRadius: 0,
                  }}
                />
                <i
                  style={{
                    width: `${(kpiSubmitted / kpiTotal) * 100}%`,
                    background: "var(--amber)",
                    borderRadius: 0,
                  }}
                />
                <i
                  style={{
                    width: `${(kpiValidated / kpiTotal) * 100}%`,
                    background: "var(--green)",
                    borderRadius: 0,
                  }}
                />
              </>
            ) : null}
          </div>
          <div className="row wrap" style={{ gap: 16, marginTop: 12 }}>
            {[
              { color: "var(--blue)", label: "En cours" },
              { color: "var(--amber)", label: "Soumis" },
              { color: "var(--green)", label: "Validés" },
            ].map((item) => (
              <div key={item.label} className="row small" style={{ gap: 6 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: item.color,
                  }}
                />
                {item.label}
              </div>
            ))}
          </div>
        </Tile>

        <Tile>
          <p className="small" style={{ fontWeight: 600, marginBottom: 12 }}>
            Répartition
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { label: "En cours", value: kpiInProgress, total: kpiTotal },
              { label: "Soumis", value: kpiSubmitted, total: kpiTotal },
              { label: "Validés", value: kpiValidated, total: kpiTotal },
            ].map((item) => (
              <div key={item.label} className="row between small">
                <span>{item.label}</span>
                <span style={{ fontWeight: 700, color: "var(--ink)" }}>
                  {item.total > 0
                    ? `${Math.round((item.value / item.total) * 100)}%`
                    : "—"}
                </span>
              </div>
            ))}
          </div>
        </Tile>
      </div>

      {(campaign.targetDepartments ?? []).length > 0 && (
        <Tile>
          <p className="small" style={{ fontWeight: 600, marginBottom: 12 }}>
            Départements ciblés
          </p>
          <div className="row wrap" style={{ gap: 8 }}>
            {campaign.targetDepartments!.map((dept) => (
              <span key={dept} className="badge grey">
                {dept}
              </span>
            ))}
          </div>
        </Tile>
      )}
    </div>
  );
}
