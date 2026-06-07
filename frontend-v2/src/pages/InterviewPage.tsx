import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Eye,
  UserCheck,
  MessagesSquare,
  Target,
  Flag,
  PenLine,
  Save,
  CheckCircle,
  AlertTriangle,
  Plus,
  Trash2,
} from "lucide-react";
import { interviewsApi } from "../api/interviews";
import { PageHead, Tile } from "../components/shell";
import Breadcrumbs from "../components/ui/Breadcrumbs";
import PageGuide from "../components/shared/PageGuide";
import SignaturePad from "../components/ui/SignaturePad";
import { AnswerView } from "../components/evaluations/AnswerView";
import type { Interview, InterviewEvaluation, FormQuestion } from "../types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fullName(
  user: { firstName: string; lastName: string } | undefined,
): string {
  if (!user) return "…";
  return `${user.firstName} ${user.lastName}`.trim();
}

const OBJ_STATUS = [
  { key: "achieved", label: "Atteint" },
  { key: "partial", label: "Partiel" },
  { key: "not_achieved", label: "Non atteint" },
] as const;

const SYNTHESIS_EXAMPLE =
  "L'entretien a confirmé une année solide, avec un vrai pilotage du projet X de bout en bout. " +
  "Les deux parties s'accordent sur une bonne maîtrise technique, à consolider dans la durée. " +
  "Axe de progrès partagé : la délégation des tâches récurrentes. " +
  "Objectifs de l'année suivante fixés ensemble (voir ci-dessus). Climat de l'échange : constructif.";

type DiscussionState = Record<
  string,
  { employeeComment: string; managerComment: string; agreedAnswer: string }
>;
type ObjReview = { label: string; status: string; comment: string };

// ─── Page : chargement + garde ──────────────────────────────────────────────────

export default function InterviewPage() {
  const [searchParams] = useSearchParams();
  const campaignId = searchParams.get("campaignId") ?? "";
  const evaluateeId = searchParams.get("evaluateeId") ?? "";

  const { data: interview, isLoading } = useQuery({
    queryKey: ["interview", campaignId, evaluateeId],
    queryFn: () =>
      interviewsApi
        .getInterview({ campaignId, evaluateeId })
        .then((r) => r.data),
    enabled: !!campaignId && !!evaluateeId,
  });

  if (!campaignId || !evaluateeId) {
    return (
      <div className="nx-app">
        <Tile>
          <div className="text-center" style={{ padding: "40px 0" }}>
            <p className="body">
              Paramètres manquants (campaignId, evaluateeId).
            </p>
            <Link to="/manager/todo" className="link small">
              ← Retour
            </Link>
          </div>
        </Tile>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="nx-app">
        <div className="section-gap" style={{ gap: 16 }}>
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-24 bg-slate-100 rounded-xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!interview) {
    return (
      <div className="nx-app">
        <Tile>
          <div className="text-center" style={{ padding: "40px 0" }}>
            <p className="body">Entretien introuvable ou accès refusé.</p>
            <Link to="/manager/todo" className="link small">
              ← Retour
            </Link>
          </div>
        </Tile>
      </div>
    );
  }

  return (
    <InterviewWorkspace
      key={interview._id}
      interview={interview}
      campaignId={campaignId}
      evaluateeId={evaluateeId}
    />
  );
}

// ─── Espace de travail (état initialisé depuis l'entretien chargé) ──────────────

function InterviewWorkspace({
  interview,
  campaignId,
  evaluateeId,
}: {
  interview: Interview;
  campaignId: string;
  evaluateeId: string;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["interview", campaignId, evaluateeId],
    });

  const evals = interview.evaluationIds ?? [];
  const selfEval: InterviewEvaluation | undefined = evals.find(
    (ev) => ev.evaluatorId._id === ev.evaluateeId._id,
  );
  const managerEval: InterviewEvaluation | undefined = evals.find(
    (ev) => ev.evaluatorId._id !== ev.evaluateeId._id,
  );
  const sourceEval = selfEval ?? managerEval;
  const questions: FormQuestion[] = sourceEval?.formId.questions ?? [];
  const evaluateeName = fullName(
    selfEval?.evaluateeId ?? managerEval?.evaluateeId,
  );
  const managerName = managerEval
    ? fullName(managerEval.evaluatorId)
    : "Manager";

  // ── État éditable, initialisé une seule fois ──────────────────────────────
  const [discussion, setDiscussion] = useState<DiscussionState>(() => {
    const base: DiscussionState = {};
    for (const q of questions)
      base[q.id] = {
        employeeComment: "",
        managerComment: "",
        agreedAnswer: "",
      };
    for (const d of interview.discussion ?? []) {
      base[d.questionId] = {
        employeeComment: d.employeeComment ?? "",
        managerComment: d.managerComment ?? "",
        agreedAnswer: d.agreedAnswer ?? "",
      };
    }
    return base;
  });

  const [objReview, setObjReview] = useState<ObjReview[]>(() => {
    if (interview.objectivesReview?.length) {
      return interview.objectivesReview.map((o) => ({
        label: o.label,
        status: o.status ?? "",
        comment: o.comment ?? "",
      }));
    }
    // Pré-remplissage depuis les objectifs N+1 de l'édition précédente
    return (interview.previousObjectives ?? "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((label) => ({ label, status: "", comment: "" }));
  });

  const [nextObjectives, setNextObjectives] = useState<string[]>(() => {
    const fromDb = (interview.nextYearObjectives ?? []).map((o) => o.text);
    return fromDb.length ? fromDb : [""];
  });

  const [synthesis, setSynthesis] = useState<string>(
    interview.synthesis?.text ?? "",
  );
  const [savedOk, setSavedOk] = useState(false);
  const [disagreeOpen, setDisagreeOpen] = useState(false);
  const [disagreeReason, setDisagreeReason] = useState("");

  const signed = (role: "evaluatee" | "manager") =>
    interview.signatures?.find((s) => s.role === role);
  const disagreement = interview.disagreement;

  // ── Mutations ──────────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: () =>
      interviewsApi.saveState({
        campaignId,
        evaluateeId,
        discussion: Object.entries(discussion).map(([questionId, v]) => ({
          questionId,
          ...v,
        })),
        objectivesReview: objReview,
        nextYearObjectives: nextObjectives
          .filter((t) => t.trim())
          .map((text) => ({ text })),
        synthesis: { text: synthesis },
      }),
    onSuccess: () => {
      setSavedOk(true);
      setTimeout(() => setSavedOk(false), 3000);
      invalidate();
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Erreur enregistrement entretien :", msg);
    },
  });

  const signMutation = useMutation({
    mutationFn: (body: { role: "evaluatee" | "manager"; dataUrl: string }) =>
      interviewsApi.sign({ campaignId, evaluateeId, ...body }),
    onSuccess: () => invalidate(),
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Erreur signature :", msg);
    },
  });

  const disagreeMutation = useMutation({
    mutationFn: () =>
      interviewsApi.flagDisagreement({
        campaignId,
        evaluateeId,
        reason: disagreeReason,
      }),
    onSuccess: () => {
      setDisagreeOpen(false);
      invalidate();
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Erreur désaccord :", msg);
    },
  });

  const setDisc = (
    qid: string,
    field: "employeeComment" | "managerComment" | "agreedAnswer",
    value: string,
  ) =>
    setDiscussion((prev) => ({
      ...prev,
      [qid]: { ...prev[qid], [field]: value },
    }));

  const isSaving = saveMutation.isPending;

  return (
    <div className="nx-app">
      <Breadcrumbs
        items={[
          { label: "À traiter", href: "/manager/todo" },
          { label: evaluateeName },
          { label: "Entretien" },
        ]}
      />

      <PageHead
        eyebrow={t("eyebrow.interviewView")}
        title={t("pageHead.interviewTitle", { name: evaluateeName })}
        desc={t("pageHead.interviewDesc")}
        actions={
          <button
            className="btn primary"
            disabled={isSaving}
            onClick={() => saveMutation.mutate()}
          >
            {savedOk ? (
              <>
                <CheckCircle size={14} strokeWidth={1.5} /> Enregistré
              </>
            ) : (
              <>
                <Save size={14} strokeWidth={1.5} />
                {isSaving ? "Enregistrement…" : "Enregistrer l'entretien"}
              </>
            )}
          </button>
        }
      />

      <PageGuide
        id="interview"
        title={t("guides.interview.title")}
        steps={t("guides.interview.steps", { returnObjects: true }) as string[]}
        color="teal"
      />

      {/* Bandeau désaccord */}
      {disagreement?.flagged && (
        <Tile
          className="mb-6"
          style={{
            borderLeft: "4px solid var(--color-danger)",
            background: "var(--red-soft)",
          }}
        >
          <div className="row" style={{ gap: 8, alignItems: "center" }}>
            <AlertTriangle
              size={18}
              strokeWidth={1.5}
              style={{ color: "var(--color-danger)" }}
            />
            <span className="body" style={{ fontWeight: 600 }}>
              Désaccord signalé — l'entretien passe en litige (arbitrage RH).
            </span>
          </div>
          {disagreement.reason && (
            <p className="body" style={{ marginTop: 6 }}>
              « {disagreement.reason} »
            </p>
          )}
        </Tile>
      )}

      {/* En-tête participants */}
      <Tile className="mb-6">
        <div className="row wrap" style={{ gap: 24 }}>
          <div>
            <p className="label">Évalué(e)</p>
            <p className="body">{evaluateeName}</p>
          </div>
          <div>
            <p className="label">Manager</p>
            <p className="body">{managerName}</p>
          </div>
          <div>
            <p className="label">Statut</p>
            <p className="body">{interview.status ?? "draft"}</p>
          </div>
        </div>
      </Tile>

      {/* ① ÉCHANGE PAR QUESTION */}
      <SectionTitle
        icon={<MessagesSquare size={16} />}
        text="Échange par question"
      />
      {questions.length === 0 ? (
        <Tile className="mb-8">
          <p className="body" style={{ color: "var(--color-text-secondary)" }}>
            Aucune question dans les formulaires associés.
          </p>
        </Tile>
      ) : (
        <div className="section-gap mb-8" style={{ gap: 20 }}>
          {questions.map((question, idx) => {
            const selfAnswer = selfEval?.answers?.find(
              (a) => a.questionId === question.id,
            )?.value;
            const managerAnswer = managerEval?.answers?.find(
              (a) => a.questionId === question.id,
            )?.value;
            const disc = discussion[question.id] ?? {
              employeeComment: "",
              managerComment: "",
              agreedAnswer: "",
            };
            return (
              <Tile key={question.id}>
                <p
                  className="label"
                  style={{ color: "var(--color-text)", marginBottom: 12 }}
                >
                  {idx + 1}. {question.text}
                </p>

                {/* Brouillons (lecture seule) */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, 1fr)",
                    gap: 16,
                    marginBottom: 12,
                  }}
                >
                  <ReadonlyBlock
                    icon={<Eye size={14} strokeWidth={1.5} />}
                    label={`Auto-éval — ${evaluateeName}`}
                    color="var(--blue)"
                  >
                    <AnswerView
                      value={selfAnswer}
                      type={question.type}
                      scale={(question as { scale?: number }).scale}
                      options={question.options}
                    />
                  </ReadonlyBlock>
                  <ReadonlyBlock
                    icon={<UserCheck size={14} strokeWidth={1.5} />}
                    label={`Manager — ${managerName}`}
                    color="var(--color-text-secondary)"
                  >
                    <AnswerView
                      value={managerAnswer}
                      type={question.type}
                      scale={(question as { scale?: number }).scale}
                      options={question.options}
                    />
                  </ReadonlyBlock>
                </div>

                {/* Échange */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                  }}
                >
                  <Field label={`Commentaire — ${evaluateeName}`}>
                    <textarea
                      className="textarea"
                      rows={2}
                      value={disc.employeeComment}
                      onChange={(e) =>
                        setDisc(question.id, "employeeComment", e.target.value)
                      }
                      placeholder="Remarque de l'évalué(e)…"
                    />
                  </Field>
                  <Field label={`Commentaire — ${managerName}`}>
                    <textarea
                      className="textarea"
                      rows={2}
                      value={disc.managerComment}
                      onChange={(e) =>
                        setDisc(question.id, "managerComment", e.target.value)
                      }
                      placeholder="Remarque du manager…"
                    />
                  </Field>
                </div>
                <Field label="Position retenue (commune)">
                  <textarea
                    className="textarea"
                    rows={2}
                    value={disc.agreedAnswer}
                    onChange={(e) =>
                      setDisc(question.id, "agreedAnswer", e.target.value)
                    }
                    placeholder="Ce que les deux parties actent ensemble…"
                  />
                </Field>
              </Tile>
            );
          })}
        </div>
      )}

      {/* ② REVUE DES OBJECTIFS DE L'AN DERNIER */}
      <SectionTitle
        icon={<Target size={16} />}
        text="Revue des objectifs de l'an dernier"
      />
      <Tile className="mb-8">
        {objReview.length === 0 ? (
          <p className="body" style={{ color: "var(--color-text-secondary)" }}>
            Aucun objectif fixé à l'édition précédente.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {objReview.map((obj, i) => (
              <div
                key={i}
                style={{
                  borderBottom:
                    i < objReview.length - 1
                      ? "1px solid var(--color-border)"
                      : "none",
                  paddingBottom: 12,
                }}
              >
                <p
                  className="body"
                  style={{ fontWeight: 600, marginBottom: 8 }}
                >
                  {obj.label}
                </p>
                <div className="row" style={{ gap: 8, marginBottom: 8 }}>
                  {OBJ_STATUS.map((s) => {
                    const active = obj.status === s.key;
                    return (
                      <button
                        key={s.key}
                        type="button"
                        className={
                          active ? "btn primary btn-sm" : "btn btn-ghost btn-sm"
                        }
                        onClick={() =>
                          setObjReview((prev) =>
                            prev.map((o, j) =>
                              j === i
                                ? { ...o, status: active ? "" : s.key }
                                : o,
                            ),
                          )
                        }
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
                <input
                  className="input"
                  value={obj.comment}
                  onChange={(e) =>
                    setObjReview((prev) =>
                      prev.map((o, j) =>
                        j === i ? { ...o, comment: e.target.value } : o,
                      ),
                    )
                  }
                  placeholder="Commentaire sur l'objectif…"
                />
              </div>
            ))}
          </div>
        )}
      </Tile>

      {/* ③ OBJECTIFS N+1 */}
      <SectionTitle
        icon={<Target size={16} />}
        text="Objectifs pour l'année suivante"
      />
      <Tile className="mb-8">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {nextObjectives.map((obj, i) => (
            <div key={i} className="row" style={{ gap: 8 }}>
              <input
                className="input"
                style={{ flex: 1 }}
                value={obj}
                onChange={(e) =>
                  setNextObjectives((prev) =>
                    prev.map((o, j) => (j === i ? e.target.value : o)),
                  )
                }
                placeholder={`Objectif ${i + 1}…`}
              />
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                aria-label="Retirer"
                onClick={() =>
                  setNextObjectives((prev) => prev.filter((_, j) => j !== i))
                }
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            style={{ alignSelf: "flex-start" }}
            onClick={() => setNextObjectives((prev) => [...prev, ""])}
          >
            <Plus size={14} /> Ajouter un objectif
          </button>
        </div>
      </Tile>

      {/* ④ SYNTHÈSE */}
      <SectionTitle
        icon={<PenLine size={16} />}
        text="Synthèse de l'entretien"
      />
      <Tile className="mb-8">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          style={{ alignSelf: "flex-start", marginBottom: 8 }}
          onClick={() => setSynthesis(SYNTHESIS_EXAMPLE)}
        >
          Insérer un exemple
        </button>
        <textarea
          className="textarea"
          rows={5}
          value={synthesis}
          onChange={(e) => setSynthesis(e.target.value)}
          placeholder={SYNTHESIS_EXAMPLE}
        />
      </Tile>

      {/* ⑤ SIGNATURE DU MANAGER (l'évalué·e signe séparément, dans sa fiche) */}
      <SectionTitle icon={<PenLine size={16} />} text="Signature du manager" />
      <Tile className="mb-8">
        <p
          className="small"
          style={{ color: "var(--color-text-secondary)", marginBottom: 12 }}
        >
          Le manager signe le compte-rendu de l'entretien. L'évalué·e signe de
          son côté, depuis sa propre fiche d'évaluation.
        </p>
        <div style={{ maxWidth: 380 }}>
          <SignatureBlock
            title={`Manager — ${managerName}`}
            existing={signed("manager")}
            onSign={(dataUrl) =>
              signMutation.mutate({ role: "manager", dataUrl })
            }
          />
        </div>
      </Tile>

      {/* ⑥ DÉSACCORD */}
      {!disagreement?.flagged && (
        <Tile
          className="mb-8"
          style={{ borderLeft: "4px solid var(--color-danger)" }}
        >
          {!disagreeOpen ? (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ color: "var(--color-danger)" }}
              onClick={() => setDisagreeOpen(true)}
            >
              <Flag size={14} /> Marquer un désaccord
            </button>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <p className="label">Motif du désaccord</p>
              <textarea
                className="textarea"
                rows={2}
                value={disagreeReason}
                onChange={(e) => setDisagreeReason(e.target.value)}
                placeholder="Expliquez le point de désaccord — l'entretien passera en litige (arbitrage RH)…"
              />
              <div className="row" style={{ gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setDisagreeOpen(false)}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  style={{ background: "var(--color-danger)", color: "#fff" }}
                  disabled={
                    !disagreeReason.trim() || disagreeMutation.isPending
                  }
                  onClick={() => disagreeMutation.mutate()}
                >
                  Confirmer le désaccord
                </button>
              </div>
            </div>
          )}
        </Tile>
      )}
    </div>
  );
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function SectionTitle({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div
      className="row"
      style={{ gap: 8, alignItems: "center", margin: "0 0 12px" }}
    >
      <span style={{ color: "var(--blue)" }}>{icon}</span>
      <h2 className="h3" style={{ margin: 0 }}>
        {text}
      </h2>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}
    >
      <span className="label">{label}</span>
      {children}
    </div>
  );
}

function ReadonlyBlock({
  icon,
  label,
  color,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        borderLeft: `3px solid ${color}`,
        background: "var(--bg-alt)",
        borderRadius: "var(--radius)",
        padding: "12px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div className="row" style={{ gap: 6, alignItems: "center" }}>
        <span style={{ color, display: "inline-flex" }}>{icon}</span>
        <span
          className="label"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}

function SignatureBlock({
  title,
  existing,
  onSign,
}: {
  title: string;
  existing: { dataUrl: string; signedAt: string } | undefined;
  onSign: (dataUrl: string) => void;
}) {
  if (existing) {
    return (
      <div>
        <div
          className="row"
          style={{ gap: 6, alignItems: "center", marginBottom: 6 }}
        >
          <CheckCircle size={14} style={{ color: "var(--color-success)" }} />
          <span className="label">{title} — signé</span>
        </div>
        <img
          src={existing.dataUrl}
          alt={`Signature ${title}`}
          style={{
            width: 360,
            maxWidth: "100%",
            height: 140,
            objectFit: "contain",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius)",
            background: "#fff",
          }}
        />
        <p
          className="small"
          style={{ color: "var(--color-text-secondary)", marginTop: 4 }}
        >
          {new Date(existing.signedAt).toLocaleString("fr-FR")}
        </p>
      </div>
    );
  }
  return (
    <SignaturePad
      label={title}
      onChange={(dataUrl) => {
        if (dataUrl) onSign(dataUrl);
      }}
    />
  );
}
