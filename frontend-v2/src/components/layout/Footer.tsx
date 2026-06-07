import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import nxLogo from "../../assets/nx-logo.png";

/**
 * Pied de page institutionnel — affiché sur toutes les pages authentifiées et
 * les pages légales. Scopé `.nx-app` pour hériter du design system.
 */
export default function Footer() {
  const { t } = useTranslation();
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
              {t("footer.tagline")}
            </p>
          </div>

          {/* Liens légaux / RGPD */}
          <nav
            className="row wrap"
            style={{ gap: "10px 28px" }}
            aria-label={t("footer.legalNav")}
          >
            <Link to="/confidentialite" className="link small">
              {t("footer.gdprLink")}
            </Link>
            <Link to="/mentions-legales" className="link small">
              {t("footer.legalNotice")}
            </Link>
            <Link to="/accessibilite" className="link small">
              {t("footer.accessibility")}
            </Link>
            <a href="mailto:rh-support@nanoxplore.com" className="link small">
              {t("footer.hrContact")}
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
          <span className="small">{t("footer.copyright", { year })}</span>
          <span className="small">{t("footer.gdprCompliance")}</span>
        </div>
      </div>
    </footer>
  );
}
