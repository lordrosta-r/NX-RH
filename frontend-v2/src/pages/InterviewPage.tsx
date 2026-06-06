import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Eye, UserCheck, FileEdit, Save, CheckCircle } from "lucide-react";
import { interviewsApi } from "../api/interviews";
import { PageHead, Tile } from "../components/shell";
import Breadcrumbs from "../components/ui/Breadcrumbs";
import type { InterviewEvaluation, FormQuestion } from "../types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fullName(
  user: { firstName: string; lastName: string } | undefined,
): string {
  if (!user) return "…";
  return `${user.firstName} ${user.lastName}`.trim();
}

function formatAnswer(value: unknown, question: FormQuestion): string {
  if (value === undefined || value === null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Oui" : "Non";
  if (typeof value === "number") {
    if (question.type === "rating" || question.type === "scale") {
      const max =
        question.type === "scale" ? (question.options?.length ?? 10) : 5;
      return `${value} / ${max}`;
    }
    return String(value);
  }
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function ReadonlyAnswer({
  label,
  value,
  icon,
  borderColor,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  borderColor: string;
}) {
  return (
    <div
      className="tile"
      style={{
        borderTop: `3px solid ${borderColor}`,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div
        className="row"
        style={{ gap: 6, alignItems: "center", marginBottom: 4 }}
      >
        {icon}
        <span className="label">{label}</span>
      </div>
      <p
        className="body"
        style={{ color: "var(--color-text-2)", whiteSpace: "pre-wrap" }}
      >
        {value}
      </p>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

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

  // Synthèse globale d'entretien
  const [globalScore, setGlobalScore] = useState<string>("");
  const [globalComment, setGlobalComment] = useState<string>("");
  const [savedOk, setSavedOk] = useState(false);

  const saveMutation = useMutation({
    mutationFn: () =>
      interviewsApi.saveSynthesis({
        campaignId,
        evaluateeId,
        reviewerScore: globalScore !== "" ? Number(globalScore) : null,
        reviewerComment: globalComment,
      }),
    onSuccess: () => {
      setSavedOk(true);
      setTimeout(() => setSavedOk(false), 3000);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Erreur enregistrement synthèse :", msg);
    },
  });

  // ── Loading ────────────────────────────────────────────────────────────────
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

  // ── Params manquants ───────────────────────────────────────────────────────
  if (!campaignId || !evaluateeId) {
    return (
      <div className="nx-app">
        <Tile>
          <div className="text-center" style={{ padding: "40px 0" }}>
            <p className="body">
              Paramètres manquants (campaignId, evaluateeId).
            </p>
            <Link
              to="/manager"
              className="link small"
              style={{ marginTop: 8, display: "inline-block" }}
            >
              ← Retour
            </Link>
          </div>
        </Tile>
      </div>
    );
  }

  // ── Introuvable ────────────────────────────────────────────────────────────
  if (!interview) {
    return (
      <div className="nx-app">
        <Tile>
          <div className="text-center" style={{ padding: "40px 0" }}>
            <p className="body">Entretien introuvable ou accès refusé.</p>
            <Link
              to="/manager"
              className="link small"
              style={{ marginTop: 8, display: "inline-block" }}
            >
              ← Retour
            </Link>
          </div>
        </Tile>
      </div>
    );
  }

  // ── Résoudre évaluations ───────────────────────────────────────────────────

  const evals = interview.evaluationIds ?? [];

  // Identifier l'évalué : son _id = evaluateeId param (toujours string ici)
  const selfEval: InterviewEvaluation | undefined = evals.find(
    (ev) => ev.evaluatorId._id === ev.evaluateeId._id,
  );
  const managerEval: InterviewEvaluation | undefined = evals.find(
    (ev) => ev.evaluatorId._id !== ev.evaluateeId._id,
  );

  // Résoudre le nom de l'évalué depuis les évaluations imbriquées (toujours peuplées)
  const evaluateeUser = selfEval?.evaluateeId ?? managerEval?.evaluateeId;
  const evaluateeName = fullName(evaluateeUser);

  const managerName = managerEval
    ? fullName(managerEval.evaluatorId)
    : "Manager";

  // Source des questions : on prend le formulaire de l'auto-éval, sinon du manager
  const sourceEval: InterviewEvaluation | undefined = selfEval ?? managerEval;
  const questions: FormQuestion[] = sourceEval?.formId.questions ?? [];

  const isSaving = saveMutation.isPending;
  const saveError = saveMutation.isError;

  return (
    <div className="nx-app">
      <Breadcrumbs
        items={[
          { label: "Équipe", href: "/manager/team" },
          { label: evaluateeName },
          { label: "Entretien" },
        ]}
      />

      <PageHead
        eyebrow="Vue Entretien"
        title={`Entretien — ${evaluateeName}`}
        desc="Auto-évaluation, évaluation manager et synthèse partagée côte à côte."
        actions={
          <button
            className="btn primary"
            disabled={isSaving}
            onClick={() => saveMutation.mutate()}
          >
            {savedOk ? (
              <>
                <CheckCircle size={14} strokeWidth={1.5} />
                Enregistré ✓
              </>
            ) : (
              <>
                <Save size={14} strokeWidth={1.5} />
                {isSaving ? "Enregistrement…" : "Enregistrer la synthèse"}
              </>
            )}
          </button>
        }
      />

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
        </div>
      </Tile>

      {/* Corps : une Tile par question, grille 2 colonnes */}
      {questions.length === 0 ? (
        <Tile>
          <p className="body" style={{ color: "var(--color-text-2)" }}>
            Aucune question trouvée dans les formulaires associés.
          </p>
        </Tile>
      ) : (
        <div className="section-gap" style={{ gap: 24 }}>
          {questions.map((question, idx) => {
            const selfAnswer = selfEval?.answers?.find(
              (a) => a.questionId === question.id,
            )?.value;
            const managerAnswer = managerEval?.answers?.find(
              (a) => a.questionId === question.id,
            )?.value;

            return (
              <div
                key={question.id}
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {/* Titre de la question */}
                <p className="label" style={{ color: "var(--color-text-1)" }}>
                  {idx + 1}. {question.text}
                </p>

                {/* Grille 2 colonnes (auto-éval + manager) */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, 1fr)",
                    gap: 16,
                  }}
                >
                  {/* Colonne 1 : Auto-évaluation */}
                  <ReadonlyAnswer
                    label={`Auto-éval — ${evaluateeName}`}
                    value={formatAnswer(selfAnswer, question)}
                    icon={
                      <Eye
                        size={14}
                        strokeWidth={1.5}
                        style={{ color: "var(--color-secondary)" }}
                      />
                    }
                    borderColor="var(--color-secondary)"
                  />

                  {/* Colonne 2 : Évaluation manager */}
                  <ReadonlyAnswer
                    label={`Manager — ${managerName}`}
                    value={formatAnswer(managerAnswer, question)}
                    icon={
                      <UserCheck
                        size={14}
                        strokeWidth={1.5}
                        style={{ color: "var(--color-text-2)" }}
                      />
                    }
                    borderColor="var(--color-border)"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Synthèse globale d'entretien */}
      <Tile
        className="mt-8"
        style={{
          borderTop: "3px solid var(--color-primary)",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div className="row" style={{ gap: 8, alignItems: "center" }}>
          <FileEdit
            size={16}
            strokeWidth={1.5}
            style={{ color: "var(--color-primary)" }}
          />
          <span className="label" style={{ fontSize: 15 }}>
            Synthèse globale de l'entretien
          </span>
        </div>

        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label className="label" htmlFor="global-score">
              Note retenue (0–5)
            </label>
            <input
              id="global-score"
              type="number"
              min={0}
              max={5}
              step={0.5}
              value={globalScore}
              onChange={(e) => {
                setGlobalScore(e.target.value);
                setSavedOk(false);
              }}
              className="input"
              placeholder="—"
              style={{ width: 96 }}
            />
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              flex: 1,
              minWidth: 240,
            }}
          >
            <label className="label" htmlFor="global-comment">
              Commentaire de synthèse
            </label>
            <textarea
              id="global-comment"
              rows={4}
              value={globalComment}
              onChange={(e) => {
                setGlobalComment(e.target.value);
                setSavedOk(false);
              }}
              className="textarea"
              placeholder="Saisir une synthèse globale de l'entretien…"
            />
          </div>
        </div>

        {saveError && (
          <p className="body" style={{ color: "var(--color-danger)" }}>
            Une erreur est survenue lors de l'enregistrement.
          </p>
        )}
      </Tile>
    </div>
  );
}
