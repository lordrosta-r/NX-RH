import { useState, useRef, useEffect } from "react";
import { useDebounce } from "../hooks/useDebounce";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BarChart2, Search, Plus, MoreVertical, Download } from "lucide-react";
import EmptyState from "../components/ui/EmptyState";
import { useAuth } from "../contexts/AuthContext";
import { useConfirm } from "../contexts/ConfirmContext";
import { campaignsApi } from "../api/campaigns";
import { toast } from "../hooks/useToast";
import type { Campaign } from "../types";
import PageGuide from "../components/shared/PageGuide";
import Breadcrumbs from "../components/ui/Breadcrumbs";
import { exportToCsv } from "../utils/export";
import { queryKeys } from "../lib/queryKeys";
import { useTranslation } from "react-i18next";
import { PageHead, Tile, Badge, Bar } from "../components/shell";

const STATUS_TABS = ["all", "draft", "active", "closed", "archived"] as const;

const STATUS_TONE: Record<string, "blue" | "green" | "amber" | "red" | "grey"> =
  {
    draft: "grey",
    active: "green",
    closed: "grey",
    archived: "grey",
  };

function formatDateRange(start: string, end: string) {
  const s = new Date(start).toLocaleDateString("fr-FR", {
    month: "short",
    year: "numeric",
  });
  const e = new Date(end).toLocaleDateString("fr-FR", {
    month: "short",
    year: "numeric",
  });
  return `${s} – ${e}`;
}

/** Backend returns `_id` from lean() queries — this helper normalises to a string id */
const cid = (c: Campaign): string => c.id ?? c._id ?? "";

function StatusBadge({ status, label }: { status: string; label: string }) {
  return (
    <Badge tone={STATUS_TONE[status] ?? "grey"} dot>
      {label}
    </Badge>
  );
}

function ActionMenu({
  campaign,
  canManage,
  onClone,
  onArchive,
  onDelete,
  labels,
}: {
  campaign: Campaign;
  canManage: boolean;
  onClone: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  labels: {
    view: string;
    edit: string;
    clone: string;
    archive: string;
    delete: string;
  };
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  if (!canManage) return null;

  const canArchive =
    campaign.status === "active" || campaign.status === "closed";
  const canDelete =
    campaign.status === "draft" || campaign.status === "archived";

  const itemStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    width: "100%",
    padding: "9px 14px",
    fontSize: 14,
    color: "var(--ink)",
    textAlign: "left",
    background: "none",
    border: "none",
    cursor: "pointer",
  };

  return (
    <div style={{ position: "relative" }} ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Actions campagne"
        className="btn btn-ghost btn-sm"
        style={{ padding: 6 }}
      >
        <MoreVertical className="ico" style={{ width: 16, height: 16 }} />
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 36,
            zIndex: 20,
            background: "#fff",
            borderRadius: "var(--radius)",
            border: "1px solid var(--line)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            width: 176,
            padding: "6px 0",
          }}
        >
          <Link
            to={`/campaigns/${cid(campaign)}`}
            style={itemStyle}
            onClick={() => setOpen(false)}
          >
            {labels.view}
          </Link>
          <Link
            to={`/campaigns/${cid(campaign)}/edit`}
            style={itemStyle}
            onClick={() => setOpen(false)}
          >
            {labels.edit}
          </Link>
          <button
            style={itemStyle}
            onClick={() => {
              onClone(cid(campaign));
              setOpen(false);
            }}
          >
            {labels.clone}
          </button>
          {canArchive && (
            <button
              style={itemStyle}
              onClick={() => {
                onArchive(cid(campaign));
                setOpen(false);
              }}
            >
              {labels.archive}
            </button>
          )}
          {canDelete && (
            <button
              style={{ ...itemStyle, color: "var(--red)" }}
              onClick={() => {
                onDelete(cid(campaign));
                setOpen(false);
              }}
            >
              {labels.delete}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function CampaignsPage() {
  const { t } = useTranslation();
  const [statusTab, setStatusTab] = useState("all");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const { user } = useAuth();
  const confirm = useConfirm();
  const queryClient = useQueryClient();

  const canManage = user?.role === "admin" || user?.role === "hr";
  const isSearching = search !== debouncedSearch;

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.campaigns.list({
      status: statusTab,
      q: debouncedSearch,
    }),
    queryFn: () =>
      campaignsApi
        .getCampaigns({
          status: statusTab === "all" ? undefined : statusTab,
          q: debouncedSearch || undefined,
          limit: 50,
        })
        .then((r) => r.data),
  });

  const cloneMutation = useMutation({
    mutationFn: (id: string) => campaignsApi.cloneCampaign(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.lists() }),
    onError: () => toast.error("Erreur lors du clonage", "Veuillez réessayer."),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => campaignsApi.archiveCampaign(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.lists() }),
    onError: () =>
      toast.error("Erreur lors de l'archivage", "Veuillez réessayer."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => campaignsApi.deleteCampaign(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.lists() }),
    onError: () =>
      toast.error("Erreur lors de la suppression", "Veuillez réessayer."),
  });

  const handleArchive = async (id: string) => {
    if (
      await confirm({
        title: "Archiver la campagne ?",
        description: "La campagne sera archivée (réversible).",
        variant: "warning",
        confirmLabel: "Archiver",
      })
    ) {
      archiveMutation.mutate(id);
    }
  };

  const handleDelete = async (id: string) => {
    if (
      await confirm({
        title: "Supprimer la campagne ?",
        description: "Cette action est irréversible.",
        variant: "danger",
        confirmLabel: "Supprimer",
      })
    ) {
      deleteMutation.mutate(id);
    }
  };

  const campaigns = data?.data ?? [];
  const isEmpty = !isLoading && campaigns.length === 0;

  const actionLabels = {
    view: t("campaigns.actions.view"),
    edit: t("campaigns.actions.edit"),
    clone: t("campaigns.actions.clone"),
    archive: t("campaigns.actions.archive"),
    delete: t("campaigns.actions.delete"),
  };

  const handleExport = () => {
    exportToCsv(
      "campagnes.csv",
      (campaigns ?? []).map((c) => ({
        nom: c.name,
        statut: c.status,
        dateDebut: c.startDate,
        dateFin: c.endDate,
      })),
    );
  };

  return (
    <div className="nx-app">
      <Breadcrumbs
        items={[
          { label: t("campaigns.home"), href: "/" },
          { label: t("campaigns.title") },
        ]}
      />

      <PageGuide
        id="campaigns"
        title={t("guides.campaigns.title")}
        color="blue"
        steps={t("guides.campaigns.steps", { returnObjects: true }) as string[]}
      />

      <PageHead
        title={t("campaigns.title")}
        actions={
          <>
            {canManage && (
              <button onClick={handleExport} className="btn btn-ghost">
                <Download className="ico" style={{ width: 18, height: 18 }} />{" "}
                {t("campaigns.export")}
              </button>
            )}
            {canManage && (
              <Link
                to="/campaigns/new"
                data-testid="new-campaign-button"
                className="btn btn-primary"
              >
                <Plus className="ico" style={{ width: 18, height: 18 }} />{" "}
                {t("campaigns.new")}
              </Link>
            )}
          </>
        }
      />

      <div data-testid="campaigns-list">
        <Tile style={{ padding: 0, overflow: "hidden" }}>
          {/* Status tabs */}
          <div
            className="row"
            style={{
              gap: 0,
              borderBottom: "1px solid var(--line)",
              padding: "0 16px",
              overflowX: "auto",
            }}
          >
            {STATUS_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusTab(tab)}
                className="small"
                style={{
                  padding: "12px 16px",
                  whiteSpace: "nowrap",
                  background: "none",
                  border: "none",
                  borderBottom:
                    statusTab === tab
                      ? "2px solid var(--blue)"
                      : "2px solid transparent",
                  color: statusTab === tab ? "var(--blue)" : "var(--ink-3)",
                  fontWeight: statusTab === tab ? 700 : 500,
                  cursor: "pointer",
                }}
              >
                {t(`campaigns.status.${tab}`)}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div
            style={{ padding: 16, borderBottom: "1px solid var(--line)" }}
            className="row"
          >
            <div style={{ position: "relative", maxWidth: 320, flex: 1 }}>
              <Search
                className="ico"
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 16,
                  height: 16,
                  color: "var(--ink-3)",
                }}
              />
              <input
                type="text"
                aria-label={t("campaigns.search")}
                placeholder={t("campaigns.search")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input"
                style={{ paddingLeft: 36 }}
              />
            </div>
            {isSearching && (
              <span className="small" style={{ marginLeft: 8 }}>
                …
              </span>
            )}
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="small" style={{ padding: 40, textAlign: "center" }}>
              {t("campaigns.loading")}
            </div>
          ) : isEmpty ? (
            <EmptyState
              icon={<BarChart2 className="w-8 h-8" />}
              title={t("campaigns.empty")}
              description={t("campaigns.emptyDescription")}
              action={
                canManage
                  ? {
                      label: t("campaigns.createFirst"),
                      onClick: () => window.location.assign("/campaigns/new"),
                    }
                  : undefined
              }
            />
          ) : (
            <>
              <div
                className="tbl-head"
                style={{
                  gridTemplateColumns: "2fr 1fr 1.2fr 1.4fr 48px",
                }}
              >
                <div>{t("campaigns.columns.name")}</div>
                <div>{t("campaigns.columns.status")}</div>
                <div>{t("campaigns.columns.period")}</div>
                <div>{t("campaigns.columns.progress")}</div>
                <div />
              </div>
              {campaigns.map((campaign) => {
                const progress = campaign.completionPct ?? 0;
                return (
                  <div
                    key={cid(campaign)}
                    className="tbl-row"
                    style={{
                      gridTemplateColumns: "2fr 1fr 1.2fr 1.4fr 48px",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <Link
                        to={`/campaigns/${cid(campaign)}`}
                        className="link"
                        style={{ fontWeight: 600 }}
                      >
                        {campaign.name}
                      </Link>
                      {campaign.description && (
                        <p className="small truncate" style={{ marginTop: 2 }}>
                          {campaign.description}
                        </p>
                      )}
                    </div>
                    <div>
                      <StatusBadge
                        status={campaign.status}
                        label={t(`campaigns.status.${campaign.status}`)}
                      />
                    </div>
                    <div className="small">
                      {formatDateRange(campaign.startDate, campaign.endDate)}
                    </div>
                    <div
                      className="row"
                      style={{ gap: 8, alignItems: "center" }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Bar pct={progress} tone="var(--blue)" height={6} />
                      </div>
                      <span
                        className="small"
                        style={{ width: 36, textAlign: "right" }}
                      >
                        {progress}%
                      </span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <ActionMenu
                        campaign={campaign}
                        canManage={canManage}
                        onClone={(id) => cloneMutation.mutate(id)}
                        onArchive={(id) => void handleArchive(id)}
                        onDelete={(id) => void handleDelete(id)}
                        labels={actionLabels}
                      />
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </Tile>
      </div>
    </div>
  );
}
