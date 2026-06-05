import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Send, CheckCircle, XCircle } from "lucide-react";
import { PageHead, Tile, Callout } from "../components/shell";
import client from "@/api/client";

interface TestResult {
  sent: boolean;
  previewUrl?: string | null;
}

export default function AdminMailTestPage() {
  const [email, setEmail] = useState("");

  const testMutation = useMutation({
    mutationFn: (to: string) =>
      client
        .post<TestResult>("/api/admin/email/test", { to })
        .then((r) => r.data),
  });

  const result = testMutation.data;
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  return (
    <div className="nx-app">
      <PageHead
        title="Test d'envoi d'email"
        desc="Envoie un email de test via la configuration SMTP courante"
      />

      <Tile>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="field">
            <label htmlFor="mail-test-to">Destinataire</label>
            <input
              id="mail-test-to"
              type="email"
              className="input"
              placeholder="vous@exemple.fr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="row" style={{ gap: 12 }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => testMutation.mutate(email)}
              disabled={!valid || testMutation.isPending}
            >
              <Send size={16} aria-hidden="true" />
              {testMutation.isPending ? "Envoi…" : "Envoyer l'email de test"}
            </button>
          </div>

          {testMutation.isSuccess && (
            <Callout tone="green">
              <div
                className="row"
                style={{ gap: 12, alignItems: "flex-start" }}
              >
                <CheckCircle
                  size={20}
                  aria-hidden="true"
                  style={{ flexShrink: 0, marginTop: 2 }}
                />
                <div>
                  <p className="body" style={{ fontWeight: 600 }}>
                    Email envoyé
                  </p>
                  {result?.previewUrl && (
                    <a
                      href={result.previewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="link"
                      style={{ wordBreak: "break-all" }}
                    >
                      Voir l'aperçu (Ethereal)
                    </a>
                  )}
                </div>
              </div>
            </Callout>
          )}

          {testMutation.isError && (
            <Callout tone="red">
              <div className="row" style={{ gap: 12, alignItems: "center" }}>
                <XCircle
                  size={20}
                  aria-hidden="true"
                  style={{ flexShrink: 0 }}
                />
                <span className="body">
                  Échec de l'envoi — vérifiez la configuration SMTP.
                </span>
              </div>
            </Callout>
          )}
        </div>
      </Tile>
    </div>
  );
}
