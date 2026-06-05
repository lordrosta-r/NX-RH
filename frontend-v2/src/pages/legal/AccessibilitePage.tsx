import { PageHead, Tile, Callout } from "../../components/shell";

const LAST_UPDATE = "5 juin 2026";

export default function AccessibilitePage() {
  return (
    <>
      <PageHead
        eyebrow="Accessibilité"
        title="Déclaration d’accessibilité"
        desc={`NanoXplore RH — Dernière mise à jour : ${LAST_UPDATE}`}
      />

      <Callout tone="blue" className="mb-6">
        <p className="body" style={{ color: "var(--ink)" }}>
          NanoXplore s’engage à rendre sa plateforme RH accessible au plus grand
          nombre, conformément aux principes du référentiel RGAA et des règles
          WCAG 2.1 niveau AA.
        </p>
      </Callout>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8">
          <Tile className="mb-6">
            <h2 className="h2" style={{ marginBottom: 12 }}>
              État de conformité
            </h2>
            <p className="body">
              La plateforme est <b>partiellement conforme</b>. Des actions
              continues sont menées pour améliorer l’accessibilité : libellés de
              formulaires associés, navigation au clavier, contrastes de
              couleurs, textes alternatifs et points d’entrée (skip-link,
              landmarks).
            </p>
          </Tile>

          <Tile className="mb-6">
            <h2 className="h2" style={{ marginBottom: 12 }}>
              Mesures mises en œuvre
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
              <li>Lien d’évitement « Aller au contenu principal ».</li>
              <li>
                Champs de formulaire associés à un libellé ou un{" "}
                <code>aria-label</code>.
              </li>
              <li>Boutons à icône seule dotés d’un intitulé accessible.</li>
              <li>
                Hiérarchie de titres cohérente (un seul <code>h1</code> par
                page).
              </li>
              <li>
                Indicateur de focus visible et navigation clavier des menus.
              </li>
            </ul>
          </Tile>

          <Tile>
            <h2 className="h2" style={{ marginBottom: 12 }}>
              Voie de recours
            </h2>
            <p className="body">
              Si vous rencontrez un défaut d’accessibilité vous empêchant
              d’accéder à un contenu ou à une fonctionnalité, contactez l’équipe
              RH à l’adresse{" "}
              <a className="link" href="mailto:rh-support@nanoxplore.com">
                rh-support@nanoxplore.com
              </a>{" "}
              afin qu’une alternative vous soit proposée.
            </p>
          </Tile>
        </div>

        <div className="col-span-12 lg:col-span-4">
          <Tile>
            <p className="eyebrow">Référentiels</p>
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
              <li>RGAA (France)</li>
              <li>WCAG 2.1 — niveau AA visé</li>
            </ul>
          </Tile>
        </div>
      </div>
    </>
  );
}
