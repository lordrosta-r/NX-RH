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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          Compte-rendu — {evaluation.evaluatee?.firstName}{" "}
          {evaluation.evaluatee?.lastName}
        </h1>
        <button
          onClick={() => exportEvaluationPdf(evaluation)}
          className="inline-flex items-center gap-2 border border-slate-200 hover:bg-slate-50 px-4 py-2 rounded-md text-sm font-medium"
        >
          <Download className="w-4 h-4" /> Télécharger PDF
        </button>
      </div>

      <div className="space-y-6">
        {/* Réponses */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">
            Réponses
          </h2>
          <div className="space-y-4">
            {questions.map((q, idx) => (
              <div
                key={q.id}
                className="pb-4 border-b border-slate-100 last:border-0"
              >
                <p className="text-sm font-medium text-slate-800 mb-1">
                  Q{idx + 1}. {q.text}
                </p>
                <p className="text-sm text-slate-600 pl-4">
                  ➤ {String(answers[q.id] ?? "—")}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Résumé révision */}
        {evaluation.reviewerScore !== undefined && (
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">
              Révision
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-500">Score :</span>
                <span className="text-lg font-bold text-slate-900">
                  {evaluation.reviewerScore}/100
                </span>
              </div>
              {evaluation.reviewerComment && (
                <div>
                  <p className="text-sm text-slate-500 mb-1">
                    Commentaire reviewer :
                  </p>
                  <p className="text-sm text-slate-700 italic pl-3 border-l-2 border-slate-200">
                    « {evaluation.reviewerComment} »
                  </p>
                </div>
              )}
              {evaluation.nextYearObjectives && (
                <div>
                  <p className="text-sm text-slate-500 mb-1">Objectifs N+1 :</p>
                  <p className="text-sm text-slate-700 pl-3 border-l-2 border-slate-200">
                    {evaluation.nextYearObjectives}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Commentaire évalué */}
        {evaluation.evaluateeComment && (
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">
              Commentaire de l'évalué
            </h2>
            <p className="text-sm text-slate-700 italic">
              « {evaluation.evaluateeComment} »
            </p>
            {evaluation.disagreementFlag && (
              <div className="mt-3 flex items-center gap-2 text-warning-600 text-sm font-medium">
                <AlertTriangle className="w-4 h-4" /> Désaccord signalé
              </div>
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
