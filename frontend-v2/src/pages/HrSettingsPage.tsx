import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, X } from "lucide-react";
import { adminApi } from "../api/admin";
import { queryKeys } from "../lib/queryKeys";
import { PageHead, Tile } from "../components/shell";

type CampaignSettings = {
  allow_self_evaluation: boolean;
  require_manager_signature: boolean;
  send_completion_email: boolean;
  auto_close_days: number;
};

export default function HrSettingsPage() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [campaignId, setCampaignId] = useState("");
  const [targetStatuses, setTargetStatuses] = useState<string[]>([
    "assigned",
    "in_progress",
  ]);
  const [remindResult, setRemindResult] = useState<string | null>(null);
  const [autoCloseDays, setAutoCloseDays] = useState<number>(0);
  const qc = useQueryClient();

  const { data: campaignSettings, isLoading: settingsLoading } =
    useQuery<CampaignSettings>({
      queryKey: queryKeys.campaignSettings.all,
      queryFn: () =>
        adminApi.getHrSettings().then((r) => r.data as CampaignSettings),
    });

  useEffect(() => {
    if (campaignSettings?.auto_close_days != null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydratation du champ depuis les paramètres chargés
      setAutoCloseDays(campaignSettings.auto_close_days);
    }
  }, [campaignSettings?.auto_close_days]);

  const updateSettings = useMutation({
    mutationFn: (data: Partial<CampaignSettings>) =>
      adminApi.updateHrSettings(data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.campaignSettings.all }),
  });

  const bulkRemindMut = useMutation({
    mutationFn: () =>
      adminApi.bulkRemind({
        campaignId: campaignId || undefined,
        targetStatuses,
      }),
    onSuccess: (res) => {
      setRemindResult(`Rappels envoyés (${JSON.stringify(res.data)})`);
      setShowConfirm(false);
    },
    onError: () => {
      setRemindResult("Erreur lors de l'envoi des rappels");
      setShowConfirm(false);
    },
  });

  const statuses = ["assigned", "in_progress", "submitted"];

  const flags = [
    { key: "allow_self_evaluation", label: "Auto-évaluation autorisée" },
    {
      key: "require_manager_signature",
      label: "Signature manager obligatoire",
    },
    { key: "send_completion_email", label: "Email de clôture automatique" },
  ] as const;

  return (
    <div className="nx-app">
      <PageHead title="Paramètres RH" />

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Tile — rappels groupés */}
        <Tile>
          <div
            className="row"
            style={{ gap: 12, alignItems: "center", marginBottom: 16 }}
          >
            <Bell
              size={20}
              style={{ color: "var(--amber)" }}
              aria-hidden="true"
            />
            <h2 className="h3">Rappels groupés</h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="field">
              <label htmlFor="hr-campaign-id">ID Campagne (optionnel)</label>
              <input
                id="hr-campaign-id"
                className="input"
                value={campaignId}
                onChange={(e) => setCampaignId(e.target.value)}
                placeholder="Toutes les campagnes actives"
              />
            </div>

            <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
              <legend
                className="small"
                style={{ fontWeight: 600, marginBottom: 8 }}
              >
                Statuts cibles
              </legend>
              <div className="row wrap" style={{ gap: 12 }}>
                {statuses.map((s) => (
                  <label
                    key={s}
                    className="row"
                    style={{ gap: 6, cursor: "pointer", alignItems: "center" }}
                  >
                    <input
                      type="checkbox"
                      checked={targetStatuses.includes(s)}
                      onChange={(e) =>
                        setTargetStatuses((ts) =>
                          e.target.checked
                            ? [...ts, s]
                            : ts.filter((x) => x !== s),
                        )
                      }
                    />
                    <span className="body">{s}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {remindResult && (
              <p className="small" style={{ color: "var(--green)" }}>
                {remindResult}
              </p>
            )}

            <div className="row">
              <button
                type="button"
                onClick={() => setShowConfirm(true)}
                className="btn btn-primary"
              >
                <Bell size={16} aria-hidden="true" /> Envoyer rappels groupés
              </button>
            </div>
          </div>
        </Tile>

        {/* Tile — paramètres campagnes */}
        <Tile>
          <h2 className="h3" style={{ marginBottom: 16 }}>
            Paramètres campagnes
          </h2>
          {settingsLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    height: 32,
                    background: "var(--bg-alt)",
                    borderRadius: "var(--radius)",
                  }}
                />
              ))}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {flags.map(({ key, label }) => {
                const val = campaignSettings?.[key] ?? false;
                return (
                  <label
                    key={key}
                    className="row between"
                    style={{ gap: 12, cursor: "pointer", alignItems: "center" }}
                  >
                    <span className="body" style={{ fontWeight: 600 }}>
                      {label}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={val}
                      aria-label={label}
                      onClick={() => updateSettings.mutate({ [key]: !val })}
                      style={{
                        position: "relative",
                        width: 44,
                        height: 24,
                        borderRadius: 9999,
                        border: "none",
                        cursor: "pointer",
                        padding: 0,
                        background: val ? "var(--blue)" : "var(--line)",
                        transition: "background 0.12s",
                        flexShrink: 0,
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
                          transform: val ? "translateX(20px)" : "translateX(0)",
                          transition: "transform 0.12s",
                        }}
                      />
                    </button>
                  </label>
                );
              })}

              <div className="field">
                <label htmlFor="hr-auto-close-days">
                  Clôture auto après N jours (0 = désactivé)
                </label>
                <div className="row" style={{ gap: 8, alignItems: "center" }}>
                  <input
                    id="hr-auto-close-days"
                    type="number"
                    min={0}
                    value={autoCloseDays}
                    onChange={(e) => setAutoCloseDays(Number(e.target.value))}
                    className="input"
                    style={{ width: 120 }}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      updateSettings.mutate({ auto_close_days: autoCloseDays })
                    }
                    disabled={updateSettings.isPending}
                    className="btn btn-primary"
                  >
                    Sauvegarder
                  </button>
                </div>
              </div>
            </div>
          )}
        </Tile>
      </div>

      {/* Confirm modal */}
      {showConfirm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.4)",
          }}
        >
          <Tile style={{ width: "100%", maxWidth: 420, margin: 16 }}>
            <div
              className="row between"
              style={{ alignItems: "center", marginBottom: 16 }}
            >
              <h2 className="h3">Confirmer l'envoi</h2>
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                aria-label="Fermer"
                className="btn btn-ghost"
                style={{ padding: 6 }}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <p
              className="body"
              style={{ marginBottom: 24, color: "var(--ink-2)" }}
            >
              Vous allez envoyer des rappels à tous les utilisateurs avec les
              statuts sélectionnés
              {campaignId ? ` pour la campagne ${campaignId}` : ""}. Confirmer ?
            </p>
            <div
              className="row"
              style={{ justifyContent: "flex-end", gap: 12 }}
            >
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="btn btn-ghost"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => bulkRemindMut.mutate()}
                disabled={bulkRemindMut.isPending}
                className="btn btn-primary"
              >
                {bulkRemindMut.isPending ? "Envoi…" : "Confirmer"}
              </button>
            </div>
          </Tile>
        </div>
      )}
    </div>
  );
}
