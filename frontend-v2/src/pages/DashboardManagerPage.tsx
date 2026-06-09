import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronDown, ChevronUp, PenLine } from "lucide-react";
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
import PageGuide from "../components/shared/PageGuide";

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
/**
 * Le backend (sanitizeAnonymity) aplatit `evaluateeId` en simple id string et
 * expose l'objet peuplé { firstName, lastName } via `evaluatee`. On lit donc
 * `evaluatee` en priorité pour afficher le nom plutôt que l'ObjectId brut.
 */
function evaluateeOf(ev: Evaluation): PopulatedUser | string | undefined | null {
  return ev.evaluatee ?? (ev.evaluateeId as string | PopulatedUser | undefined);
}

type Tone = "blue" | "green" | "amber" | "red" | "grey";
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
function StatusBadge({
  status,
  t,
}: {
  status: EvaluationStatus;
  t: TFunction;
}) {
  return (
    <Badge tone={statusTone[status] ?? "grey"} dot>
      {t(`evaluations.status.${status}`, { defaultValue: status })}
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

const TOP_COUNT = 5;
const TEAM_COUNT = 6;

function isOverdue(ev: Evaluation): boolean {
  return ev.deadline != null && new Date(ev.deadline).getTime() < Date.now();
}

// Priorité : en retard d'abord, puis « en cours » avant « assignée ».
function evalPriority(ev: Evaluation): number {
  if (isOverdue(ev)) return 0;
  if (ev.status === "in_progress") return 1;
  return 2;
}

function EvalRow({ ev, t }: { ev: Evaluation; t: TFunction }) {
  const overdue = isOverdue(ev);
  return (
    <div
      className="row between wrap"
      style={{
        gap: 12,
        border: `1px solid ${overdue ? "var(--red)" : "var(--line)"}`,
        borderRadius: "var(--radius)",
        padding: "14px 16px",
      }}
    >
      <div>
        <p style={{ fontWeight: 700, fontSize: 15 }}>
          {getDisplayName(evaluateeOf(ev))}
        </p>
        <p className="small" style={{ marginTop: 2 }}>
          {t("dashManager.evalRow.campaign")} : {getCampaignName(ev.campaignId)}
        </p>
      </div>
      <div className="row" style={{ gap: 12 }}>
        {overdue && (
          <Badge tone="red" dot>
            {t("dashManager.evalRow.overdue")}
          </Badge>
        )}
        <StatusBadge status={ev.status} t={t} />
        <Link to={`/evaluations/${ev.id}`} className="btn btn-primary btn-sm">
          {t("dashManager.evalRow.fill")}{" "}
          <ArrowRight className="ico" style={{ width: 15, height: 15 }} />
        </Link>
      </div>
    </div>
  );
}

function EvalsToComplete({
  evaluations,
  t,
}: {
  evaluations: Evaluation[];
  t: TFunction;
}) {
  const [expanded, setExpanded] = useState(false);

  const pending = evaluations
    .filter((e) => e.status === "assigned" || e.status === "in_progress")
    .slice()
    .sort((a, b) => evalPriority(a) - evalPriority(b));

  if (pending.length === 0) {
    return (
      <p className="small text-center" style={{ padding: "16px 0" }}>
        {t("dashManager.evalsToComplete.empty")}
      </p>
    );
  }

  const top = pending.slice(0, TOP_COUNT);
  const rest = pending.slice(TOP_COUNT);
  const visible = expanded ? pending : top;

  return (
    <div className="section-gap" style={{ gap: 12 }}>
      {!expanded && rest.length > 0 && (
        <p className="small" style={{ fontWeight: 600, color: "var(--ink)" }}>
          {t("dashManager.evalsToComplete.topN", { count: top.length })}
        </p>
      )}
      {visible.map((ev) => (
        <EvalRow key={ev.id} ev={ev} t={t} />
      ))}
      {rest.length > 0 && (
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setExpanded((v) => !v)}
          style={{ alignSelf: "center" }}
        >
          {expanded ? (
            <>
              {t("dashManager.collapse")}{" "}
              <ChevronUp className="ico" style={{ width: 15, height: 15 }} />
            </>
          ) : (
            <>
              {t("dashManager.expandCount", { count: pending.length })}{" "}
              <ChevronDown className="ico" style={{ width: 15, height: 15 }} />
            </>
          )}
        </button>
      )}
    </div>
  );
}

function MyTeam({
  evaluations,
  t,
}: {
  evaluations: Evaluation[];
  t: TFunction;
}) {
  const [expanded, setExpanded] = useState(false);

  if (evaluations.length === 0) {
    return (
      <p className="small text-center" style={{ padding: "16px 0" }}>
        {t("dashManager.myTeam.empty")}
      </p>
    );
  }

  const top = evaluations.slice(0, TEAM_COUNT);
  const rest = evaluations.slice(TEAM_COUNT);
  const visible = expanded ? evaluations : top;

  return (
    <div className="section-gap" style={{ gap: 14 }}>
      {visible.map((ev) => (
        <div key={ev.id} className="row" style={{ gap: 12 }}>
          <span
            className="avatar"
            style={{ width: 32, height: 32, fontSize: 12 }}
          >
            {getInitials(evaluateeOf(ev))}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="row between" style={{ marginBottom: 6 }}>
              <p style={{ fontSize: 14, fontWeight: 600 }} className="truncate">
                {getDisplayName(evaluateeOf(ev))}
              </p>
              <StatusBadge status={ev.status} t={t} />
            </div>
            <Bar pct={progressWidth(ev)} height={6} />
          </div>
        </div>
      ))}
      {rest.length > 0 && (
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setExpanded((v) => !v)}
          style={{ alignSelf: "center" }}
        >
          {expanded ? (
            <>
              {t("dashManager.collapse")}{" "}
              <ChevronUp className="ico" style={{ width: 15, height: 15 }} />
            </>
          ) : (
            <>
              {t("dashManager.expandCount", { count: evaluations.length })}{" "}
              <ChevronDown className="ico" style={{ width: 15, height: 15 }} />
            </>
          )}
        </button>
      )}
    </div>
  );
}

function ActiveCampaigns({ t }: { t: TFunction }) {
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
        {t("dashManager.activeCampaigns.empty")}
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
                  {t("dashManager.activeCampaigns.closingDate")} :{" "}
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
                <span className="small">
                  {t("dashManager.activeCampaigns.progress")}
                </span>
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
              {t("common.view")}
            </Link>
          </div>
        );
      })}
    </div>
  );
}

function PendingSignaturesList({
  statsData,
  t,
}: {
  statsData: DashboardManagerStats | undefined;
  t: TFunction;
}) {
  const list = (statsData?.pendingSignatures ?? []).slice(0, 5);
  if (list.length === 0) {
    return (
      <p className="small text-center" style={{ padding: "16px 0" }}>
        {t("dashManager.pendingSignatures.empty")}
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
                {campaign}{" "}
                · {t("dashManager.pendingSignatures.signedOn", { date: signedAt })}
              </p>
            </div>
            <Link
              to={`/evaluations/${ev._id ?? ev.id}`}
              className="link small row"
              style={{ gap: 4, flex: "none" }}
            >
              <PenLine className="w-3 h-3" />{" "}
              {t("dashManager.pendingSignatures.sign")}
            </Link>
          </div>
        );
      })}
    </div>
  );
}

export default function DashboardManagerPage() {
  const { t } = useTranslation();
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
        eyebrow={t("eyebrow.managerSpace")}
        title={t("pageHead.dashManagerTitle")}
        desc={t("pageHead.dashManagerDesc")}
        actions={
          <Link to="/evaluations" className="btn btn-primary">
            {t("dashManager.actions.myEvaluations")}{" "}
            <ArrowRight className="ico" />
          </Link>
        }
      />

      <PageGuide
        id="dashManager"
        title={t("guides.dashManager.title")}
        color="teal"
        steps={t("guides.dashManager.steps", { returnObjects: true }) as string[]}
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatTile
          value={s?.evaluations?.pending ?? toCompleteCount}
          label={t("dashManager.stats.evalsToComplete")}
          tone="var(--amber)"
        />
        <StatTile
          value={s?.completionRate != null ? `${s.completionRate}%` : "—"}
          label={t("dashManager.stats.completionRate")}
          tone="var(--green)"
        />
        <StatTile
          value={s?.teamSize ?? waitingCount}
          label={t("dashManager.stats.teamSize")}
          tone="var(--blue)"
        />
        <StatTile
          value={s?.evaluations?.overdue ?? 0}
          label={t("dashManager.stats.overdue")}
          tone="var(--red)"
        />
        <StatTile
          value={s?.evaluations?.signedByManager ?? 0}
          label={t("dashManager.stats.signed")}
          tone="var(--green)"
        />
      </div>

      {/* Évals à compléter + Mon équipe */}
      <div className="grid grid-cols-12 gap-6 mb-6">
        <div className="col-span-12 lg:col-span-7">
          <Tile style={{ height: "100%" }}>
            <h2 className="h2" style={{ marginBottom: 16 }}>
              {t("dashManager.evalsToComplete.title")}
            </h2>
            <EvalsToComplete evaluations={evalList} t={t} />
          </Tile>
        </div>
        <div className="col-span-12 lg:col-span-5">
          <Tile style={{ height: "100%" }}>
            <h2 className="h2" style={{ marginBottom: 16 }}>
              {t("dashManager.myTeam.title")}
            </h2>
            <MyTeam evaluations={evalList} t={t} />
          </Tile>
        </div>
      </div>

      {/* Campagnes actives */}
      <Tile className="mb-6">
        <div className="row between" style={{ marginBottom: 16 }}>
          <h2 className="h2">{t("dashManager.activeCampaigns.title")}</h2>
          <Link to="/campaigns" className="link small">
            {t("dashManager.viewAll")}
          </Link>
        </div>
        <ActiveCampaigns t={t} />
      </Tile>

      {/* En attente de signature */}
      <Tile className="mb-6">
        <div className="row between" style={{ marginBottom: 16 }}>
          <h2 className="h2">{t("dashManager.pendingSignatures.title")}</h2>
          <Link to="/evaluations" className="link small">
            {t("dashManager.viewAll")}
          </Link>
        </div>
        <PendingSignaturesList statsData={stats.data} t={t} />
      </Tile>

      {/* Prochains événements */}
      <Tile>
        <div className="row between" style={{ marginBottom: 16 }}>
          <h2 className="h2">{t("dashManager.upcomingEvents.title")}</h2>
          <Link to="/events" className="link small">
            {t("dashManager.viewAll")}
          </Link>
        </div>
        {upcomingEvents.length === 0 ? (
          <p className="small text-center" style={{ padding: "16px 0" }}>
            {t("dashManager.upcomingEvents.empty")}
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
                  {t("common.view")}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Tile>
    </div>
  );
}
