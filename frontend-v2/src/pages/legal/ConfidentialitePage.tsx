import { useTranslation } from "react-i18next";
import { PageHead, Tile, Callout } from "../../components/shell";

const LAST_UPDATE_FR = "5 juin 2026";
const LAST_UPDATE_EN = "June 5, 2026";

export default function ConfidentialitePage() {
  const { i18n } = useTranslation();
  const en = i18n.language?.startsWith("en") ?? false;

  return (
    <>
      <PageHead
        eyebrow={en ? "Personal data" : "Données personnelles"}
        title={
          en
            ? "Data protection policy (GDPR)"
            : "Politique de protection des données (RGPD)"
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
            ? "NanoXplore HR is an internal platform dedicated to managing professional reviews and tracking employee development. It processes personal data in strict compliance with Regulation (EU) 2016/679 (GDPR)."
            : "NanoXplore RH est une plateforme interne destinée à la gestion des entretiens professionnels et au suivi du développement des collaborateurs. Elle traite des données à caractère personnel dans le strict respect du Règlement (UE) 2016/679 (RGPD)."}
        </p>
      </Callout>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8">
          <Tile className="mb-6">
            <h2 className="h2" style={{ marginBottom: 12 }}>
              {en ? "Data controller" : "Responsable du traitement"}
            </h2>
            <p className="body">
              {en ? (
                <>
                  The data controller is <b>NanoXplore</b>, in its capacity as
                  employer. The processing operations are carried out by the
                  Human Resources Department.
                </>
              ) : (
                <>
                  Le responsable du traitement est la société{" "}
                  <b>NanoXplore</b>, en sa qualité d’employeur. Les traitements
                  sont mis en œuvre par la Direction des Ressources Humaines.
                </>
              )}
            </p>
          </Tile>

          <Tile className="mb-6">
            <h2 className="h2" style={{ marginBottom: 12 }}>
              {en ? "Data collected" : "Données collectées"}
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
                  <li>
                    Identity and professional contact details (last name, first
                    name, e-mail, position, department).
                  </li>
                  <li>
                    Reporting line (manager, team, organizational chart).
                  </li>
                  <li>
                    Review content: self-assessments, manager appraisals,
                    objectives, reports.
                  </li>
                  <li>
                    Internal mobility preferences and individual development
                    plans (IDP).
                  </li>
                  <li>
                    Connection data (audit log, timestamps) for security
                    purposes.
                  </li>
                </>
              ) : (
                <>
                  <li>
                    Identité et coordonnées professionnelles (nom, prénom,
                    e-mail, poste, service).
                  </li>
                  <li>
                    Rattachement hiérarchique (manager, équipe, organigramme).
                  </li>
                  <li>
                    Contenu des entretiens : auto-évaluations, appréciations du
                    manager, objectifs, comptes-rendus.
                  </li>
                  <li>
                    Souhaits de mobilité interne et plans de développement
                    individuel (PDI).
                  </li>
                  <li>
                    Données de connexion (journal d’audit, horodatage) à des
                    fins de sécurité.
                  </li>
                </>
              )}
            </ul>
          </Tile>

          <Tile className="mb-6">
            <h2 className="h2" style={{ marginBottom: 12 }}>
              {en ? "Purposes & legal basis" : "Finalités & base légale"}
            </h2>
            <p className="body">
              {en ? (
                <>
                  The data is processed to organize annual review campaigns,
                  track objectives and support professional development. The
                  legal basis is the <b>performance of the employment contract</b>{" "}
                  and the <b>legitimate interest</b> of the employer in managing
                  its human resources.
                </>
              ) : (
                <>
                  Les données sont traitées pour organiser les campagnes
                  d’entretiens annuels, suivre les objectifs et accompagner
                  l’évolution professionnelle. La base légale est l’
                  <b>exécution du contrat de travail</b> et l’
                  <b>intérêt légitime</b> de l’employeur à assurer la gestion de
                  ses ressources humaines.
                </>
              )}
            </p>
          </Tile>

          <Tile className="mb-6">
            <h2 className="h2" style={{ marginBottom: 12 }}>
              {en ? "Recipients" : "Destinataires"}
            </h2>
            <p className="body">
              {en
                ? "The data is only accessible to authorized persons: the employee concerned, their manager (N+1), the Human Resources Department and, where applicable, the technical administrators of the platform. No data is sold to third parties for commercial purposes."
                : "Les données ne sont accessibles qu’aux personnes habilitées : le collaborateur concerné, son manager (N+1), la Direction des Ressources Humaines et, le cas échéant, les administrateurs techniques de la plateforme. Aucune donnée n’est cédée à des tiers à des fins commerciales."}
            </p>
          </Tile>

          <Tile>
            <h2 className="h2" style={{ marginBottom: 12 }}>
              {en ? "Your rights" : "Vos droits"}
            </h2>
            <p className="body" style={{ marginBottom: 10 }}>
              {en
                ? "In accordance with the GDPR, you have the rights of access, rectification, erasure, restriction, objection and portability of your data. You may exercise them with the Data Protection Officer:"
                : "Conformément au RGPD, vous disposez des droits d’accès, de rectification, d’effacement, de limitation, d’opposition et de portabilité de vos données. Vous pouvez les exercer auprès du Délégué à la protection des données :"}
            </p>
            <p className="body">
              <a className="link" href="mailto:dpo@nanoxplore.com">
                dpo@nanoxplore.com
              </a>
            </p>
            <p className="small" style={{ marginTop: 10 }}>
              {en
                ? "You may also lodge a complaint with the competent supervisory authority (in France, the CNIL — www.cnil.fr)."
                : "Vous pouvez également introduire une réclamation auprès de la CNIL (www.cnil.fr)."}
            </p>
          </Tile>
        </div>

        <div className="col-span-12 lg:col-span-4">
          <Tile className="mb-6">
            <p className="eyebrow">
              {en ? "Retention period" : "Durée de conservation"}
            </p>
            <p className="body" style={{ marginTop: 10 }}>
              {en
                ? "Review reports are kept for the duration of the employment relationship, then archived in accordance with legal obligations. Audit logs are kept for 12 months."
                : "Les comptes-rendus d’entretien sont conservés pendant la durée de la relation de travail, puis archivés conformément aux obligations légales. Les journaux d’audit sont conservés 12 mois."}
            </p>
          </Tile>
          <Callout tone="green">
            <p style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>
              {en
                ? "Hosting within the European Union"
                : "Hébergement en Union européenne"}
            </p>
            <p className="small" style={{ marginTop: 4 }}>
              {en
                ? "Data is hosted on servers located within the European Union. Authentication flows are encrypted (TLS) and access is logged."
                : "Les données sont hébergées sur des serveurs situés dans l’Union européenne. Les flux d’authentification sont chiffrés (TLS) et les accès tracés."}
            </p>
          </Callout>
        </div>
      </div>
    </>
  );
}
