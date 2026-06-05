import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Check, X } from "lucide-react";
import { orgApi } from "../../api/org";
import type { OrgLegend as OrgLegendData } from "../../types";

interface OrgLegendProps {
  legend?: OrgLegendData;
  /** Seul l'administrateur peut modifier la légende. */
  canEdit: boolean;
}

const ROLE_ORDER = ["admin", "hr", "manager", "employee"] as const;

/**
 * Légende de l'organigramme, posée en overlay. Pilotée par la config en base
 * (mêmes couleurs que le graphe). Éditable par l'administrateur (labels +
 * couleurs).
 */
export default function OrgLegend({ legend, canEdit }: OrgLegendProps) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<OrgLegendData | null>(null);

  const mutation = useMutation({
    mutationFn: (data: OrgLegendData) =>
      orgApi.updateLegend(data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org", "legend"] });
      setEditing(false);
      setDraft(null);
    },
  });

  if (!legend) return null;
  const view = editing && draft ? draft : legend;

  const startEdit = () => {
    setDraft(structuredClone(legend));
    setEditing(true);
  };

  const setEntry = (
    group: "edges" | "roles",
    key: string,
    field: "label" | "color",
    value: string,
  ) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      const bucket = next[group] as Record<
        string,
        { label: string; color: string }
      >;
      bucket[key][field] = value;
      return next;
    });
  };

  const rows: { group: "edges" | "roles"; key: string; dash?: string }[] = [
    { group: "edges", key: "hierarchical", dash: "6 3" },
    { group: "edges", key: "transverse", dash: "1 4" },
    ...ROLE_ORDER.map((r) => ({ group: "roles" as const, key: r })),
  ];

  return (
    <div
      className="absolute z-10"
      style={{
        bottom: 16,
        left: 16,
        background: "#fff",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow)",
        padding: 12,
        minWidth: 200,
        fontSize: 13,
      }}
    >
      <div
        className="row between"
        style={{ marginBottom: 8, alignItems: "center" }}
      >
        <span className="eyebrow" style={{ fontSize: 11 }}>
          Légende
        </span>
        {canEdit && !editing && (
          <button
            type="button"
            onClick={startEdit}
            className="icon-btn"
            aria-label="Modifier la légende"
            title="Modifier la légende"
            style={{ width: 24, height: 24 }}
          >
            <Pencil size={13} />
          </button>
        )}
        {editing && (
          <span className="row" style={{ gap: 4 }}>
            <button
              type="button"
              onClick={() => draft && mutation.mutate(draft)}
              disabled={mutation.isPending}
              className="icon-btn"
              aria-label="Enregistrer"
              title="Enregistrer"
              style={{ width: 24, height: 24, color: "var(--green)" }}
            >
              <Check size={14} />
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setDraft(null);
              }}
              className="icon-btn"
              aria-label="Annuler"
              title="Annuler"
              style={{ width: 24, height: 24, color: "var(--ink-3)" }}
            >
              <X size={14} />
            </button>
          </span>
        )}
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        {rows.map(({ group, key, dash }) => {
          const entry =
            group === "edges"
              ? view.edges[key as "hierarchical" | "transverse"]
              : view.roles[key as keyof OrgLegendData["roles"]];
          return (
            <div
              key={`${group}-${key}`}
              className="row"
              style={{ gap: 8, alignItems: "center" }}
            >
              {/* Pastille couleur : trait pour les liens, point pour les rôles */}
              {group === "edges" ? (
                <svg width="22" height="8" style={{ flexShrink: 0 }}>
                  <line
                    x1="0"
                    y1="4"
                    x2="22"
                    y2="4"
                    stroke={entry.color}
                    strokeWidth="2"
                    strokeDasharray={dash}
                  />
                </svg>
              ) : (
                <span
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    background: entry.color,
                    flexShrink: 0,
                  }}
                />
              )}

              {editing ? (
                <>
                  <input
                    type="text"
                    value={entry.label}
                    onChange={(e) =>
                      setEntry(group, key, "label", e.target.value)
                    }
                    className="input"
                    style={{ fontSize: 12, padding: "3px 6px", flex: 1 }}
                  />
                  <input
                    type="color"
                    value={entry.color}
                    onChange={(e) =>
                      setEntry(group, key, "color", e.target.value)
                    }
                    aria-label="Couleur"
                    style={{
                      width: 24,
                      height: 24,
                      padding: 0,
                      border: "none",
                      background: "none",
                    }}
                  />
                </>
              ) : (
                <span style={{ color: "var(--ink-2)" }}>{entry.label}</span>
              )}
            </div>
          );
        })}
      </div>

      {mutation.isError && (
        <p className="small" style={{ color: "var(--red)", marginTop: 6 }}>
          Échec de l'enregistrement
        </p>
      )}
    </div>
  );
}
