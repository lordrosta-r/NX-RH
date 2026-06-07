import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Server } from "lucide-react";
import { PageHead, Tile, Callout } from "@/components/shell";
import client from "@/api/client";
import { queryKeys } from "@/lib/queryKeys";
import { mailConfigSchema } from "@/schemas/smtp";

interface MailConfig {
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPass: string;
  passwordSet?: boolean;
  fromEmail: string;
  fromName: string;
}

type FieldErrors = Partial<Record<keyof MailConfig, string>>;

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {error && (
        <span
          className="caption"
          style={{ color: "var(--red)", marginTop: 4 }}
        >
          {error}
        </span>
      )}
    </div>
  );
}

export default function AdminMailConfigPage() {
  const qc = useQueryClient();

  const { data: config, isLoading } = useQuery<MailConfig>({
    queryKey: queryKeys.mailConfig.all,
    queryFn: () =>
      client.get("/api/admin/config/mail").then((r) => r.data?.data ?? r.data),
  });

  const [form, setForm] = useState<Partial<MailConfig>>({});
  const [errors, setErrors] = useState<FieldErrors>({});
  const [testEmail, setTestEmail] = useState("");

  const saveMutation = useMutation({
    mutationFn: (data: Partial<MailConfig>) =>
      client.put("/api/admin/config/mail", data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.mailConfig.all }),
  });

  const testMutation = useMutation({
    mutationFn: (email: string) =>
      client.post("/api/admin/email/test", { to: email }),
  });

  const current: Partial<MailConfig> = { ...config, ...form };

  function applyOvhPreset() {
    setForm((f) => ({
      ...f,
      smtpHost: "smtp.ovh.net",
      smtpPort: 587,
      smtpSecure: false,
    }));
    setErrors((e) => ({
      ...e,
      smtpHost: undefined,
      smtpPort: undefined,
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Mot de passe : vide autorisé si déjà stocké (passwordSet), sinon requis.
    const payload = {
      smtpHost: current.smtpHost ?? "",
      smtpPort: current.smtpPort ?? 0,
      smtpSecure: current.smtpSecure ?? false,
      smtpUser: current.smtpUser ?? "",
      smtpPass: current.smtpPass ?? "",
      fromEmail: current.fromEmail ?? "",
      fromName: current.fromName ?? "",
    };
    const parsed = mailConfigSchema.safeParse(payload);
    const nextErrors: FieldErrors = {};
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof MailConfig;
        if (key && !nextErrors[key]) nextErrors[key] = issue.message;
      }
    }
    if (!payload.smtpPass && !config?.passwordSet) {
      nextErrors.smtpPass =
        "Le mot de passe SMTP est requis lors de la première configuration";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    // N'envoyer le mot de passe que s'il a été saisi (vide = inchangé côté serveur).
    const { smtpPass, ...rest } = payload;
    saveMutation.mutate(smtpPass ? payload : rest);
  }

  return (
    <div className="nx-app">
      <PageHead
        title="Configuration Email"
        desc="Paramètres SMTP et envoi d'emails"
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {isLoading ? (
          <Tile>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  style={{
                    height: 40,
                    background: "var(--bg-alt)",
                    borderRadius: "var(--radius)",
                  }}
                />
              ))}
            </div>
          </Tile>
        ) : (
          <Tile>
            <form
              onSubmit={handleSubmit}
              style={{ display: "flex", flexDirection: "column", gap: 16 }}
            >
              <div
                className="row"
                style={{ justifyContent: "space-between", alignItems: "center" }}
              >
                <h2 className="h3" style={{ marginBottom: 0 }}>
                  Paramètres SMTP
                </h2>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={applyOvhPreset}
                  style={{ color: "var(--blue)", borderColor: "var(--line)" }}
                >
                  <Server size={16} aria-hidden="true" />
                  Preset OVH
                </button>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 16,
                }}
              >
                <Field
                  label="Hôte SMTP"
                  htmlFor="smtp-host"
                  error={errors.smtpHost}
                >
                  <input
                    id="smtp-host"
                    type="text"
                    className="input"
                    value={current.smtpHost ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, smtpHost: e.target.value }))
                    }
                    placeholder="smtp.example.com"
                  />
                </Field>
                <Field label="Port" htmlFor="smtp-port" error={errors.smtpPort}>
                  <input
                    id="smtp-port"
                    type="number"
                    className="input"
                    value={current.smtpPort ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        smtpPort:
                          e.target.value === ""
                            ? undefined
                            : Number(e.target.value),
                      }))
                    }
                    placeholder="587"
                  />
                </Field>
                <Field
                  label="Utilisateur SMTP"
                  htmlFor="smtp-user"
                  error={errors.smtpUser}
                >
                  <input
                    id="smtp-user"
                    type="text"
                    className="input"
                    value={current.smtpUser ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, smtpUser: e.target.value }))
                    }
                  />
                </Field>
                <Field
                  label="Mot de passe SMTP"
                  htmlFor="smtp-pass"
                  error={errors.smtpPass}
                >
                  <input
                    id="smtp-pass"
                    type="password"
                    className="input"
                    value={current.smtpPass ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, smtpPass: e.target.value }))
                    }
                    placeholder={
                      config?.passwordSet ? "•••••••• (inchangé)" : "••••••••"
                    }
                  />
                </Field>
                <Field
                  label="Email expéditeur"
                  htmlFor="from-email"
                  error={errors.fromEmail}
                >
                  <input
                    id="from-email"
                    type="email"
                    className="input"
                    value={current.fromEmail ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, fromEmail: e.target.value }))
                    }
                  />
                </Field>
                <Field
                  label="Nom expéditeur"
                  htmlFor="from-name"
                  error={errors.fromName}
                >
                  <input
                    id="from-name"
                    type="text"
                    className="input"
                    value={current.fromName ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, fromName: e.target.value }))
                    }
                  />
                </Field>
              </div>
              <label
                className="row"
                style={{ gap: 8, cursor: "pointer", alignItems: "center" }}
              >
                <input
                  type="checkbox"
                  id="secure"
                  checked={current.smtpSecure ?? false}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, smtpSecure: e.target.checked }))
                  }
                />
                <span className="body">Connexion sécurisée (TLS)</span>
              </label>
              <div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saveMutation.isPending}
                >
                  {saveMutation.isPending ? "Enregistrement…" : "Enregistrer"}
                </button>
              </div>
            </form>
          </Tile>
        )}

        <Tile>
          <h2 className="h3" style={{ marginBottom: 16 }}>
            Test d'envoi
          </h2>
          <div className="row" style={{ gap: 12, alignItems: "flex-start" }}>
            <input
              type="email"
              value={testEmail}
              aria-label="Adresse email de destination du test"
              onChange={(e) => setTestEmail(e.target.value)}
              className="input"
              style={{ flex: 1 }}
              placeholder="destinataire@example.com"
            />
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => testMutation.mutate(testEmail)}
              disabled={!testEmail || testMutation.isPending}
            >
              {testMutation.isPending ? "Envoi…" : "Envoyer un test"}
            </button>
          </div>
          {testMutation.isSuccess && (
            <Callout tone="green" style={{ marginTop: 16 }}>
              Email envoyé avec succès
            </Callout>
          )}
          {testMutation.isError && (
            <Callout tone="red" style={{ marginTop: 16 }}>
              Échec de l'envoi
            </Callout>
          )}
        </Tile>
      </div>
    </div>
  );
}
