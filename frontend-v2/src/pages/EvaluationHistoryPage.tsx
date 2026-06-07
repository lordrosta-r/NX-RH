import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { History, Download } from "lucide-react";
import { evaluationsApi } from "../api/evaluations";
import { getCampaignName } from "../types";
import { PageHead, Tile, Badge, Bar } from "../components/shell";
import Breadcrumbs from "../components/ui/Breadcrumbs";

type Tone = "blue" | "green" | "amber" | "red" | "grey";

const EVAL_STATUS_CONFIG: Record<string, { label: string; tone: Tone }> = {
  assigned: { label: "Assignée", tone: "grey" },
  in_progress: { label: "En cours", tone: "blue" },
  submitted: { label: "Soumise", tone: "amber" },
  reviewed: { label: "Révisée", tone: "blue" },
  signed_evaluatee: { label: "Signée (évalué)", tone: "blue" },
  signed_manager: { label: "Signée (resp.)", tone: "blue" },
  signed_hr: { label: "Signée (RH)", tone: "blue" },
  validated: { label: "Validée ✓", tone: "green" },
  expired: { label: "Expirée", tone: "red" },
  archived: { label: "Archivée", tone: "grey" },
};

const GRID_COLS = "2fr 1.2fr 1.4fr 1.2fr 200px";

export default function EvaluationHistoryPage() {
  const [yearFilter, setYearFilter] = useState("");
  const [campaignFilter, setCampaignFilter] = useState("");

  const { data: evaluations = [], isLoading } = useQuery({
    queryKey: ["evaluations-history"],
    queryFn: () => evaluationsApi.getHistory().then((r) => r.data),
  });

  const years = [
    ...new Set(
      evaluations.map((e) => e.createdAt?.slice(0, 4)).filter(Boolean),
    ),
  ]
    .sort()
    .reverse() as string[];

  const filteredEvaluations = evaluations.filter((ev) => {
    if (yearFilter && ev.createdAt?.slice(0, 4) !== yearFilter) return false;
    if (campaignFilter && ev.campaign?.name !== campaignFilter) return false;
    return true;
  });

  return (
    <div className="nx-app">
      <Breadcrumbs
        items={[
          { label: "Accueil", href: "/" },
          { label: "Évaluations", href: "/evaluations" },
          { label: "Historique" },
        ]}
      />

      <PageHead
        title="Mon historique d'entretiens"
        actions={
          <>
            <div className="field" style={{ minWidth: 200 }}>
              <select
                aria-label="Filtrer par année"
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="input"
              >
                <option value="">Toutes les années</option>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div className="field" style={{ minWidth: 240 }}>
              <select
                aria-label="Filtrer par campagne"
                value={campaignFilter}
                onChange={(e) => setCampaignFilter(e.target.value)}
                className="input"
              >
                <option value="">Toutes les campagnes</option>
                {[
                  ...new Set(
                    evaluations.map((e) => e.campaign?.name).filter(Boolean),
                  ),
                ].map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </>
        }
      />

      <Tile style={{ padding: 0, overflow: "hidden" }}>
        {isLoading ? (
          <div className="small" style={{ padding: 40, textAlign: "center" }}>
            Chargement…
          </div>
        ) : filteredEvaluations.length === 0 ? (
          <div style={{ textAlign: "center", padding: "64px 16px" }}>
            <History
              className="ico"
              style={{
                width: 48,
                height: 48,
                color: "var(--line)",
                margin: "0 auto 12px",
              }}
            />
            <p className="body" style={{ fontWeight: 600 }}>
              Aucun entretien terminé pour l'instant.
            </p>
            <p className="small" style={{ marginTop: 4 }}>
              Vos évaluations validées apparaîtront ici.
            </p>
          </div>
        ) : (
          <>
            <div
              className="tbl-head"
              style={{ gridTemplateColumns: GRID_COLS }}
            >
              <div>Campagne</div>
              <div>Statut</div>
              <div>Score</div>
              <div>Validée le</div>
              <div />
            </div>
            {filteredEvaluations.map((ev) => {
              const cfg = EVAL_STATUS_CONFIG[ev.status];
              return (
                <div
                  key={ev.id}
                  className="tbl-row"
                  style={{ gridTemplateColumns: GRID_COLS }}
                >
                  <div style={{ minWidth: 0 }}>
                    <Link
                      to={`/evaluations/${ev.id}`}
                      className="link"
                      style={{ fontWeight: 600 }}
                    >
                      {ev.campaign?.name ?? getCampaignName(ev.campaignId)}
                    </Link>
                    <p className="small truncate" style={{ marginTop: 2 }}>
                      {ev.form?.title ?? ev.formId}
                    </p>
                  </div>
                  <div>
                    <Badge tone={cfg?.tone ?? "grey"} dot>
                      {cfg?.label ?? ev.status}
                    </Badge>
                  </div>
                  <div className="row" style={{ gap: 8, alignItems: "center" }}>
                    {ev.reviewerScore !== undefined ? (
                      <>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Bar
                            pct={ev.reviewerScore}
                            tone="var(--blue)"
                            height={6}
                          />
                        </div>
                        <span
                          className="small"
                          style={{ width: 52, textAlign: "right" }}
                        >
                          {ev.reviewerScore}/100
                        </span>
                      </>
                    ) : (
                      <span className="small">—</span>
                    )}
                  </div>
                  <div className="small">
                    {ev.signedByHrAt
                      ? new Date(ev.signedByHrAt).toLocaleDateString("fr-FR")
                      : "—"}
                  </div>
                  <div
                    className="row"
                    style={{ gap: 8, justifyContent: "flex-end" }}
                  >
                    <Link to={`/evaluations/${ev.id}`} className="link small">
                      Voir le compte-rendu
                    </Link>
                    <button
                      onClick={() =>
                        window.open(`/api/evaluations/${ev.id}/pdf`, "_blank")
                      }
                      className="btn btn-ghost btn-sm"
                      style={{ padding: 6 }}
                      aria-label="Télécharger le PDF"
                    >
                      <Download
                        className="ico"
                        style={{ width: 16, height: 16 }}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </Tile>
    </div>
  );
}
