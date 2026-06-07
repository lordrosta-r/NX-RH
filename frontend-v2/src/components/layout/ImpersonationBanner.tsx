import { useState } from "react";
import { Eye } from "lucide-react";
import client from "../../api/client";
import { useAuth } from "../../contexts/AuthContext";

/**
 * Bannière permanente affichée pendant une session d'impersonation.
 * Lecture seule garantie côté backend ; ici on signale l'état et on offre la
 * sortie. Après sortie, rechargement complet pour repartir d'un état propre.
 */
export default function ImpersonationBanner() {
  const { user } = useAuth();
  const [leaving, setLeaving] = useState(false);

  if (!user?.impersonatedBy) return null;

  const stop = async () => {
    setLeaving(true);
    try {
      await client.post("/api/auth/impersonate/stop");
    } finally {
      // Rechargement dur : réinitialise tout le state client (caches, contextes).
      window.location.href = "/";
    }
  };

  return (
    <div
      style={{
        background: "var(--red)",
        color: "#fff",
        padding: "10px 24px",
        display: "flex",
        gap: 12,
        alignItems: "center",
        justifyContent: "center",
        fontSize: 14,
        fontWeight: 600,
      }}
    >
      <Eye size={18} aria-hidden="true" />
      <span>
        Vous consultez en tant que {user.firstName} {user.lastName} ({user.role}
        ) — lecture seule.
      </span>
      <button
        type="button"
        onClick={stop}
        disabled={leaving}
        style={{
          marginLeft: 8,
          background: "#fff",
          color: "var(--red)",
          border: "none",
          borderRadius: 6,
          padding: "4px 12px",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        {leaving ? "Sortie…" : "Quitter l'impersonation"}
      </button>
    </div>
  );
}
