import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Evaluation, FormQuestion } from "../../types";
import type { EvalMutationHandle } from "../../types/evaluation";
import { EvaluationProgress } from "./EvaluationProgress";

interface EvaluationSkillsFormProps {
  evaluation: Evaluation;
  answers: Record<string, unknown>;
  currentQuestionIdx: number;
  currentPhase: string | null;
  submitModal: boolean;
  questions: FormQuestion[];
  phases: string[];
  filteredQuestions: FormQuestion[];
  currentQuestion: FormQuestion | undefined;
  answeredCount: number;
  lastSavedAt: Date | null;
  setAnswer: (questionId: string, value: unknown) => void;
  setCurrentQuestionIdx: Dispatch<SetStateAction<number>>;
  setCurrentPhase: Dispatch<SetStateAction<string | null>>;
  setSubmitModal: Dispatch<SetStateAction<boolean>>;
  submitMutation: EvalMutationHandle;
}

export function EvaluationSkillsForm({
  answers,
  currentQuestionIdx,
  currentPhase,
  submitModal,
  questions,
  phases,
  filteredQuestions,
  currentQuestion,
  answeredCount,
  lastSavedAt,
  setAnswer,
  setCurrentQuestionIdx,
  setCurrentPhase,
  setSubmitModal,
  submitMutation,
}: EvaluationSkillsFormProps) {
  const handlePhaseChange = useCallback(
    (phase: string | null) => {
      setCurrentPhase(phase);
      setCurrentQuestionIdx(0);
    },
    [setCurrentPhase, setCurrentQuestionIdx],
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-slate-900">
          Remplir l'évaluation
        </h1>
        {lastSavedAt && (
          <span className="text-xs text-slate-500">
            Sauvegardé à{" "}
            {lastSavedAt.toLocaleTimeString("fr-FR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
      </div>

      <EvaluationProgress
        answeredCount={answeredCount}
        totalQuestions={questions.length}
        phases={phases}
        currentPhase={currentPhase}
        onPhaseChange={handlePhaseChange}
      />

      {currentQuestion && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-4">
          <p className="text-xs text-slate-500 mb-2">
            Question {currentQuestionIdx + 1} / {filteredQuestions.length}
          </p>
          <p className="text-base font-medium text-slate-900 mb-4">
            {currentQuestion.text}
          </p>

          {currentQuestion.type === "rating" && (
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((v) => (
                <button
                  key={v}
                  onClick={() => setAnswer(currentQuestion.id, v)}
                  className={`w-10 h-10 rounded-full border-2 font-semibold text-sm transition-all ${
                    answers[currentQuestion.id] === v
                      ? "border-primary-500 bg-primary-500 text-white"
                      : "border-slate-200 text-slate-600 hover:border-primary-300"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          )}

          {(currentQuestion.type === "text" ||
            currentQuestion.type === "textarea") && (
            <textarea
              rows={4}
              value={String(answers[currentQuestion.id] ?? "")}
              onChange={(e) => setAnswer(currentQuestion.id, e.target.value)}
              placeholder="Votre réponse…"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-200 resize-none"
            />
          )}

          {currentQuestion.type === "yes_no" && (
            <div className="flex gap-3">
              {["Oui", "Non"].map((opt) => (
                <button
                  key={opt}
                  onClick={() => setAnswer(currentQuestion.id, opt)}
                  className={`px-6 py-2 rounded-md border-2 font-medium text-sm transition-all ${
                    answers[currentQuestion.id] === opt
                      ? "border-primary-500 bg-primary-500 text-white"
                      : "border-slate-200 text-slate-600 hover:border-primary-300"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          {currentQuestion.type === "choice" && currentQuestion.options && (
            <div className="space-y-2">
              {currentQuestion.options.map((opt) => (
                <button
                  key={opt}
                  onClick={() => setAnswer(currentQuestion.id, opt)}
                  className={`w-full text-left px-4 py-3 rounded-md border-2 text-sm transition-all ${
                    answers[currentQuestion.id] === opt
                      ? "border-primary-500 bg-primary-50 text-primary-700 font-medium"
                      : "border-slate-200 text-slate-700 hover:border-slate-300"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          {currentQuestion.type === "rating" && (
            <div className="mt-4">
              <label className="block text-xs text-slate-500 mb-1">
                Note (optionnelle)
              </label>
              <input
                type="text"
                value={String(answers[`${currentQuestion.id}_note`] ?? "")}
                onChange={(e) =>
                  setAnswer(`${currentQuestion.id}_note`, e.target.value)
                }
                placeholder="Commentaire…"
                className="w-full h-9 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
              />
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          disabled={currentQuestionIdx === 0}
          onClick={() => setCurrentQuestionIdx((i) => i - 1)}
          className="px-4 py-2 border border-slate-200 rounded-md text-sm font-medium hover:bg-slate-50 disabled:opacity-40"
        >
          ← Précédent
        </button>
        {currentQuestionIdx < filteredQuestions.length - 1 ? (
          <button
            onClick={() => setCurrentQuestionIdx((i) => i + 1)}
            className="px-4 py-2 bg-primary-500 text-white rounded-md text-sm font-medium hover:bg-primary-600"
          >
            Suivant →
          </button>
        ) : (
          <button
            onClick={() => setSubmitModal(true)}
            className="px-6 py-2 bg-success-500 text-white rounded-md text-sm font-semibold hover:bg-success-600"
          >
            Soumettre l'évaluation
          </button>
        )}
      </div>

      {submitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Confirmer la soumission ?
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Vous ne pourrez plus modifier vos réponses après soumission.{" "}
              {answeredCount < questions.length && (
                <span className="text-warning-600 font-medium">
                  {questions.length - answeredCount} question(s) non
                  répondue(s).
                </span>
              )}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setSubmitModal(false)}
                className="px-4 py-2 text-sm border border-slate-200 rounded-md hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                onClick={() => submitMutation.mutate()}
                disabled={submitMutation.isPending}
                className="px-4 py-2 text-sm bg-success-500 text-white rounded-md hover:bg-success-600 disabled:opacity-50"
              >
                {submitMutation.isPending
                  ? "Soumission…"
                  : "Confirmer la soumission"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
