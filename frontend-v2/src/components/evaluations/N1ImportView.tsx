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
        className="h-20 bg-slate-100 rounded-lg animate-pulse"
        aria-hidden="true"
      />
    );
  }

  // 204 No Content → axios renvoie une chaîne vide ; ou erreur réseau.
  if (isError || !data || typeof data === "string") {
    return (
      <p className="text-sm text-slate-500 italic">
        Aucune donnée de l'année précédente (N-1) disponible.
      </p>
    );
  }

  const n1 = data as N1Context;

  return (
    <div className="space-y-4 text-sm">
      {n1.n1Campaign?.name && (
        <p className="text-xs text-slate-500">
          Source : {n1.n1Campaign.name}
          {n1.formTitle ? ` — ${n1.formTitle}` : ""}
        </p>
      )}

      {n1.reviewerScore != null && (
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-700">Note N-1 :</span>
          <span className="px-2 py-0.5 rounded-md bg-primary-50 text-primary-700 font-semibold">
            {n1.reviewerScore}
          </span>
        </div>
      )}

      {n1.reviewerComment && (
        <div>
          <p className="font-medium text-slate-700 mb-1">Appréciation N-1</p>
          <p className="text-slate-600 whitespace-pre-wrap">
            {n1.reviewerComment}
          </p>
        </div>
      )}

      {n1.nextYearObjectives && (
        <div>
          <p className="font-medium text-slate-700 mb-1">
            Objectifs fixés pour l'année
          </p>
          <p className="text-slate-600 whitespace-pre-wrap">
            {n1.nextYearObjectives}
          </p>
        </div>
      )}

      {n1.objectivesAnswers?.length > 0 && (
        <div>
          <p className="font-medium text-slate-700 mb-1">
            Réponses N-1 (objectifs)
          </p>
          <ul className="space-y-1">
            {n1.objectivesAnswers.map((a) => (
              <li key={a.questionId} className="text-slate-600">
                <span className="text-slate-500">{a.questionLabel} : </span>
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
