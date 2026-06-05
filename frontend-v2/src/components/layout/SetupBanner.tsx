import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import client from "../../api/client";
import { useAuth } from "../../contexts/AuthContext";

interface SetupStatus {
  ready: boolean;
  checks: {
    hasAdmin: boolean;
    hasManagedUsers: boolean;
    hasForm: boolean;
    smtpConfigured: boolean;
  };
}

const LABELS: Record<keyof SetupStatus["checks"], string> = {
  hasAdmin: "un compte administrateur actif",
  hasManagedUsers: "au moins un collaborateur rattaché à un responsable",
  hasForm: "au moins un formulaire d'évaluation",
  smtpConfigured: "la configuration e-mail (SMTP)",
};

/**
 * Gate « State Zero » : tant que les prérequis minimaux ne sont pas réunis,
 * affiche une bannière d'avertissement aux admins. Lecture seule, non bloquante
 * pour la navigation mais explicite sur ce qui manque avant d'exploiter l'app.
 */
export default function SetupBanner() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const { data } = useQuery({
    queryKey: ["admin", "setup-status"],
    queryFn: () =>
      client.get<SetupStatus>("/api/admin/setup-status").then((r) => r.data),
    enabled: isAdmin,
    staleTime: 5 * 60 * 1000,
  });

  if (!isAdmin || !data || data.ready) return null;

  const missing = (
    Object.keys(data.checks) as Array<keyof SetupStatus["checks"]>
  ).filter((k) => !data.checks[k]);

  return (
    <div
      className="nx-app"
      style={{
        background: "var(--amber-bg, #fff7ed)",
        borderBottom: "1px solid var(--amber)",
      }}
    >
      <div
        className="max-w-7xl"
        style={{
          margin: "0 auto",
          padding: "12px 24px",
          display: "flex",
          gap: 12,
          alignItems: "flex-start",
        }}
      >
        <AlertTriangle
          size={20}
          style={{ color: "var(--amber)", flexShrink: 0, marginTop: 2 }}
          aria-hidden="true"
        />
        <div className="small" style={{ color: "var(--ink-2)" }}>
          <strong>Configuration initiale incomplète.</strong> Il manque encore :{" "}
          {missing.map((k) => LABELS[k]).join(", ")}.{" "}
          <Link to="/admin/setup" className="link">
            Ouvrir l'assistant de configuration
          </Link>
          .
        </div>
      </div>
    </div>
  );
}
