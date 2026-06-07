import { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { Upload, AlertCircle, CheckCircle, Download } from "lucide-react";
import { adminApi } from "../api/admin";
import type { ImportResult } from "../types";
import { PageHead, Tile, Callout } from "../components/shell";

type ParsedRow = Record<string, string>;

const REQUIRED_FIELDS = ["email", "firstName", "lastName", "role"];
const TEMPLATE_HEADERS = [
  "firstName",
  "lastName",
  "email",
  "role",
  "department",
  "managerEmail",
  "sector",
];

function validateRow(
  row: ParsedRow,
  idx: number,
  t: TFunction,
): string | null {
  for (const f of REQUIRED_FIELDS) {
    if (!row[f]?.trim())
      return t("adminUsersImport.errors.missingField", {
        line: idx + 1,
        field: f,
      });
  }
  return null;
}

function detectSeparator(text: string): "," | ";" {
  const firstLine = text.split("\n")[0] ?? "";
  return firstLine.includes(";") ? ";" : ",";
}

function parseCsv(text: string, sep: "," | ";" = ","): ParsedRow[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0]
    .split(sep)
    .map((h) => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map((line) => {
    const vals = line.split(sep).map((v) => v.trim().replace(/^"|"$/g, ""));
    return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? ""]));
  });
}

function downloadTemplateCsv() {
  const csv =
    TEMPLATE_HEADERS.join(",") +
    "\n" +
    "Jean,Dupont,jean.dupont@example.com,employee,Finance,manager@example.com,Paris\n";
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "template-import-utilisateurs.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminUsersImportPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [dryRun, setDryRun] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  function processFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      let parsed: ParsedRow[];
      if (file.name.endsWith(".json")) {
        try {
          parsed = JSON.parse(text);
        } catch {
          setErrors([t("adminUsersImport.errors.invalidJson")]);
          return;
        }
      } else {
        const sep = detectSeparator(text);
        parsed = parseCsv(text, sep);
      }
      const errs = parsed
        .map((r, i) => validateRow(r, i, t))
        .filter(Boolean) as string[];
      setErrors(errs);
      setRows(parsed);
      setResult(null);
    };
    reader.readAsText(file);
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, []);

  async function doImport() {
    if (!rows.length || errors.length) return;
    setIsImporting(true);
    try {
      const res = await adminApi.importUsers(rows, dryRun);
      setResult(res.data as ImportResult);
    } catch {
      setResult({ success: 0, errors: rows.length });
    } finally {
      setIsImporting(false);
    }
  }

  const headers = rows.length ? Object.keys(rows[0]) : [];
  const gridCols = headers.length
    ? `repeat(${headers.length}, minmax(0, 1fr))`
    : "1fr";

  return (
    <div className="nx-app">
      <PageHead
        title={t("adminUsersImport.title")}
        desc={t("adminUsersImport.desc")}
        actions={
          <button onClick={downloadTemplateCsv} className="btn btn-ghost">
            <Download className="ico" style={{ width: 18, height: 18 }} />{" "}
            {t("adminUsersImport.downloadTemplate")}
          </button>
        }
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Colonnes attendues + mode + drop zone */}
        <Tile>
          <Callout tone="blue" style={{ marginBottom: 16 }}>
            {t("adminUsersImport.expectedColumns")}{" "}
            <code style={{ fontFamily: "monospace" }}>
              firstName · lastName · email · role · department · managerEmail ·
              sector
            </code>{" "}
            {t("adminUsersImport.separatorBefore")} <code>;</code>{" "}
            {t("adminUsersImport.separatorOr")} <code>,</code>{" "}
            {t("adminUsersImport.separatorAfter")}
          </Callout>

          {/* Mode simulation */}
          <label
            className="row"
            style={{
              gap: 12,
              marginBottom: 24,
              cursor: "pointer",
              alignItems: "center",
              userSelect: "none",
            }}
          >
            <button
              type="button"
              role="switch"
              aria-checked={dryRun}
              aria-label={t("adminUsersImport.dryRun.label")}
              onClick={() => setDryRun((d) => !d)}
              style={{
                position: "relative",
                width: 44,
                height: 24,
                borderRadius: 9999,
                border: "none",
                cursor: "pointer",
                padding: 0,
                background: dryRun ? "var(--blue)" : "var(--line)",
                transition: "background 0.12s",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: 2,
                  left: 2,
                  width: 20,
                  height: 20,
                  borderRadius: 9999,
                  background: "#fff",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                  transform: dryRun ? "translateX(20px)" : "translateX(0)",
                  transition: "transform 0.12s",
                }}
              />
            </button>
            <div>
              <span className="body" style={{ fontWeight: 600 }}>
                {t("adminUsersImport.dryRun.label")}
              </span>
              <p className="small">
                {dryRun
                  ? t("adminUsersImport.dryRun.on")
                  : t("adminUsersImport.dryRun.off")}
              </p>
            </div>
          </label>

          {/* Drop zone */}
          <div
            role="button"
            tabIndex={0}
            aria-label={t("adminUsersImport.dropzone.ariaLabel")}
            style={{
              border: `2px dashed ${isDragging ? "var(--blue)" : "var(--line)"}`,
              borderRadius: "var(--radius)",
              padding: 40,
              textAlign: "center",
              cursor: "pointer",
              background: isDragging ? "var(--bg-alt)" : "transparent",
              transition: "border-color 0.12s, background 0.12s",
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                inputRef.current?.click();
              }
            }}
          >
            <Upload
              size={40}
              strokeWidth={1.5}
              style={{ margin: "0 auto 12px", color: "var(--ink-3)" }}
            />
            <p className="body" style={{ fontWeight: 600 }}>
              {t("adminUsersImport.dropzone.title")}
            </p>
            <p className="small" style={{ marginTop: 4 }}>
              {t("adminUsersImport.dropzone.hint")}
            </p>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.json"
              aria-label={t("adminUsersImport.dropzone.inputAriaLabel")}
              style={{ display: "none" }}
              onChange={(e) => {
                if (e.target.files?.[0]) processFile(e.target.files[0]);
              }}
            />
          </div>
        </Tile>

        {/* Preview */}
        {rows.length > 0 && (
          <Tile>
            <p className="body" style={{ marginBottom: 16 }}>
              <strong>{rows.length}</strong>{" "}
              {t("adminUsersImport.preview.rowsDetected")}
            </p>

            {errors.length > 0 && (
              <Callout tone="red" style={{ marginBottom: 16 }}>
                <div
                  className="row"
                  style={{ gap: 8, alignItems: "center", marginBottom: 8 }}
                >
                  <AlertCircle size={16} style={{ color: "var(--red)" }} />
                  <span className="body" style={{ fontWeight: 700 }}>
                    {t("adminUsersImport.preview.validationErrors", {
                      count: errors.length,
                    })}
                  </span>
                </div>
                <ul style={{ listStyle: "disc", paddingLeft: 20 }}>
                  {errors.slice(0, 10).map((e, i) => (
                    <li key={`${e}-${i}`} className="small">
                      {e}
                    </li>
                  ))}
                </ul>
              </Callout>
            )}

            <div style={{ overflowX: "auto" }}>
              <div
                className="tbl-head"
                style={{ gridTemplateColumns: gridCols }}
              >
                {headers.map((h) => (
                  <div key={h}>{h}</div>
                ))}
              </div>
              {rows.slice(0, 10).map((r, i) => (
                <div
                  key={i}
                  className="tbl-row"
                  style={{ gridTemplateColumns: gridCols }}
                >
                  {headers.map((h) => (
                    <div key={h} className="small">
                      {r[h] ?? ""}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            {rows.length > 10 && (
              <p className="small" style={{ marginTop: 8 }}>
                {t("adminUsersImport.preview.moreRows", {
                  count: rows.length - 10,
                })}
              </p>
            )}

            <div
              className="row"
              style={{ gap: 12, marginTop: 16, alignItems: "center" }}
            >
              <button
                onClick={doImport}
                disabled={errors.length > 0 || isImporting}
                className="btn btn-primary"
              >
                {isImporting
                  ? t("adminUsersImport.actions.importing")
                  : dryRun
                    ? t("adminUsersImport.actions.simulate", {
                        count: rows.length,
                      })
                    : t("adminUsersImport.actions.import", {
                        count: rows.length,
                      })}
              </button>
              <button
                onClick={() => {
                  setRows([]);
                  setErrors([]);
                  setResult(null);
                }}
                className="btn btn-ghost"
              >
                {t("adminUsersImport.actions.reset")}
              </button>
            </div>
          </Tile>
        )}

        {/* Result */}
        {result && (
          <Callout tone={result.errors === 0 ? "green" : "amber"}>
            <div className="row" style={{ gap: 12, alignItems: "flex-start" }}>
              {result.errors === 0 ? (
                <CheckCircle
                  size={20}
                  style={{ color: "var(--green)", flexShrink: 0, marginTop: 2 }}
                />
              ) : (
                <AlertCircle
                  size={20}
                  style={{ color: "var(--amber)", flexShrink: 0, marginTop: 2 }}
                />
              )}
              <div>
                {dryRun && (
                  <p
                    className="small"
                    style={{
                      fontWeight: 600,
                      color: "var(--amber)",
                      marginBottom: 4,
                    }}
                  >
                    {t("adminUsersImport.result.dryRunNotice")}
                  </p>
                )}
                <p className="body" style={{ fontWeight: 700 }}>
                  {t("adminUsersImport.result.summary", {
                    success: result.success,
                    errors: result.errors,
                  })}
                </p>
                {result.details?.map((d, i) => (
                  <p
                    key={d.row ?? i}
                    className="small"
                    style={{ marginTop: 4 }}
                  >
                    {t("adminUsersImport.result.lineError", {
                      line: d.row,
                      error: d.error,
                    })}
                  </p>
                ))}
              </div>
            </div>
          </Callout>
        )}
      </div>
    </div>
  );
}
