import { Link } from "react-router-dom";
import nxLogo from "../../assets/nx-logo.png";

/**
 * Pied de page institutionnel — affiché sur toutes les pages authentifiées et
 * les pages légales. Scopé `.nx-app` pour hériter du design system.
 */
export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer
      className="nx-app"
      style={{
        background: "#fff",
        borderTop: "3px solid var(--blue)",
        marginTop: 40,
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "28px 28px 22px",
          width: "100%",
        }}
      >
        <div
          className="row between wrap"
          style={{ gap: "24px 40px", alignItems: "flex-start" }}
        >
          {/* Marque + accroche */}
          <div style={{ maxWidth: 360 }}>
            <img
              src={nxLogo}
              alt="NanoXplore RH"
              style={{ height: 34, width: "auto", display: "block" }}
            />
            <p className="small" style={{ marginTop: 8 }}>
              NanoXplore RH — Plateforme d’entretiens professionnels et de
              développement des collaborateurs.
            </p>
          </div>

          {/* Liens légaux / RGPD */}
          <nav
            className="row wrap"
            style={{ gap: "10px 28px" }}
            aria-label="Liens légaux"
          >
            <Link to="/confidentialite" className="link small">
              Données personnelles (RGPD)
            </Link>
            <Link to="/mentions-legales" className="link small">
              Mentions légales
            </Link>
            <Link to="/accessibilite" className="link small">
              Accessibilité
            </Link>
            <a href="mailto:rh-support@nanoxplore.com" className="link small">
              Contact RH
            </a>
          </nav>
        </div>

        <div
          className="row between wrap"
          style={{
            gap: 8,
            marginTop: 22,
            paddingTop: 16,
            borderTop: "1px solid var(--line)",
          }}
        >
          <span className="small">
            © {year} NanoXplore — Tous droits réservés.
          </span>
          <span className="small">
            Conforme RGPD · Données hébergées en Union européenne
          </span>
        </div>
      </div>
    </footer>
  );
}
