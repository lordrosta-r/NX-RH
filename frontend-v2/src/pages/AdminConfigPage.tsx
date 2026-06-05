import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, X, CheckCircle2, XCircle } from "lucide-react";
import { adminApi } from "../api/admin";
import { queryKeys } from "../lib/queryKeys";
import { PageHead, Tile, Badge } from "../components/shell";

type ConfigKey = { key: string; value: string };

type EnvVar = {
  key: string;
  set: boolean;
  required: boolean;
  description: string;
};

function SkeletonRow() {
  return (
    <tr>
      <td style={{ padding: "12px 16px" }}>
        <div
          style={{
            height: 16,
            width: 128,
            borderRadius: 6,
            background: "var(--bg-alt)",
          }}
        />
      </td>
      <td style={{ padding: "12px 16px" }}>
        <div
          style={{
            height: 16,
            width: 192,
            borderRadius: 6,
            background: "var(--bg-alt)",
          }}
        />
      </td>
      <td style={{ padding: "12px 16px" }}>
        <div
          style={{
            height: 16,
            width: 64,
            borderRadius: 6,
            background: "var(--bg-alt)",
          }}
        />
      </td>
    </tr>
  );
}

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

  return (
    <Tile>
      <h2 className="h3" style={{ marginBottom: 16 }}>
        Variables d'environnement
      </h2>
      {isLoading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="row"
              style={{ gap: 12, alignItems: "center" }}
            >
              <div
                style={{
                  height: 20,
                  width: 20,
                  borderRadius: 9999,
                  background: "var(--bg-alt)",
                }}
              />
              <div
                style={{
                  height: 16,
                  width: 160,
                  borderRadius: 6,
                  background: "var(--bg-alt)",
                }}
              />
              <div
                style={{
                  height: 16,
                  width: 256,
                  borderRadius: 6,
                  background: "var(--bg-alt)",
                  marginLeft: 16,
                }}
              />
            </div>
          ))}
        </div>
      )}
      {isError && (
        <p
          className="body"
          style={{ textAlign: "center", color: "var(--ink-2)" }}
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
              <tr style={{ borderBottom: "1px solid var(--line)" }}>
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--ink-3)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Variable
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--ink-3)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Description
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--ink-3)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Statut
                </th>
              </tr>
            </thead>
            <tbody>
              {envVars.map((v) => (
                <tr
                  key={v.key}
                  style={{ borderBottom: "1px solid var(--line)" }}
                >
                  <td style={{ padding: "12px 16px" }}>
                    <span
                      style={{
                        fontFamily: "monospace",
                        color: "var(--ink)",
                        fontWeight: v.required ? 700 : 400,
                      }}
                    >
                      {v.key}
                    </span>
                    {v.required && (
                      <span
                        style={{
                          marginLeft: 8,
                          fontSize: 10,
                          color: "var(--ink-3)",
                          textTransform: "uppercase",
                        }}
                      >
                        requis
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "12px 16px", color: "var(--ink-2)" }}>
                    {v.description}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    {v.set ? (
                      <span
                        className="row"
                        style={{
                          gap: 6,
                          color: "var(--green)",
                          alignItems: "center",
                        }}
                      >
                        <CheckCircle2 size={16} aria-hidden="true" />
                        <span className="small" style={{ fontWeight: 600 }}>
                          Définie
                        </span>
                      </span>
                    ) : (
                      <span
                        className="row"
                        style={{
                          gap: 6,
                          color: "var(--red)",
                          alignItems: "center",
                        }}
                      >
                        <XCircle size={16} aria-hidden="true" />
                        <span className="small" style={{ fontWeight: 600 }}>
                          Manquante
                        </span>
                      </span>
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

export default function AdminConfigPage() {
  const qc = useQueryClient();
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [editingKey, setEditingKey] = useState<ConfigKey | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [keyForm, setKeyForm] = useState({ key: "", value: "" });

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
      setDeleteTarget(null);
    },
  });

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
        title="Configuration système"
        actions={
          <button type="button" onClick={openNew} className="btn btn-primary">
            <Plus size={16} aria-hidden="true" /> Nouvelle clé
          </button>
        }
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <Tile>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 14,
              }}
            >
              <thead>
                <tr style={{ borderBottom: "1px solid var(--line)" }}>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--ink-3)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Clé
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--ink-3)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Valeur
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "right",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--ink-3)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <SkeletonRow key={i} />
                  ))
                ) : !keys?.length ? (
                  <tr>
                    <td
                      colSpan={3}
                      style={{
                        padding: "48px 16px",
                        textAlign: "center",
                        color: "var(--ink-2)",
                      }}
                    >
                      Aucune clé de configuration
                    </td>
                  </tr>
                ) : (
                  keys.map((k) => (
                    <tr
                      key={k.key}
                      style={{ borderBottom: "1px solid var(--line)" }}
                    >
                      <td
                        style={{
                          padding: "12px 16px",
                          fontFamily: "monospace",
                          color: "var(--ink)",
                        }}
                      >
                        {k.key}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          color: "var(--ink-2)",
                          maxWidth: 320,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {typeof k.value === "object" && k.value !== null
                          ? JSON.stringify(k.value)
                          : String(k.value ?? "")}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right" }}>
                        <div
                          className="row"
                          style={{ gap: 8, justifyContent: "flex-end" }}
                        >
                          <button
                            type="button"
                            onClick={() => openEdit(k)}
                            aria-label={`Modifier ${k.key}`}
                            className="btn btn-ghost btn-sm"
                          >
                            <Pencil size={15} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(k.key)}
                            aria-label={`Supprimer ${k.key}`}
                            className="btn btn-ghost btn-sm"
                            style={{ color: "var(--red)" }}
                          >
                            <Trash2 size={15} aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Tile>

        {/* Variables d'environnement */}
        <EnvCheckSection />
      </div>

      {/* Modal nouvelle/modifier clé */}
      {showKeyModal && (
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
          <Tile style={{ width: "100%", maxWidth: 480, margin: 16 }}>
            <div
              className="row between"
              style={{ marginBottom: 16, alignItems: "center" }}
            >
              <h2 className="h3">
                {editingKey ? "Modifier la clé" : "Nouvelle clé"}
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
                <label htmlFor="config-key">Clé</label>
                <input
                  id="config-key"
                  className="input"
                  style={{ fontFamily: "monospace" }}
                  value={keyForm.key}
                  onChange={(e) =>
                    setKeyForm((f) => ({ ...f, key: e.target.value }))
                  }
                  disabled={!!editingKey}
                  placeholder="ex: SMTP_HOST"
                />
              </div>
              <div className="field">
                <label htmlFor="config-value">Valeur</label>
                <input
                  id="config-value"
                  className="input"
                  value={keyForm.value}
                  onChange={(e) =>
                    setKeyForm((f) => ({ ...f, value: e.target.value }))
                  }
                  placeholder="Valeur"
                />
              </div>
            </div>
            <div
              className="row"
              style={{ justifyContent: "flex-end", gap: 12, marginTop: 24 }}
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
                disabled={!keyForm.key || setKeyMut.isPending}
                className="btn btn-primary"
              >
                {setKeyMut.isPending ? "Sauvegarde…" : "Sauvegarder"}
              </button>
            </div>
          </Tile>
        </div>
      )}

      {/* Modal email de test supprimé — utiliser Admin › Modèles email pour tester l'envoi SMTP */}

      {/* Confirm delete */}
      {deleteTarget && (
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
          <Tile style={{ width: "100%", maxWidth: 400, margin: 16 }}>
            <h2 className="h3" style={{ marginBottom: 8 }}>
              Supprimer la clé
            </h2>
            <p className="body" style={{ marginBottom: 24 }}>
              Supprimer <Badge tone="red">{deleteTarget}</Badge> ?
            </p>
            <div
              className="row"
              style={{ justifyContent: "flex-end", gap: 12 }}
            >
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="btn btn-ghost"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => deleteKeyMut.mutate(deleteTarget)}
                disabled={deleteKeyMut.isPending}
                className="btn btn-primary"
                style={{ background: "var(--red)", borderColor: "var(--red)" }}
              >
                {deleteKeyMut.isPending ? "Suppression…" : "Supprimer"}
              </button>
            </div>
          </Tile>
        </div>
      )}
    </div>
  );
}
