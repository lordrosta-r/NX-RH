import Tooltip from "./Tooltip";
import { getDefinition } from "../../lib/glossary";

interface GlossaryTermProps {
  /** Terme à expliquer (ex. "PDI"). La définition est résolue depuis le glossaire. */
  term: string;
  /** Texte affiché (défaut : le terme lui-même). */
  children?: string;
}

/**
 * Terme métier inline avec infobulle de définition (glossaire partagé).
 * Si le terme est inconnu du glossaire, rend simplement le texte sans tooltip.
 */
export default function GlossaryTerm({ term, children }: GlossaryTermProps) {
  const definition = getDefinition(term);
  const label = children ?? term;

  if (!definition) return <>{label}</>;

  return (
    <Tooltip content={definition}>
      <abbr
        title=""
        style={{
          textDecoration: "underline dotted",
          textUnderlineOffset: 3,
          cursor: "help",
        }}
      >
        {label}
      </abbr>
    </Tooltip>
  );
}
