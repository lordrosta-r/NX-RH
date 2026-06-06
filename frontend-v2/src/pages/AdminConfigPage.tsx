import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, X, Settings2 } from "lucide-react";
import { adminApi } from "../api/admin";
import { queryKeys } from "../lib/queryKeys";
import { PageHead, Tile, Badge } from "../components/shell";
import { useConfirm } from "../contexts/ConfirmContext";

type ConfigKey = { key: string; value: string };

type EnvVar = {
  key: string;
  set: boolean;
  required: boolean;
  description: string;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

const TH_STYLE: React.CSSProperties = {
  padding: "10px 16px",
  textAlign: "left",
  fontSize: 11,
  fontWeight: 700,
  color: "var(--ink-3)",
  textTransform: "uppercase",
  letterSpacing: "0.07em",
  borderBottom: "2px solid var(--line-strong)",
  whiteSpace: "nowrap",
};

const TD_STYLE: React.CSSProperties = {
  padding: "14px 16px",
  verticalAlign: "middle",
  borderBottom: "1px solid var(--line)",
};

/** Tronque et formate joliment les valeurs longues (ex : JSON ldap). */
function formatValue(raw: unknown, expanded: boolean): string {
  const str =
    typeof raw === "object" && raw !== null
      ? JSON.stringify(raw, null, 2)
      : String(raw ?? "");
  if (expanded) return str;
  const oneLine = str.replace(/\s+/g, " ");
  return oneLine.length > 80 ? oneLine.slice(0, 80) + "…" : oneLine;
}

// ─── Skeleton ───────────────────────────────────────────────────────────────

function SkeletonRow({ cols = 3 }: { cols?: number }) {
  const widths = [128, 200, 64];
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} style={TD_STYLE}>
          <div
            style={{
              height: 14,
              width: widths[i] ?? 96,
              borderRadius: 6,
              background: "var(--bg-alt)",
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          />
        </td>
      ))}
    </tr>
  );
}

// ─── Env check ──────────────────────────────────────────────────────────────

function EnvCheckSection() {
  const {
    data: envVars,
    isLoading,
    isError,
  } = useQuery<EnvVar[]>({
    queryKey: ["admin-env-check"],
    queryFn: () => adminApi.getEnvCheck().then((r) => r.data as EnvVar[]),
    retry: false,
  });

  const missing = envVars?.filter((v) => !v.set).length ?? 0;
  const total = envVars?.length ?? 0;

  return (
    <Tile>
      {/* En-tête de section */}
      <div
        className="row between"
        style={{ marginBottom: 20, alignItems: "center", gap: 12 }}
      >
        <div>
          <h2 className="h3" style={{ marginBottom: 2 }}>
            Variables d'environnement
          </h2>
          {envVars && (
            <p
              className="small"
              style={{ color: "var(--ink-3)", marginTop: 4 }}
            >
              {total - missing} / {total} définies
              {missing > 0 && (
                <span style={{ color: "var(--red)", marginLeft: 8 }}>
                  · {missing} manquante{missing > 1 ? "s" : ""}
                </span>
              )}
            </p>
          )}
        </div>
        {envVars && missing > 0 && (
          <Badge tone="red" dot>
            {missing} manquante{missing > 1 ? "s" : ""}
          </Badge>
        )}
        {envVars && missing === 0 && (
          <Badge tone="green" dot>
            Tout est défini
          </Badge>
        )}
      </div>

      {isLoading && (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}
          >
            <tbody>
              {Array.from({ length: 7 }).map((_, i) => (
                <SkeletonRow key={i} cols={3} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isError && (
        <p
          className="body"
          style={{
            padding: "32px 0",
            textAlign: "center",
            color: "var(--ink-3)",
          }}
        >
          Endpoint non disponible — les variables d'environnement ne peuvent pas
          être vérifiées pour l'instant.
        </p>
      )}

      {envVars && (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}
          >
            <thead>
              <tr>
                <th style={TH_STYLE}>Variable</th>
                <th style={TH_STYLE}>Description</th>
                <th style={{ ...TH_STYLE, textAlign: "right" }}>Statut</th>
              </tr>
            </thead>
            <tbody>
              {envVars.map((v) => (
                <tr
                  key={v.key}
                  style={{
                    background:
                      !v.set && v.required
                        ? "color-mix(in srgb, var(--red) 4%, transparent)"
                        : undefined,
                  }}
                >
                  <td style={TD_STYLE}>
                    <div
                      className="row"
                      style={{ gap: 8, alignItems: "center" }}
                    >
                      <code
                        style={{
                          fontFamily: "monospace",
                          fontSize: 13,
                          fontWeight: 600,
                          color: "var(--ink)",
                          background: "var(--bg-alt)",
                          padding: "2px 6px",
                          borderRadius: "var(--radius)",
                          border: "1px solid var(--line)",
                        }}
                      >
                        {v.key}
                      </code>
                      {v.required && <Badge tone="amber">requis</Badge>}
                    </div>
                  </td>
                  <td style={{ ...TD_STYLE, color: "var(--ink-2)" }}>
                    {v.description}
                  </td>
                  <td style={{ ...TD_STYLE, textAlign: "right" }}>
                    {v.set ? (
                      <Badge tone="green" dot>
                        Définie
                      </Badge>
                    ) : (
                      <Badge tone="red" dot>
                        Manquante
                      </Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Tile>
  );
}

// ─── Page principale ─────────────────────────────────────────────────────────

export default function AdminConfigPage() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [editingKey, setEditingKey] = useState<ConfigKey | null>(null);
  const [keyForm, setKeyForm] = useState({ key: "", value: "" });
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const { data: keys, isLoading } = useQuery({
    queryKey: queryKeys.configKeys.all,
    queryFn: () => adminApi.getConfigKeys().then((r) => r.data),
  });

  const setKeyMut = useMutation({
    mutationFn: ({ key, value }: ConfigKey) =>
      adminApi.setConfigKey(key, value),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.configKeys.all });
      setShowKeyModal(false);
      setEditingKey(null);
    },
  });

  const deleteKeyMut = useMutation({
    mutationFn: (key: string) => adminApi.deleteConfigKey(key),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.configKeys.all });
    },
  });

  async function handleDeleteKey(key: string) {
    if (
      await confirm({
        title: "Supprimer la clé de configuration ?",
        description: `La clé « ${key} » sera définitivement supprimée.`,
        variant: "danger",
        confirmLabel: "Supprimer",
      })
    ) {
      deleteKeyMut.mutate(key);
    }
  }

  function openNew() {
    setKeyForm({ key: "", value: "" });
    setEditingKey(null);
    setShowKeyModal(true);
  }

  function openEdit(k: ConfigKey) {
    setKeyForm({ key: k.key, value: k.value });
    setEditingKey(k);
    setShowKeyModal(true);
  }

  return (
    <div className="nx-app">
      <PageHead
        eyebrow="Administration"
        title="Configuration système"
        desc="Gérez les clés de configuration applicatives et vérifiez les variables d'environnement du serveur."
        actions={
          <button type="button" onClick={openNew} className="btn btn-primary">
            <Plus size={16} aria-hidden="true" /> Nouvelle clé
          </button>
        }
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {/* ── Clés de configuration ── */}
        <Tile>
          <div
            className="row between"
            style={{ marginBottom: 20, alignItems: "center", gap: 12 }}
          >
            <div className="row" style={{ gap: 10, alignItems: "center" }}>
              <Settings2
                size={18}
                strokeWidth={1.5}
                aria-hidden="true"
                style={{ color: "var(--blue)" }}
              />
              <h2 className="h3">Clés de configuration</h2>
            </div>
            {keys && keys.length > 0 && (
              <span className="small" style={{ color: "var(--ink-3)" }}>
                {keys.length} clé{keys.length > 1 ? "s" : ""}
              </span>
            )}
          </div>

          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 14,
              }}
            >
              <thead>
                <tr>
                  <th style={{ ...TH_STYLE, width: "20%" }}>Clé</th>
                  <th style={TH_STYLE}>Valeur</th>
                  <th style={{ ...TH_STYLE, textAlign: "right", width: "10%" }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <SkeletonRow key={i} cols={3} />
                  ))
                ) : !keys?.length ? (
                  <tr>
                    <td
                      colSpan={3}
                      style={{
                        padding: "48px 16px",
                        textAlign: "center",
                        color: "var(--ink-3)",
                      }}
                    >
                      <p className="body" style={{ marginBottom: 8 }}>
                        Aucune clé de configuration
                      </p>
                      <button
                        type="button"
                        onClick={openNew}
                        className="btn btn-sm btn-ghost"
                      >
                        <Plus size={14} aria-hidden="true" /> Ajouter une clé
                      </button>
                    </td>
                  </tr>
                ) : (
                  keys.map((k) => {
                    const isExpanded = expandedKey === k.key;
                    const rawValue =
                      typeof k.value === "object" && k.value !== null
                        ? k.value
                        : String(k.value ?? "");
                    const displayValue = formatValue(rawValue, isExpanded);
                    const isLong =
                      formatValue(rawValue, false) !==
                      formatValue(rawValue, true);

                    return (
                      <tr key={k.key}>
                        <td style={TD_STYLE}>
                          <code
                            style={{
                              fontFamily: "monospace",
                              fontSize: 13,
                              fontWeight: 600,
                              color: "var(--blue)",
                              background:
                                "color-mix(in srgb, var(--blue) 8%, transparent)",
                              padding: "2px 7px",
                              borderRadius: "var(--radius)",
                              border:
                                "1px solid color-mix(in srgb, var(--blue) 20%, transparent)",
                            }}
                          >
                            {k.key}
                          </code>
                        </td>
                        <td style={{ ...TD_STYLE, maxWidth: 0, width: "70%" }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 8,
                            }}
                          >
                            <span
                              style={{
                                fontFamily: "monospace",
                                fontSize: 12,
                                color: "var(--ink-2)",
                                whiteSpace: isExpanded ? "pre-wrap" : "nowrap",
                                overflow: isExpanded ? "visible" : "hidden",
                                textOverflow: isExpanded ? "clip" : "ellipsis",
                                flex: 1,
                                minWidth: 0,
                                wordBreak: isExpanded ? "break-all" : "normal",
                              }}
                            >
                              {displayValue}
                            </span>
                            {isLong && (
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedKey(isExpanded ? null : k.key)
                                }
                                className="btn btn-ghost btn-sm"
                                style={{
                                  fontSize: 11,
                                  color: "var(--blue)",
                                  flexShrink: 0,
                                  padding: "2px 6px",
                                }}
                              >
                                {isExpanded ? "Réduire" : "Voir tout"}
                              </button>
                            )}
                          </div>
                        </td>
                        <td style={{ ...TD_STYLE, textAlign: "right" }}>
                          <div
                            className="row"
                            style={{ gap: 6, justifyContent: "flex-end" }}
                          >
                            <button
                              type="button"
                              onClick={() => openEdit(k)}
                              aria-label={`Modifier ${k.key}`}
                              className="btn btn-ghost btn-sm"
                              title="Modifier"
                            >
                              <Pencil size={15} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteKey(k.key)}
                              aria-label={`Supprimer ${k.key}`}
                              className="btn btn-ghost btn-sm"
                              style={{ color: "var(--red)" }}
                              title="Supprimer"
                            >
                              <Trash2 size={15} aria-hidden="true" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Tile>

        {/* ── Variables d'environnement ── */}
        <EnvCheckSection />
      </div>

      {/* ── Modal nouvelle/modifier clé ── */}
      {showKeyModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.45)",
          }}
          onClick={() => setShowKeyModal(false)}
        >
          <Tile
            style={{ width: "100%", maxWidth: 520, margin: 16 }}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <div
              className="row between"
              style={{ marginBottom: 20, alignItems: "center" }}
            >
              <h2 className="h3">
                {editingKey
                  ? "Modifier la clé"
                  : "Nouvelle clé de configuration"}
              </h2>
              <button
                type="button"
                onClick={() => setShowKeyModal(false)}
                className="btn btn-ghost btn-sm"
                aria-label="Fermer"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="field">
                <label htmlFor="config-key">
                  Clé{" "}
                  {!editingKey && (
                    <span style={{ color: "var(--ink-3)", fontWeight: 400 }}>
                      (ex : SMTP_HOST)
                    </span>
                  )}
                </label>
                <input
                  id="config-key"
                  className="input"
                  style={{ fontFamily: "monospace" }}
                  value={keyForm.key}
                  onChange={(e) =>
                    setKeyForm((f) => ({ ...f, key: e.target.value }))
                  }
                  disabled={!!editingKey}
                  placeholder="NOM_DE_LA_CLE"
                  autoFocus={!editingKey}
                />
              </div>
              <div className="field">
                <label htmlFor="config-value">Valeur</label>
                <textarea
                  id="config-value"
                  className="input"
                  style={{
                    fontFamily: "monospace",
                    fontSize: 13,
                    minHeight: 96,
                    resize: "vertical",
                  }}
                  value={keyForm.value}
                  onChange={(e) =>
                    setKeyForm((f) => ({ ...f, value: e.target.value }))
                  }
                  placeholder="Valeur de la clé…"
                />
              </div>
            </div>

            <div
              className="row"
              style={{ justifyContent: "flex-end", gap: 10, marginTop: 24 }}
            >
              <button
                type="button"
                onClick={() => setShowKeyModal(false)}
                className="btn btn-ghost"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => setKeyMut.mutate(keyForm)}
                disabled={!keyForm.key.trim() || setKeyMut.isPending}
                className="btn btn-primary"
              >
                {setKeyMut.isPending ? "Sauvegarde…" : "Sauvegarder"}
              </button>
            </div>
          </Tile>
        </div>
      )}

      {/* Modal email de test supprimé — utiliser Admin › Modèles email pour tester l'envoi SMTP */}
    </div>
  );
}
