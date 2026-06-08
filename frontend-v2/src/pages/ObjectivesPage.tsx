import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Target, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { interviewsApi } from "../api/interviews";
import type { TeamObjectivesRow } from "../api/interviews";
import { PageHead, Tile, Badge } from "../components/shell";
import Breadcrumbs from "../components/ui/Breadcrumbs";
import PageGuide from "../components/shared/PageGuide";

const REVIEW_TONE: Record<string, "green" | "amber" | "red" | "grey"> = {
  achieved: "green",
  partial: "amber",
  not_achieved: "red",
};
const REVIEW_ICON: Record<string, typeof CheckCircle2> = {
  achieved: CheckCircle2,
  partial: AlertTriangle,
  not_achieved: XCircle,
};

function fullName(u: TeamObjectivesRow["evaluatee"]): string {
  if (!u) return "—";
  return `${u.firstName} ${u.lastName}`.trim();
}

export default function ObjectivesPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ["team-objectives"],
    refetchOnMount: "always",
    queryFn: () => interviewsApi.getTeamObjectives().then((r) => r.data.data),
  });

  const rows: TeamObjectivesRow[] = data ?? [];
  const withObjectives = rows.filter(
    (r) => r.nextYearObjectives.length > 0 || r.objectivesReview.length > 0,
  );

  return (
    <div className="nx-app">
      <Breadcrumbs
        items={[
          { label: t("common.home"), href: "/" },
          { label: t("objectives.title") },
        ]}
      />

      <PageGuide
        id="objectives"
        title={t("objectives.guide.title")}
        steps={t("objectives.guide.steps", { returnObjects: true }) as string[]}
        color="blue"
      />

      <PageHead title={t("objectives.title")} desc={t("objectives.desc")} />

      {isLoading ? (
        <Tile>
          <p className="small">{t("common.loading")}</p>
        </Tile>
      ) : withObjectives.length === 0 ? (
        <Tile>
          <div className="row" style={{ gap: 10, alignItems: "center" }}>
            <Target size={18} strokeWidth={1.5} />
            <p className="small">{t("objectives.empty")}</p>
          </div>
        </Tile>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {withObjectives.map((row, i) => (
            <Tile key={row.evaluatee?._id ?? i}>
              <div
                className="row between wrap"
                style={{ gap: 8, marginBottom: 12, alignItems: "baseline" }}
              >
                <h3 className="h3" style={{ margin: 0 }}>
                  {fullName(row.evaluatee)}
                </h3>
                {row.campaign?.name && (
                  <span className="small" style={{ color: "var(--ink-3)" }}>
                    {row.campaign.name}
                  </span>
                )}
              </div>

              {row.nextYearObjectives.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <p className="label" style={{ marginBottom: 6 }}>
                    {t("objectives.nextYear")}
                  </p>
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    {row.nextYearObjectives.map((o, j) => (
                      <li key={j} className="body" style={{ marginBottom: 4 }}>
                        {o}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {row.objectivesReview.length > 0 && (
                <div>
                  <p className="label" style={{ marginBottom: 6 }}>
                    {t("objectives.review")}
                  </p>
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 6 }}
                  >
                    {row.objectivesReview.map((o, j) => {
                      const Icon = REVIEW_ICON[o.status ?? ""] ?? Target;
                      return (
                        <div
                          key={j}
                          className="row"
                          style={{ gap: 8, alignItems: "center" }}
                        >
                          <Icon size={14} strokeWidth={1.5} />
                          <span className="body">{o.label || "—"}</span>
                          {o.status && (
                            <Badge tone={REVIEW_TONE[o.status] ?? "grey"}>
                              {t(`objectives.status.${o.status}`)}
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </Tile>
          ))}
        </div>
      )}
    </div>
  );
}
