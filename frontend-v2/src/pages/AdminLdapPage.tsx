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

const inp =
  "w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400";

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
    setDraft(sources.filter((_, i) => i !== idx));
  }

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
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Annuaires LDAP</h1>
        <div className="flex gap-2">
          <button
            onClick={addSource}
            className="flex items-center gap-2 px-4 py-2 text-sm border border-slate-200 rounded-xl hover:bg-slate-50 transition"
          >
            <Plus size={16} /> Ajouter une source
          </button>
          <button
            onClick={() => saveMut.mutate(sources)}
            disabled={saveMut.isPending || !dirty}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-primary-500 text-white rounded-xl hover:bg-primary-600 disabled:opacity-50 transition"
          >
            <Save size={16} />{" "}
            {saveMut.isPending ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>

      {dirty && (
        <p className="text-xs text-amber-600 mb-4">
          Modifications non enregistrées — enregistrez avant de tester /
          synchroniser.
        </p>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="h-40 bg-slate-100 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      ) : sources.length === 0 ? (
        <div className="bg-white rounded-2xl shadow p-8 text-center text-slate-500 text-sm">
          Aucun annuaire configuré. Cliquez sur « Ajouter une source ».
        </div>
      ) : (
        <div className="space-y-5">
          {sources.map((src, idx) => {
            const res = results[src.id];
            return (
              <div key={src.id} className="bg-white rounded-2xl shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <input
                      className="text-lg font-semibold text-slate-900 border-b border-transparent hover:border-slate-200 focus:border-primary-400 focus:outline-none"
                      value={src.label}
                      onChange={(e) => patch(idx, "label", e.target.value)}
                    />
                    <label className="flex items-center gap-1 text-xs text-slate-500">
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
                    onClick={() => removeSource(idx)}
                    className="text-slate-400 hover:text-red-500 transition"
                    title="Supprimer"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {fields.map((f) => (
                    <div key={f.key}>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        {f.label}
                      </label>
                      <input
                        className={inp}
                        value={(src[f.key] as string) ?? ""}
                        onChange={(e) => patch(idx, f.key, e.target.value)}
                        placeholder={f.placeholder}
                      />
                    </div>
                  ))}
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Mot de passe Bind
                    </label>
                    <input
                      className={inp}
                      type="password"
                      placeholder="•••••••• (laisser vide = inchangé)"
                      value={src.bindPassword ?? ""}
                      onChange={(e) =>
                        patch(idx, "bindPassword", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Rôle par défaut
                    </label>
                    <input
                      className={inp}
                      value={src.defaultRole ?? "employee"}
                      onChange={(e) =>
                        patch(idx, "defaultRole", e.target.value)
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mt-3">
                  {attrFields.map((f) => (
                    <div key={f.key}>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        {f.label}
                      </label>
                      <input
                        className={inp}
                        value={(src[f.key] as string) ?? ""}
                        onChange={(e) => patch(idx, f.key, e.target.value)}
                      />
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 mt-4">
                  <button
                    onClick={() => testMut.mutate(src.id)}
                    disabled={dirty || testMut.isPending}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50 transition"
                  >
                    <RefreshCw
                      size={14}
                      className={testMut.isPending ? "animate-spin" : ""}
                    />{" "}
                    Tester
                  </button>
                  <button
                    onClick={() => previewMut.mutate(src.id)}
                    disabled={dirty || previewMut.isPending}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50 transition"
                  >
                    <Eye size={14} /> Prévisualiser
                  </button>
                  <button
                    onClick={() => syncMut.mutate(src.id)}
                    disabled={dirty || syncMut.isPending}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary-500 text-white rounded-xl hover:bg-primary-600 disabled:opacity-50 transition"
                  >
                    <RefreshCw
                      size={14}
                      className={syncMut.isPending ? "animate-spin" : ""}
                    />{" "}
                    Synchroniser
                  </button>
                </div>

                {res?.kind === "test" && (
                  <div
                    className={`mt-3 p-3 rounded-xl flex items-center gap-2 text-sm ${res.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}
                  >
                    {res.ok ? <CheckCircle size={16} /> : <XCircle size={16} />}
                    {res.ok ? "Connexion réussie" : "Connexion échouée"}
                    {res.message && (
                      <span className="text-xs text-slate-500">
                        — {res.message}
                      </span>
                    )}
                  </div>
                )}
                {res?.kind === "sync" && (
                  <div className="mt-3 p-3 bg-slate-50 rounded-xl text-sm flex gap-6">
                    <span>
                      <b className="text-green-600">{res.created}</b> créés
                    </span>
                    <span>
                      <b className="text-blue-600">{res.updated}</b> mis à jour
                    </span>
                    <span>
                      <b className="text-slate-500">{res.skipped}</b> ignorés
                    </span>
                    <span>
                      <b className="text-red-500">{res.errors.length}</b>{" "}
                      erreurs
                    </span>
                  </div>
                )}
                {res?.kind === "preview" && (
                  <div className="mt-3 border border-slate-100 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          {["Nom", "Email", "DN"].map((h) => (
                            <th
                              key={h}
                              className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {res.users.slice(0, 100).map((u, i) => (
                          <tr key={u.dn ?? u.mail ?? `row-${i}`}>
                            <td className="px-3 py-2">{u.cn ?? "—"}</td>
                            <td className="px-3 py-2">{u.mail ?? "—"}</td>
                            <td className="px-3 py-2 font-mono text-xs text-slate-500 truncate max-w-xs">
                              {u.dn ?? "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="px-3 py-2 text-xs text-slate-400">
                      {res.users.length} utilisateur(s)
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
