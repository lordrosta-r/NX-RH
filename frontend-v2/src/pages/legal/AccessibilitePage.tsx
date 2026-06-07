import { useTranslation } from "react-i18next";
import { PageHead, Tile, Callout } from "../../components/shell";

const LAST_UPDATE_FR = "5 juin 2026";
const LAST_UPDATE_EN = "June 5, 2026";

export default function AccessibilitePage() {
  const { i18n } = useTranslation();
  const en = i18n.language?.startsWith("en") ?? false;

  return (
    <>
      <PageHead
        eyebrow={en ? "Accessibility" : "Accessibilité"}
        title={
          en ? "Accessibility statement" : "Déclaration d’accessibilité"
        }
        desc={
          en
            ? `NanoXplore HR — Last updated: ${LAST_UPDATE_EN}`
            : `NanoXplore RH — Dernière mise à jour : ${LAST_UPDATE_FR}`
        }
      />

      <Callout tone="blue" className="mb-6">
        <p className="body" style={{ color: "var(--ink)" }}>
          {en
            ? "NanoXplore is committed to making its HR platform accessible to as many people as possible, in line with the principles of the RGAA framework and the WCAG 2.1 level AA guidelines."
            : "NanoXplore s’engage à rendre sa plateforme RH accessible au plus grand nombre, conformément aux principes du référentiel RGAA et des règles WCAG 2.1 niveau AA."}
        </p>
      </Callout>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8">
          <Tile className="mb-6">
            <h2 className="h2" style={{ marginBottom: 12 }}>
              {en ? "Compliance status" : "État de conformité"}
            </h2>
            <p className="body">
              {en ? (
                <>
                  The platform is <b>partially compliant</b>. Ongoing efforts
                  are being made to improve accessibility: associated form
                  labels, keyboard navigation, color contrast, alternative text
                  and entry points (skip-link, landmarks).
                </>
              ) : (
                <>
                  La plateforme est <b>partiellement conforme</b>. Des actions
                  continues sont menées pour améliorer l’accessibilité :
                  libellés de formulaires associés, navigation au clavier,
                  contrastes de couleurs, textes alternatifs et points d’entrée
                  (skip-link, landmarks).
                </>
              )}
            </p>
          </Tile>

          <Tile className="mb-6">
            <h2 className="h2" style={{ marginBottom: 12 }}>
              {en ? "Measures implemented" : "Mesures mises en œuvre"}
            </h2>
            <ul
              className="body"
              style={{
                paddingLeft: 18,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              {en ? (
                <>
                  <li>“Skip to main content” bypass link.</li>
                  <li>
                    Form fields associated with a label or an{" "}
                    <code>aria-label</code>.
                  </li>
                  <li>Icon-only buttons given an accessible name.</li>
                  <li>
                    Consistent heading hierarchy (a single <code>h1</code> per
                    page).
                  </li>
                  <li>
                    Visible focus indicator and keyboard navigation of menus.
                  </li>
                </>
              ) : (
                <>
                  <li>Lien d’évitement « Aller au contenu principal ».</li>
                  <li>
                    Champs de formulaire associés à un libellé ou un{" "}
                    <code>aria-label</code>.
                  </li>
                  <li>
                    Boutons à icône seule dotés d’un intitulé accessible.
                  </li>
                  <li>
                    Hiérarchie de titres cohérente (un seul <code>h1</code> par
                    page).
                  </li>
                  <li>
                    Indicateur de focus visible et navigation clavier des menus.
                  </li>
                </>
              )}
            </ul>
          </Tile>

          <Tile>
            <h2 className="h2" style={{ marginBottom: 12 }}>
              {en ? "Means of recourse" : "Voie de recours"}
            </h2>
            <p className="body">
              {en ? (
                <>
                  If you encounter an accessibility issue preventing you from
                  accessing content or a feature, contact the HR team at{" "}
                  <a className="link" href="mailto:rh-support@nanoxplore.com">
                    rh-support@nanoxplore.com
                  </a>{" "}
                  so that an alternative can be offered to you.
                </>
              ) : (
                <>
                  Si vous rencontrez un défaut d’accessibilité vous empêchant
                  d’accéder à un contenu ou à une fonctionnalité, contactez
                  l’équipe RH à l’adresse{" "}
                  <a className="link" href="mailto:rh-support@nanoxplore.com">
                    rh-support@nanoxplore.com
                  </a>{" "}
                  afin qu’une alternative vous soit proposée.
                </>
              )}
            </p>
          </Tile>
        </div>

        <div className="col-span-12 lg:col-span-4">
          <Tile>
            <p className="eyebrow">{en ? "Frameworks" : "Référentiels"}</p>
            <ul
              className="small"
              style={{
                marginTop: 10,
                paddingLeft: 16,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              {en ? (
                <>
                  <li>RGAA (France)</li>
                  <li>WCAG 2.1 — level AA targeted</li>
                </>
              ) : (
                <>
                  <li>RGAA (France)</li>
                  <li>WCAG 2.1 — niveau AA visé</li>
                </>
              )}
            </ul>
          </Tile>
        </div>
      </div>
    </>
  );
}
