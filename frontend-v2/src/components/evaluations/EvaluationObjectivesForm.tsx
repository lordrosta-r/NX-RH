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
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          Révision de l'évaluation
        </h1>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-warning-50 text-warning-700">
            Soumise
          </span>
          <button
            onClick={() => exportEvaluationPdf(evaluation)}
            className="inline-flex items-center gap-2 border border-slate-200 hover:bg-slate-50 px-3 py-1.5 rounded-md text-sm"
          >
            <Download className="w-4 h-4" /> PDF
          </button>
          {(isAdminOrHr || isManager) && (
            <button
              onClick={() => reviewMutation.mutate()}
              disabled={reviewMutation.isPending}
              className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-3 py-1.5 rounded-md text-sm font-medium disabled:opacity-50"
            >
              {reviewMutation.isPending ? "Traitement…" : "Revoir →"}
            </button>
          )}
        </div>
      </div>

      {/* Réponses en lecture seule */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">
          Réponses de l'évalué
        </h2>
        <div className="space-y-4">
          {questions.map((q, idx) => (
            <div
              key={q.id}
              className="pb-4 border-b border-slate-100 last:border-0"
            >
              <p className="text-xs text-slate-400 mb-1">
                Q{idx + 1} · {q.type}
              </p>
              <p className="text-sm font-medium text-slate-800 mb-2">
                {q.text}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-primary-600 text-sm">➤</span>
                {q.type === "rating" && answers[q.id] !== undefined ? (
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((v) => (
                      <div
                        key={v}
                        className={`w-7 h-7 rounded-full text-xs font-semibold flex items-center justify-center ${
                          Number(answers[q.id]) >= v
                            ? "bg-primary-500 text-white"
                            : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        {v}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-700 italic">
                    {String(answers[q.id] ?? "—")}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Formulaire de révision */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">
          Votre révision
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Score global <span className="text-error-500">*</span>
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={0}
                max={100}
                value={reviewerScore}
                onChange={(e) =>
                  setReviewerScore(
                    e.target.value === "" ? "" : Number(e.target.value),
                  )
                }
                className="w-24 h-10 px-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
              />
              <span className="text-sm text-slate-500">/ 100</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Commentaire
            </label>
            <textarea
              rows={3}
              value={reviewerComment}
              onChange={(e) => setReviewerComment(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-200 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Objectifs N+1
            </label>
            <textarea
              rows={3}
              value={nextYearObjectives}
              onChange={(e) => setNextYearObjectives(e.target.value)}
              placeholder="Objectifs pour l'année prochaine…"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-200 resize-none"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={() => navigate("/evaluations")}
            className="px-4 py-2 text-sm border border-slate-200 rounded-md hover:bg-slate-50"
          >
            Annuler
          </button>
          <button
            onClick={() => reviewMutation.mutate()}
            disabled={reviewMutation.isPending || reviewerScore === ""}
            className="px-4 py-2 text-sm bg-primary-500 text-white rounded-md hover:bg-primary-600 disabled:opacity-50"
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
