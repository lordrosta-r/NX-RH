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
import PageGuide from "../components/shared/PageGuide";
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

  // Regroupement par collaborateur + campagne (= un entretien)
  type Group = {
    key: string;
    name: string;
    initials: string;
    campaignId: string;
    campaignName: string;
    evaluateeId: string;
    evals: Evaluation[];
  };
  const groupMap = new Map<string, Group>();
  for (const ev of actionEvals) {
    const cid = idOf(ev.campaignId);
    const key = `${cid}__${ev.evaluateeId}`;
    let g = groupMap.get(key);
    if (!g) {
      const fn = ev.evaluatee?.firstName ?? "";
      const ln = ev.evaluatee?.lastName ?? "";
      g = {
        key,
        name: `${fn} ${ln}`.trim() || "Collaborateur",
        initials: `${fn[0] ?? ""}${ln[0] ?? ""}`.toUpperCase() || "?",
        campaignId: cid,
        campaignName:
          typeof ev.campaignId === "string"
            ? ev.campaignId
            : ev.campaignId.name,
        evaluateeId: ev.evaluateeId,
        evals: [],
      };
      groupMap.set(key, g);
    }
    g.evals.push(ev);
  }
  const groups = [...groupMap.values()];

  return (
    <div className="nx-app">
      <PageHead
        eyebrow={t("eyebrow.managerSpace")}
        title={t("nav.toProcess")}
        desc={t("pageHead.managerTodoDesc")}
      />

      <PageGuide
        id="manager-todo"
        title={t("guides.managerTodo.title")}
        steps={
          t("guides.managerTodo.steps", { returnObjects: true }) as string[]
        }
        color="blue"
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

      {isLoading ? (
        <div className="section-gap" style={{ gap: 16 }}>
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-24 bg-slate-100 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <Tile>
          <div style={{ padding: 24 }}>
            <EmptyState
              icon={<ClipboardCheck className="w-8 h-8" />}
              title={t("pageHead.managerTodoEmpty")}
              description={t("pageHead.managerTodoEmptyDesc")}
            />
          </div>
        </Tile>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))",
            gap: 16,
          }}
        >
          {groups.map((g) => {
            const hasOverdue = g.evals.some(isOverdue);
            const hasSubmitted = g.evals.some((e) => e.status === "submitted");
            const accent = hasOverdue
              ? "var(--red)"
              : hasSubmitted
                ? "var(--blue)"
                : "var(--line)";
            return (
              <Tile
                key={g.key}
                style={{ borderTop: `3px solid ${accent}`, padding: 18 }}
              >
                {/* En-tête collaborateur */}
                <div
                  className="row"
                  style={{ gap: 10, alignItems: "center", marginBottom: 14 }}
                >
                  <span className="avatar" aria-hidden="true">
                    {g.initials}
                  </span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="body" style={{ fontWeight: 600 }}>
                      {g.name}
                    </div>
                    <div
                      className="small truncate"
                      style={{ color: "var(--ink-3)" }}
                    >
                      {g.campaignName}
                    </div>
                  </div>
                </div>

                {/* Liste des évaluations du collaborateur */}
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  {g.evals.map((ev) => {
                    const overdue = isOverdue(ev);
                    const nearExpiry = isNearExpiry(ev);
                    const dlTone = deadlineTone(ev);
                    return (
                      <Link
                        key={ev.id}
                        to={`/evaluations/${ev.id}`}
                        className="row between"
                        style={{
                          gap: 8,
                          padding: "8px 10px",
                          borderRadius: "var(--radius)",
                          background: "var(--bg-alt)",
                          textDecoration: "none",
                          color: "inherit",
                        }}
                      >
                        <span className="small truncate" style={{ flex: 1 }}>
                          {ev.form?.title ?? "Évaluation"}
                        </span>
                        <Badge tone={EVAL_STATUS_TONE[ev.status] ?? "grey"} dot>
                          {t(`evaluations.status.${ev.status}`)}
                        </Badge>
                        {ev.deadline && (overdue || nearExpiry) && (
                          <span
                            className="row"
                            style={{ gap: 3, display: "inline-flex" }}
                          >
                            <Clock
                              size={12}
                              style={{
                                color:
                                  dlTone === "red"
                                    ? "var(--red)"
                                    : "var(--amber)",
                              }}
                              aria-hidden="true"
                            />
                            <Badge tone={dlTone}>
                              {new Date(ev.deadline).toLocaleDateString(
                                "fr-FR",
                              )}
                            </Badge>
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>

                {/* Action entretien */}
                <Link
                  to={`/interview?campaignId=${g.campaignId}&evaluateeId=${g.evaluateeId}`}
                  className="btn btn-ghost btn-block"
                  style={{
                    marginTop: 14,
                    border: "1px solid var(--line)",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  <MessagesSquare size={15} aria-hidden="true" />
                  Ouvrir l'entretien
                </Link>
              </Tile>
            );
          })}
        </div>
      )}
    </div>
  );
}
