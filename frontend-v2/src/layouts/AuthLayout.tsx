import { Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import nxLogo from "../assets/nx-logo.png";
import "../styles/login.css";

const PREVIEW_STEPS: [string, boolean][] = [
  ["Bilan de l'année", true],
  ["Compétences", true],
  ["Objectifs", true],
  ["Récapitulatif", false],
];

export default function AuthLayout() {
  const { t } = useTranslation();

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
                    <div className="ap-title">Entretien annuel</div>
                    <div className="ap-sub">Auto-évaluation</div>
                  </div>
                </div>
                <span className="ap-badge">En cours</span>
              </div>
              <div className="ap-prog">
                <div className="ap-prog-row">
                  <span>Progression</span>
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
                  Camille &amp; Sophie · manager
                </span>
              </div>
            </div>
            <div className="ap-float">
              <span className="ap-float-ic">
                <Check style={{ width: 14, height: 14 }} />
              </span>
              <div>
                <div className="ap-float-t">Transmis à votre manager</div>
                <div className="ap-float-d">il y a 2 min</div>
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
        <Outlet />
      </main>
    </div>
  );
}
