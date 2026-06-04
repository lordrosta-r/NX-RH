import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
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
    <div className="p-6 space-y-6">
      <PageHeader
        title="Configuration Email"
        subtitle="Paramètres SMTP et envoi d'emails"
      />

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-200 animate-pulse rounded" />
          ))}
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate(form);
          }}
          className="space-y-4 bg-white p-6 rounded-xl border border-gray-200"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hôte SMTP
              </label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                defaultValue={config?.smtpHost}
                onChange={(e) =>
                  setForm((f) => ({ ...f, smtpHost: e.target.value }))
                }
                placeholder="smtp.example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Port
              </label>
              <input
                type="number"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                defaultValue={config?.smtpPort}
                onChange={(e) =>
                  setForm((f) => ({ ...f, smtpPort: +e.target.value }))
                }
                placeholder="587"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Utilisateur SMTP
              </label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                defaultValue={config?.smtpUser}
                onChange={(e) =>
                  setForm((f) => ({ ...f, smtpUser: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mot de passe SMTP
              </label>
              <input
                type="password"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                onChange={(e) =>
                  setForm((f) => ({ ...f, smtpPass: e.target.value }))
                }
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email expéditeur
              </label>
              <input
                type="email"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                defaultValue={config?.fromEmail}
                onChange={(e) =>
                  setForm((f) => ({ ...f, fromEmail: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom expéditeur
              </label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                defaultValue={config?.fromName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, fromName: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="secure"
              checked={current.smtpSecure ?? false}
              onChange={(e) =>
                setForm((f) => ({ ...f, smtpSecure: e.target.checked }))
              }
            />
            <label htmlFor="secure" className="text-sm text-gray-700">
              Connexion sécurisée (TLS)
            </label>
          </div>
          <Button type="submit" loading={saveMutation.isPending}>
            Enregistrer
          </Button>
        </form>
      )}

      <div className="bg-white p-6 rounded-xl border border-gray-200 space-y-3">
        <h3 className="font-medium text-gray-800">Test d'envoi</h3>
        <div className="flex gap-3">
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
            placeholder="destinataire@example.com"
          />
          <Button
            onClick={() => testMutation.mutate(testEmail)}
            loading={testMutation.isPending}
            disabled={!testEmail}
            variant="secondary"
          >
            Envoyer un test
          </Button>
        </div>
        {testMutation.isSuccess && (
          <p className="text-sm text-green-600">✅ Email envoyé avec succès</p>
        )}
        {testMutation.isError && (
          <p className="text-sm text-red-600">❌ Échec de l'envoi</p>
        )}
      </div>
    </div>
  );
}
