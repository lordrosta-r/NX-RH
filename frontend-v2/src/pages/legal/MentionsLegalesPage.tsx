import { useTranslation } from "react-i18next";
import { PageHead, Tile } from "../../components/shell";

const LAST_UPDATE_FR = "5 juin 2026";
const LAST_UPDATE_EN = "June 5, 2026";

export default function MentionsLegalesPage() {
  const { i18n } = useTranslation();
  const en = i18n.language?.startsWith("en") ?? false;

  return (
    <>
      <PageHead
        eyebrow={en ? "Legal information" : "Informations légales"}
        title={en ? "Legal notice" : "Mentions légales"}
        desc={
          en
            ? `NanoXplore HR — Last updated: ${LAST_UPDATE_EN}`
            : `NanoXplore RH — Dernière mise à jour : ${LAST_UPDATE_FR}`
        }
      />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8">
          <Tile className="mb-6">
            <h2 className="h2" style={{ marginBottom: 12 }}>
              {en ? "Publisher" : "Éditeur"}
            </h2>
            <p className="body">
              {en ? (
                <>
                  The <b>NanoXplore HR</b> platform is published by the company
                  <b> NanoXplore</b>, for strictly internal use in managing the
                  professional reviews of its employees.
                </>
              ) : (
                <>
                  La plateforme <b>NanoXplore RH</b> est éditée par la société
                  <b> NanoXplore</b>, à usage strictement interne pour la
                  gestion des entretiens professionnels de ses collaborateurs.
                </>
              )}
            </p>
            <p className="body" style={{ marginTop: 8 }}>
              {en ? "Contact: " : "Contact : "}
              <a className="link" href="mailto:rh-support@nanoxplore.com">
                rh-support@nanoxplore.com
              </a>
            </p>
          </Tile>

          <Tile className="mb-6">
            <h2 className="h2" style={{ marginBottom: 12 }}>
              {en ? "Hosting" : "Hébergement"}
            </h2>
            <p className="body">
              {en
                ? "The application and its data are hosted on infrastructure located within the European Union. Exchanges are encrypted using the TLS protocol."
                : "L’application et ses données sont hébergées sur une infrastructure située dans l’Union européenne. Les échanges sont chiffrés via le protocole TLS."}
            </p>
          </Tile>

          <Tile className="mb-6">
            <h2 className="h2" style={{ marginBottom: 12 }}>
              {en ? "Intellectual property" : "Propriété intellectuelle"}
            </h2>
            <p className="body">
              {en
                ? "All elements of the platform (code, interface, visual identity, content) are the property of NanoXplore. Any unauthorized reproduction or distribution is prohibited."
                : "L’ensemble des éléments de la plateforme (code, interface, identité visuelle, contenus) est la propriété de NanoXplore. Toute reproduction ou diffusion non autorisée est interdite."}
            </p>
          </Tile>

          <Tile>
            <h2 className="h2" style={{ marginBottom: 12 }}>
              {en ? "Use & confidentiality" : "Usage & confidentialité"}
            </h2>
            <p className="body">
              {en ? (
                <>
                  Access to NanoXplore HR is reserved for authorized employees.
                  Each user is responsible for keeping their credentials
                  confidential. The processing of personal data is described in
                  our{" "}
                  <a className="link" href="/confidentialite">
                    data protection policy
                  </a>
                  .
                </>
              ) : (
                <>
                  L’accès à NanoXplore RH est réservé aux collaborateurs
                  habilités. Chaque utilisateur est responsable de la
                  confidentialité de ses identifiants. Le traitement des données
                  personnelles est décrit dans notre{" "}
                  <a className="link" href="/confidentialite">
                    politique de protection des données
                  </a>
                  .
                </>
              )}
            </p>
          </Tile>
        </div>

        <div className="col-span-12 lg:col-span-4">
          <Tile>
            <p className="eyebrow">{en ? "At a glance" : "En bref"}</p>
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
                  <li>Internal NanoXplore application</li>
                  <li>Hosting within the European Union</li>
                  <li>Access reserved for employees</li>
                  <li>GDPR compliant</li>
                </>
              ) : (
                <>
                  <li>Application interne NanoXplore</li>
                  <li>Hébergement Union européenne</li>
                  <li>Accès réservé aux collaborateurs</li>
                  <li>Conforme RGPD</li>
                </>
              )}
            </ul>
          </Tile>
        </div>
      </div>
    </>
  );
}
