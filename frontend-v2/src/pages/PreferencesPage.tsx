import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { authApi } from "../api/auth";
import { PageHead, Tile } from "../components/shell";

interface NotifDef {
  key: string;
  label: string;
  roles: string[];
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label
      className="row"
      style={{ gap: 12, cursor: "pointer", alignItems: "center" }}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        style={{
          position: "relative",
          width: 44,
          height: 24,
          borderRadius: 9999,
          border: "none",
          cursor: "pointer",
          padding: 0,
          background: checked ? "var(--blue)" : "var(--line)",
          transition: "background 0.12s",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            left: 2,
            width: 20,
            height: 20,
            borderRadius: 9999,
            background: "#fff",
            boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
            transform: checked ? "translateX(20px)" : "translateX(0)",
            transition: "transform 0.12s",
          }}
        />
      </button>
      <span className="body" style={{ fontWeight: 600 }}>
        {label}
      </span>
    </label>
  );
}

const ALL_NOTIFS: NotifDef[] = [
  {
    key: "evalAssigned",
    label: "Évaluation assignée",
    roles: ["employee", "manager", "hr", "admin"],
  },
  {
    key: "deadlineReminder",
    label: "Rappel de deadline",
    roles: ["employee", "manager", "hr", "admin"],
  },
  {
    key: "managerActionRequired",
    label: "Action manager requise",
    roles: ["manager", "hr", "admin"],
  },
  {
    key: "evalSubmission",
    label: "Soumission d'évaluation",
    roles: ["manager", "hr", "admin"],
  },
  {
    key: "campaignLaunch",
    label: "Lancement de campagne",
    roles: ["hr", "admin"],
  },
  { key: "systemAlerts", label: "Alertes système", roles: ["admin"] },
];

export default function PreferencesPage() {
  const { user } = useAuth();

  const [locale, setLocale] = useState<"fr" | "en">("fr");
  const [notifs, setNotifs] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string>("");
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const saveMutation = useMutation({
    mutationFn: () =>
      authApi.updatePreferences({ locale, notificationPrefs: notifs }),
    onSuccess: () => {
      setToast("Préférences sauvegardées");
      toastTimerRef.current = setTimeout(() => setToast(""), 3000);
    },
  });

  if (!user) return null;

  const visibleNotifs = ALL_NOTIFS.filter((n) => n.roles.includes(user.role));

  function toggleNotif(key: string) {
    setNotifs((prev: Record<string, boolean>) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  return (
    <div className="nx-app">
      <PageHead
        eyebrow={
          <Link
            to="/profile"
            className="link"
            aria-label="Retour au profil"
            style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
          >
            <ChevronLeft size={16} strokeWidth={1.5} aria-hidden="true" />
            Profil
          </Link>
        }
        title="Préférences"
        actions={
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? "Sauvegarde…" : "Sauvegarder"}
          </button>
        }
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Tile — Interface */}
        <Tile>
          <h2 className="h3" style={{ marginBottom: 16 }}>
            Interface
          </h2>
          <div className="field">
            <label htmlFor="pref-language">Langue</label>
            <select
              id="pref-language"
              value={locale}
              onChange={(e) => setLocale(e.target.value as "fr" | "en")}
              className="input"
            >
              <option value="fr">Français</option>
              <option value="en">English</option>
            </select>
          </div>
        </Tile>

        {/* Tile — Notifications e-mail */}
        {visibleNotifs.length > 0 && (
          <Tile>
            <h2 className="h3" style={{ marginBottom: 16 }}>
              Notifications e-mail
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {visibleNotifs.map((n) => (
                <Toggle
                  key={n.key}
                  checked={!!notifs[n.key]}
                  onChange={() => toggleNotif(n.key)}
                  label={n.label}
                />
              ))}
            </div>
          </Tile>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div
          className="badge green"
          role="status"
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 50,
          }}
        >
          ✓ {toast}
        </div>
      )}
    </div>
  );
}
