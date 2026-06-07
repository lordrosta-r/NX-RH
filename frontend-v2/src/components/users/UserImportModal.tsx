import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { usersApi } from "../../api/users";
import { toast } from "../../hooks/useToast";
import type { ImportResult } from "../../types";
import Modal from "../ui/Modal";
import { queryKeys } from "../../lib/queryKeys";

interface CsvRow {
  [key: string]: string;
}

function parseCsvPreview(
  text: string,
  maxRows = 5,
): { headers: string[]; rows: CsvRow[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = lines[0]
    .split(",")
    .map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows = lines.slice(1, maxRows + 1).map((line) => {
    const cells = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    return Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? ""]));
  });
  return { headers, rows };
}

interface Props {
  onClose: () => void;
}

export function UserImportModal({ onClose }: Props) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{
    headers: string[];
    rows: CsvRow[];
  } | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const importMutation = useMutation({
    mutationFn: (f: File) => usersApi.importUsers(f).then((r) => r.data),
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });
      toast.success(
        "Import terminé",
        `${data.success} créé(s)${data.skipped ? `, ${data.skipped} ignoré(s)` : ""}, ${data.errors} erreur(s).`,
      );
    },
    onError: () =>
      toast.error("Erreur import", "Impossible d'importer le fichier CSV."),
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setPreview(parseCsvPreview(text, 5));
    };
    reader.readAsText(selected);
  }

  function handleImport() {
    if (file) importMutation.mutate(file);
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Importer des utilisateurs"
      size="md"
      footer={
        <div className="nx-app" style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} className="btn btn-ghost btn-sm">
            {result ? "Fermer" : "Annuler"}
          </button>
          {!result && (
            <button
              disabled={!file || importMutation.isPending}
              onClick={handleImport}
              className="btn btn-primary btn-sm"
            >
              {importMutation.isPending ? (
                <>
                  <span
                    className="animate-spin"
                    style={{
                      width: 14,
                      height: 14,
                      border: "2px solid rgba(255,255,255,0.4)",
                      borderTopColor: "#fff",
                      borderRadius: "50%",
                    }}
                  />
                  Import en cours...
                </>
              ) : (
                <>
                  <Upload className="ico" />
                  Importer
                </>
              )}
            </button>
          )}
        </div>
      }
    >
      <div className="nx-app">
        {/* File picker */}
        <div
          className="tile"
          style={{
            border: "2px dashed var(--line)",
            textAlign: "center",
            cursor: "pointer",
            marginBottom: 20,
          }}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Sélectionner un fichier CSV"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
          }}
        >
          <FileText
            size={40}
            strokeWidth={1.5}
            aria-hidden="true"
            style={{ color: "var(--line-strong)", margin: "0 auto 12px" }}
          />
          {file ? (
            <p
              className="body"
              style={{ fontWeight: 600, color: "var(--ink)" }}
            >
              {file.name}
            </p>
          ) : (
            <>
              <p
                className="body"
                style={{ fontWeight: 600, color: "var(--ink-2)" }}
              >
                Cliquez pour sélectionner un fichier CSV
              </p>
              <p className="small" style={{ marginTop: 4 }}>
                Format attendu : prénom, nom, email, rôle, département
              </p>
            </>
          )}
          <input
            ref={inputRef}
            id="csv-file-input"
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileChange}
            aria-label="Fichier CSV à importer"
          />
        </div>

        {/* CSV Preview */}
        {preview && preview.headers.length > 0 && !result && (
          <div style={{ marginBottom: 20 }}>
            <p
              className="small"
              style={{ fontWeight: 600, color: "var(--ink)", marginBottom: 8 }}
            >
              Aperçu ({preview.rows.length} ligne
              {preview.rows.length !== 1 ? "s" : ""} sur 5 max)
            </p>
            <div
              style={{
                overflowX: "auto",
                borderRadius: "var(--radius)",
                border: "1px solid var(--line)",
              }}
            >
              <div
                className="tbl-head"
                style={{
                  gridTemplateColumns: `repeat(${preview.headers.length}, minmax(0, 1fr))`,
                }}
              >
                {preview.headers.map((h) => (
                  <span
                    key={h}
                    style={{ overflow: "hidden", textOverflow: "ellipsis" }}
                  >
                    {h}
                  </span>
                ))}
              </div>
              {preview.rows.map((row, i) => (
                <div
                  key={i}
                  className="tbl-row"
                  style={{
                    gridTemplateColumns: `repeat(${preview.headers.length}, minmax(0, 1fr))`,
                  }}
                >
                  {preview.headers.map((h) => (
                    <span
                      key={h}
                      className="small"
                      style={{
                        color: "var(--ink-2)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {row[h]}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Import result */}
        {result && (
          <div
            className="card"
            style={{
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div className="row nxgap-12" style={{ gap: 8 }}>
              <CheckCircle
                size={20}
                strokeWidth={1.5}
                aria-hidden="true"
                style={{ color: "var(--green)", flex: "none" }}
              />
              <span
                className="body"
                style={{ fontWeight: 600, color: "var(--ink)" }}
              >
                Import terminé
              </span>
            </div>
            <div className="row wrap" style={{ gap: 8 }}>
              <span className="badge green">
                {result.success} créé{result.success !== 1 ? "s" : ""}
              </span>
              {result.skipped !== undefined && result.skipped > 0 && (
                <span className="badge amber">
                  {result.skipped} ignoré{result.skipped !== 1 ? "s" : ""}
                </span>
              )}
              {result.errors > 0 && (
                <span className="badge red">
                  {result.errors} erreur{result.errors !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            {result.details && result.details.length > 0 && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  maxHeight: 160,
                  overflowY: "auto",
                }}
              >
                {result.details.map((d, i) => (
                  <div
                    key={i}
                    className="callout red small"
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 8,
                      padding: "8px 12px",
                    }}
                  >
                    <AlertCircle
                      size={14}
                      strokeWidth={1.5}
                      aria-hidden="true"
                      style={{
                        color: "var(--red)",
                        marginTop: 2,
                        flex: "none",
                      }}
                    />
                    <span style={{ color: "var(--red)" }}>
                      Ligne {d.row} : {d.error}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
