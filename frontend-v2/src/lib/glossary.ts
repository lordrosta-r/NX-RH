// Source de vérité unique du glossaire métier. Utilisée à la fois par le
// composant inline <GlossaryTerm> (tooltips sur acronymes) et par la section
// glossaire de la page Aides.

export interface GlossaryEntry {
  term: string;
  definition: string;
}

export const GLOSSARY: GlossaryEntry[] = [
  {
    term: "Campagne",
    definition:
      "Cycle d'évaluation lancé par les RH sur une période et un périmètre donnés : il génère les évaluations des collaborateurs concernés.",
  },
  {
    term: "Formulaire",
    definition:
      "Trame de questions (compétences, objectifs) utilisée dans une campagne. Il devient « gelé » dès qu'il est utilisé ; pour le faire évoluer, on le clone.",
  },
  {
    term: "Évaluation",
    definition:
      "Le dossier d'un collaborateur dans une campagne : il suit un circuit (remplissage → soumission → révision → signature → validation RH).",
  },
  {
    term: "Synthèse d'entretien",
    definition:
      "Le compte-rendu commun rédigé pendant l'entretien : positions actées, revue des objectifs passés et objectifs N+1, signé par le manager et l'évalué.",
  },
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
