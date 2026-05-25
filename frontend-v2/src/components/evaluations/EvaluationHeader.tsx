import { AlertTriangle } from "lucide-react";
import type { Evaluation } from "../../types";

interface EvaluationHeaderProps {
  evaluation: Evaluation;
}

export function EvaluationHeader({ evaluation }: EvaluationHeaderProps) {
  return (
    <div className="flex items-center gap-4 mb-4 text-sm text-slate-600 flex-wrap">
      <span>
        Évalué :{" "}
        <strong className="text-slate-900">
          {evaluation.evaluatee?.firstName} {evaluation.evaluatee?.lastName}
        </strong>
      </span>
      <span>
        Campagne :{" "}
        <strong className="text-slate-900">{evaluation.campaign?.name}</strong>
      </span>
      {evaluation.deadline && (
        <span>
          Deadline :{" "}
          <strong className="text-slate-900">
            {new Date(evaluation.deadline).toLocaleDateString("fr-FR")}
          </strong>
        </span>
      )}
      {evaluation.disagreementFlag && (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-warning-50 text-warning-700 border border-warning-200 rounded-full text-xs font-medium">
          <AlertTriangle className="w-3.5 h-3.5" /> Désaccord signalé
        </span>
      )}
    </div>
  );
}
