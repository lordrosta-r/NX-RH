import { Link } from "react-router-dom";
import {
  AlertCircle,
  Inbox,
  UserX,
  PlayCircle,
  PlusCircle,
  UserPlus,
  Upload,
  SlidersHorizontal,
  Rocket,
  Circle,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import { useDashboardAdmin } from "../hooks/useDashboard";
import { useSetupChecklist } from "../hooks/useSetupChecklist";
import { adminApi } from "../api/admin";
import type { Campaign } from "../types";
import {
  PageHead,
  Tile,
  StatTile,
  Badge,
  Callout,
  Bar,
} from "../components/shell";

// Libellés lisibles pour les actions du journal d'audit.
const AUDIT_ACTION_LABELS: Record<string, string> = {
  login: "Connexion",
  login_failed: "Échec de connexion",
  logout: "Déconnexion",
  user_created: "Utilisateur créé",
  user_updated: "Utilisateur modifié",
  user_deleted: "Utilisateur supprimé",
  campaign_created: "Campagne créée",
  campaign_updated: "Campagne modifiée",
  evaluation_submitted: "Évaluation soumise",
  evaluation_signed: "Évaluation signée",
  ldap_sync: "Synchronisation LDAP",
};

// ─── Widget de complétude de la configuration (onboarding admin) ───────────────

function SetupCompletenessCard() {
  const { steps, completed, total, percent, isLoading, allDone } =
    useSetupChecklist();
  if (isLoading || allDone) return null;

  const nextSteps = steps.filter((s) => !s.done).slice(0, 3);

  return (
    <Tile className="mb-6">
      <div className="row between" style={{ marginBottom: 12 }}>
        <div className="row" style={{ gap: 10 }}>
          <Rocket
            className="ico"
            style={{ width: 20, height: 20, color: "var(--blue)" }}
          />
          <h2 className="h2">Configuration de l&apos;application</h2>
        </div>
        <Link to="/admin/setup" className="link small">
          Tout voir →
        </Link>
      </div>
      <div className="row" style={{ gap: 12, marginBottom: 10 }}>
        <span style={{ fontSize: 28, fontWeight: 800, color: "var(--ink)" }}>
          {percent}%
        </span>
        <span className="small">
          {completed}/{total} étapes complètes
        </span>
      </div>
      <div style={{ marginBottom: 16 }}>
        <Bar pct={percent} />
      </div>
      <ul
        className="section-gap"
        style={{ listStyle: "none", margin: 0, padding: 0, gap: 10 }}
      >
        {nextSteps.map((step) => (
          <li key={step.id}>
            <Link
              to={step.actionHref}
              className="row between"
              style={{
                gap: 12,
                padding: "12px 14px",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius)",
                color: "inherit",
              }}
            >
              <span
                className="row"
                style={{
                  gap: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--ink-2)",
                }}
              >
                <Circle
                  className="ico"
                  style={{ width: 16, height: 16, color: "var(--line-strong)" }}
                />
                {step.title}
              </span>
              <span className="link small" style={{ flex: "none" }}>
                {step.actionLabel}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Tile>
  );
}

// ─── StatusBadge campagne ──────────────────────────────────────────────────────

const statusLabels: Record<string, string> = {
  draft: "Brouillon",
  active: "Active",
  closed: "Clôturée",
  archived: "Archivée",
};

type Tone = "blue" | "green" | "amber" | "red" | "grey";
const statusTone: Record<string, Tone> = {
  draft: "grey",
  active: "green",
  closed: "grey",
  archived: "grey",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge tone={statusTone[status] ?? "grey"}>
      {statusLabels[status] ?? status}
    </Badge>
  );
}

// ─── Liste des campagnes ───────────────────────────────────────────────────────

function CampaignList({
  campaigns,
  isLoading,
}: {
  campaigns: Campaign[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="section-gap" style={{ gap: 12 }}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <p className="small text-center" style={{ padding: "24px 0" }}>
        Aucune campagne active
      </p>
    );
  }

  return (
    <div className="section-gap" style={{ gap: 12 }}>
      {campaigns.map((row) => (
        <div
          key={row.id}
          className="row between wrap"
          style={{
            gap: 12,
            padding: "14px 16px",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius)",
          }}
        >
          <Link
            to={`/campaigns/${row.id}`}
            className="link"
            style={{ fontSize: 15, fontWeight: 700, flex: 1, minWidth: 0 }}
          >
            {row.name}
          </Link>
          <StatusBadge status={row.status} />
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardAdminPage() {
  const { user } = useAuth();
  const { campaigns, evaluations, users } = useDashboardAdmin();

  const { data: pendingFlagsCount } = useQuery({
    queryKey: ["hr-flags-pending-count"],
    queryFn: () =>
      adminApi
        .getFlags({ status: "pending" })
        .then((r) => (r.data as { total?: number })?.total ?? 0),
  });

  // Journal d'audit — 5 dernières entrées réelles.
  const { data: auditRecent, isLoading: auditLoading } = useQuery({
    queryKey: ["admin-audit-recent"],
    queryFn: () =>
      adminApi.getAuditLog({ limit: 5 }).then((r) => r.data?.data ?? []),
  });

  const isLoading =
    campaigns.isLoading || evaluations.isLoading || users.isLoading;
  const isError = campaigns.isError || evaluations.isError || users.isError;

  if (isLoading) {
    return (
      <div className="nx-app">
        <div className="h-8 w-64 bg-slate-200 rounded animate-pulse mb-8" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-28 bg-slate-200 rounded-xl animate-pulse"
            />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 h-64 bg-slate-200 rounded-xl animate-pulse" />
          <div className="lg:col-span-4 h-64 bg-slate-200 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (isError) {
    const refetch = () => {
      campaigns.refetch();
      evaluations.refetch();
      users.refetch();
    };
    return (
      <div className="nx-app">
        <Callout tone="red">
          <p className="body" style={{ color: "var(--ink)" }}>
            Impossible de charger les données du tableau de bord.
          </p>
          <button
            onClick={refetch}
            className="link small"
            style={{ marginTop: 8 }}
          >
            Réessayer
          </button>
        </Callout>
      </div>
    );
  }

  const totalUsers = users.data?.data?.total ?? 0;
  const totalCampaigns = campaigns.data?.data?.total ?? 0;
  const totalEvals = evaluations.data?.data?.total ?? 0;
  const campaignList = campaigns.data?.data?.data ?? [];

  return (
    <div className="nx-app">
      <PageHead
        eyebrow="Administration"
        title={`Tableau de bord — Bonjour, ${user?.firstName ?? "…"}`}
        desc="État de la plateforme et activité système."
        actions={
          <button disabled className="btn btn-ghost">
            Exporter PDF
          </button>
        }
      />

      {/* Complétude de la configuration (masqué une fois 100%) */}
      <SetupCompletenessCard />

      {/* Actions requises */}
      <Tile className="mb-6">
        <div className="row" style={{ gap: 10, marginBottom: 16 }}>
          <AlertCircle
            className="ico"
            style={{ width: 20, height: 20, color: "var(--amber)" }}
          />
          <h2 className="h2">Actions requises</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            to="/hr/flags?status=pending"
            className="row between"
            style={{
              gap: 12,
              padding: "14px 16px",
              border: "1px solid var(--amber)",
              borderRadius: "var(--radius)",
              background: "var(--amber-soft)",
              color: "inherit",
            }}
          >
            <span className="row" style={{ gap: 12 }}>
              <Inbox
                className="ico"
                style={{ width: 18, height: 18, color: "var(--amber)" }}
              />
              <span
                style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}
              >
                Demandes RH en attente
              </span>
            </span>
            {pendingFlagsCount != null && pendingFlagsCount > 0 && (
              <span
                style={{
                  minWidth: 24,
                  height: 24,
                  padding: "0 7px",
                  borderRadius: 999,
                  background: "var(--amber)",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 800,
                  display: "grid",
                  placeItems: "center",
                  flex: "none",
                }}
              >
                {pendingFlagsCount}
              </span>
            )}
          </Link>
          <Link
            to="/users"
            className="row"
            style={{
              gap: 12,
              padding: "14px 16px",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius)",
              background: "var(--bg-alt)",
              color: "inherit",
            }}
          >
            <UserX
              className="ico"
              style={{ width: 18, height: 18, color: "var(--ink-3)" }}
            />
            <span
              style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}
            >
              Utilisateurs sans manager
            </span>
          </Link>
          <Link
            to="/campaigns?status=active"
            className="row"
            style={{
              gap: 12,
              padding: "14px 16px",
              border: "1px solid var(--blue-soft-2)",
              borderRadius: "var(--radius)",
              background: "var(--blue-soft)",
              color: "inherit",
            }}
          >
            <PlayCircle
              className="ico"
              style={{ width: 18, height: 18, color: "var(--blue)" }}
            />
            <span
              style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}
            >
              Campagnes actives
            </span>
          </Link>
        </div>
      </Tile>

      {/* Raccourcis */}
      <Tile className="mb-6">
        <h2 className="h2" style={{ marginBottom: 16 }}>
          Raccourcis
        </h2>
        <div className="row wrap" style={{ gap: 12 }}>
          <Link to="/campaigns/new" className="btn btn-primary">
            <PlusCircle className="ico" style={{ width: 18, height: 18 }} />{" "}
            Nouvelle campagne
          </Link>
          <Link to="/users/new" className="btn btn-ghost">
            <UserPlus className="ico" style={{ width: 18, height: 18 }} />{" "}
            Ajouter un utilisateur
          </Link>
          <Link to="/admin/users/import" className="btn btn-ghost">
            <Upload className="ico" style={{ width: 18, height: 18 }} />{" "}
            Importer CSV
          </Link>
          <Link to="/admin/settings" className="btn btn-ghost">
            <SlidersHorizontal
              className="ico"
              style={{ width: 18, height: 18 }}
            />{" "}
            Paramètres RH
          </Link>
        </div>
      </Tile>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatTile
          value={totalUsers}
          label="Utilisateurs actifs"
          tone="var(--blue)"
        />
        <StatTile
          value={totalCampaigns}
          label="Campagnes actives"
          tone="var(--green)"
        />
        <StatTile
          value={totalEvals}
          label="Évaluations non finalisées"
          tone="var(--amber)"
        />
      </div>

      {/* Campagnes + actions urgentes */}
      <div className="grid grid-cols-12 gap-6 mb-6">
        <div className="col-span-12 lg:col-span-8">
          <Tile style={{ height: "100%" }}>
            <div className="row between" style={{ marginBottom: 16 }}>
              <h2 className="h2">Campagnes actives</h2>
              <Link to="/campaigns" className="link small">
                Voir toutes →
              </Link>
            </div>
            <CampaignList
              campaigns={campaignList}
              isLoading={campaigns.isLoading}
            />
          </Tile>
        </div>

        <div className="col-span-12 lg:col-span-4">
          <Tile style={{ height: "100%" }}>
            <h2 className="h2" style={{ marginBottom: 16 }}>
              Actions urgentes
            </h2>
            <div className="section-gap" style={{ gap: 12 }}>
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
                      Évaluations expirées
                    </p>
                    <Link to="/evaluations" className="link small">
                      Voir les évaluations →
                    </Link>
                  </div>
                </div>
              </Callout>
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
                      Évaluations à signer côté RH
                    </p>
                    <Link to="/hr/flags" className="link small">
                      Voir les alertes RH →
                    </Link>
                  </div>
                </div>
              </Callout>
            </div>
          </Tile>
        </div>
      </div>

      {/* Activité récente */}
      <Tile>
        <div className="row between" style={{ marginBottom: 16 }}>
          <h2 className="h2">Activité récente</h2>
          <Link to="/admin/audit" className="link small">
            Voir le journal complet →
          </Link>
        </div>
        {auditLoading ? (
          <div className="section-gap" style={{ gap: 10 }}>
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-10 bg-slate-100 rounded animate-pulse"
              />
            ))}
          </div>
        ) : (auditRecent?.length ?? 0) === 0 ? (
          <p className="small text-center" style={{ padding: "24px 0" }}>
            Aucune activité récente
          </p>
        ) : (
          <div>
            {auditRecent!.map((a, i) => (
              <div
                key={a.id}
                className="row between wrap"
                style={{
                  gap: 12,
                  padding: "12px 0",
                  borderTop: i ? "1px solid var(--line)" : "none",
                }}
              >
                <div className="row" style={{ gap: 12, minWidth: 0 }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: a.action.includes("failed")
                        ? "var(--red)"
                        : "var(--blue)",
                      flex: "none",
                    }}
                  />
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "var(--ink)",
                    }}
                  >
                    {AUDIT_ACTION_LABELS[a.action] ?? a.action}
                    {(a.actorName || a.actorEmail) && (
                      <span className="small" style={{ fontWeight: 400 }}>
                        {" "}
                        · {a.actorName ?? a.actorEmail}
                      </span>
                    )}
                  </span>
                </div>
                <span className="small" style={{ flex: "none" }}>
                  {new Date(a.createdAt).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
      </Tile>
    </div>
  );
}
