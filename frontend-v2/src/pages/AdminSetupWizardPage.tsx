import { CheckCircle, Circle, ChevronRight, Rocket } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useSetupChecklist } from "../hooks/useSetupChecklist";
import { PageHead, Tile, Bar, Callout } from "../components/shell";

export default function AdminSetupWizardPage() {
  const { t } = useTranslation();
  const { steps, completed, total, percent, isLoading, allDone } =
    useSetupChecklist();

  if (isLoading) {
    return (
      <div className="nx-app">
        <div
          className="row"
          style={{
            justifyContent: "center",
            padding: "64px 0",
            color: "var(--ink-3)",
          }}
        >
          {t("adminSetup.checking")}
        </div>
      </div>
    );
  }

  return (
    <div className="nx-app">
      <PageHead
        eyebrow={t("adminSetup.eyebrow")}
        title={t("adminSetup.title")}
        desc={t("adminSetup.desc")}
      />

      {allDone ? (
        <Callout tone="green" className="mb-6">
          <div className="row" style={{ gap: 16, alignItems: "center" }}>
            <CheckCircle
              className="ico"
              style={{
                width: 32,
                height: 32,
                color: "var(--green)",
                flex: "none",
              }}
            />
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>
                {t("adminSetup.complete.title")}
              </p>
              <p className="small" style={{ marginTop: 2 }}>
                {t("adminSetup.complete.subtitle")}
              </p>
            </div>
          </div>
        </Callout>
      ) : (
        <Tile className="mb-6">
          <div className="row" style={{ gap: 10, marginBottom: 12 }}>
            <Rocket
              className="ico"
              style={{ width: 20, height: 20, color: "var(--blue)" }}
            />
            <span style={{ fontWeight: 700, color: "var(--ink)" }}>
              {t("adminSetup.progress.percent", { percent })}
            </span>
            <span className="small">
              · {t("adminSetup.progress.steps", { completed, total })}
            </span>
          </div>
          <Bar pct={percent} />
        </Tile>
      )}

      <div className="section-gap" style={{ gap: 16 }}>
        {steps.map((step) => (
          <Tile key={step.id} style={step.done ? { opacity: 0.7 } : undefined}>
            <div className="row between wrap" style={{ gap: 16 }}>
              <div
                className="row"
                style={{ gap: 16, alignItems: "flex-start", minWidth: 0 }}
              >
                <span
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "var(--radius)",
                    display: "grid",
                    placeItems: "center",
                    flex: "none",
                    background: step.done
                      ? "var(--green-soft)"
                      : "var(--bg-alt)",
                  }}
                >
                  {step.done ? (
                    <CheckCircle
                      className="ico"
                      style={{ width: 20, height: 20, color: "var(--green)" }}
                    />
                  ) : (
                    <Circle
                      className="ico"
                      style={{
                        width: 20,
                        height: 20,
                        color: "var(--line-strong)",
                      }}
                    />
                  )}
                </span>
                <div style={{ minWidth: 0 }}>
                  <h3
                    className="h3"
                    style={
                      step.done
                        ? {
                            color: "var(--ink-3)",
                            textDecoration: "line-through",
                          }
                        : undefined
                    }
                  >
                    {step.title}
                  </h3>
                  <p className="small" style={{ marginTop: 4 }}>
                    {step.description}
                  </p>
                </div>
              </div>
              {!step.done && (
                <Link
                  to={step.actionHref}
                  className="btn btn-primary"
                  style={{ flex: "none" }}
                >
                  {step.actionLabel}
                  <ChevronRight
                    className="ico"
                    style={{ width: 16, height: 16 }}
                  />
                </Link>
              )}
            </div>
          </Tile>
        ))}
      </div>
    </div>
  );
}
