import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Target,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  MessageSquarePlus,
  Send,
  Clock,
} from "lucide-react";
import { interviewsApi } from "../api/interviews";
import type {
  TeamObjective,
  TeamObjectivesRow,
} from "../api/interviews";
import { useAuth } from "../contexts/AuthContext";
import { PageHead, Tile, Badge, Bar } from "../components/shell";
import Breadcrumbs from "../components/ui/Breadcrumbs";
import PageGuide from "../components/shared/PageGuide";
import { formatDate } from "../utils/formatDate";

const REVIEW_TONE: Record<string, "green" | "amber" | "red" | "grey"> = {
  achieved: "green",
  partial: "amber",
  not_achieved: "red",
};
const REVIEW_ICON: Record<string, typeof CheckCircle2> = {
  achieved: CheckCircle2,
  partial: AlertTriangle,
  not_achieved: XCircle,
};

function fullName(u: TeamObjectivesRow["evaluatee"]): string {
  if (!u) return "—";
  return `${u.firstName} ${u.lastName}`.trim();
}

function initials(u: TeamObjectivesRow["evaluatee"]): string {
  if (!u) return "?";
  const a = (u.firstName || "").charAt(0);
  const b = (u.lastName || "").charAt(0);
  return `${a}${b}`.toUpperCase() || "?";
}

// Avatar à initiales, ton brand (--blue).
function Avatar({ evaluatee }: { evaluatee: TeamObjectivesRow["evaluatee"] }) {
  return (
    <div
      aria-hidden="true"
      style={{
        width: 38,
        height: 38,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flex: "0 0 auto",
        background: "var(--blue)",
        color: "#fff",
        fontWeight: 600,
        fontSize: 13,
        letterSpacing: 0.5,
      }}
    >
      {initials(evaluatee)}
    </div>
  );
}

// Formulaire de mise à jour visible uniquement par l'évalué propriétaire.
function ObjectiveUpdateForm({
  campaignId,
  evaluateeId,
  objectiveIndex,
}: {
  campaignId: string;
  evaluateeId: string;
  objectiveIndex: number;
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [comment, setComment] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      interviewsApi.addObjectiveUpdate({
        campaignId,
        evaluateeId,
        objectiveIndex,
        note: note.trim(),
        comment: comment.trim() || undefined,
      }),
    onSuccess: () => {
      setNote("");
      setComment("");
      setOpen(false);
      void qc.invalidateQueries({ queryKey: ["team-objectives"] });
    },
  });

  if (!open) {
    return (
      <button
        type="button"
        className="btn btn-sm"
        style={{ marginTop: 8 }}
        onClick={() => setOpen(true)}
      >
        <MessageSquarePlus size={14} strokeWidth={1.5} />
        {t("objectives.update.add")}
      </button>
    );
  }

  return (
    <form
      style={{
        marginTop: 8,
        padding: 12,
        borderRadius: 8,
        border: "1px solid var(--line)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
      onSubmit={(e) => {
        e.preventDefault();
        if (note.trim()) mutation.mutate();
      }}
    >
      <div className="field">
        <label className="label">{t("objectives.update.note")}</label>
        <textarea
          className="textarea"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t("objectives.update.notePlaceholder")}
          maxLength={2000}
          autoFocus
        />
      </div>
      <div className="field">
        <label className="label">{t("objectives.update.comment")}</label>
        <textarea
          className="textarea"
          rows={2}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={t("objectives.update.commentPlaceholder")}
          maxLength={2000}
        />
      </div>
      {mutation.isError && (
        <p className="small" style={{ color: "var(--red)" }}>
          {t("objectives.update.error")}
        </p>
      )}
      <div className="row" style={{ gap: 8 }}>
        <button
          type="submit"
          className="btn btn-primary btn-sm"
          disabled={!note.trim() || mutation.isPending}
        >
          <Send size={14} strokeWidth={1.5} />
          {mutation.isPending
            ? t("common.loading")
            : t("objectives.update.submit")}
        </button>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => setOpen(false)}
          disabled={mutation.isPending}
        >
          {t("common.cancel")}
        </button>
      </div>
    </form>
  );
}

// Liste des mises à jour d'un objectif (lecture seule, partagée évalué/manager).
function ObjectiveUpdates({ updates }: { updates: TeamObjective["updates"] }) {
  const { t } = useTranslation();
  if (!updates.length) return null;
  return (
    <div
      style={{
        marginTop: 8,
        paddingLeft: 12,
        borderLeft: "2px solid var(--line)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {updates.map((u, k) => (
        <div key={k}>
          <div
            className="row"
            style={{ gap: 6, alignItems: "center", marginBottom: 2 }}
          >
            <Clock size={12} strokeWidth={1.5} style={{ color: "var(--ink-3)" }} />
            <span className="small" style={{ color: "var(--ink-3)" }}>
              {u.at ? formatDate(u.at) : t("objectives.update.noDate")}
            </span>
          </div>
          <p className="body" style={{ margin: 0 }}>
            {u.note}
          </p>
          {u.comment && (
            <p
              className="small"
              style={{ margin: "2px 0 0", color: "var(--ink-3)" }}
            >
              {u.comment}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

// Indicateur d'avancement du bilan des objectifs passés (atteint/partiel/non).
function ReviewProgress({
  review,
}: {
  review: TeamObjectivesRow["objectivesReview"];
}) {
  const { t } = useTranslation();
  const total = review.length;
  if (!total) return null;
  const achieved = review.filter((o) => o.status === "achieved").length;
  const partial = review.filter((o) => o.status === "partial").length;
  const pct = Math.round(((achieved + partial * 0.5) / total) * 100);

  return (
    <div style={{ marginBottom: 10 }}>
      <div
        className="row between"
        style={{ marginBottom: 4, alignItems: "baseline" }}
      >
        <span className="small" style={{ color: "var(--ink-3)" }}>
          {t("objectives.progress.label", { achieved, total })}
        </span>
        <span className="small" style={{ color: "var(--ink-3)" }}>
          {pct}%
        </span>
      </div>
      <Bar pct={pct} tone="var(--blue)" />
    </div>
  );
}

export default function ObjectivesPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const currentUserId = user?._id ?? user?.id ?? null;

  const { data, isLoading } = useQuery({
    queryKey: ["team-objectives"],
    refetchOnMount: "always",
    queryFn: () => interviewsApi.getTeamObjectives().then((r) => r.data.data),
  });

  const rows: TeamObjectivesRow[] = data ?? [];
  const withObjectives = rows.filter(
    (r) => r.nextYearObjectives.length > 0 || r.objectivesReview.length > 0,
  );

  return (
    <div className="nx-app">
      <Breadcrumbs
        items={[
          { label: t("common.home"), href: "/" },
          { label: t("objectives.title") },
        ]}
      />

      <PageGuide
        id="objectives"
        title={t("objectives.guide.title")}
        steps={t("objectives.guide.steps", { returnObjects: true }) as string[]}
        color="blue"
      />

      <PageHead title={t("objectives.title")} desc={t("objectives.desc")} />

      {isLoading ? (
        <Tile>
          <p className="small">{t("common.loading")}</p>
        </Tile>
      ) : withObjectives.length === 0 ? (
        <Tile>
          <div className="row" style={{ gap: 10, alignItems: "center" }}>
            <Target size={18} strokeWidth={1.5} />
            <p className="small">{t("objectives.empty")}</p>
          </div>
        </Tile>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {withObjectives.map((row, i) => {
            const isOwner =
              !!currentUserId &&
              !!row.evaluatee?._id &&
              currentUserId === row.evaluatee._id;
            const campaignId = row.campaign?._id ?? null;
            const evaluateeId = row.evaluatee?._id ?? null;

            return (
              <Tile key={row.evaluatee?._id ?? i}>
                {/* En-tête membre : avatar + nom + campagne */}
                <div
                  className="row between wrap"
                  style={{
                    gap: 12,
                    marginBottom: 14,
                    paddingBottom: 12,
                    borderBottom: "1px solid var(--line)",
                    alignItems: "center",
                  }}
                >
                  <div className="row" style={{ gap: 10, alignItems: "center" }}>
                    <Avatar evaluatee={row.evaluatee} />
                    <div>
                      <h3 className="h3" style={{ margin: 0 }}>
                        {fullName(row.evaluatee)}
                      </h3>
                      {row.campaign?.name && (
                        <span
                          className="small"
                          style={{ color: "var(--ink-3)" }}
                        >
                          {row.campaign.name}
                        </span>
                      )}
                    </div>
                  </div>
                  {isOwner && <Badge tone="blue">{t("objectives.you")}</Badge>}
                </div>

                {/* Objectifs N+1 + mises à jour d'avancement */}
                {row.nextYearObjectives.length > 0 && (
                  <div
                    style={{
                      marginBottom: row.objectivesReview.length > 0 ? 16 : 0,
                    }}
                  >
                    <p
                      className="label row"
                      style={{ marginBottom: 8, gap: 6, alignItems: "center" }}
                    >
                      <Target
                        size={14}
                        strokeWidth={1.5}
                        style={{ color: "var(--blue)" }}
                      />
                      {t("objectives.nextYear")}
                    </p>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 14,
                      }}
                    >
                      {row.nextYearObjectives.map((o) => (
                        <div
                          key={o.index}
                          style={{
                            padding: 12,
                            borderRadius: 8,
                            border: "1px solid var(--line)",
                          }}
                        >
                          <p
                            className="body"
                            style={{ margin: 0, fontWeight: 500 }}
                          >
                            {o.text}
                          </p>

                          <ObjectiveUpdates updates={o.updates} />

                          {isOwner && campaignId && evaluateeId && (
                            <ObjectiveUpdateForm
                              campaignId={campaignId}
                              evaluateeId={evaluateeId}
                              objectiveIndex={o.index}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bilan des objectifs passés + indicateur d'avancement */}
                {row.objectivesReview.length > 0 && (
                  <div>
                    <p className="label" style={{ marginBottom: 8 }}>
                      {t("objectives.review")}
                    </p>
                    <ReviewProgress review={row.objectivesReview} />
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      {row.objectivesReview.map((o, j) => {
                        const Icon = REVIEW_ICON[o.status ?? ""] ?? Target;
                        return (
                          <div
                            key={j}
                            className="row"
                            style={{ gap: 8, alignItems: "center" }}
                          >
                            <Icon size={14} strokeWidth={1.5} />
                            <span className="body" style={{ flex: 1 }}>
                              {o.label || "—"}
                            </span>
                            {o.status && (
                              <Badge tone={REVIEW_TONE[o.status] ?? "grey"}>
                                {t(`objectives.status.${o.status}`)}
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </Tile>
            );
          })}
        </div>
      )}
    </div>
  );
}
