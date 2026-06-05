import { useQuery } from "@tanstack/react-query";
import { evaluationsApi } from "../../api/evaluations";
import type { N1Context } from "../../types";

interface N1ImportViewProps {
  evaluationId: string;
}

// Affichage auto + lecture seule des données de l'évaluation N-1.
// Type de question `n1_import` : pas de saisie, on lit l'endpoint dédié.
export function N1ImportView({ evaluationId }: N1ImportViewProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["evaluations", "n1-context", evaluationId],
    queryFn: () =>
      evaluationsApi.getN1Context(evaluationId).then((r) => r.data),
    enabled: !!evaluationId,
  });

  if (isLoading) {
    return (
      <div
        className="tile"
        style={{ height: 80, background: "var(--bg-alt)" }}
        aria-hidden="true"
      />
    );
  }

  // 204 No Content → axios renvoie une chaîne vide ; ou erreur réseau.
  if (isError || !data || typeof data === "string") {
    return (
      <p className="small" style={{ fontStyle: "italic" }}>
        Aucune donnée de l'année précédente (N-1) disponible.
      </p>
    );
  }

  const n1 = data as N1Context;

  return (
    <div className="tile section-gap">
      {n1.n1Campaign?.name && (
        <p className="small">
          Source : {n1.n1Campaign.name}
          {n1.formTitle ? ` — ${n1.formTitle}` : ""}
        </p>
      )}

      {n1.reviewerScore != null && (
        <div className="row nxgap-12">
          <span className="body" style={{ fontWeight: 600 }}>
            Note N-1 :
          </span>
          <span className="badge blue">{n1.reviewerScore}</span>
        </div>
      )}

      {n1.reviewerComment && (
        <div>
          <p className="h3" style={{ marginBottom: 4 }}>
            Appréciation N-1
          </p>
          <p className="body" style={{ whiteSpace: "pre-wrap" }}>
            {n1.reviewerComment}
          </p>
        </div>
      )}

      {n1.nextYearObjectives && (
        <div>
          <p className="h3" style={{ marginBottom: 4 }}>
            Objectifs fixés pour l'année
          </p>
          <p className="body" style={{ whiteSpace: "pre-wrap" }}>
            {n1.nextYearObjectives}
          </p>
        </div>
      )}

      {n1.objectivesAnswers?.length > 0 && (
        <div>
          <p className="h3" style={{ marginBottom: 8 }}>
            Réponses N-1 (objectifs)
          </p>
          <ul style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {n1.objectivesAnswers.map((a) => (
              <li key={a.questionId} className="body">
                <span className="small">{a.questionLabel} : </span>
                {typeof a.value === "object"
                  ? JSON.stringify(a.value)
                  : String(a.value ?? "—")}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
