import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MoreVertical, CheckSquare, Square, X } from "lucide-react";
import { offboardingApi, type OffboardingRecord } from "../api/offboarding";
import { useAuth } from "../contexts/AuthContext";
import { formatDate, formatDateTime } from "../utils/formatDate";
import { queryKeys } from "../lib/queryKeys";
import { PageHead, Tile, Badge, Bar } from "../components/shell";

const REASON_LABELS: Record<OffboardingRecord["reason"], string> = {
  resignation: "Démission",
  termination: "Licenciement",
  retirement: "Retraite",
  other: "Autre",
};

const REASON_TONE: Record<
  OffboardingRecord["reason"],
  "blue" | "green" | "amber" | "red" | "grey"
> = {
  resignation: "amber",
  termination: "red",
  retirement: "blue",
  other: "grey",
};

const STATUS_TONE: Record<
  OffboardingRecord["status"],
  "blue" | "green" | "amber" | "red" | "grey"
> = {
  pending: "amber",
  in_progress: "blue",
  completed: "green",
};

const STATUS_LABELS: Record<OffboardingRecord["status"], string> = {
  pending: "En attente",
  in_progress: "En cours",
  completed: "Terminé",
};

type PopulatedUser = {
  _id?: string;
  id?: string;
  firstName?: string;
  lastName?: string;
};
function getUserName(rec: {
  userName?: string;
  userId?: string | PopulatedUser;
}): string {
  if (rec.userName) return rec.userName;
  const u = rec.userId;
  if (u && typeof u === "object")
    return `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
  return typeof u === "string" ? u : "—";
}
function getUserId(rec: { userId?: string | PopulatedUser }): string {
  const u = rec.userId;
  if (u && typeof u === "object") return u._id ?? u.id ?? "";
  return typeof u === "string" ? u : "";
}

export default function OffboardingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [statusConfirm, setStatusConfirm] = useState(false);
  const [notes, setNotes] = useState<string>("");
  const [notesReady, setNotesReady] = useState(false);

  const { data: record, isLoading } = useQuery({
    queryKey: queryKeys.offboarding.detail(id ?? ""),
    queryFn: () => offboardingApi.getOffboarding(id!).then((r) => r.data),
    enabled: !!id,
    select: (d) => {
      if (!notesReady) {
        setNotes(d.notes ?? "");
        setNotesReady(true);
      }
      return d;
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (index: number) =>
      offboardingApi.toggleChecklistItem(id!, index),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.offboarding.detail(id ?? ""),
      }),
  });

  const notesMutation = useMutation({
    mutationFn: () => offboardingApi.updateNotes(id!, notes),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.offboarding.detail(id ?? ""),
      }),
  });

  const statusMutation = useMutation({
    mutationFn: (newStatus: string) =>
      offboardingApi.changeStatus(id!, newStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.offboarding.detail(id ?? ""),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.offboarding.lists(),
      });
      setStatusConfirm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => offboardingApi.deleteOffboarding(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.offboarding.lists(),
      });
      navigate("/offboarding");
    },
  });

  if (isLoading) {
    return (
      <div className="nx-app">
        <div className="row" style={{ justifyContent: "center", padding: 96 }}>
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!record)
    return (
      <div className="nx-app">
        <p className="body">Enregistrement introuvable.</p>
      </div>
    );

  const done = record.checklist.filter((c) => c.done).length;
  const total = record.checklist.length;
  const pct = total ? (done / total) * 100 : 0;
  const isAdmin = user?.role === "admin";

  const nextStatus: Record<
    OffboardingRecord["status"],
    OffboardingRecord["status"] | null
  > = {
    pending: "in_progress",
    in_progress: "completed",
    completed: null,
  };
  const nextStatusLabel: Record<OffboardingRecord["status"], string> = {
    pending: "Marquer En cours",
    in_progress: "Marquer Complété",
    completed: "",
  };

  return (
    <div className="nx-app">
      <PageHead
        eyebrow={
          <>
            <Link to="/offboarding" className="link">
              <ArrowLeft
                size={14}
                strokeWidth={1.5}
                aria-hidden="true"
                style={{ display: "inline", verticalAlign: "-2px" }}
              />{" "}
              Offboarding
            </Link>{" "}
            › {getUserName(record)}
          </>
        }
        title={`Départ — ${getUserName(record)}`}
        desc={
          <>
            <Badge tone={REASON_TONE[record.reason]}>
              {REASON_LABELS[record.reason]}
            </Badge>{" "}
            <Badge tone={STATUS_TONE[record.status]}>
              {STATUS_LABELS[record.status]}
            </Badge>{" "}
            <span style={{ color: "var(--ink-3)" }}>
              Dernier jour : {formatDate(record.lastDay)}
            </span>
          </>
        }
        actions={
          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="btn btn-ghost btn-sm"
              aria-label="Plus d'actions"
            >
              <MoreVertical size={18} strokeWidth={1.5} aria-hidden="true" />
            </button>
            {menuOpen && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "calc(100% + 4px)",
                  width: 176,
                  background: "#fff",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius)",
                  boxShadow: "var(--shadow-lg)",
                  padding: "4px 0",
                  zIndex: 10,
                }}
              >
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setDeleteConfirm(true);
                    }}
                    className="small"
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "8px 16px",
                      background: "none",
                      border: "none",
                      color: "var(--red)",
                      cursor: "pointer",
                    }}
                  >
                    Supprimer
                  </button>
                )}
              </div>
            )}
          </div>
        }
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)",
          gap: 24,
          alignItems: "start",
        }}
      >
        {/* Col gauche — Checklist */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <Tile>
            <div
              className="row between"
              style={{ marginBottom: 16, alignItems: "center" }}
            >
              <h2 className="h3">Checklist de départ</h2>
              <span className="small">
                {done}/{total} complétés
              </span>
            </div>
            <div style={{ marginBottom: 20 }}>
              <Bar pct={pct} tone="var(--blue)" />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {record.checklist.map((item, i) => (
                <button
                  key={item.item}
                  type="button"
                  onClick={() => toggleMutation.mutate(i)}
                  disabled={toggleMutation.isPending}
                  aria-label={`Basculer : ${item.item}`}
                  className="row"
                  style={{
                    width: "100%",
                    gap: 12,
                    padding: 12,
                    borderRadius: "var(--radius)",
                    border: `1px solid ${item.done ? "var(--green)" : "var(--line)"}`,
                    background: item.done ? "var(--bg-alt)" : "#fff",
                    textAlign: "left",
                    cursor: "pointer",
                    alignItems: "center",
                  }}
                >
                  {item.done ? (
                    <CheckSquare
                      size={20}
                      strokeWidth={1.5}
                      aria-hidden="true"
                      style={{ color: "var(--green)", flexShrink: 0 }}
                    />
                  ) : (
                    <Square
                      size={20}
                      strokeWidth={1.5}
                      aria-hidden="true"
                      style={{ color: "var(--ink-3)", flexShrink: 0 }}
                    />
                  )}
                  <span
                    className="body"
                    style={{
                      color: item.done ? "var(--ink-3)" : "var(--ink)",
                      textDecoration: item.done ? "line-through" : "none",
                    }}
                  >
                    {item.item}
                  </span>
                  {item.done && item.doneAt && (
                    <span
                      className="small"
                      style={{
                        marginLeft: "auto",
                        whiteSpace: "nowrap",
                        color: "var(--ink-3)",
                      }}
                    >
                      {item.doneBy ? `${item.doneBy} · ` : ""}
                      {formatDateTime(item.doneAt)}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </Tile>
        </div>

        {/* Col droite */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Infos */}
          <Tile>
            <h3 className="h3" style={{ marginBottom: 16 }}>
              Informations
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div className="row between">
                <span className="small">Collaborateur</span>
                <Link to={`/users/${getUserId(record)}`} className="link">
                  {getUserName(record)}
                </Link>
              </div>
              {record.department && (
                <div className="row between">
                  <span className="small">Département</span>
                  <span className="body">{record.department}</span>
                </div>
              )}
              {record.managerName && (
                <div className="row between">
                  <span className="small">Responsable</span>
                  <span className="body">{record.managerName}</span>
                </div>
              )}
              {record.createdBy && (
                <div className="row between">
                  <span className="small">Créé par</span>
                  <span className="body">{record.createdBy}</span>
                </div>
              )}
              <div className="row between">
                <span className="small">Créé le</span>
                <span className="body">{formatDate(record.createdAt)}</span>
              </div>
            </div>
          </Tile>

          {/* Notes RH */}
          <Tile>
            <h3 className="h3" style={{ marginBottom: 16 }}>
              Notes RH
            </h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
              placeholder="Ajouter des notes RH confidentielles…"
              aria-label="Notes RH"
              className="input"
              style={{ resize: "none", marginBottom: 12 }}
            />
            <button
              type="button"
              onClick={() => notesMutation.mutate()}
              disabled={notesMutation.isPending}
              className="btn btn-primary btn-block"
            >
              {notesMutation.isPending
                ? "Sauvegarde…"
                : "Sauvegarder les notes"}
            </button>
          </Tile>
        </div>
      </div>

      {/* Footer: change status */}
      {nextStatus[record.status] && (
        <Tile style={{ marginTop: 24 }}>
          <div className="row" style={{ justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={() => {
                if (record.status === "in_progress") {
                  setStatusConfirm(true);
                } else {
                  const ns = nextStatus[record.status];
                  if (ns) statusMutation.mutate(ns);
                }
              }}
              disabled={statusMutation.isPending}
              className="btn btn-primary"
            >
              {nextStatusLabel[record.status]}
            </button>
          </div>
        </Tile>
      )}

      {/* Status confirm modal (in_progress → completed) */}
      {statusConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setStatusConfirm(false)}
          />
          <Tile
            className="relative w-full max-w-sm"
            style={{ boxShadow: "var(--shadow-lg)" }}
          >
            <button
              type="button"
              onClick={() => setStatusConfirm(false)}
              aria-label="Fermer"
              className="btn btn-ghost btn-sm"
              style={{ position: "absolute", top: 12, right: 12 }}
            >
              <X size={16} strokeWidth={1.5} aria-hidden="true" />
            </button>
            <h3 className="h3" style={{ marginBottom: 8 }}>
              Confirmer la clôture
            </h3>
            <p className="body" style={{ marginBottom: 20 }}>
              L'utilisateur sera désactivé dans le système. Cette action est
              définitive.
            </p>
            <div className="row" style={{ gap: 12 }}>
              <button
                type="button"
                onClick={() => statusMutation.mutate("completed")}
                disabled={statusMutation.isPending}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                {statusMutation.isPending ? "En cours…" : "Confirmer"}
              </button>
              <button
                type="button"
                onClick={() => setStatusConfirm(false)}
                className="btn btn-ghost"
              >
                Annuler
              </button>
            </div>
          </Tile>
        </div>
      )}

      {/* Delete modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setDeleteConfirm(false)}
          />
          <Tile
            className="relative w-full max-w-sm"
            style={{ boxShadow: "var(--shadow-lg)" }}
          >
            <h3 className="h3" style={{ marginBottom: 8 }}>
              Confirmer la suppression
            </h3>
            <p className="body" style={{ marginBottom: 20 }}>
              Cette action est irréversible.
            </p>
            <div className="row" style={{ gap: 12 }}>
              <button
                type="button"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="btn btn-primary"
                style={{
                  flex: 1,
                  background: "var(--red)",
                  borderColor: "var(--red)",
                }}
              >
                {deleteMutation.isPending ? "Suppression…" : "Supprimer"}
              </button>
              <button
                type="button"
                onClick={() => setDeleteConfirm(false)}
                className="btn btn-ghost"
              >
                Annuler
              </button>
            </div>
          </Tile>
        </div>
      )}

      {/* Close menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-0" onClick={() => setMenuOpen(false)} />
      )}
    </div>
  );
}
