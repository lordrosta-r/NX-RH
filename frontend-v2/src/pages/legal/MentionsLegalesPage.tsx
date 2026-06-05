import { PageHead, Tile } from "../../components/shell";

const LAST_UPDATE = "5 juin 2026";

export default function MentionsLegalesPage() {
  return (
    <>
      <PageHead
        eyebrow="Informations légales"
        title="Mentions légales"
        desc={`NanoXplore RH — Dernière mise à jour : ${LAST_UPDATE}`}
      />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8">
          <Tile className="mb-6">
            <h2 className="h2" style={{ marginBottom: 12 }}>
              Éditeur
            </h2>
            <p className="body">
              La plateforme <b>NanoXplore RH</b> est éditée par la société
              <b> NanoXplore</b>, à usage strictement interne pour la gestion
              des entretiens professionnels de ses collaborateurs.
            </p>
            <p className="body" style={{ marginTop: 8 }}>
              Contact :{" "}
              <a className="link" href="mailto:rh-support@nanoxplore.com">
                rh-support@nanoxplore.com
              </a>
            </p>
          </Tile>

          <Tile className="mb-6">
            <h2 className="h2" style={{ marginBottom: 12 }}>
              Hébergement
            </h2>
            <p className="body">
              L’application et ses données sont hébergées sur une infrastructure
              située dans l’Union européenne. Les échanges sont chiffrés via le
              protocole TLS.
            </p>
          </Tile>

          <Tile className="mb-6">
            <h2 className="h2" style={{ marginBottom: 12 }}>
              Propriété intellectuelle
            </h2>
            <p className="body">
              L’ensemble des éléments de la plateforme (code, interface,
              identité visuelle, contenus) est la propriété de NanoXplore. Toute
              reproduction ou diffusion non autorisée est interdite.
            </p>
          </Tile>

          <Tile>
            <h2 className="h2" style={{ marginBottom: 12 }}>
              Usage &amp; confidentialité
            </h2>
            <p className="body">
              L’accès à NanoXplore RH est réservé aux collaborateurs habilités.
              Chaque utilisateur est responsable de la confidentialité de ses
              identifiants. Le traitement des données personnelles est décrit
              dans notre{" "}
              <a className="link" href="/confidentialite">
                politique de protection des données
              </a>
              .
            </p>
          </Tile>
        </div>

        <div className="col-span-12 lg:col-span-4">
          <Tile>
            <p className="eyebrow">En bref</p>
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
              <li>Application interne NanoXplore</li>
              <li>Hébergement Union européenne</li>
              <li>Accès réservé aux collaborateurs</li>
              <li>Conforme RGPD</li>
            </ul>
          </Tile>
        </div>
      </div>
    </>
  );
}
