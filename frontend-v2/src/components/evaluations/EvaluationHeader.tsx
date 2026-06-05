import { AlertTriangle } from "lucide-react";
import type { Evaluation } from "../../types";

interface EvaluationHeaderProps {
  evaluation: Evaluation;
}

export function EvaluationHeader({ evaluation }: EvaluationHeaderProps) {
  const firstName = evaluation.evaluatee?.firstName ?? "";
  const lastName = evaluation.evaluatee?.lastName ?? "";
  const initials =
    `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "?";

  return (
    <div
      className="tile row wrap"
      style={{ width: "100%", gap: 20, marginBottom: 22 }}
    >
      <span className="avatar" aria-hidden="true">
        {initials}
      </span>
      <div className="row wrap" style={{ gap: 28, flex: 1, minWidth: 0 }}>
        <div>
          <div className="small">Évalué</div>
          <div className="h3">
            {firstName} {lastName}
          </div>
        </div>
        <div>
          <div className="small">Campagne</div>
          <div
            className="body"
            style={{ fontWeight: 600, color: "var(--ink)" }}
          >
            {evaluation.campaign?.name}
          </div>
        </div>
        {evaluation.deadline && (
          <div>
            <div className="small">Deadline</div>
            <div
              className="body"
              style={{ fontWeight: 600, color: "var(--ink)" }}
            >
              {new Date(evaluation.deadline).toLocaleDateString("fr-FR")}
            </div>
          </div>
        )}
      </div>
      {evaluation.disagreementFlag && (
        <span className="badge red">
          <AlertTriangle style={{ width: 14, height: 14 }} aria-hidden="true" />
          Désaccord signalé
        </span>
      )}
    </div>
  );
}
