import { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import {
  Upload,
  AlertCircle,
  CheckCircle,
  Download,
  FileText,
  ClipboardList,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { adminApi } from "../api/admin";
import { PageHead, Tile, Callout } from "../components/shell";

type FormJson = {
  title?: string;
  formType?: string;
  questions?: unknown[];
} & Record<string, unknown>;

const VALID_FORM_TYPES = [
  "self_evaluation",
  "manager_evaluation",
  "upward_feedback",
  "peer_review",
  "objectives",
  "mobility_request",
  "salary_raise_request",
  "promotion_request",
  "training_request",
];
const VALID_QUESTION_TYPES = [
  "rating",
  "text",
  "yes_no",
  "choice",
  "weather",
  "mobility",
  "n1_import",
  "scale",
  "objective_item",
];

function validateForm(json: unknown, t: TFunction): string[] {
  const errs: string[] = [];
  if (typeof json !== "object" || json === null || Array.isArray(json)) {
    errs.push(t("adminFormsImport.errors.notObject"));
    return errs;
  }
  const f = json as FormJson;
  if (!f.title)
    errs.push(t("adminFormsImport.errors.missingField", { field: "title" }));
  if (!f.formType)
    errs.push(t("adminFormsImport.errors.missingField", { field: "formType" }));
  else if (!VALID_FORM_TYPES.includes(f.formType))
    errs.push(
      t("adminFormsImport.errors.invalidFormType", {
        value: f.formType,
        values: VALID_FORM_TYPES.join(", "),
      }),
    );
  if (!Array.isArray(f.questions))
    errs.push(t("adminFormsImport.errors.missingQuestions"));
  else {
    const ids = new Set<string>();
    f.questions.forEach((q: unknown, i) => {
      const qObj = q as { id?: string; type?: string };
      if (!qObj.id)
        errs.push(
          t("adminFormsImport.errors.questionMissingId", { number: i + 1 }),
        );
      else if (ids.has(qObj.id))
        errs.push(
          t("adminFormsImport.errors.questionDuplicateId", {
            number: i + 1,
            id: qObj.id,
          }),
        );
      else ids.add(qObj.id);
      if (!qObj.type)
        errs.push(
          t("adminFormsImport.errors.questionMissingType", { number: i + 1 }),
        );
      else if (!VALID_QUESTION_TYPES.includes(qObj.type))
        errs.push(
          t("adminFormsImport.errors.questionInvalidType", {
            number: i + 1,
            type: qObj.type,
          }),
        );
    });
  }
  return errs;
}

async function downloadTemplate() {
  const res = await adminApi.getFormTemplate();
  const blob = new Blob([res.data as BlobPart], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "template-formulaire.json";
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminFormsImportPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"file" | "paste">("file");
  const [json, setJson] = useState<FormJson | null>(null);
  const [, setRawText] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importedId, setImportedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function parseAndValidate(text: string) {
    setRawText(text);
    try {
      const parsed = JSON.parse(text);
      const errs = validateForm(parsed, t);
      setErrors(errs);
      setJson(errs.length === 0 ? (parsed as FormJson) : null);
    } catch {
      setErrors([t("adminFormsImport.errors.malformedJson")]);
      setJson(null);
    }
  }

  function processFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => parseAndValidate(e.target?.result as string);
    reader.readAsText(file);
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, []);

  function handlePaste() {
    parseAndValidate(pasteText);
  }

  async function doImport() {
    if (!json || errors.length) return;
    setIsImporting(true);
    try {
      const res = await adminApi.importForm(json);
      const id = res.data?.id;
      setImportedId(id ?? null);
      setTimeout(() => navigate(id ? `/forms/${id}` : "/forms"), 2000);
    } catch {
      setErrors([t("adminFormsImport.errors.importFailed")]);
    } finally {
      setIsImporting(false);
    }
  }

  function reset() {
    setJson(null);
    setRawText("");
    setPasteText("");
    setErrors([]);
    setImportedId(null);
  }

  const questions = Array.isArray(json?.questions)
    ? (json!.questions as { id?: string; type?: string; text?: string }[])
    : [];

  return (
    <div className="nx-app">
      <PageHead
        title={t("adminFormsImport.title")}
        desc={t("adminFormsImport.desc")}
        actions={
          <button
            type="button"
            onClick={downloadTemplate}
            className="btn btn-ghost"
          >
            <Download className="ico" style={{ width: 18, height: 18 }} />{" "}
            {t("adminFormsImport.downloadTemplate")}
          </button>
        }
      />

      <Tile>
        {/* Onglets */}
        <div
          className="row"
          style={{
            gap: 0,
            borderBottom: "1px solid var(--line)",
            marginBottom: 24,
          }}
        >
          <button
            type="button"
            onClick={() => setTab("file")}
            className="small"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 16px",
              background: "none",
              border: "none",
              borderBottom:
                tab === "file"
                  ? "2px solid var(--blue)"
                  : "2px solid transparent",
              color: tab === "file" ? "var(--blue)" : "var(--ink-3)",
              fontWeight: tab === "file" ? 700 : 500,
              cursor: "pointer",
            }}
          >
            <FileText className="ico" style={{ width: 16, height: 16 }} />{" "}
            {t("adminFormsImport.tabs.file")}
          </button>
          <button
            type="button"
            onClick={() => setTab("paste")}
            className="small"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 16px",
              background: "none",
              border: "none",
              borderBottom:
                tab === "paste"
                  ? "2px solid var(--blue)"
                  : "2px solid transparent",
              color: tab === "paste" ? "var(--blue)" : "var(--ink-3)",
              fontWeight: tab === "paste" ? 700 : 500,
              cursor: "pointer",
            }}
          >
            <ClipboardList className="ico" style={{ width: 16, height: 16 }} />{" "}
            {t("adminFormsImport.tabs.paste")}
          </button>
        </div>

        {/* Tab: Fichier */}
        {tab === "file" && (
          <button
            type="button"
            aria-label={t("adminFormsImport.dropzone.ariaLabel")}
            style={{
              display: "block",
              width: "100%",
              border: isDragging
                ? "2px dashed var(--blue)"
                : "2px dashed var(--line)",
              background: isDragging ? "var(--bg-alt)" : "transparent",
              borderRadius: "var(--radius)",
              padding: 40,
              textAlign: "center",
              cursor: "pointer",
              transition: "all 0.12s",
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
          >
            <Upload
              size={40}
              className="ico"
              style={{ margin: "0 auto 12px", color: "var(--ink-3)" }}
            />
            <p className="body" style={{ fontWeight: 600 }}>
              {t("adminFormsImport.dropzone.title")}
            </p>
            <p className="small" style={{ marginTop: 4 }}>
              {t("adminFormsImport.dropzone.hint")}
            </p>
            <input
              ref={inputRef}
              type="file"
              accept=".json"
              aria-label={t("adminFormsImport.dropzone.inputAriaLabel")}
              style={{ display: "none" }}
              onChange={(e) => {
                if (e.target.files?.[0]) processFile(e.target.files[0]);
              }}
            />
          </button>
        )}

        {/* Tab: Paste */}
        {tab === "paste" && (
          <div className="field">
            <label htmlFor="paste-json">
              {t("adminFormsImport.paste.label")}
            </label>
            <textarea
              id="paste-json"
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={t("adminFormsImport.paste.placeholder")}
              rows={12}
              className="input"
              style={{
                fontFamily: "monospace",
                fontSize: 12,
                resize: "vertical",
              }}
            />
            <button
              type="button"
              onClick={handlePaste}
              disabled={!pasteText.trim()}
              className="btn btn-primary"
              style={{ marginTop: 12 }}
            >
              {t("adminFormsImport.paste.validate")}
            </button>
          </div>
        )}
      </Tile>

      {/* Erreurs */}
      {errors.length > 0 && (
        <Callout tone="red" style={{ marginTop: 24 }}>
          <div
            className="row"
            style={{ gap: 8, marginBottom: 8, alignItems: "center" }}
          >
            <AlertCircle className="ico" style={{ width: 16, height: 16 }} />
            <p className="body" style={{ fontWeight: 700 }}>
              {t("adminFormsImport.validationErrors")}
            </p>
          </div>
          <ul
            className="small"
            style={{
              listStyle: "disc",
              paddingLeft: 20,
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            {errors.map((e, i) => (
              <li key={`${e}-${i}`}>{e}</li>
            ))}
          </ul>
        </Callout>
      )}

      {/* Aperçu riche */}
      {json && !errors.length && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
            marginTop: 24,
          }}
        >
          <Tile>
            <p className="eyebrow" style={{ marginBottom: 16 }}>
              {t("adminFormsImport.preview.title")}
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 16,
              }}
            >
              <div>
                <p className="small">{t("adminFormsImport.preview.titleField")}</p>
                <p className="body" style={{ fontWeight: 600 }}>
                  {json.title}
                </p>
              </div>
              <div>
                <p className="small">{t("adminFormsImport.preview.typeField")}</p>
                <p className="body" style={{ fontWeight: 600 }}>
                  {json.formType}
                </p>
              </div>
              <div>
                <p className="small">
                  {t("adminFormsImport.preview.questionsField")}
                </p>
                <p className="body" style={{ fontWeight: 600 }}>
                  {questions.length}
                </p>
              </div>
            </div>
          </Tile>

          {questions.length > 0 && (
            <Tile style={{ padding: 0, overflow: "hidden" }}>
              <div
                className="tbl-head"
                style={{ gridTemplateColumns: "160px 1fr" }}
              >
                <div>{t("adminFormsImport.questionsTable.type")}</div>
                <div>{t("adminFormsImport.questionsTable.label")}</div>
              </div>
              {questions.slice(0, 5).map((q, i) => (
                <div
                  key={q.id ?? `q-${i}`}
                  className="tbl-row"
                  style={{ gridTemplateColumns: "160px 1fr" }}
                >
                  <div>
                    <span
                      className="small"
                      style={{
                        fontFamily: "monospace",
                        background: "var(--bg-alt)",
                        color: "var(--ink-2)",
                        padding: "2px 6px",
                        borderRadius: 4,
                      }}
                    >
                      {q.type}
                    </span>
                  </div>
                  <div className="small truncate">{q.text}</div>
                </div>
              ))}
              {questions.length > 5 && (
                <div className="tbl-row" style={{ gridTemplateColumns: "1fr" }}>
                  <div className="small">
                    {t("adminFormsImport.questionsTable.more", {
                      count: questions.length - 5,
                    })}
                  </div>
                </div>
              )}
            </Tile>
          )}

          <div className="row" style={{ gap: 12 }}>
            <button
              type="button"
              onClick={doImport}
              disabled={isImporting || !!importedId}
              className="btn btn-primary"
            >
              {isImporting
                ? t("adminFormsImport.actions.importing")
                : t("adminFormsImport.actions.import")}
            </button>
            <button type="button" onClick={reset} className="btn btn-ghost">
              {t("adminFormsImport.actions.reset")}
            </button>
          </div>

          {importedId && (
            <Callout tone="green">
              <div className="row" style={{ gap: 8, alignItems: "center" }}>
                <CheckCircle
                  className="ico"
                  style={{ width: 16, height: 16 }}
                />
                <p className="body">{t("adminFormsImport.imported")}</p>
              </div>
            </Callout>
          )}
        </div>
      )}
    </div>
  );
}
