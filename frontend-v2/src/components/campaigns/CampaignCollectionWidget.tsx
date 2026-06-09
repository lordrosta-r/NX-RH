import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Inbox, ArrowRight } from "lucide-react";
import { campaignsApi } from "../../api/campaigns";
import { Tile, Badge } from "../shell";

/**
 * Widget RH/Admin : campagnes brouillon avec une collecte de formulaires en cours.
 * Met en avant les formulaires « Soumis » (décisions à prendre par la RH).
 * Ne s'affiche pas s'il n'y a aucune collecte en cours.
 */
export default function CampaignCollectionWidget() {
  const { t } = useTranslation();

  const { data = [], isLoading } = useQuery({
    queryKey: ["form-collection-overview"],
    queryFn: () =>
      campaignsApi.getFormRequestsOverview().then((r) => r.data.data),
    refetchOnMount: "always",
  });

  if (isLoading || data.length === 0) return null;

  return (
    <Tile className="mb-6" data-testid="dash-form-collection">
      <div
        className="row between"
        style={{ marginBottom: 16, alignItems: "center" }}
      >
        <h2 className="h2" style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Inbox size={18} strokeWidth={1.5} aria-hidden="true" />
          {t("dashShared.formCollection.title")}
        </h2>
      </div>

      <div className="section-gap" style={{ gap: 10 }}>
        {data.map((c) => (
          <Link
            key={c.campaignId}
            to={`/campaigns/${c.campaignId}`}
            className="tbl-row row between"
            style={{
              gridTemplateColumns: undefined,
              display: "flex",
              alignItems: "center",
              color: "inherit",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <p
                className="body truncate"
                style={{ fontWeight: 600, color: "var(--ink)" }}
              >
                {c.campaignName}
              </p>
              <div className="row" style={{ gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                {c.submitted > 0 && (
                  <Badge tone="blue">
                    {t("dashShared.formCollection.toDecide", {
                      count: c.submitted,
                    })}
                  </Badge>
                )}
                {c.pending > 0 && (
                  <Badge tone="grey">
                    {t("dashShared.formCollection.pending", {
                      count: c.pending,
                    })}
                  </Badge>
                )}
                {c.accepted > 0 && (
                  <Badge tone="green">
                    {t("dashShared.formCollection.accepted", {
                      count: c.accepted,
                    })}
                  </Badge>
                )}
              </div>
            </div>
            <ArrowRight
              size={16}
              strokeWidth={1.5}
              aria-hidden="true"
              style={{ color: "var(--ink-3)", flex: "none" }}
            />
          </Link>
        ))}
      </div>
    </Tile>
  );
}
