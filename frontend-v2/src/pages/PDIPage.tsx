import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/api/client";
import { queryKeys } from "@/lib/queryKeys";
import { PlusCircle, ClipboardList, ChevronRight } from "lucide-react";
import { PageHead, Tile, Badge, Bar } from "@/components/shell";
import Breadcrumbs from "@/components/ui/Breadcrumbs";

type PDIStatus = "draft" | "active" | "completed" | "archived";

interface PDI {
  _id: string;
  employee: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    department?: string;
    position?: string;
  };
  manager: { _id: string; firstName: string; lastName: string; email: string };
  period: { start: string; end: string };
  objectives: string[];
  actions: { _id: string; status: string }[];
  status: PDIStatus;
  employeeSignedAt?: string;
  managerSignedAt?: string;
  createdAt: string;
}

const STATUS_LABELS: Record<PDIStatus, string> = {
  draft: "Brouillon",
  active: "Actif",
  completed: "Terminé",
  archived: "Archivé",
};

const STATUS_TONE: Record<
  PDIStatus,
  "blue" | "green" | "amber" | "red" | "grey"
> = {
  draft: "amber",
  active: "blue",
  completed: "green",
  archived: "grey",
};

const EMPTY_FORM = {
  employee: "",
  manager: "",
  periodStart: "",
  periodEnd: "",
  notes: "",
};

export default function PDIPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const canCreate = user && ["admin", "hr", "manager"].includes(user.role);

  const [statusFilter, setStatusFilter] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.pdi.list({ status: statusFilter }),
    queryFn: () =>
      api
        .get("/api/pdi", { params: { status: statusFilter || undefined } })
        .then((r) => r.data),
  });

  const pdis: PDI[] = data?.data ?? [];

  const createMutation = useMutation({
    mutationFn: (payload: typeof form) =>
      api.post("/api/pdi", {
        employee: payload.employee,
        manager: payload.manager,
        period: { start: payload.periodStart, end: payload.periodEnd },
        notes: payload.notes,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.pdi.lists() });
      setShowNewForm(false);
      setForm(EMPTY_FORM);
    },
  });

  function completedCount(pdi: PDI) {
    return pdi.actions.filter((a) => a.status === "completed").length;
  }

  function progress(pdi: PDI) {
    if (!pdi.actions.length) return 0;
    return Math.round((completedCount(pdi) / pdi.actions.length) * 100);
  }

  const FILTERS = ["", "draft", "active", "completed", "archived"] as const;

  return (
    <div className="nx-app">
      <Breadcrumbs
        items={[
          { label: "Accueil", href: "/" },
          { label: "PDI" },
        ]}
      />

      <PageHead
        title={
          <span className="row" style={{ gap: 10, alignItems: "center" }}>
            <ClipboardList
              className="ico"
              style={{ width: 24, height: 24, color: "var(--blue)" }}
            />
            Plans de Développement Individuel
          </span>
        }
        desc="Suivez les objectifs de développement de vos collaborateurs"
        actions={
          canCreate ? (
            <button
              onClick={() => setShowNewForm((v) => !v)}
              className="btn btn-primary"
            >
              <PlusCircle className="ico" style={{ width: 18, height: 18 }} />{" "}
              Nouveau PDI
            </button>
          ) : undefined
        }
      />

      {/* Filters */}
      <div className="row wrap" style={{ gap: 8, marginBottom: 16 }}>
        {FILTERS.map((s) => {
          const active = statusFilter === s;
          return (
            <button
              key={s || "all"}
              onClick={() => setStatusFilter(s)}
              className="btn btn-sm"
              style={{
                background: active ? "var(--blue)" : "var(--bg-alt)",
                color: active ? "#fff" : "var(--ink)",
                borderColor: active ? "var(--blue)" : "var(--line)",
              }}
            >
              {s === "" ? "Tous" : STATUS_LABELS[s]}
            </button>
          );
        })}
      </div>

      {/* New PDI form */}
      {showNewForm && (
        <Tile style={{ marginBottom: 16 }}>
          <h2 className="h3" style={{ marginBottom: 16 }}>
            Créer un nouveau PDI
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 16,
              marginBottom: 16,
            }}
          >
            <div className="field">
              <label htmlFor="pdi-employee">ID Employé *</label>
              <input
                id="pdi-employee"
                aria-label="ID Employé"
                className="input"
                value={form.employee}
                onChange={(e) =>
                  setForm((f) => ({ ...f, employee: e.target.value }))
                }
                placeholder="ObjectId de l'employé"
              />
            </div>
            <div className="field">
              <label htmlFor="pdi-manager">ID Manager *</label>
              <input
                id="pdi-manager"
                aria-label="ID Manager"
                className="input"
                value={form.manager}
                onChange={(e) =>
                  setForm((f) => ({ ...f, manager: e.target.value }))
                }
                placeholder="ObjectId du manager"
              />
            </div>
            <div className="field">
              <label htmlFor="pdi-start">Début de période *</label>
              <input
                id="pdi-start"
                type="date"
                aria-label="Début de période"
                className="input"
                value={form.periodStart}
                onChange={(e) =>
                  setForm((f) => ({ ...f, periodStart: e.target.value }))
                }
              />
            </div>
            <div className="field">
              <label htmlFor="pdi-end">Fin de période *</label>
              <input
                id="pdi-end"
                type="date"
                aria-label="Fin de période"
                className="input"
                value={form.periodEnd}
                onChange={(e) =>
                  setForm((f) => ({ ...f, periodEnd: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="field" style={{ marginBottom: 16 }}>
            <label htmlFor="pdi-notes">Notes</label>
            <textarea
              id="pdi-notes"
              rows={2}
              aria-label="Notes"
              className="input"
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
            />
          </div>
          <div className="row" style={{ justifyContent: "flex-end", gap: 12 }}>
            <button
              onClick={() => setShowNewForm(false)}
              className="btn btn-ghost"
            >
              Annuler
            </button>
            <button
              disabled={
                createMutation.isPending ||
                !form.employee ||
                !form.manager ||
                !form.periodStart ||
                !form.periodEnd
              }
              onClick={() => createMutation.mutate(form)}
              className="btn btn-primary"
            >
              {createMutation.isPending ? "Création…" : "Créer"}
            </button>
          </div>
        </Tile>
      )}

      {/* PDI list */}
      {isLoading ? (
        <Tile>
          <div className="small" style={{ padding: 40, textAlign: "center" }}>
            Chargement…
          </div>
        </Tile>
      ) : pdis.length === 0 ? (
        <Tile>
          <div
            className="small"
            style={{ padding: 48, textAlign: "center", color: "var(--ink-3)" }}
          >
            <ClipboardList
              className="ico"
              style={{
                width: 40,
                height: 40,
                margin: "0 auto 12px",
                opacity: 0.4,
              }}
            />
            <p>Aucun PDI trouvé</p>
          </div>
        </Tile>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {pdis.map((pdi) => (
            <Link
              key={pdi._id}
              to={`/pdi/${pdi._id}`}
              className="tile tile-link"
              style={{ textDecoration: "none" }}
            >
              <div
                className="row between"
                style={{ gap: 12, alignItems: "center" }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    className="row"
                    style={{ gap: 8, alignItems: "center", marginBottom: 4 }}
                  >
                    <span className="body truncate" style={{ fontWeight: 600 }}>
                      {pdi.employee.firstName} {pdi.employee.lastName}
                    </span>
                    <Badge tone={STATUS_TONE[pdi.status]} dot>
                      {STATUS_LABELS[pdi.status]}
                    </Badge>
                  </div>
                  <div
                    className="row wrap small"
                    style={{ gap: "0 16px", color: "var(--ink-3)" }}
                  >
                    <span>
                      Manager : {pdi.manager.firstName} {pdi.manager.lastName}
                    </span>
                    <span>
                      Période :{" "}
                      {new Date(pdi.period.start).toLocaleDateString("fr-FR")} –{" "}
                      {new Date(pdi.period.end).toLocaleDateString("fr-FR")}
                    </span>
                    <span>
                      {pdi.actions.length} action
                      {pdi.actions.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {pdi.actions.length > 0 && (
                    <div
                      className="row"
                      style={{ gap: 8, alignItems: "center", marginTop: 8 }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Bar
                          pct={progress(pdi)}
                          tone="var(--green)"
                          height={6}
                        />
                      </div>
                      <span
                        className="small"
                        style={{ color: "var(--ink-3)", whiteSpace: "nowrap" }}
                      >
                        {completedCount(pdi)}/{pdi.actions.length}
                      </span>
                    </div>
                  )}
                </div>
                <ChevronRight
                  className="ico"
                  style={{
                    width: 18,
                    height: 18,
                    color: "var(--ink-3)",
                    flexShrink: 0,
                  }}
                />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
