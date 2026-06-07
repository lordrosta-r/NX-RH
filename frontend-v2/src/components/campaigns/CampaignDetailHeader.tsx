import { useState } from "react";
import { Link } from "react-router-dom";
import { BarChart2, Copy, Trash2, MoreVertical } from "lucide-react";
import { StatusBadge } from "../ui/StatusBadge";
import { formatDate } from "../../utils/formatDate";
import type { Campaign } from "../../types";

interface CampaignDetailHeaderProps {
  campaign: Campaign;
  id: string;
  isAdminOrHr: boolean;
  isActivating: boolean;
  isClosing: boolean;
  isArchiving: boolean;
  onActivate: () => void;
  onClose: () => void;
  onArchive: () => void;
  onCloneClick: () => void;
  onDelete: () => void;
}

export default function CampaignDetailHeader({
  campaign,
  id,
  isAdminOrHr,
  isActivating,
  isClosing,
  isArchiving,
  onActivate,
  onClose,
  onArchive,
  onCloneClick,
  onDelete,
}: CampaignDetailHeaderProps) {
  const [actionsOpen, setActionsOpen] = useState(false);

  return (
    <div
      className="tile"
      style={{
        marginBottom: 24,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 8,
            flexWrap: "wrap",
          }}
        >
          <h1 className="h1" style={{ minWidth: 0 }}>
            {campaign.name}
          </h1>
          <StatusBadge status={campaign.status} />
        </div>
        <p className="small">
          {formatDate(campaign.startDate)} – {formatDate(campaign.endDate)}
          {campaign.createdAt &&
            ` · Créée le ${formatDate(campaign.createdAt)}`}
        </p>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexShrink: 0,
          flexWrap: "wrap",
          justifyContent: "flex-end",
        }}
      >
        {isAdminOrHr && campaign.status === "draft" && (
          <button
            onClick={onActivate}
            disabled={isActivating}
            className="btn btn-primary btn-sm"
          >
            {isActivating ? "Activation…" : "Activer la campagne"}
          </button>
        )}
        {isAdminOrHr && campaign.status === "active" && (
          <button
            onClick={onClose}
            disabled={isClosing}
            className="btn btn-ghost btn-sm"
          >
            {isClosing ? "Clôture…" : "Clôturer la campagne"}
          </button>
        )}
        {isAdminOrHr && campaign.status === "closed" && (
          <button
            onClick={onArchive}
            disabled={isArchiving}
            className="btn btn-ghost btn-sm"
          >
            {isArchiving ? "Archivage…" : "Archiver"}
          </button>
        )}
        {isAdminOrHr &&
          campaign.status !== "closed" &&
          campaign.status !== "archived" && (
            <Link to={`/campaigns/${id}/edit`} className="btn btn-ghost btn-sm">
              Modifier
            </Link>
          )}

        <div style={{ position: "relative" }}>
          <button
            onClick={() => setActionsOpen((o) => !o)}
            className="btn btn-ghost btn-sm"
            style={{ padding: 9 }}
            aria-label="Actions"
          >
            <MoreVertical className="ico" aria-hidden="true" />
          </button>
          {actionsOpen && (
            <div
              className="tile"
              style={{
                position: "absolute",
                right: 0,
                top: 44,
                width: 200,
                padding: 4,
                zIndex: 10,
                boxShadow: "var(--shadow-lg)",
              }}
              onMouseLeave={() => setActionsOpen(false)}
            >
              <button
                onClick={() => {
                  onCloneClick();
                  setActionsOpen(false);
                }}
                className="btn btn-ghost btn-sm btn-block"
                style={{ justifyContent: "flex-start", border: "none" }}
              >
                <Copy className="ico" aria-hidden="true" /> Cloner
              </button>
              <Link
                to={`/campaigns/${id}/analytics`}
                className="btn btn-ghost btn-sm btn-block"
                style={{ justifyContent: "flex-start", border: "none" }}
                onClick={() => setActionsOpen(false)}
              >
                <BarChart2 className="ico" aria-hidden="true" /> Voir les
                analytics
              </Link>
              {isAdminOrHr &&
                (campaign.status === "draft" ||
                  campaign.status === "archived") && (
                  <button
                    onClick={() => {
                      onDelete();
                      setActionsOpen(false);
                    }}
                    className="btn btn-ghost btn-sm btn-block"
                    style={{
                      justifyContent: "flex-start",
                      border: "none",
                      borderTop: "1px solid var(--line)",
                      color: "var(--red)",
                    }}
                  >
                    <Trash2 className="ico" aria-hidden="true" /> Supprimer
                  </button>
                )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
