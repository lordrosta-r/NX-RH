import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Send, CheckCircle, XCircle } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
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
    <div className="p-6 space-y-6 max-w-xl">
      <PageHeader
        title="Test d'envoi d'email"
        subtitle="Envoie un email de test via la configuration SMTP courante"
      />

      <div className="bg-white rounded-2xl shadow p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Destinataire
          </label>
          <input
            type="email"
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            placeholder="vous@exemple.fr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <Button
          onClick={() => testMutation.mutate(email)}
          loading={testMutation.isPending}
          disabled={!valid || testMutation.isPending}
          className="flex items-center gap-2"
        >
          <Send size={16} /> Envoyer l'email de test
        </Button>

        {testMutation.isSuccess && (
          <div className="p-4 rounded-xl bg-green-50 flex items-start gap-3">
            <CheckCircle
              size={20}
              className="text-green-500 flex-shrink-0 mt-0.5"
            />
            <div className="text-sm">
              <p className="font-semibold text-green-700">Email envoyé</p>
              {result?.previewUrl && (
                <a
                  href={result.previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary-600 hover:underline break-all"
                >
                  Voir l'aperçu (Ethereal)
                </a>
              )}
            </div>
          </div>
        )}

        {testMutation.isError && (
          <div className="p-4 rounded-xl bg-red-50 flex items-center gap-3 text-sm text-red-700">
            <XCircle size={20} className="text-red-500 flex-shrink-0" />
            Échec de l'envoi — vérifiez la configuration SMTP.
          </div>
        )}
      </div>
    </div>
  );
}
