import { Link } from "react-router-dom";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  ClipboardCheck,
  AlertCircle,
  Clock,
  MessagesSquare,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { evaluationsApi } from "../api/evaluations";
import { queryKeys } from "../lib/queryKeys";
import { useTranslation } from "react-i18next";
import { PageHead, Tile, Badge } from "../components/shell";
import EmptyState from "../components/ui/EmptyState";
import type { Evaluation } from "../types";

type Tone = "blue" | "green" | "amber" | "red" | "grey";

const EVAL_STATUS_TONE: Record<string, Tone> = {
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

/** Priorité de tri : submitted (à reviewer) > en retard > proche échéance > reste */
function sortPriority(ev: Evaluation): number {
  if (ev.status === "submitted") return 0;
  const now = Date.now();
  if (ev.deadline) {
    const dl = new Date(ev.deadline).getTime();
    if (dl < now) return 1; // retard
    const nearMs = 7 * 24 * 60 * 60 * 1000; // 7 jours
    if (dl - now < nearMs) return 2; // proche échéance
  }
  return 3;
}

function isOverdue(ev: Evaluation): boolean {
  if (!ev.deadline) return false;
  return new Date(ev.deadline).getTime() < Date.now();
}

function isNearExpiry(ev: Evaluation): boolean {
  if (!ev.deadline) return false;
  const dl = new Date(ev.deadline).getTime();
  const now = Date.now();
  const nearMs = 7 * 24 * 60 * 60 * 1000;
  return dl >= now && dl - now < nearMs;
}

function deadlineTone(ev: Evaluation): Tone {
  if (isOverdue(ev)) return "red";
  if (isNearExpiry(ev)) return "amber";
  return "grey";
}

/** Extrait un id string depuis une valeur string ou un objet peuplé { id } / { _id } */
function idOf(val: string | { id?: string; _id?: string } | undefined): string {
  if (!val) return "";
  if (typeof val === "string") return val;
  return val.id ?? val._id ?? "";
}

// Statuts qui nécessitent une action du manager-évaluateur
const ACTION_REQUIRED_STATUSES = [
  "submitted",
  "assigned",
  "in_progress",
  "signed_evaluatee",
];

export default function ManagerTodoPage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.evaluations.list({ evaluatorId: user?.id, limit: 200 }),
    queryFn: () =>
      evaluationsApi
        .getEvaluations({
          evaluatorId: user?.id,
          limit: 200,
        })
        .then((r) => r.data),
    placeholderData: keepPreviousData,
    enabled: !!user?.id,
  });

  const allEvals: Evaluation[] = data?.data ?? [];

  // Garder uniquement les évaluations actives où le manager doit agir
  const actionEvals = allEvals
    .filter((ev) => ACTION_REQUIRED_STATUSES.includes(ev.status))
    .sort((a, b) => sortPriority(a) - sortPriority(b));

  const overdueCount = actionEvals.filter(isOverdue).length;
  const submittedCount = actionEvals.filter(
    (ev) => ev.status === "submitted",
  ).length;

  const tblCols = "1.6fr 1.4fr 1.2fr 120px 120px 140px";

  return (
    <div className="nx-app">
      <PageHead
        eyebrow="Espace manager"
        title={t("nav.toProcess")}
        desc="Évaluations de vos collaborateurs qui nécessitent votre action."
      />

      {/* Compteurs rapides */}
      {!isLoading && actionEvals.length > 0 && (
        <div className="row wrap" style={{ gap: 12, marginBottom: 24 }}>
          {submittedCount > 0 && (
            <div
              className="row"
              style={{
                gap: 8,
                padding: "8px 14px",
                background: "var(--blue-soft)",
                borderRadius: 8,
              }}
            >
              <ClipboardCheck
                size={16}
                style={{ color: "var(--blue)" }}
                aria-hidden="true"
              />
              <span className="small">
                <strong>{submittedCount}</strong> à reviewer
              </span>
            </div>
          )}
          {overdueCount > 0 && (
            <div
              className="row"
              style={{
                gap: 8,
                padding: "8px 14px",
                background: "var(--red-soft)",
                borderRadius: 8,
              }}
            >
              <AlertCircle
                size={16}
                style={{ color: "var(--red)" }}
                aria-hidden="true"
              />
              <span className="small">
                <strong>{overdueCount}</strong> en retard
              </span>
            </div>
          )}
        </div>
      )}

      <Tile style={{ padding: 0, overflow: "hidden" }}>
        <div className="tbl-head" style={{ gridTemplateColumns: tblCols }}>
          <span>Collaborateur</span>
          <span>Campagne</span>
          <span>Formulaire</span>
          <span>Statut</span>
          <span>Échéance</span>
          <span>Actions</span>
        </div>

        {isLoading ? (
          [...Array(5)].map((_, i) => (
            <div
              key={i}
              className="tbl-row"
              style={{ gridTemplateColumns: "1fr" }}
            >
              <div className="h-5 bg-slate-100 rounded animate-pulse" />
            </div>
          ))
        ) : actionEvals.length === 0 ? (
          <div style={{ padding: 24 }}>
            <EmptyState
              icon={<ClipboardCheck className="w-8 h-8" />}
              title="Rien à traiter"
              description="Toutes les évaluations de votre équipe sont à jour."
            />
          </div>
        ) : (
          actionEvals.map((ev) => {
            const overdue = isOverdue(ev);
            const nearExpiry = isNearExpiry(ev);
            const dlTone = deadlineTone(ev);
            const campaignName =
              typeof ev.campaignId === "string"
                ? ev.campaignId
                : ev.campaignId.name;

            return (
              <div
                key={ev.id}
                className="tbl-row"
                style={{
                  gridTemplateColumns: tblCols,
                  borderLeft: overdue
                    ? "3px solid var(--red)"
                    : ev.status === "submitted"
                      ? "3px solid var(--blue)"
                      : nearExpiry
                        ? "3px solid var(--amber)"
                        : "3px solid transparent",
                }}
              >
                {/* Collaborateur */}
                <div className="row" style={{ gap: 8, minWidth: 0 }}>
                  <span
                    className="avatar"
                    style={{ width: 28, height: 28, fontSize: 11 }}
                  >
                    {ev.evaluatee?.firstName?.[0]}
                    {ev.evaluatee?.lastName?.[0]}
                  </span>
                  <Link to={`/evaluations/${ev.id}`} className="link truncate">
                    {ev.evaluatee?.firstName} {ev.evaluatee?.lastName}
                  </Link>
                </div>

                {/* Campagne */}
                <span className="small truncate">{campaignName}</span>

                {/* Formulaire */}
                <span className="small truncate">{ev.form?.title ?? "—"}</span>

                {/* Statut */}
                <span>
                  <Badge tone={EVAL_STATUS_TONE[ev.status] ?? "grey"} dot>
                    {t(`evaluations.status.${ev.status}`)}
                  </Badge>
                </span>

                {/* Échéance */}
                <span>
                  {ev.deadline ? (
                    <span
                      className="row"
                      style={{ gap: 4, display: "inline-flex" }}
                    >
                      {(overdue || nearExpiry) && (
                        <Clock
                          size={13}
                          style={{
                            color:
                              dlTone === "red" ? "var(--red)" : "var(--amber)",
                            flexShrink: 0,
                          }}
                          aria-hidden="true"
                        />
                      )}
                      <Badge tone={dlTone}>
                        {new Date(ev.deadline).toLocaleDateString("fr-FR")}
                      </Badge>
                    </span>
                  ) : (
                    <span className="small" style={{ color: "var(--muted)" }}>
                      —
                    </span>
                  )}
                </span>

                {/* Actions */}
                <span>
                  <Link
                    to={`/interview?campaignId=${idOf(ev.campaignId)}&evaluateeId=${ev.evaluateeId}`}
                    className="link row"
                    style={{
                      gap: 4,
                      display: "inline-flex",
                      alignItems: "center",
                    }}
                  >
                    <MessagesSquare size={14} aria-hidden="true" />
                    <span className="small">Entretien</span>
                  </Link>
                </span>
              </div>
            );
          })
        )}
      </Tile>
    </div>
  );
}
