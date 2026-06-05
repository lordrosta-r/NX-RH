import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Mail,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Save,
  AlertCircle,
  Send,
  CheckCircle,
} from "lucide-react";
import { adminApi } from "../api/admin";
import { useAuth } from "../contexts/AuthContext";
import type { MailTemplate } from "../types";
import { queryKeys } from "../lib/queryKeys";
import { PageHead, Tile } from "../components/shell";

const SLUG_LABELS: Record<string, string> = {
  campaignLaunch: "Campagne lancée",
  evaluationAssigned: "Évaluation assignée",
  evaluationSubmitted: "Évaluation soumise",
  deadlineReminder: "Rappel deadline",
  managerActionRequired: "Action manager requise",
  systemAlerts: "Alertes système",
  bulkReminder: "Rappel groupé",
  request_treated: "Demande traitée",
  request_rejected: "Demande rejetée",
  password_reset: "Réinitialisation mot de passe",
  welcome_import: "Bienvenue (import)",
};

function formatDate(d?: string) {
  if (!d) return "–";
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function TemplateEditor({
  template,
  onClose,
}: {
  template: MailTemplate;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [subject, setSubject] = useState(template.subject);
  const [bodyText, setBodyText] = useState(template.bodyText);

  const updateMut = useMutation({
    mutationFn: (data: { subject: string; bodyText: string }) =>
      adminApi.updateMailTemplate(template.slug, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.mailTemplates.all });
      onClose();
    },
  });

  const resetMut = useMutation({
    mutationFn: () =>
      adminApi.updateMailTemplate(template.slug, { reset: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.mailTemplates.all });
      onClose();
    },
  });

  const isDirty =
    subject !== template.subject || bodyText !== template.bodyText;

  const subjectId = `mail-subject-${template.slug}`;
  const bodyId = `mail-body-${template.slug}`;

  return (
    <div
      style={{
        borderTop: "1px solid var(--line)",
        paddingTop: 16,
        marginTop: 16,
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <div className="field">
        <label htmlFor={subjectId}>Objet</label>
        <input
          id={subjectId}
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="input"
        />
      </div>
      <div className="field">
        <label htmlFor={bodyId}>Corps (texte brut)</label>
        <textarea
          id={bodyId}
          value={bodyText}
          onChange={(e) => setBodyText(e.target.value)}
          rows={8}
          className="input"
          style={{ fontFamily: "monospace", resize: "vertical" }}
        />
        <p className="small" style={{ marginTop: 6 }}>
          Variables disponibles entre doubles accolades :{" "}
          <code
            style={{
              background: "var(--bg-alt)",
              padding: "1px 4px",
              borderRadius: 4,
            }}
          >
            {"{{firstName}}"}
          </code>
          ,{" "}
          <code
            style={{
              background: "var(--bg-alt)",
              padding: "1px 4px",
              borderRadius: 4,
            }}
          >
            {"{{campaignName}}"}
          </code>
          , etc.
        </p>
      </div>
      <div className="row" style={{ gap: 8, alignItems: "center" }}>
        <button
          type="button"
          onClick={() => updateMut.mutate({ subject, bodyText })}
          disabled={updateMut.isPending || !isDirty}
          className="btn btn-primary"
        >
          <Save className="ico" style={{ width: 16, height: 16 }} />
          {updateMut.isPending ? "Enregistrement…" : "Enregistrer"}
        </button>
        <button
          type="button"
          onClick={() => resetMut.mutate()}
          disabled={resetMut.isPending}
          className="btn btn-ghost"
          title="Remettre les valeurs par défaut"
        >
          <RefreshCw className="ico" style={{ width: 16, height: 16 }} />
          Réinitialiser
        </button>
        <button
          type="button"
          onClick={onClose}
          className="btn btn-ghost btn-sm"
        >
          Annuler
        </button>
      </div>
      {(updateMut.isError || resetMut.isError) && (
        <p
          className="small row"
          style={{ gap: 6, alignItems: "center", color: "var(--red)" }}
        >
          <AlertCircle className="ico" style={{ width: 16, height: 16 }} />
          Une erreur est survenue.
        </p>
      )}
    </div>
  );
}

function TemplateRow({ template }: { template: MailTemplate }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);

  return (
    <Tile style={{ padding: 0 }}>
      <button
        type="button"
        onClick={() => {
          setExpanded((e) => !e);
          if (editing) setEditing(false);
        }}
        className="row between"
        style={{
          width: "100%",
          padding: "16px 20px",
          gap: 12,
          textAlign: "left",
          background: "none",
          border: "none",
          cursor: "pointer",
          borderRadius: "var(--radius-lg)",
        }}
      >
        <div
          className="row"
          style={{ gap: 12, alignItems: "center", minWidth: 0 }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "var(--radius)",
              background: "var(--bg-alt)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Mail
              className="ico"
              style={{ width: 16, height: 16, color: "var(--blue)" }}
            />
          </div>
          <div style={{ minWidth: 0 }}>
            <p className="body" style={{ fontWeight: 600 }}>
              {SLUG_LABELS[template.slug] ?? template.slug}
            </p>
            <p className="small truncate" style={{ marginTop: 2 }}>
              {template.subject}
            </p>
          </div>
        </div>
        <div
          className="row"
          style={{ gap: 12, alignItems: "center", flexShrink: 0 }}
        >
          <span className="small">
            Modifié {formatDate(template.updatedAt)}
          </span>
          {expanded ? (
            <ChevronUp className="ico" style={{ width: 16, height: 16 }} />
          ) : (
            <ChevronDown className="ico" style={{ width: 16, height: 16 }} />
          )}
        </div>
      </button>

      {expanded && (
        <div style={{ padding: "0 20px 20px" }}>
          {!editing ? (
            <>
              <div style={{ marginBottom: 12 }}>
                <p className="eyebrow" style={{ marginBottom: 6 }}>
                  Aperçu (texte brut)
                </p>
                <pre
                  className="small"
                  style={{
                    background: "var(--bg-alt)",
                    borderRadius: "var(--radius)",
                    padding: 12,
                    whiteSpace: "pre-wrap",
                    maxHeight: 192,
                    overflowY: "auto",
                    fontFamily: "monospace",
                    margin: 0,
                  }}
                >
                  {template.bodyText || (
                    <span style={{ fontStyle: "italic" }}>
                      Aucun corps défini
                    </span>
                  )}
                </pre>
              </div>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="link"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 600,
                  padding: 0,
                }}
              >
                Modifier ce template
              </button>
            </>
          ) : (
            <TemplateEditor
              template={template}
              onClose={() => setEditing(false)}
            />
          )}
        </div>
      )}
    </Tile>
  );
}

export default function AdminMailTemplatesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [smtpEmail, setSmtpEmail] = useState("");
  const [smtpResult, setSmtpResult] = useState<{
    ok: boolean;
    msg: string;
  } | null>(null);

  const {
    data: templates,
    isLoading,
    isError,
  } = useQuery<MailTemplate[]>({
    queryKey: queryKeys.mailTemplates.all,
    queryFn: () => adminApi.getMailTemplates().then((r) => r.data),
  });

  const testSmtpMut = useMutation({
    mutationFn: (to: string) => adminApi.sendTestEmail(to),
    onSuccess: () =>
      setSmtpResult({ ok: true, msg: "Email envoyé avec succès." }),
    onError: () =>
      setSmtpResult({
        ok: false,
        msg: "Erreur lors de l'envoi. Vérifiez la configuration SMTP.",
      }),
  });

  return (
    <div className="nx-app">
      <PageHead
        title="Modèles email"
        desc="Personnalisez l'objet et le corps des emails envoyés automatiquement par la plateforme."
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {isAdmin && (
          <Tile>
            <h2
              className="h3 row"
              style={{ gap: 8, alignItems: "center", marginBottom: 12 }}
            >
              <Mail className="ico" style={{ width: 16, height: 16 }} /> Tester
              l'envoi SMTP
            </h2>
            <div className="row" style={{ gap: 12, alignItems: "flex-start" }}>
              <input
                type="email"
                aria-label="Adresse e-mail destinataire du test"
                className="input"
                style={{ flex: 1 }}
                value={smtpEmail}
                onChange={(e) => {
                  setSmtpEmail(e.target.value);
                  setSmtpResult(null);
                }}
                placeholder="destinataire@exemple.com"
              />
              <button
                type="button"
                onClick={() => testSmtpMut.mutate(smtpEmail)}
                disabled={!smtpEmail || testSmtpMut.isPending}
                className="btn btn-primary"
              >
                <Send className="ico" style={{ width: 16, height: 16 }} />
                {testSmtpMut.isPending ? "Envoi…" : "Envoyer"}
              </button>
            </div>
            {smtpResult && (
              <p
                className="small row"
                style={{
                  gap: 6,
                  alignItems: "center",
                  marginTop: 8,
                  color: smtpResult.ok ? "var(--green)" : "var(--red)",
                }}
              >
                {smtpResult.ok ? (
                  <CheckCircle
                    className="ico"
                    style={{ width: 16, height: 16 }}
                  />
                ) : (
                  <AlertCircle
                    className="ico"
                    style={{ width: 16, height: 16 }}
                  />
                )}
                {smtpResult.msg}
              </p>
            )}
          </Tile>
        )}

        {isLoading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                style={{
                  height: 64,
                  borderRadius: "var(--radius-lg)",
                  background: "var(--bg-alt)",
                }}
              />
            ))}
          </div>
        )}

        {isError && (
          <p
            className="small row"
            style={{ gap: 8, alignItems: "center", color: "var(--red)" }}
          >
            <AlertCircle
              className="ico"
              style={{ width: 16, height: 16, flexShrink: 0 }}
            />
            Impossible de charger les templates.
          </p>
        )}

        {templates && templates.length === 0 && (
          <div style={{ textAlign: "center", padding: "64px 0" }}>
            <Mail
              className="ico"
              style={{
                width: 48,
                height: 48,
                margin: "0 auto 12px",
                opacity: 0.3,
                color: "var(--ink-3)",
              }}
            />
            <p className="body">Aucun template configuré.</p>
          </div>
        )}

        {templates && templates.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {templates.map((t) => (
              <TemplateRow key={t.slug} template={t} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
