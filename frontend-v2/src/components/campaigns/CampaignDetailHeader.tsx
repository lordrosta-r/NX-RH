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
  onDeleteClick: () => void;
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
  onDeleteClick,
}: CampaignDetailHeaderProps) {
  const [actionsOpen, setActionsOpen] = useState(false);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 mb-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900 truncate">
              {campaign.name}
            </h1>
            <StatusBadge status={campaign.status} />
          </div>
          <p className="text-sm text-slate-500">
            {formatDate(campaign.startDate)} – {formatDate(campaign.endDate)}
            {campaign.createdAt &&
              ` · Créée le ${formatDate(campaign.createdAt)}`}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
          {isAdminOrHr && campaign.status === "draft" && (
            <button
              onClick={onActivate}
              disabled={isActivating}
              className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {isActivating ? "Activation…" : "Activer la campagne"}
            </button>
          )}
          {isAdminOrHr && campaign.status === "active" && (
            <button
              onClick={onClose}
              disabled={isClosing}
              className="border border-slate-200 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {isClosing ? "Clôture…" : "Clôturer la campagne"}
            </button>
          )}
          {isAdminOrHr && campaign.status === "closed" && (
            <button
              onClick={onArchive}
              disabled={isArchiving}
              className="border border-slate-200 hover:bg-slate-50 text-slate-500 px-4 py-2 rounded-lg text-xs font-medium disabled:opacity-50"
            >
              {isArchiving ? "Archivage…" : "Archiver"}
            </button>
          )}
          {isAdminOrHr &&
            campaign.status !== "closed" &&
            campaign.status !== "archived" && (
              <Link
                to={`/campaigns/${id}/edit`}
                className="border border-slate-200 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-medium"
              >
                Modifier
              </Link>
            )}

          <div className="relative">
            <button
              onClick={() => setActionsOpen((o) => !o)}
              className="p-2 hover:bg-slate-50 rounded-lg border border-slate-200"
              aria-label="Actions"
            >
              <MoreVertical className="w-4 h-4 text-slate-500" />
            </button>
            {actionsOpen && (
              <div
                className="absolute right-0 top-10 bg-white rounded-xl shadow-lg border border-slate-100 w-48 z-10"
                onMouseLeave={() => setActionsOpen(false)}
              >
                <button
                  onClick={() => {
                    onCloneClick();
                    setActionsOpen(false);
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 w-full text-left"
                >
                  <Copy className="w-4 h-4" /> Cloner
                </button>
                <Link
                  to={`/campaigns/${id}/analytics`}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                  onClick={() => setActionsOpen(false)}
                >
                  <BarChart2 className="w-4 h-4" /> Voir les analytics
                </Link>
                {isAdminOrHr &&
                  (campaign.status === "draft" ||
                    campaign.status === "archived") && (
                    <button
                      onClick={() => {
                        onDeleteClick();
                        setActionsOpen(false);
                      }}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-error-600 hover:bg-error-50 w-full text-left border-t border-slate-100"
                    >
                      <Trash2 className="w-4 h-4" /> Supprimer
                    </button>
                  )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
