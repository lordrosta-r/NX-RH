// Source de vérité unique du glossaire métier. Utilisée à la fois par le
// composant inline <GlossaryTerm> (tooltips sur acronymes) et par la section
// glossaire de la page Aides.

export interface GlossaryEntry {
  term: string;
  definition: string;
}

export const GLOSSARY: GlossaryEntry[] = [
  {
    term: "PDI",
    definition:
      "Plan de Développement Individuel : vos objectifs de développement et les actions de suivi, co-signés avec votre responsable.",
  },
  {
    term: "Édition précédente",
    definition:
      "La réponse de la campagne précédente, reprise en rappel contextuel sous une question lors de l'évaluation en cours.",
  },
  {
    term: "N+1",
    definition: "Les objectifs fixés pour la période (l'année) suivante.",
  },
  {
    term: "Feedback ascendant",
    definition:
      "Retour donné par un collaborateur sur son responsable, souvent anonyme.",
  },
  {
    term: "Évaluateur",
    definition:
      "La personne qui remplit et soumet l'évaluation (souvent le responsable, parfois un évaluateur transverse désigné).",
  },
  {
    term: "Évalué",
    definition: "La personne dont les compétences et objectifs sont évalués.",
  },
  {
    term: "Litige",
    definition:
      "Désaccord formel de l'évalué après révision : l'évaluation est transmise aux RH pour arbitrage au lieu d'être signée.",
  },
  {
    term: "Responsable transverse",
    definition:
      "Lien fonctionnel (matriciel) : chef de projet ou responsable transverse qui obtient la visibilité sur vos évaluations. La signature hiérarchique reste au manager direct.",
  },
];

const GLOSSARY_MAP: Record<string, string> = Object.fromEntries(
  GLOSSARY.map((e) => [e.term.toLowerCase(), e.definition]),
);

/** Définition d'un terme (insensible à la casse), ou undefined si inconnu. */
export function getDefinition(term: string): string | undefined {
  return GLOSSARY_MAP[term.toLowerCase()];
}
