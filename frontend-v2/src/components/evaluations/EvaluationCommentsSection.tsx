import type { Dispatch, SetStateAction } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { SignatureSection } from "../SignatureSection";
import type { Evaluation, EvaluationStatus } from "../../types";
import type { EvalMutationHandle } from "../../types/evaluation";

const SIGN_STATUSES = [
  "submitted",
  "reviewed",
  "signed_evaluatee",
  "signed_manager",
  "signed_hr",
] as const;
type SignStatus = (typeof SIGN_STATUSES)[number];

interface StepConfig {
  key: SignStatus;
  label: string;
}

const STEPS: StepConfig[] = [
  { key: "submitted", label: "Soumis" },
  { key: "reviewed", label: "Révisé" },
  { key: "signed_evaluatee", label: "Signé (évalué)" },
  { key: "signed_manager", label: "Signé (manager)" },
  { key: "signed_hr", label: "Signé (RH)" },
];

interface EvaluationCommentsSectionProps {
  evaluation: Evaluation;
  status: EvaluationStatus;
  id: string;
  isEvaluatee: boolean;
  isManager: boolean;
  isAdminOrHr: boolean;
  evaluateeComment: string;
  disagreementFlag: boolean;
  setEvaluateeComment: Dispatch<SetStateAction<string>>;
  setDisagreementFlag: Dispatch<SetStateAction<boolean>>;
  signMutation: EvalMutationHandle;
  validateMutation: EvalMutationHandle;
  signWithCommentMutation: EvalMutationHandle;
}

export function EvaluationCommentsSection({
  evaluation,
  status,
  id,
  isEvaluatee,
  isManager,
  isAdminOrHr,
  evaluateeComment,
  disagreementFlag,
  setEvaluateeComment,
  setDisagreementFlag,
  signMutation,
  validateMutation,
  signWithCommentMutation,
}: EvaluationCommentsSectionProps) {
  const queryClient = useQueryClient();
  const currentIdx = SIGN_STATUSES.indexOf(status as SignStatus);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">
        Compte-rendu d'entretien
      </h1>

      {/* Stepper */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          {STEPS.map((step, idx) => {
            const stepIdx = SIGN_STATUSES.indexOf(step.key);
            const isDone = stepIdx < currentIdx;
            const isCurrent = stepIdx === currentIdx;
            return (
              <div key={step.key} className="flex items-center gap-2">
                <div
                  className={`flex items-center gap-1 text-sm ${
                    isDone
                      ? "text-success-600"
                      : isCurrent
                        ? "text-primary-600 font-semibold"
                        : "text-slate-500"
                  }`}
                >
                  {isDone ? "✓" : isCurrent ? "→" : "○"} {step.label}
                </div>
                {idx < STEPS.length - 1 && (
                  <span className="text-slate-300 mx-1">─</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Désaccord */}
      {evaluation.disagreementFlag && (
        <div className="border-l-4 border-warning-500 bg-warning-50 p-4 rounded-lg mb-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-warning-600 flex-shrink-0" />
          <p className="text-sm text-warning-700 font-medium">
            L'évalué a signalé un désaccord avec cette évaluation.
          </p>
        </div>
      )}

      {/* Résumé révision */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <div className="grid grid-cols-2 gap-6">
          {evaluation.reviewerScore !== undefined && (
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                Score
              </p>
              <p className="text-2xl font-bold text-slate-900">
                {evaluation.reviewerScore}
                <span className="text-base font-normal text-slate-500">
                  /100
                </span>
              </p>
            </div>
          )}
          {evaluation.reviewerComment && (
            <div className="col-span-2">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                Commentaire reviewer
              </p>
              <p className="text-sm text-slate-700 italic">
                « {evaluation.reviewerComment} »
              </p>
            </div>
          )}
          {evaluation.nextYearObjectives && (
            <div className="col-span-2">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                Objectifs N+1
              </p>
              <p className="text-sm text-slate-700">
                {evaluation.nextYearObjectives}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Zone évalué */}
      {status === "reviewed" && isEvaluatee && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">
            Votre prise de connaissance
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Mon commentaire (facultatif)
              </label>
              <textarea
                rows={3}
                value={evaluateeComment}
                onChange={(e) => setEvaluateeComment(e.target.value)}
                placeholder="Votre commentaire sur cette évaluation…"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-200 resize-none"
              />
            </div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={disagreementFlag}
                onChange={(e) => setDisagreementFlag(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-warning-500"
              />
              <span className="text-sm text-slate-700">
                Je signale un désaccord avec cette évaluation
              </span>
            </label>
          </div>
          <div className="mt-4">
            <button
              onClick={() => signWithCommentMutation.mutate()}
              disabled={signWithCommentMutation.isPending}
              className="px-6 py-2 bg-primary-500 text-white rounded-md text-sm font-semibold hover:bg-primary-600 disabled:opacity-50"
            >
              {signWithCommentMutation.isPending
                ? "Signature…"
                : "Signer et valider la prise de connaissance"}
            </button>
          </div>
        </div>
      )}

      {/* Signature manager */}
      {status === "signed_evaluatee" && (isManager || isAdminOrHr) && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
          <p className="text-sm text-slate-600 mb-4">
            L'évalué a signé. Votre signature est maintenant requise.
          </p>
          <button
            onClick={() => signMutation.mutate()}
            disabled={signMutation.isPending}
            className="px-6 py-2 bg-primary-500 text-white rounded-md text-sm font-semibold hover:bg-primary-600 disabled:opacity-50"
          >
            {signMutation.isPending ? "Signature…" : "Signer"}
          </button>
        </div>
      )}

      {/* Signature RH */}
      {status === "signed_manager" && isAdminOrHr && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
          <p className="text-sm text-slate-600 mb-4">
            Le manager a signé. La signature RH est requise.
          </p>
          <button
            onClick={() => signMutation.mutate()}
            disabled={signMutation.isPending}
            className="px-6 py-2 bg-primary-500 text-white rounded-md text-sm font-semibold hover:bg-primary-600 disabled:opacity-50"
          >
            {signMutation.isPending ? "Signature RH…" : "Signer (RH)"}
          </button>
        </div>
      )}

      {/* Validation finale */}
      {status === "signed_hr" && isAdminOrHr && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
          <p className="text-sm text-slate-600 mb-4">
            Toutes les signatures sont collectées. Vous pouvez valider
            définitivement.
          </p>
          <button
            onClick={() => validateMutation.mutate()}
            disabled={validateMutation.isPending}
            className="px-6 py-2 bg-success-500 text-white rounded-md text-sm font-semibold hover:bg-success-600 disabled:opacity-50"
          >
            {validateMutation.isPending
              ? "Validation…"
              : "Valider définitivement"}
          </button>
        </div>
      )}

      <SignatureSection
        evaluationId={id}
        signatures={evaluation.signatures ?? []}
        status={status}
        evaluatorId={evaluation.evaluatorId}
        evaluateeId={evaluation.evaluateeId}
        onSigned={() =>
          queryClient.invalidateQueries({ queryKey: ["evaluation", id] })
        }
      />
    </div>
  );
}
