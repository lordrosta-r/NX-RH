import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle,
  XCircle,
  RefreshCw,
  Eye,
  Plus,
  Trash2,
  Save,
} from "lucide-react";
import { adminApi } from "../api/admin";
import type { LdapSource } from "../types";
import { PageHead, Tile, Badge } from "../components/shell";
import {
  validateLdapSource,
  type LdapFieldErrors,
} from "../schemas/ldap";

function emptySource(): LdapSource {
  return {
    id: `src-${Date.now()}`,
    label: "Nouvel annuaire",
    enabled: true,
    host: "ldap://",
    baseDN: "",
    bindDN: "",
    bindPassword: "",
    userFilter: "(objectClass=person)",
    attrEmail: "mail",
    attrFirstName: "givenName",
    attrLastName: "sn",
    defaultRole: "employee",
  };
}

type ActionResult =
  | { kind: "test"; ok: boolean; message?: string }
  | {
      kind: "sync";
      created: number;
      updated: number;
      skipped: number;
      errors: string[];
    }
  | { kind: "preview"; users: Record<string, string>[] };

export default function AdminLdapPage() {
  const qc = useQueryClient();
  // `draft` = édition locale en cours (null tant qu'on n'a rien modifié) ;
  // l'affichage dérive de draft ?? données serveur — pas de setState dans un effet.
  const [draft, setDraft] = useState<LdapSource[] | null>(null);
  const [results, setResults] = useState<Record<string, ActionResult>>({});
  // Erreurs de validation par source.id (objet vide = source valide)
  const [errors, setErrors] = useState<Record<string, LdapFieldErrors>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["ldap", "sources"],
    queryFn: () => adminApi.getLdapSources().then((r) => r.data.sources),
  });

  const sources = draft ?? data ?? [];
  const dirty = draft !== null;

  const saveMut = useMutation({
    mutationFn: (next: LdapSource[]) => adminApi.updateLdapSources(next),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ldap", "sources"] });
      setDraft(null);
    },
  });

  const testMut = useMutation({
    mutationFn: (id: string) => adminApi.testLdapSource(id),
    onSuccess: (res, id) =>
      setResults((r) => ({
        ...r,
        [id]: {
          kind: "test",
          ok: res.data.ok,
          message: res.data.info ?? res.data.error,
        },
      })),
    onError: (_e, id) =>
      setResults((r) => ({
        ...r,
        [id]: { kind: "test", ok: false, message: "Connexion échouée" },
      })),
  });

  const previewMut = useMutation({
    mutationFn: (id: string) => adminApi.previewLdapSource(id),
    onSuccess: (res, id) =>
      setResults((r) => ({
        ...r,
        [id]: { kind: "preview", users: res.data.users ?? [] },
      })),
  });

  const syncMut = useMutation({
    mutationFn: (id: string) => adminApi.syncLdapSource(id),
    onSuccess: (res, id) =>
      setResults((r) => ({ ...r, [id]: { kind: "sync", ...res.data } })),
  });

  function patch(
    idx: number,
    field: keyof LdapSource,
    value: string | boolean,
  ) {
    setDraft(
      sources.map((src, i) => (i === idx ? { ...src, [field]: value } : src)),
    );
  }

  function addSource() {
    setDraft([...sources, emptySource()]);
  }

  function removeSource(idx: number) {
    const removed = sources[idx];
    setDraft(sources.filter((_, i) => i !== idx));
    if (removed) {
      setErrors((e) => {
        const rest = { ...e };
        delete rest[removed.id];
        return rest;
      });
    }
  }

  // Valide une source et stocke ses erreurs (onBlur / onSave)
  function validateOne(src: LdapSource): LdapFieldErrors {
    const fieldErrors = validateLdapSource(src);
    setErrors((e) => ({ ...e, [src.id]: fieldErrors }));
    return fieldErrors;
  }

  // Valide toutes les sources avant enregistrement ; n'envoie que si tout est valide
  function handleSave() {
    const next: Record<string, LdapFieldErrors> = {};
    let valid = true;
    for (const src of sources) {
      const fieldErrors = validateLdapSource(src);
      next[src.id] = fieldErrors;
      if (Object.keys(fieldErrors).length > 0) valid = false;
    }
    setErrors(next);
    if (!valid) return;
    saveMut.mutate(sources);
  }

  // Au moins une source en erreur → bloque l'enregistrement
  const hasErrors = Object.values(errors).some(
    (fe) => Object.keys(fe).length > 0,
  );

  const fields: {
    label: string;
    key: keyof LdapSource;
    placeholder?: string;
  }[] = [
    { label: "Hôte (URL)", key: "host", placeholder: "ldap://openldap:389" },
    { label: "Base DN", key: "baseDN", placeholder: "dc=example,dc=com" },
    {
      label: "Bind DN",
      key: "bindDN",
      placeholder: "cn=admin,dc=example,dc=com",
    },
    {
      label: "Filtre utilisateurs",
      key: "userFilter",
      placeholder: "(objectClass=person)",
    },
  ];
  const attrFields: { label: string; key: keyof LdapSource }[] = [
    { label: "Attr. email", key: "attrEmail" },
    { label: "Attr. prénom", key: "attrFirstName" },
    { label: "Attr. nom", key: "attrLastName" },
  ];

  return (
    <div className="nx-app">
      <PageHead
        eyebrow="Administration"
        title="Annuaires LDAP"
        actions={
          <>
            <button type="button" onClick={addSource} className="btn btn-ghost">
              <Plus className="ico" style={{ width: 18, height: 18 }} /> Ajouter
              une source
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saveMut.isPending || !dirty || hasErrors}
              className="btn btn-primary"
            >
              <Save className="ico" style={{ width: 18, height: 18 }} />{" "}
              {saveMut.isPending ? "Enregistrement…" : "Enregistrer"}
            </button>
          </>
        }
      />

      {dirty && (
        <p
          className="small"
          style={{ color: "var(--amber)", marginBottom: 16 }}
        >
          Modifications non enregistrées — enregistrez avant de tester /
          synchroniser.
        </p>
      )}

      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {Array.from({ length: 2 }).map((_, i) => (
            <Tile key={i}>
              <p className="body">Chargement…</p>
            </Tile>
          ))}
        </div>
      ) : sources.length === 0 ? (
        <Tile>
          <p className="body" style={{ textAlign: "center" }}>
            Aucun annuaire configuré. Cliquez sur « Ajouter une source ».
          </p>
        </Tile>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {sources.map((src, idx) => {
            const res = results[src.id];
            const srcErrors = errors[src.id] ?? {};
            return (
              <Tile key={src.id}>
                <div
                  className="row between"
                  style={{ alignItems: "center", marginBottom: 16 }}
                >
                  <div
                    className="row"
                    style={{ gap: 12, alignItems: "center" }}
                  >
                    <input
                      className="input"
                      aria-label="Nom de l'annuaire"
                      style={{ fontWeight: 600, maxWidth: 320 }}
                      value={src.label}
                      onChange={(e) => patch(idx, "label", e.target.value)}
                    />
                    <label
                      className="row small"
                      style={{ gap: 6, alignItems: "center" }}
                    >
                      <input
                        type="checkbox"
                        checked={src.enabled}
                        onChange={(e) =>
                          patch(idx, "enabled", e.target.checked)
                        }
                      />
                      Activé
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSource(idx)}
                    aria-label="Supprimer l'annuaire"
                    className="btn btn-ghost btn-sm"
                    style={{ padding: 6 }}
                  >
                    <Trash2 className="ico" style={{ width: 18, height: 18 }} />
                  </button>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                    gap: 16,
                  }}
                >
                  {fields.map((f) => {
                    const fieldError = srcErrors[f.key as string];
                    return (
                      <div className="field" key={f.key}>
                        <label htmlFor={`${src.id}-${f.key}`}>{f.label}</label>
                        <input
                          id={`${src.id}-${f.key}`}
                          className="input"
                          style={
                            fieldError
                              ? { borderColor: "var(--red)" }
                              : undefined
                          }
                          aria-invalid={fieldError ? true : undefined}
                          value={(src[f.key] as string) ?? ""}
                          onChange={(e) => patch(idx, f.key, e.target.value)}
                          onBlur={() => validateOne(src)}
                          placeholder={f.placeholder}
                        />
                        {fieldError && (
                          <p
                            className="small"
                            style={{ color: "var(--red)", marginTop: 4 }}
                          >
                            {fieldError}
                          </p>
                        )}
                      </div>
                    );
                  })}
                  <div className="field">
                    <label htmlFor={`${src.id}-bindPassword`}>
                      Mot de passe Bind
                    </label>
                    <input
                      id={`${src.id}-bindPassword`}
                      className="input"
                      type="password"
                      placeholder="•••••••• (laisser vide = inchangé)"
                      value={src.bindPassword ?? ""}
                      onChange={(e) =>
                        patch(idx, "bindPassword", e.target.value)
                      }
                    />
                  </div>
                  <div className="field">
                    <label htmlFor={`${src.id}-defaultRole`}>
                      Rôle par défaut
                    </label>
                    <input
                      id={`${src.id}-defaultRole`}
                      className="input"
                      value={src.defaultRole ?? "employee"}
                      onChange={(e) =>
                        patch(idx, "defaultRole", e.target.value)
                      }
                    />
                  </div>
                  <div className="field">
                    <label htmlFor={`${src.id}-excludePatterns`}>
                      Comptes exclus (motifs)
                    </label>
                    <input
                      id={`${src.id}-excludePatterns`}
                      className="input"
                      placeholder="svc-*, *@bots.local, admin*"
                      value={(src.excludePatterns ?? []).join(", ")}
                      onChange={(e) =>
                        patch(
                          idx,
                          "excludePatterns" as keyof LdapSource,
                          e.target.value
                            .split(/[\s,]+/)
                            .filter(Boolean) as unknown as string,
                        )
                      }
                    />
                    <span className="small" style={{ color: "var(--ink-3)" }}>
                      Comptes système/service ignorés à l'import et désactivés
                      s'ils ont déjà été synchronisés.
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: 16,
                    marginTop: 16,
                  }}
                >
                  {attrFields.map((f) => (
                    <div className="field" key={f.key}>
                      <label htmlFor={`${src.id}-${f.key}`}>{f.label}</label>
                      <input
                        id={`${src.id}-${f.key}`}
                        className="input"
                        value={(src[f.key] as string) ?? ""}
                        onChange={(e) => patch(idx, f.key, e.target.value)}
                      />
                    </div>
                  ))}
                </div>

                <div
                  className="row"
                  style={{ gap: 8, alignItems: "center", marginTop: 16 }}
                >
                  <button
                    type="button"
                    onClick={() => testMut.mutate(src.id)}
                    disabled={dirty || testMut.isPending}
                    className="btn btn-ghost btn-sm"
                  >
                    <RefreshCw
                      className={`ico ${testMut.isPending ? "animate-spin" : ""}`}
                      style={{ width: 14, height: 14 }}
                    />{" "}
                    Tester
                  </button>
                  <button
                    type="button"
                    onClick={() => previewMut.mutate(src.id)}
                    disabled={dirty || previewMut.isPending}
                    className="btn btn-ghost btn-sm"
                  >
                    <Eye className="ico" style={{ width: 14, height: 14 }} />{" "}
                    Prévisualiser
                  </button>
                  <button
                    type="button"
                    onClick={() => syncMut.mutate(src.id)}
                    disabled={dirty || syncMut.isPending}
                    className="btn btn-primary btn-sm"
                  >
                    <RefreshCw
                      className={`ico ${syncMut.isPending ? "animate-spin" : ""}`}
                      style={{ width: 14, height: 14 }}
                    />{" "}
                    Synchroniser
                  </button>
                </div>

                {res?.kind === "test" && (
                  <div
                    className="row"
                    style={{ gap: 8, alignItems: "center", marginTop: 16 }}
                  >
                    <Badge tone={res.ok ? "green" : "red"}>
                      {res.ok ? (
                        <CheckCircle
                          className="ico"
                          style={{ width: 14, height: 14 }}
                        />
                      ) : (
                        <XCircle
                          className="ico"
                          style={{ width: 14, height: 14 }}
                        />
                      )}
                      {res.ok ? "Connexion réussie" : "Connexion échouée"}
                    </Badge>
                    {res.message && (
                      <span className="small">— {res.message}</span>
                    )}
                  </div>
                )}
                {res?.kind === "sync" && (
                  <div
                    className="row wrap"
                    style={{
                      gap: 24,
                      marginTop: 16,
                      padding: 12,
                      background: "var(--bg-alt)",
                      borderRadius: "var(--radius)",
                    }}
                  >
                    <span className="small">
                      <b style={{ color: "var(--green)" }}>{res.created}</b>{" "}
                      créés
                    </span>
                    <span className="small">
                      <b style={{ color: "var(--blue)" }}>{res.updated}</b> mis
                      à jour
                    </span>
                    <span className="small">
                      <b style={{ color: "var(--ink-3)" }}>{res.skipped}</b>{" "}
                      ignorés
                    </span>
                    <span className="small">
                      <b style={{ color: "var(--red)" }}>{res.errors.length}</b>{" "}
                      erreurs
                    </span>
                  </div>
                )}
                {res?.kind === "preview" && (
                  <div style={{ marginTop: 16 }}>
                    <div
                      className="tbl-head"
                      style={{ gridTemplateColumns: "1fr 1fr 2fr" }}
                    >
                      <div>Nom</div>
                      <div>Email</div>
                      <div>DN</div>
                    </div>
                    {res.users.slice(0, 100).map((u, i) => (
                      <div
                        key={u.dn ?? u.mail ?? `row-${i}`}
                        className="tbl-row"
                        style={{ gridTemplateColumns: "1fr 1fr 2fr" }}
                      >
                        <div className="small">{u.cn ?? "—"}</div>
                        <div className="small">{u.mail ?? "—"}</div>
                        <div
                          className="small truncate"
                          style={{ fontFamily: "monospace" }}
                        >
                          {u.dn ?? "—"}
                        </div>
                      </div>
                    ))}
                    <p className="small" style={{ marginTop: 8 }}>
                      {res.users.length} utilisateur(s)
                    </p>
                  </div>
                )}
              </Tile>
            );
          })}
        </div>
      )}
    </div>
  );
}
