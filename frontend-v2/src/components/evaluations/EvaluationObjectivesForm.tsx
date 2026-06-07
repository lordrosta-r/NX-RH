import { useNavigate } from "react-router-dom";
import type { Dispatch, SetStateAction } from "react";
import { Download } from "lucide-react";
import { usePdfExport } from "../../hooks/usePdfExport";
import type { Evaluation, FormQuestion } from "../../types";
import type { EvalMutationHandle } from "../../types/evaluation";

interface EvaluationObjectivesFormProps {
  evaluation: Evaluation;
  isAdminOrHr: boolean;
  isManager: boolean;
  answers: Record<string, unknown>;
  questions: FormQuestion[];
  reviewerScore: number | "";
  reviewerComment: string;
  nextYearObjectives: string;
  setReviewerScore: Dispatch<SetStateAction<number | "">>;
  setReviewerComment: Dispatch<SetStateAction<string>>;
  setNextYearObjectives: Dispatch<SetStateAction<string>>;
  reviewMutation: EvalMutationHandle;
}

export function EvaluationObjectivesForm({
  evaluation,
  isAdminOrHr,
  isManager,
  answers,
  questions,
  reviewerScore,
  reviewerComment,
  nextYearObjectives,
  setReviewerScore,
  setReviewerComment,
  setNextYearObjectives,
  reviewMutation,
}: EvaluationObjectivesFormProps) {
  const navigate = useNavigate();
  const { exportEvaluationPdf } = usePdfExport();

  return (
    <div className="section-gap">
      <div className="row between wrap nxgap-12">
        <h1 className="h1">Révision de l'évaluation</h1>
        <div className="row wrap nxgap-12">
          <span className="badge amber">
            <span className="dot" />
            Soumise
          </span>
          <button
            onClick={() => exportEvaluationPdf(evaluation)}
            className="btn btn-ghost btn-sm"
          >
            <Download className="ico" aria-hidden="true" /> PDF
          </button>
          {(isAdminOrHr || isManager) && (
            <button
              onClick={() => reviewMutation.mutate()}
              disabled={reviewMutation.isPending}
              className="btn btn-primary btn-sm"
            >
              {reviewMutation.isPending ? "Traitement…" : "Revoir →"}
            </button>
          )}
        </div>
      </div>

      {/* Réponses en lecture seule */}
      <div className="tile">
        <h2 className="eyebrow" style={{ marginBottom: 16 }}>
          Réponses de l'évalué
        </h2>
        <div className="section-gap" style={{ gap: 16 }}>
          {questions.map((q, idx) => (
            <div
              key={q.id}
              style={{
                paddingBottom: 16,
                borderBottom: "1px solid var(--line)",
              }}
            >
              <p className="small" style={{ marginBottom: 4 }}>
                Q{idx + 1} · {q.type}
              </p>
              <p
                className="body"
                style={{
                  fontWeight: 600,
                  color: "var(--ink)",
                  marginBottom: 8,
                }}
              >
                {q.text}
              </p>
              <div className="row nxgap-12">
                <span style={{ color: "var(--blue-text)" }}>➤</span>
                {q.type === "rating" && answers[q.id] !== undefined ? (
                  <div className="row" style={{ gap: 4 }}>
                    {[1, 2, 3, 4, 5].map((v) => (
                      <div
                        key={v}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          fontSize: 12,
                          fontWeight: 600,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background:
                            Number(answers[q.id]) >= v
                              ? "var(--blue)"
                              : "var(--bg-alt-2)",
                          color:
                            Number(answers[q.id]) >= v
                              ? "#fff"
                              : "var(--ink-3)",
                        }}
                      >
                        {v}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p
                    className="body"
                    style={{ fontStyle: "italic", color: "var(--ink-2)" }}
                  >
                    {String(answers[q.id] ?? "—")}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Formulaire de révision */}
      <div className="tile">
        <h2 className="eyebrow" style={{ marginBottom: 16 }}>
          Votre révision
        </h2>
        <div className="section-gap" style={{ gap: 16 }}>
          <div className="field">
            <label htmlFor="reviewer-score">
              Score global <span style={{ color: "var(--red)" }}>*</span>
            </label>
            <div className="row nxgap-12">
              <input
                id="reviewer-score"
                type="number"
                min={0}
                max={100}
                value={reviewerScore}
                onChange={(e) =>
                  setReviewerScore(
                    e.target.value === "" ? "" : Number(e.target.value),
                  )
                }
                className="input"
                style={{ width: 110 }}
              />
              <span className="small">/ 100</span>
            </div>
          </div>
          <div className="field">
            <label htmlFor="reviewer-comment">Commentaire</label>
            <textarea
              id="reviewer-comment"
              rows={3}
              value={reviewerComment}
              onChange={(e) => setReviewerComment(e.target.value)}
              className="input"
            />
          </div>
          <div className="field">
            <label htmlFor="next-year-objectives">Objectifs N+1</label>
            <textarea
              id="next-year-objectives"
              rows={3}
              value={nextYearObjectives}
              onChange={(e) => setNextYearObjectives(e.target.value)}
              placeholder="Objectifs pour l'année prochaine…"
              className="input"
            />
          </div>
        </div>
        <div
          className="row wrap nxgap-12"
          style={{ justifyContent: "flex-end", marginTop: 24 }}
        >
          <button
            onClick={() => navigate("/evaluations")}
            className="btn btn-ghost btn-sm"
          >
            Annuler
          </button>
          <button
            onClick={() => reviewMutation.mutate()}
            disabled={reviewMutation.isPending || reviewerScore === ""}
            className="btn btn-primary btn-sm"
          >
            {reviewMutation.isPending
              ? "Enregistrement…"
              : "Enregistrer la révision"}
          </button>
        </div>
      </div>
    </div>
  );
}
