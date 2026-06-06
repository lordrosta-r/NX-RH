import { useQuery } from "@tanstack/react-query";
import { History } from "lucide-react";
import { evaluationsApi } from "../../api/evaluations";
import { AnswerView } from "./AnswerView";
import type { N1Context } from "../../types";

interface PreviousEditionAccordionProps {
  evaluationId: string;
  questionId: string;
}

// Accordéon contextuel « Édition précédente », affiché SOUS une question
// pendant le remplissage — uniquement si la RH a coché carryPrevious ET qu'une
// réponse de l'édition précédente existe pour cette question (via la lignée).
// Replié par défaut : zéro surcharge tant que l'utilisateur ne l'ouvre pas.
export function PreviousEditionAccordion({
  evaluationId,
  questionId,
}: PreviousEditionAccordionProps) {
  const { data } = useQuery({
    queryKey: ["evaluations", "n1-context", evaluationId],
    queryFn: () =>
      evaluationsApi.getN1Context(evaluationId).then((r) => r.data),
    enabled: !!evaluationId,
    staleTime: 5 * 60 * 1000,
  });

  // 204 → chaîne vide ; pas de données → rien à afficher.
  if (!data || typeof data === "string") return null;
  const n1 = data as N1Context;
  const entry = n1.byQuestion?.[questionId];
  if (!entry) return null;

  return (
    <details
      style={{
        marginTop: 12,
        border: "1px solid var(--line)",
        borderRadius: "var(--radius)",
        background: "var(--bg-alt)",
      }}
    >
      <summary
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 14px",
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 600,
          color: "var(--ink-2)",
          listStyle: "none",
        }}
      >
        <History size={15} style={{ color: "var(--blue)" }} />
        Édition précédente
        {n1.n1Campaign?.name && (
          <span style={{ fontWeight: 400, color: "var(--ink-3)" }}>
            —{" "}
            {n1.n1Campaign.name.length > 40
              ? `${n1.n1Campaign.name.slice(0, 40)}…`
              : n1.n1Campaign.name}
          </span>
        )}
      </summary>
      <div style={{ padding: "0 14px 12px 37px" }}>
        <AnswerView value={entry.value} type={entry.type} scale={entry.scale} />
      </div>
    </details>
  );
}
