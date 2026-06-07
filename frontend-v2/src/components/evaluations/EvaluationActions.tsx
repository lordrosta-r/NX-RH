import { Download, AlertTriangle } from "lucide-react";
import { SignatureSection } from "../SignatureSection";
import { usePdfExport } from "../../hooks/usePdfExport";
import type { Evaluation } from "../../types";

interface EvaluationActionsProps {
  evaluation: Evaluation;
  id: string;
}

export function EvaluationActions({ evaluation, id }: EvaluationActionsProps) {
  const { exportEvaluationPdf } = usePdfExport();
  const questions = evaluation.form?.questions ?? [];
  const answers = evaluation.answers ?? {};

  return (
    <div>
      <div className="row between wrap nxgap-12" style={{ marginBottom: 24 }}>
        <h1 className="h1">
          Compte-rendu — {evaluation.evaluatee?.firstName}{" "}
          {evaluation.evaluatee?.lastName}
        </h1>
        <button
          onClick={() => exportEvaluationPdf(evaluation)}
          className="btn btn-ghost btn-sm"
        >
          <Download className="ico" /> Télécharger PDF
        </button>
      </div>

      <div className="section-gap">
        {/* Réponses */}
        <div className="tile">
          <h2 className="eyebrow" style={{ marginBottom: 16 }}>
            Réponses
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {questions.map((q, idx) => (
              <div
                key={q.id}
                style={{
                  paddingBottom: 16,
                  borderBottom: "1px solid var(--line)",
                }}
              >
                <p
                  className="body"
                  style={{ fontWeight: 600, color: "var(--ink)" }}
                >
                  Q{idx + 1}. {q.text}
                </p>
                <p className="small" style={{ paddingLeft: 16, marginTop: 4 }}>
                  ➤ {String(answers[q.id] ?? "—")}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Résumé révision */}
        {evaluation.reviewerScore !== undefined && (
          <div className="tile">
            <h2 className="eyebrow" style={{ marginBottom: 16 }}>
              Révision
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="row nxgap-12">
                <span className="small">Score :</span>
                <span
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    color: "var(--ink)",
                  }}
                >
                  {evaluation.reviewerScore}/100
                </span>
              </div>
              {evaluation.reviewerComment && (
                <div>
                  <p className="small" style={{ marginBottom: 4 }}>
                    Commentaire reviewer :
                  </p>
                  <p
                    className="body"
                    style={{
                      fontStyle: "italic",
                      paddingLeft: 12,
                      borderLeft: "2px solid var(--line)",
                    }}
                  >
                    « {evaluation.reviewerComment} »
                  </p>
                </div>
              )}
              {evaluation.nextYearObjectives && (
                <div>
                  <p className="small" style={{ marginBottom: 4 }}>
                    Objectifs N+1 :
                  </p>
                  <p
                    className="body"
                    style={{
                      paddingLeft: 12,
                      borderLeft: "2px solid var(--line)",
                    }}
                  >
                    {evaluation.nextYearObjectives}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Commentaire évalué */}
        {evaluation.evaluateeComment && (
          <div className="tile">
            <h2 className="eyebrow" style={{ marginBottom: 16 }}>
              Commentaire de l'évalué
            </h2>
            <p className="body" style={{ fontStyle: "italic" }}>
              « {evaluation.evaluateeComment} »
            </p>
            {evaluation.disagreementFlag && (
              <span className="badge red" style={{ marginTop: 12 }}>
                <AlertTriangle
                  className="ico"
                  style={{ width: 14, height: 14 }}
                />{" "}
                Désaccord signalé
              </span>
            )}
          </div>
        )}

        <SignatureSection
          evaluationId={id}
          signatures={evaluation.signatures ?? []}
          status={evaluation.status}
          evaluatorId={evaluation.evaluatorId}
          evaluateeId={evaluation.evaluateeId}
        />
      </div>
    </div>
  );
}
