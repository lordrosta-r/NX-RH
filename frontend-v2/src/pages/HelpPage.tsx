import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import { PageHead, Tile, Callout } from "../components/shell";
import { GLOSSARY } from "../lib/glossary";
import type { Role } from "../types";

// ─── Contenu d'aide ──────────────────────────────────────────────────────────
// Anti-exposition ÉDITORIALE : il n'existe AUCUNE section d'aide pour les
// procédures admin sensibles (impersonation, déblocage d'évaluation, LDAP,
// config sécurité). L'admin accède bien à /help (non masqué) mais n'y trouve
// que les sections communes. Ne jamais ajouter de contenu admin sensible ici.

interface HelpSection {
  title: string;
  body: string[];
}

// Bases communes — comprendre l'app côté collaborateur. Servies à tous,
// admin compris.
const COMMON: HelpSection[] = [
  {
    title: "Comprendre mon évaluation",
    body: [
      "Une évaluation suit un circuit en étapes : remplissage → soumission → révision par le responsable → prise de connaissance et signature → validation RH.",
      "Vous ne pouvez pas sauter d'étape : ce que vous voyez dépend du statut courant de l'évaluation et de votre rôle.",
      "Vos réponses sont enregistrées automatiquement. Un indicateur « Sauvegardé à HH:MM » confirme l'enregistrement ; en cas d'échec réseau, un message rouge apparaît et vos réponses sont conservées localement.",
    ],
  },
  {
    title: "Le vocabulaire (PDI, Édition précédente, N+1, aspirations)",
    body: [
      "PDI : Plan de Développement Individuel — vos objectifs de développement et les actions associées.",
      "Édition précédente : la réponse de la campagne précédente, reprise en rappel sous une question.",
      "N+1 : les objectifs fixés pour la période suivante.",
      "Feedback ascendant : retour donné par un collaborateur sur son responsable (souvent anonyme).",
    ],
  },
  {
    title: "Signer ou contester ma prise de connaissance",
    body: [
      "Après la révision de votre responsable, vous prenez connaissance de l'évaluation. Vous pouvez ajouter un commentaire.",
      "Si vous êtes d'accord : « Signer et valider la prise de connaissance ».",
      "Si vous n'êtes pas d'accord : « Contester l'évaluation » ouvre un litige transmis aux RH pour arbitrage, sans signer. Précisez votre désaccord dans le commentaire.",
    ],
  },
  {
    title: "Mobilité interne et PDI",
    body: [
      "Vous pouvez déposer une demande de mobilité (poste, département, site) depuis l'onglet Mobilité.",
      "Votre PDI regroupe vos objectifs de développement et les actions de suivi, co-signés avec votre responsable.",
    ],
  },
];

const MANAGER: HelpSection[] = [
  {
    title: "Le cycle d'une campagne, côté responsable",
    body: [
      "Vous voyez les évaluations de votre équipe dans l'onglet Évaluations.",
      "Quand une évaluation est « soumise », vous la révisez : score global, commentaire, objectifs N+1.",
      "Après votre révision, l'évalué prend connaissance et signe ; vous co-signez ensuite.",
    ],
  },
  {
    title: "Lire l'organigramme de mon équipe",
    body: [
      "L'onglet Organisation affiche votre équipe. Votre périmètre de visibilité est défini par les RH.",
    ],
  },
];

const HR: HelpSection[] = [
  {
    title: "Lancer une campagne de A à Z",
    body: [
      "1. Créez la campagne (dates, périmètre, formulaires). 2. Générez les évaluations. 3. Suivez l'avancement via les analytics. 4. Clôturez puis archivez.",
      "Un formulaire devient « gelé » dès qu'il est utilisé : pour le faire évoluer en cours d'usage, clonez-le.",
    ],
  },
  {
    title: "Gérer les demandes (flags) et l'offboarding",
    body: [
      "Les demandes RH (mobilité, augmentation, promotion, formation) se traitent dans l'onglet dédié : à traiter → traité ou refusé.",
      "À l'offboarding d'un collaborateur, ses évaluations en tant qu'évalué sont archivées et celles où il est évaluateur d'autrui sont réassignées à son responsable.",
      "Litiges : une évaluation contestée par l'évalué vous est signalée pour arbitrage — renvoyez en révision ou actez le litige.",
    ],
  },
  {
    title: "Rappels groupés",
    body: [
      "Depuis les paramètres, ciblez une campagne et des statuts pour envoyer un rappel groupé aux collaborateurs concernés.",
    ],
  },
];

function sectionsForRole(role: Role | undefined): HelpSection[] {
  if (role === "manager") return [...COMMON, ...MANAGER];
  if (role === "hr") return [...COMMON, ...MANAGER, ...HR];
  // employee ET admin : sections communes uniquement.
  // (admin : volontairement aucune procédure admin sensible — anti-exposition)
  return COMMON;
}

export default function HelpPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const sections = sectionsForRole(user?.role);

  return (
    <div className="nx-app">
      <PageHead
        eyebrow="Aide"
        title={t("nav.help")}
        desc="Repères pour utiliser l'application au quotidien, selon votre rôle."
      />

      {user?.role === "admin" && (
        <Callout tone="blue" style={{ marginBottom: 16 }}>
          La documentation des opérations d'administration sensibles n'est pas
          publiée dans l'application. Référez-vous au runbook interne.
        </Callout>
      )}

      <div className="section-gap" style={{ gap: 12 }}>
        {sections.map((s) => (
          <Tile key={s.title}>
            <details>
              <summary
                className="h3"
                style={{ cursor: "pointer", listStyle: "revert" }}
              >
                {s.title}
              </summary>
              <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                {s.body.map((p, i) => (
                  <p key={i} className="body" style={{ color: "var(--ink-2)" }}>
                    {p}
                  </p>
                ))}
              </div>
            </details>
          </Tile>
        ))}
      </div>

      {/* Glossaire — source unique partagée avec le composant GlossaryTerm */}
      <h2 className="h3" style={{ marginTop: 32, marginBottom: 12 }}>
        Glossaire
      </h2>
      <Tile>
        <dl style={{ display: "grid", gap: 12 }}>
          {GLOSSARY.map((entry) => (
            <div key={entry.term}>
              <dt
                className="body"
                style={{ fontWeight: 700, color: "var(--ink)" }}
              >
                {entry.term}
              </dt>
              <dd
                className="small"
                style={{ color: "var(--ink-2)", margin: 0 }}
              >
                {entry.definition}
              </dd>
            </div>
          ))}
        </dl>
      </Tile>

      <p className="small" style={{ marginTop: 24, color: "var(--ink-3)" }}>
        Une question sans réponse ici ? Écrivez à{" "}
        <a className="link" href="mailto:rh-support@nanoxplore.com">
          rh-support@nanoxplore.com
        </a>
        .
      </p>
    </div>
  );
}
