import { PageHead, Tile, Callout } from "../../components/shell";

const LAST_UPDATE = "5 juin 2026";

export default function ConfidentialitePage() {
  return (
    <>
      <PageHead
        eyebrow="Données personnelles"
        title="Politique de protection des données (RGPD)"
        desc={`NanoXplore RH — Dernière mise à jour : ${LAST_UPDATE}`}
      />

      <Callout tone="blue" className="mb-6">
        <p className="body" style={{ color: "var(--ink)" }}>
          NanoXplore RH est une plateforme interne destinée à la gestion des
          entretiens professionnels et au suivi du développement des
          collaborateurs. Elle traite des données à caractère personnel dans le
          strict respect du Règlement (UE) 2016/679 (RGPD).
        </p>
      </Callout>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8">
          <Tile className="mb-6">
            <h2 className="h2" style={{ marginBottom: 12 }}>
              Responsable du traitement
            </h2>
            <p className="body">
              Le responsable du traitement est la société <b>NanoXplore</b>, en
              sa qualité d’employeur. Les traitements sont mis en œuvre par la
              Direction des Ressources Humaines.
            </p>
          </Tile>

          <Tile className="mb-6">
            <h2 className="h2" style={{ marginBottom: 12 }}>
              Données collectées
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
              <li>
                Identité et coordonnées professionnelles (nom, prénom, e-mail,
                poste, service).
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
                Données de connexion (journal d’audit, horodatage) à des fins de
                sécurité.
              </li>
            </ul>
          </Tile>

          <Tile className="mb-6">
            <h2 className="h2" style={{ marginBottom: 12 }}>
              Finalités &amp; base légale
            </h2>
            <p className="body">
              Les données sont traitées pour organiser les campagnes
              d’entretiens annuels, suivre les objectifs et accompagner
              l’évolution professionnelle. La base légale est l’
              <b>exécution du contrat de travail</b> et l’
              <b>intérêt légitime</b> de l’employeur à assurer la gestion de ses
              ressources humaines.
            </p>
          </Tile>

          <Tile className="mb-6">
            <h2 className="h2" style={{ marginBottom: 12 }}>
              Destinataires
            </h2>
            <p className="body">
              Les données ne sont accessibles qu’aux personnes habilitées : le
              collaborateur concerné, son manager (N+1), la Direction des
              Ressources Humaines et, le cas échéant, les administrateurs
              techniques de la plateforme. Aucune donnée n’est cédée à des tiers
              à des fins commerciales.
            </p>
          </Tile>

          <Tile>
            <h2 className="h2" style={{ marginBottom: 12 }}>
              Vos droits
            </h2>
            <p className="body" style={{ marginBottom: 10 }}>
              Conformément au RGPD, vous disposez des droits d’accès, de
              rectification, d’effacement, de limitation, d’opposition et de
              portabilité de vos données. Vous pouvez les exercer auprès du
              Délégué à la protection des données :
            </p>
            <p className="body">
              <a className="link" href="mailto:dpo@nanoxplore.com">
                dpo@nanoxplore.com
              </a>
            </p>
            <p className="small" style={{ marginTop: 10 }}>
              Vous pouvez également introduire une réclamation auprès de la CNIL
              (www.cnil.fr).
            </p>
          </Tile>
        </div>

        <div className="col-span-12 lg:col-span-4">
          <Tile className="mb-6">
            <p className="eyebrow">Durée de conservation</p>
            <p className="body" style={{ marginTop: 10 }}>
              Les comptes-rendus d’entretien sont conservés pendant la durée de
              la relation de travail, puis archivés conformément aux obligations
              légales. Les journaux d’audit sont conservés 12 mois.
            </p>
          </Tile>
          <Callout tone="green">
            <p style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>
              Hébergement en Union européenne
            </p>
            <p className="small" style={{ marginTop: 4 }}>
              Les données sont hébergées sur des serveurs situés dans l’Union
              européenne. Les flux d’authentification sont chiffrés (TLS) et les
              accès tracés.
            </p>
          </Callout>
        </div>
      </div>
    </>
  );
}
