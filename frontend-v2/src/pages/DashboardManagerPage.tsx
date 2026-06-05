import { Link } from "react-router-dom";
import { ArrowRight, PenLine } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  useDashboardManager,
  useDashboardManagerStats,
} from "../hooks/useDashboardByRole";
import { eventsApi } from "../api/events";
import { campaignsApi } from "../api/campaigns";
import type {
  Evaluation,
  Campaign,
  EvaluationStatus,
  DashboardManagerStats,
} from "../types";
import { getCampaignName } from "../types";
import { PageHead, Tile, StatTile, Badge, Bar } from "../components/shell";

// ─── Helpers ──────────────────────────────────────────────────────────────────
type PopulatedUser = {
  _id?: string;
  firstName: string;
  lastName: string;
  department?: string;
};
function getDisplayName(id: string | PopulatedUser | undefined | null): string {
  if (!id) return "—";
  if (typeof id === "object") return `${id.firstName} ${id.lastName}`.trim();
  return id;
}
function getInitials(id: string | PopulatedUser | undefined | null): string {
  const name = getDisplayName(id);
  return name.length >= 2 ? name.slice(0, 2).toUpperCase() : name.toUpperCase();
}

type Tone = "blue" | "green" | "amber" | "red" | "grey";
const statusLabels: Record<string, string> = {
  assigned: "Assignée",
  in_progress: "En cours",
  submitted: "Soumise",
  reviewed: "Revue",
  signed_evaluatee: "Signée (évalué)",
  signed_manager: "Signée (manager)",
  signed_hr: "Signée (RH)",
  validated: "Validée",
  expired: "Expirée",
  archived: "Archivée",
};
const statusTone: Record<string, Tone> = {
  assigned: "amber",
  in_progress: "blue",
  submitted: "blue",
  reviewed: "blue",
  signed_evaluatee: "blue",
  signed_manager: "blue",
  signed_hr: "blue",
  validated: "green",
  expired: "grey",
  archived: "grey",
};
function StatusBadge({ status }: { status: EvaluationStatus }) {
  return (
    <Badge tone={statusTone[status] ?? "grey"} dot>
      {statusLabels[status] ?? status}
    </Badge>
  );
}

function progressWidth(ev: Evaluation): number {
  switch (ev.status) {
    case "validated":
      return 100;
    case "submitted":
      return 75;
    case "in_progress":
      return 40;
    default:
      return 10;
  }
}

function EvalsToComplete({ evaluations }: { evaluations: Evaluation[] }) {
  const pending = evaluations.filter(
    (e) => e.status === "assigned" || e.status === "in_progress",
  );
  if (pending.length === 0) {
    return (
      <p className="small text-center" style={{ padding: "16px 0" }}>
        Aucune évaluation à compléter
      </p>
    );
  }
  return (
    <div className="section-gap" style={{ gap: 12 }}>
      {pending.map((ev) => (
        <div
          key={ev.id}
          className="row between wrap"
          style={{
            gap: 12,
            border: "1px solid var(--line)",
            borderRadius: "var(--radius)",
            padding: "14px 16px",
          }}
        >
          <div>
            <p style={{ fontWeight: 700, fontSize: 15 }}>
              {getDisplayName(ev.evaluateeId as string | PopulatedUser)}
            </p>
            <p className="small" style={{ marginTop: 2 }}>
              Campagne : {getCampaignName(ev.campaignId)}
            </p>
          </div>
          <div className="row" style={{ gap: 12 }}>
            <StatusBadge status={ev.status} />
            <Link
              to={`/evaluations/${ev.id}`}
              className="btn btn-primary btn-sm"
            >
              Remplir{" "}
              <ArrowRight className="ico" style={{ width: 15, height: 15 }} />
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}

function MyTeam({ evaluations }: { evaluations: Evaluation[] }) {
  if (evaluations.length === 0) {
    return (
      <p className="small text-center" style={{ padding: "16px 0" }}>
        Aucun membre dans l’équipe
      </p>
    );
  }
  return (
    <div className="section-gap" style={{ gap: 14 }}>
      {evaluations.map((ev) => (
        <div key={ev.id} className="row" style={{ gap: 12 }}>
          <span
            className="avatar"
            style={{ width: 32, height: 32, fontSize: 12 }}
          >
            {getInitials(ev.evaluateeId as string | PopulatedUser)}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="row between" style={{ marginBottom: 6 }}>
              <p style={{ fontSize: 14, fontWeight: 600 }} className="truncate">
                {getDisplayName(ev.evaluateeId as string | PopulatedUser)}
              </p>
              <StatusBadge status={ev.status} />
            </div>
            <Bar pct={progressWidth(ev)} height={6} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ActiveCampaigns() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-manager-campaigns"],
    queryFn: () => campaignsApi.getCampaigns({ status: "active", limit: 5 }),
  });
  const campaigns: Campaign[] = data?.data?.data ?? [];
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
      <p className="small text-center" style={{ padding: "16px 0" }}>
        Aucune campagne active
      </p>
    );
  }
  return (
    <div className="section-gap" style={{ gap: 10 }}>
      {campaigns.map((c) => {
        const pct =
          c.completionPct != null
            ? c.completionPct
            : c.stats && c.stats.total > 0
              ? Math.round(
                  ((c.stats.submitted + c.stats.validated) / c.stats.total) *
                    100,
                )
              : 0;
        return (
          <div
            key={c.id}
            className="row wrap"
            style={{
              gap: 16,
              padding: "12px 14px",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius)",
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 600 }} className="truncate">
                {c.name}
              </p>
              {c.endDate && (
                <p className="small" style={{ marginTop: 2 }}>
                  Clôture :{" "}
                  {new Date(c.endDate).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>
            <div style={{ width: 160, flex: "none" }}>
              <div className="row between" style={{ marginBottom: 4 }}>
                <span className="small">Progression</span>
                <span className="small" style={{ fontWeight: 700 }}>
                  {pct}%
                </span>
              </div>
              <Bar pct={pct} height={6} />
            </div>
            <Link
              to={`/campaigns/${c.id}`}
              className="link small"
              style={{ flex: "none" }}
            >
              Voir
            </Link>
          </div>
        );
      })}
    </div>
  );
}

function PendingSignaturesList({
  statsData,
}: {
  statsData: DashboardManagerStats | undefined;
}) {
  const list = (statsData?.pendingSignatures ?? []).slice(0, 5);
  if (list.length === 0) {
    return (
      <p className="small text-center" style={{ padding: "16px 0" }}>
        Aucune évaluation en attente de votre signature
      </p>
    );
  }
  return (
    <div className="section-gap" style={{ gap: 10 }}>
      {list.map((ev) => {
        const evaluatee =
          typeof ev.evaluateeId === "object"
            ? `${ev.evaluateeId.firstName} ${ev.evaluateeId.lastName}`
            : ev.evaluateeId;
        const campaign =
          typeof ev.campaignId === "object"
            ? ev.campaignId.name
            : ev.campaignId;
        const signedAt = ev.signedByEvaluateeAt
          ? new Date(ev.signedByEvaluateeAt).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "short",
            })
          : "—";
        return (
          <div
            key={ev._id ?? ev.id}
            className="row between"
            style={{
              gap: 12,
              padding: "12px 14px",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius)",
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 600 }} className="truncate">
                {evaluatee}
              </p>
              <p className="small truncate">
                {campaign} · signé le {signedAt}
              </p>
            </div>
            <Link
              to={`/evaluations/${ev._id ?? ev.id}`}
              className="link small row"
              style={{ gap: 4, flex: "none" }}
            >
              <PenLine className="w-3 h-3" /> Signer
            </Link>
          </div>
        );
      })}
    </div>
  );
}

export default function DashboardManagerPage() {
  const { evaluations } = useDashboardManager();
  const stats = useDashboardManagerStats();

  const { data: eventsData } = useQuery({
    queryKey: ["dashboard-manager-events"],
    queryFn: () => eventsApi.getEvents({ limit: 3 }),
  });
  const upcomingEvents = eventsData?.data?.data ?? [];

  if (evaluations.isLoading) {
    return (
      <div className="nx-app">
        <div className="h-8 w-64 bg-slate-200 rounded animate-pulse mb-8" />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-28 bg-slate-200 rounded-xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  const evalList = evaluations.data?.data ?? [];
  const toCompleteCount = evalList.filter(
    (e) => e.status === "assigned" || e.status === "in_progress",
  ).length;
  const waitingCount = evalList.filter((e) => e.status === "assigned").length;
  const s = stats.data;

  return (
    <div className="nx-app">
      <PageHead
        eyebrow="Espace manager"
        title="Tableau de bord — Mon équipe"
        desc="Suivez et gérez les évaluations de votre équipe."
        actions={
          <Link to="/evaluations" className="btn btn-primary">
            Mes évaluations <ArrowRight className="ico" />
          </Link>
        }
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatTile
          value={s?.evaluations?.pending ?? toCompleteCount}
          label="Évals à compléter"
          tone="var(--amber)"
        />
        <StatTile
          value={s?.completionRate != null ? `${s.completionRate}%` : "—"}
          label="Taux de complétion"
          tone="var(--green)"
        />
        <StatTile
          value={s?.teamSize ?? waitingCount}
          label="Taille de l’équipe"
          tone="var(--blue)"
        />
        <StatTile
          value={s?.evaluations?.overdue ?? 0}
          label="En retard"
          tone="var(--red)"
        />
        <StatTile
          value={s?.evaluations?.signedByManager ?? 0}
          label="Signées"
          tone="var(--green)"
        />
      </div>

      {/* Évals à compléter + Mon équipe */}
      <div className="grid grid-cols-12 gap-6 mb-6">
        <div className="col-span-12 lg:col-span-7">
          <Tile style={{ height: "100%" }}>
            <h2 className="h2" style={{ marginBottom: 16 }}>
              Évaluations à compléter
            </h2>
            <EvalsToComplete evaluations={evalList} />
          </Tile>
        </div>
        <div className="col-span-12 lg:col-span-5">
          <Tile style={{ height: "100%" }}>
            <h2 className="h2" style={{ marginBottom: 16 }}>
              Mon équipe
            </h2>
            <MyTeam evaluations={evalList} />
          </Tile>
        </div>
      </div>

      {/* Campagnes actives */}
      <Tile className="mb-6">
        <div className="row between" style={{ marginBottom: 16 }}>
          <h2 className="h2">Campagnes actives</h2>
          <Link to="/campaigns" className="link small">
            Voir toutes →
          </Link>
        </div>
        <ActiveCampaigns />
      </Tile>

      {/* En attente de signature */}
      <Tile className="mb-6">
        <div className="row between" style={{ marginBottom: 16 }}>
          <h2 className="h2">En attente de signature</h2>
          <Link to="/evaluations" className="link small">
            Voir toutes →
          </Link>
        </div>
        <PendingSignaturesList statsData={stats.data} />
      </Tile>

      {/* Prochains événements */}
      <Tile>
        <div className="row between" style={{ marginBottom: 16 }}>
          <h2 className="h2">Prochains événements</h2>
          <Link to="/events" className="link small">
            Voir tout →
          </Link>
        </div>
        {upcomingEvents.length === 0 ? (
          <p className="small text-center" style={{ padding: "16px 0" }}>
            Aucun événement à venir.
          </p>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {upcomingEvents.map((ev) => (
              <li
                key={ev.id}
                className="row"
                style={{ gap: 12, padding: "10px 0" }}
              >
                <span
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    background: "var(--blue-soft)",
                    display: "grid",
                    placeItems: "center",
                    flex: "none",
                  }}
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--blue)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="5" width="18" height="16" rx="2" />
                    <path d="M3 9h18M8 3v4M16 3v4" />
                  </svg>
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{ fontSize: 14, fontWeight: 600 }}
                    className="truncate"
                  >
                    {ev.title}
                  </p>
                  {(ev.startDate ?? ev.date) && (
                    <p className="small">
                      {new Date(ev.startDate ?? ev.date!).toLocaleDateString(
                        "fr-FR",
                        { day: "numeric", month: "short", year: "numeric" },
                      )}
                    </p>
                  )}
                </div>
                <Link
                  to={`/events/${ev.id}`}
                  className="link small"
                  style={{ flex: "none" }}
                >
                  Voir
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Tile>
    </div>
  );
}
