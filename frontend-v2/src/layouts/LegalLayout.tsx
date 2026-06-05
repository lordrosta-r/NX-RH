import { Outlet, Link } from "react-router-dom";
import Footer from "../components/layout/Footer";
import "../styles/app.css";

/**
 * Layout public pour les pages légales / RGPD (accessibles sans authentification).
 * En-tête minimal (logo) + contenu + pied de page institutionnel.
 */
export default function LegalLayout() {
  return (
    <div
      className="nx-app"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-alt)",
      }}
    >
      <header className="app-header">
        <div className="topbar-main">
          <div className="inner" style={{ height: 64 }}>
            <Link to="/" className="nx-logo-wrap" aria-label="NanoXplore RH">
              <span className="nx-mark" style={{ fontSize: 22 }}>
                <span className="n">N</span>
                <span className="x">X</span>
              </span>
            </Link>
            <Link to="/login" className="link small">
              Connexion
            </Link>
          </div>
        </div>
      </header>

      <main id="main-content" style={{ flex: 1 }}>
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            padding: "30px 28px 60px",
            width: "100%",
          }}
        >
          <Outlet />
        </div>
      </main>

      <Footer />
    </div>
  );
}
