import { Outlet, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import nxLogo from "../assets/nx-logo.png";
import "../styles/login.css";

export default function AuthLayout() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  const PREVIEW_STEPS: [string, boolean][] = [
    [t("auth.previewStepReview"), true],
    [t("auth.previewStepSkills"), true],
    [t("auth.previewStepObjectives"), true],
    [t("auth.previewStepSummary"), false],
  ];

  return (
    <div className="nx-auth">
      <aside className="auth-aside">
        <div style={{ position: "relative", zIndex: 1 }}>
          <img src={nxLogo} alt="NanoXplore" className="auth-aside-logo" />
        </div>

        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 26,
            maxWidth: 460,
          }}
        >
          <div>
            <p className="eyebrow" style={{ color: "rgba(255,255,255,.75)" }}>
              {t("auth.asideEyebrow")}
            </p>
            <h1 className="display" style={{ color: "#fff", marginTop: 10 }}>
              {t("auth.asideTitle")}
            </h1>
            <p
              className="lead"
              style={{ color: "rgba(255,255,255,.82)", marginTop: 14 }}
            >
              {t("auth.asideLead")}
            </p>
          </div>

          {/* Carte d'aperçu décorative */}
          <div className="auth-preview">
            <div className="ap-card">
              <div className="ap-head">
                <div className="row gap-8" style={{ minWidth: 0, flex: 1 }}>
                  <img src={nxLogo} alt="NanoXplore" className="ap-logo" />
                  <div style={{ minWidth: 0 }}>
                    <div className="ap-title">{t("auth.previewTitle")}</div>
                    <div className="ap-sub">{t("auth.previewSubtitle")}</div>
                  </div>
                </div>
                <span className="ap-badge">{t("auth.previewBadge")}</span>
              </div>
              <div className="ap-prog">
                <div className="ap-prog-row">
                  <span>{t("auth.previewProgress")}</span>
                  <b>75%</b>
                </div>
                <div className="ap-track">
                  <i style={{ width: "75%" }} />
                </div>
              </div>
              <div className="ap-steps">
                {PREVIEW_STEPS.map(([label, done], i) => (
                  <div className="ap-step" key={label}>
                    <span className={"ap-check " + (done ? "done" : "todo")}>
                      {done ? (
                        <Check style={{ width: 13, height: 13 }} />
                      ) : (
                        i + 1
                      )}
                    </span>
                    <span
                      className="ap-step-label"
                      style={{ color: done ? "var(--ink)" : "var(--ink-3)" }}
                    >
                      {label}
                    </span>
                  </div>
                ))}
              </div>
              <div className="ap-foot">
                <div className="ap-avatars">
                  <span className="ap-av" style={{ background: "#1b1b78" }}>
                    CR
                  </span>
                  <span className="ap-av" style={{ background: "#d1001f" }}>
                    SL
                  </span>
                </div>
                <span className="ap-foot-txt">
                  Camille &amp; Sophie · {t("auth.previewFootRole")}
                </span>
              </div>
            </div>
            <div className="ap-float">
              <span className="ap-float-ic">
                <Check style={{ width: 14, height: 14 }} />
              </span>
              <div>
                <div className="ap-float-t">{t("auth.previewFloatTitle")}</div>
                <div className="ap-float-d">{t("auth.previewFloatTime")}</div>
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            position: "relative",
            zIndex: 1,
            fontSize: 13,
            color: "rgba(255,255,255,.6)",
          }}
        >
          {t("auth.support")}
        </div>
      </aside>

      <main className="auth-main" id="contenu">
        <div className="auth-body">
          {/* Logo visible uniquement sur mobile (le panneau de marque est masqué <880px) */}
          <img src={nxLogo} alt="NanoXplore" className="auth-main-logo" />
          <Outlet />
        </div>

        <footer className="auth-footer">
          <nav className="auth-footer-nav" aria-label={t("footer.legalNav")}>
            <Link to="/confidentialite" className="link">
              {t("footer.gdprLink")}
            </Link>
            <Link to="/mentions-legales" className="link">
              {t("footer.legalNotice")}
            </Link>
            <Link to="/accessibilite" className="link">
              {t("footer.accessibility")}
            </Link>
          </nav>
          <p className="auth-footer-copy">{t("footer.copyright", { year })}</p>
        </footer>
      </main>
    </div>
  );
}
