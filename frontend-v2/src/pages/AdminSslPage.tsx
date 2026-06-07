import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, Upload, AlertTriangle } from "lucide-react";
import client from "../api/client";
import { PageHead, Tile, Callout, Badge } from "../components/shell";
import Breadcrumbs from "../components/ui/Breadcrumbs";
import { sslCertSchema } from "../schemas/ssl";
import { toast } from "../hooks/useToast";

// ─── Types ──────────────────────────────────────────────────────────────────

interface CertMeta {
  installed: boolean;
  valid?: boolean;
  cn?: string | null;
  subject?: string;
  notBefore?: string;
  notAfter?: string;
  daysRemaining?: number;
}

interface InstallResponse {
  ok: boolean;
  message: string;
  notAfter: string;
  cn: string | null;
  daysRemaining: number;
}

// ─── API (inline, endpoints spécifiques à cette page) ──────────────────────────

const sslApi = {
  getCert: () => client.get<CertMeta>("/api/admin/ssl/cert"),
  install: (payload: { fullchain: string; privkey: string }) =>
    client.post<InstallResponse>("/api/admin/ssl/cert", payload),
};

// Lit un fichier en texte UTF-8 (FileReader).
function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Lecture du fichier impossible"));
    reader.readAsText(file);
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminSslPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [fullchain, setFullchain] = useState("");
  const [privkey, setPrivkey] = useState("");
  const [fullchainName, setFullchainName] = useState("");
  const [privkeyName, setPrivkeyName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: cert, isLoading } = useQuery({
    queryKey: ["ssl", "cert"],
    queryFn: () => sslApi.getCert().then((r) => r.data),
  });

  const installMut = useMutation({
    mutationFn: (payload: { fullchain: string; privkey: string }) =>
      sslApi.install(payload),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["ssl", "cert"] });
      setFullchain("");
      setPrivkey("");
      setFullchainName("");
      setPrivkeyName("");
      toast.success(t("adminSsl.toast.installed"), res.data.message, 8000);
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { error?: string; message?: string } } })
              .response?.data?.error ??
            (err as { response?: { data?: { message?: string } } }).response?.data
              ?.message ??
            t("adminSsl.error.installFailed")
          : t("adminSsl.error.installFailed");
      toast.error(t("adminSsl.toast.installRefused"), msg);
    },
  });

  async function onPickFile(
    e: React.ChangeEvent<HTMLInputElement>,
    target: "fullchain" | "privkey",
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await readFileAsText(file);
      if (target === "fullchain") {
        setFullchain(text);
        setFullchainName(file.name);
      } else {
        setPrivkey(text);
        setPrivkeyName(file.name);
      }
      setError(null);
    } catch {
      setError(t("adminSsl.error.readFile"));
    }
  }

  function onSubmit() {
    setError(null);
    const parsed = sslCertSchema.safeParse({ fullchain, privkey });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? t("adminSsl.error.invalidFiles"));
      return;
    }
    installMut.mutate(parsed.data);
  }

  const expiringSoon =
    typeof cert?.daysRemaining === "number" && cert.daysRemaining < 30;

  return (
    <div className="nx-app">
      <Breadcrumbs
        items={[
          { label: t("adminSsl.breadcrumb.home"), href: "/" },
          { label: t("adminSsl.breadcrumb.admin"), href: "/admin" },
          { label: t("adminSsl.breadcrumb.ssl") },
        ]}
      />

      <PageHead
        eyebrow={t("adminSsl.eyebrow")}
        title={t("adminSsl.title")}
        desc={t("adminSsl.desc")}
      />

      <Callout tone="blue" style={{ marginBottom: 24 }}>
        <div className="row" style={{ gap: 10, alignItems: "flex-start" }}>
          <ShieldCheck
            className="ico"
            style={{ width: 18, height: 18, marginTop: 2, flex: "none" }}
          />
          <span className="small">
            {t("adminSsl.callout.before")}{" "}
            <code style={{ fontFamily: "monospace" }}>
              docker compose kill -s HUP nginx
            </code>
            {t("adminSsl.callout.after")}
          </span>
        </div>
      </Callout>

      {/* État du certificat actuel */}
      <Tile>
        <h2 className="h3" style={{ marginBottom: 16 }}>
          {t("adminSsl.current.title")}
        </h2>
        {isLoading ? (
          <p className="body">{t("adminSsl.loading")}</p>
        ) : !cert?.installed ? (
          <p className="body" style={{ color: "var(--ink)" }}>
            {t("adminSsl.current.none")}
          </p>
        ) : cert.valid === false ? (
          <Badge tone="red">
            <AlertTriangle className="ico" style={{ width: 14, height: 14 }} />{" "}
            {t("adminSsl.current.unreadable")}
          </Badge>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 16,
            }}
          >
            <div className="field">
              <label>{t("adminSsl.current.cn")}</label>
              <p className="body" style={{ fontWeight: 600 }}>
                {cert.cn ?? "—"}
              </p>
            </div>
            <div className="field">
              <label>{t("adminSsl.current.validUntil")}</label>
              <p className="body" style={{ fontWeight: 600 }}>
                {cert.notAfter
                  ? new Date(cert.notAfter).toLocaleDateString("fr-FR")
                  : "—"}
              </p>
            </div>
            <div className="field">
              <label>{t("adminSsl.current.daysRemaining")}</label>
              <Badge tone={expiringSoon ? "red" : "green"}>
                {t("adminSsl.current.days", { count: cert.daysRemaining ?? 0 })}
              </Badge>
            </div>
          </div>
        )}
      </Tile>

      {/* Formulaire de téléversement */}
      <Tile style={{ marginTop: 24 }}>
        <h2 className="h3" style={{ marginBottom: 16 }}>
          {t("adminSsl.install.title")}
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 24,
          }}
        >
          <div className="field">
            <label htmlFor="ssl-fullchain">
              {t("adminSsl.install.fullchainLabel")}
            </label>
            <input
              id="ssl-fullchain"
              type="file"
              accept=".pem,.crt,.cer"
              className="input"
              onChange={(e) => onPickFile(e, "fullchain")}
            />
            {fullchainName && (
              <span className="small" style={{ color: "var(--blue)" }}>
                {t("adminSsl.install.fileLoaded", { name: fullchainName })}
              </span>
            )}
          </div>

          <div className="field">
            <label htmlFor="ssl-privkey">
              {t("adminSsl.install.privkeyLabel")}
            </label>
            <input
              id="ssl-privkey"
              type="file"
              accept=".pem,.key"
              className="input"
              onChange={(e) => onPickFile(e, "privkey")}
            />
            {privkeyName && (
              <span className="small" style={{ color: "var(--blue)" }}>
                {t("adminSsl.install.fileLoaded", { name: privkeyName })}
              </span>
            )}
          </div>
        </div>

        {error && (
          <p
            className="small"
            style={{ color: "var(--red)", marginTop: 16 }}
            role="alert"
          >
            {error}
          </p>
        )}

        <div className="row" style={{ marginTop: 24 }}>
          <button
            type="button"
            onClick={onSubmit}
            disabled={installMut.isPending || !fullchain || !privkey}
            className="btn btn-primary"
            style={{ background: "var(--blue)" }}
          >
            <Upload className="ico" style={{ width: 18, height: 18 }} />{" "}
            {installMut.isPending
              ? t("adminSsl.install.installing")
              : t("adminSsl.install.submit")}
          </button>
        </div>
      </Tile>
    </div>
  );
}
