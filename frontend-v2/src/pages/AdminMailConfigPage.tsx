import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHead, Tile, Callout } from "@/components/shell";
import client from "@/api/client";
import { queryKeys } from "@/lib/queryKeys";

interface MailConfig {
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPass: string;
  fromEmail: string;
  fromName: string;
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
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
              onSubmit={(e) => {
                e.preventDefault();
                saveMutation.mutate(form);
              }}
              style={{ display: "flex", flexDirection: "column", gap: 16 }}
            >
              <h2 className="h3" style={{ marginBottom: 0 }}>
                Paramètres SMTP
              </h2>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 16,
                }}
              >
                <Field label="Hôte SMTP" htmlFor="smtp-host">
                  <input
                    id="smtp-host"
                    type="text"
                    className="input"
                    defaultValue={config?.smtpHost}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, smtpHost: e.target.value }))
                    }
                    placeholder="smtp.example.com"
                  />
                </Field>
                <Field label="Port" htmlFor="smtp-port">
                  <input
                    id="smtp-port"
                    type="number"
                    className="input"
                    defaultValue={config?.smtpPort}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, smtpPort: +e.target.value }))
                    }
                    placeholder="587"
                  />
                </Field>
                <Field label="Utilisateur SMTP" htmlFor="smtp-user">
                  <input
                    id="smtp-user"
                    type="text"
                    className="input"
                    defaultValue={config?.smtpUser}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, smtpUser: e.target.value }))
                    }
                  />
                </Field>
                <Field label="Mot de passe SMTP" htmlFor="smtp-pass">
                  <input
                    id="smtp-pass"
                    type="password"
                    className="input"
                    onChange={(e) =>
                      setForm((f) => ({ ...f, smtpPass: e.target.value }))
                    }
                    placeholder="••••••••"
                  />
                </Field>
                <Field label="Email expéditeur" htmlFor="from-email">
                  <input
                    id="from-email"
                    type="email"
                    className="input"
                    defaultValue={config?.fromEmail}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, fromEmail: e.target.value }))
                    }
                  />
                </Field>
                <Field label="Nom expéditeur" htmlFor="from-name">
                  <input
                    id="from-name"
                    type="text"
                    className="input"
                    defaultValue={config?.fromName}
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
