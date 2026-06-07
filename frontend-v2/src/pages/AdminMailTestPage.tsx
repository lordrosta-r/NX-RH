import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { Send, CheckCircle, XCircle } from "lucide-react";
import { PageHead, Tile, Callout } from "../components/shell";
import client from "@/api/client";
import { mailTestSchema } from "@/schemas/smtp";

interface TestResult {
  sent: boolean;
  previewUrl?: string | null;
}

export default function AdminMailTestPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const testMutation = useMutation({
    mutationFn: (to: string) =>
      client
        .post<TestResult>("/api/admin/email/test", { to })
        .then((r) => r.data),
  });

  const result = testMutation.data;
  const parsed = mailTestSchema.safeParse({ to: email });
  const valid = parsed.success;

  function handleTest() {
    const check = mailTestSchema.safeParse({ to: email });
    if (!check.success) {
      setError(
        check.error.issues[0]?.message ?? t("adminMailTest.invalidAddress"),
      );
      return;
    }
    setError(null);
    testMutation.mutate(check.data.to);
  }

  return (
    <div className="nx-app">
      <PageHead
        title={t("adminMailTest.title")}
        desc={t("adminMailTest.desc")}
      />

      <Tile>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="field">
            <label htmlFor="mail-test-to">
              {t("adminMailTest.recipient")}
            </label>
            <input
              id="mail-test-to"
              type="email"
              className="input"
              placeholder="vous@exemple.fr"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError(null);
              }}
            />
            {error && (
              <span
                className="caption"
                style={{ color: "var(--red)", marginTop: 4 }}
              >
                {error}
              </span>
            )}
          </div>

          <div className="row" style={{ gap: 12 }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleTest}
              disabled={!valid || testMutation.isPending}
            >
              <Send size={16} aria-hidden="true" />
              {testMutation.isPending
                ? t("adminMailTest.sending")
                : t("adminMailTest.send")}
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
                    {t("adminMailTest.sentTitle")}
                  </p>
                  {result?.previewUrl && (
                    <a
                      href={result.previewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="link"
                      style={{ wordBreak: "break-all" }}
                    >
                      {t("adminMailTest.viewPreview")}
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
                <span className="body">{t("adminMailTest.sendError")}</span>
              </div>
            </Callout>
          )}
        </div>
      </Tile>
    </div>
  );
}
