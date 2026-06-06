import { useState, useEffect } from "react";
import { useDebounce } from "../hooks/useDebounce";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  LogOut,
  Inbox,
  MoreVertical,
  X,
  Plus,
  Search,
  Filter,
} from "lucide-react";
import {
  offboardingApi,
  type OffboardingRecord,
  type OffboardingFilters,
} from "../api/offboarding";
import { usersApi } from "../api/users";
import type { User } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { formatDate } from "../utils/formatDate";
import { queryKeys } from "../lib/queryKeys";
import { PageHead, Tile, Badge, Bar } from "../components/shell";

type Tone = "blue" | "green" | "amber" | "red" | "grey";

const REASON_LABELS: Record<OffboardingRecord["reason"], string> = {
  resignation: "Démission",
  termination: "Licenciement",
  retirement: "Retraite",
  other: "Autre",
};

const REASON_TONE: Record<OffboardingRecord["reason"], Tone> = {
  resignation: "amber",
  termination: "red",
  retirement: "blue",
  other: "grey",
};

const STATUS_TONE: Record<OffboardingRecord["status"], Tone> = {
  pending: "amber",
  in_progress: "blue",
  completed: "green",
};

const STATUS_LABELS: Record<OffboardingRecord["status"], string> = {
  pending: "En attente",
  in_progress: "En cours",
  completed: "Terminé",
};

// Lean queries strip Mongoose virtuals, so _id may exist but id may not
type WithIds = { id?: string; _id?: string };
const rid = (r: OffboardingRecord): string => {
  const o = r as WithIds;
  return o.id ?? o._id ?? "";
};
const uid = (u: User): string => {
  const o = u as WithIds;
  return o.id ?? o._id ?? "";
};

type PopulatedUser = {
  _id?: string;
  firstName: string;
  lastName: string;
  email?: string;
  department?: string;
};
function getRecordUserName(rec: OffboardingRecord): string {
  if (rec.userName) return rec.userName;
  const uid = rec.userId as string | PopulatedUser;
  if (uid && typeof uid === "object")
    return `${uid.firstName} ${uid.lastName}`.trim();
  return typeof uid === "string" ? uid : "—";
}
function getRecordUserInitial(rec: OffboardingRecord): string {
  const name = getRecordUserName(rec);
  return name.length >= 1 ? name[0].toUpperCase() : "?";
}

const DEFAULT_CHECKLIST_ITEMS = [
  "Récupération du matériel informatique",
  "Révocation des accès systèmes",
  "Transfert des dossiers",
  "Entretien de départ effectué",
  "Solde de tout compte établi",
];

function ReasonBadge({ reason }: { reason: OffboardingRecord["reason"] }) {
  return <Badge tone={REASON_TONE[reason]}>{REASON_LABELS[reason]}</Badge>;
}

function StatusBadge({ status }: { status: OffboardingRecord["status"] }) {
  return (
    <Badge tone={STATUS_TONE[status]} dot>
      {STATUS_LABELS[status]}
    </Badge>
  );
}

interface CreateFormData {
  userId: string;
  reason: OffboardingRecord["reason"];
  lastDay: string;
}

function SlideOverForm({
  users,
  onClose,
  onSubmit,
  isPending,
}: {
  users: User[];
  onClose: () => void;
  onSubmit: (data: Partial<OffboardingRecord>) => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState<CreateFormData>({
    userId: "",
    reason: "resignation",
    lastDay: "",
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      userId: form.userId,
      reason: form.reason,
      lastDay: form.lastDay,
      checklist: DEFAULT_CHECKLIST_ITEMS.map((item) => ({ item, done: false })),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div
        className="relative w-full max-w-md h-full overflow-y-auto flex flex-col"
        style={{ background: "#fff", boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }}
      >
        <div
          className="row between"
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid var(--line)",
            alignItems: "center",
            background: "var(--blue)",
          }}
        >
          <div className="row" style={{ gap: 10, alignItems: "center" }}>
            <LogOut
              style={{ width: 18, height: 18, color: "#fff", opacity: 0.85 }}
            />
            <h2 className="h3" style={{ color: "#fff", margin: 0 }}>
              Nouvelle demande de départ
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="btn btn-ghost btn-sm"
            style={{ padding: 6, color: "#fff", opacity: 0.7 }}
          >
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>
        <form
          onSubmit={handleSubmit}
          className="flex-1"
          style={{
            padding: 24,
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          <div className="field">
            <label htmlFor="offboarding-user">Collaborateur</label>
            <select
              id="offboarding-user"
              required
              value={form.userId}
              onChange={(e) =>
                setForm((f) => ({ ...f, userId: e.target.value }))
              }
              className="input"
            >
              <option value="">Sélectionner…</option>
              {users.map((u) => (
                <option key={uid(u)} value={uid(u)}>
                  {u.firstName} {u.lastName}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="offboarding-reason">Motif</label>
            <select
              id="offboarding-reason"
              value={form.reason}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  reason: e.target.value as OffboardingRecord["reason"],
                }))
              }
              className="input"
            >
              {(
                Object.entries(REASON_LABELS) as [
                  OffboardingRecord["reason"],
                  string,
                ][]
              ).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="offboarding-last-day">Dernier jour</label>
            <input
              id="offboarding-last-day"
              required
              type="date"
              value={form.lastDay}
              onChange={(e) =>
                setForm((f) => ({ ...f, lastDay: e.target.value }))
              }
              className="input"
            />
          </div>
          <div>
            <p className="eyebrow" style={{ marginBottom: 8 }}>
              Checklist par défaut
            </p>
            <ul style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {DEFAULT_CHECKLIST_ITEMS.map((item) => (
                <li
                  key={item}
                  className="small row"
                  style={{ gap: 8, alignItems: "center" }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "var(--line-strong)",
                      flexShrink: 0,
                    }}
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="row" style={{ gap: 12, marginTop: 8 }}>
            <button
              type="submit"
              disabled={isPending}
              className="btn btn-primary"
              style={{ flex: 1 }}
            >
              {isPending ? "Création…" : "Créer la demande"}
            </button>
            <button type="button" onClick={onClose} className="btn btn-ghost">
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function OffboardingPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<OffboardingFilters>({
    page: 1,
    limit: 20,
  });
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 400);
  const [showForm, setShowForm] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [statusTarget, setStatusTarget] = useState<{
    id: string;
    current: string;
  } | null>(null);
  const [newStatus, setNewStatus] = useState("");

  // Sync debounced search into filters
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- debounce → filtre, pattern volontaire
    setFilters((f) => ({ ...f, q: debouncedSearch || undefined, page: 1 }));
  }, [debouncedSearch]);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.offboarding.lists(),
    queryFn: () => offboardingApi.getOffboardings(filters).then((r) => r.data),
    placeholderData: keepPreviousData,
  });

  const { data: usersData } = useQuery({
    queryKey: ["users-list"],
    queryFn: () => usersApi.getUsers({ limit: 200 }).then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (d: Partial<OffboardingRecord>) =>
      offboardingApi.createOffboarding(d),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.offboarding.lists(),
      });
      setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => offboardingApi.deleteOffboarding(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.offboarding.lists(),
      });
      setDeleteConfirm(null);
    },
  });

  const changeStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      offboardingApi.changeStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.offboarding.lists(),
      });
      setStatusTarget(null);
      setNewStatus("");
    },
  });

  const records = data?.data ?? [];
  const isAdmin = user?.role === "admin";

  const menuItemStyle: React.CSSProperties = {
    display: "block",
    width: "100%",
    padding: "9px 14px",
    fontSize: 14,
    color: "var(--ink)",
    textAlign: "left",
    background: "none",
    border: "none",
    cursor: "pointer",
  };

  return (
    <div className="nx-app">
      <PageHead
        eyebrow="Ressources humaines"
        title="Offboarding"
        desc="Gestion des départs de collaborateurs"
        actions={
          <button onClick={() => setShowForm(true)} className="btn btn-primary">
            <Plus style={{ width: 18, height: 18 }} /> Nouvelle demande
          </button>
        }
      />

      {/* Filters */}
      <Tile style={{ padding: "14px 20px" }}>
        <div className="row wrap" style={{ gap: 10, alignItems: "center" }}>
          <div
            className="row"
            style={{
              flex: 1,
              minWidth: 200,
              position: "relative",
              alignItems: "center",
            }}
          >
            <Search
              style={{
                position: "absolute",
                left: 10,
                width: 16,
                height: 16,
                color: "var(--ink-3)",
                pointerEvents: "none",
              }}
            />
            <input
              type="search"
              aria-label="Rechercher un collaborateur"
              placeholder="Rechercher un collaborateur…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="input"
              style={{ paddingLeft: 34, width: "100%" }}
            />
          </div>
          <div
            className="row"
            style={{
              gap: 8,
              alignItems: "center",
              flexShrink: 0,
              padding: "0 2px",
            }}
          >
            <Filter
              style={{ width: 14, height: 14, color: "var(--ink-3)" }}
              aria-hidden
            />
            <span className="small" style={{ color: "var(--ink-3)" }}>
              Filtrer :
            </span>
          </div>
          <select
            aria-label="Filtrer par statut"
            value={filters.status ?? ""}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                status: e.target.value || undefined,
                page: 1,
              }))
            }
            className="input"
            style={{ width: "auto", minWidth: 150 }}
          >
            <option value="">Tous les statuts</option>
            <option value="pending">En attente</option>
            <option value="in_progress">En cours</option>
            <option value="completed">Terminé</option>
          </select>
          <select
            aria-label="Filtrer par motif"
            value={filters.reason ?? ""}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                reason: e.target.value || undefined,
                page: 1,
              }))
            }
            className="input"
            style={{ width: "auto", minWidth: 150 }}
          >
            <option value="">Tous les motifs</option>
            <option value="resignation">Démission</option>
            <option value="termination">Licenciement</option>
            <option value="retirement">Retraite</option>
            <option value="other">Autre</option>
          </select>
        </div>
      </Tile>

      {/* Table */}
      {isLoading ? (
        <Tile
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            padding: "20px 24px",
          }}
        >
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                height: 44,
                borderRadius: "var(--radius)",
                background: "var(--bg-alt)",
                opacity: 1 - i * 0.2,
                animation: "pulse 1.6s ease-in-out infinite",
              }}
            />
          ))}
        </Tile>
      ) : records.length === 0 ? (
        <Tile
          style={{
            display: "flex",
            flexDirection: "column",
            padding: "56px 32px",
            alignItems: "center",
            gap: 16,
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "var(--radius-lg)",
              background: "var(--blue-soft)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Inbox
              style={{
                width: 28,
                height: 28,
                color: "var(--blue)",
                strokeWidth: 1.5,
              }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <p
              className="body"
              style={{ fontWeight: 600, color: "var(--ink)" }}
            >
              Aucune demande de départ en cours
            </p>
            <p
              className="small"
              style={{ color: "var(--ink-3)", maxWidth: 360 }}
            >
              {filters.q || filters.status || filters.reason
                ? "Aucun résultat ne correspond à vos filtres. Essayez d'élargir votre recherche."
                : "Les demandes d'offboarding apparaîtront ici. Créez une première demande pour commencer."}
            </p>
          </div>
          {!filters.q && !filters.status && !filters.reason && (
            <button
              onClick={() => setShowForm(true)}
              className="btn btn-primary btn-sm"
              style={{ marginTop: 4 }}
            >
              <Plus style={{ width: 15, height: 15 }} />
              Créer une demande
            </button>
          )}
        </Tile>
      ) : (
        <Tile style={{ padding: 0, overflow: "hidden" }}>
          <div
            className="tbl-head"
            style={{
              gridTemplateColumns: "2fr 1fr 1.2fr 1.2fr 1.4fr 48px",
            }}
          >
            <div>Collaborateur</div>
            <div>Motif</div>
            <div>Dernier jour</div>
            <div>Statut</div>
            <div>Checklist</div>
            <div />
          </div>
          {records.map((rec) => {
            const done = rec.checklist.filter((c) => c.done).length;
            const total = rec.checklist.length;
            const pct = total ? (done / total) * 100 : 0;
            const userName = getRecordUserName(rec);
            const userInitial = getRecordUserInitial(rec);
            const recId = rid(rec);
            // Try to get department from populated userId
            const populatedUser =
              rec.userId &&
              typeof rec.userId === "object" &&
              (rec.userId as PopulatedUser);
            const department =
              populatedUser && populatedUser.department
                ? populatedUser.department
                : undefined;
            return (
              <div
                key={recId}
                className="tbl-row"
                style={{
                  gridTemplateColumns: "2fr 1fr 1.2fr 1.2fr 1.4fr 48px",
                }}
              >
                <div className="row" style={{ gap: 12, alignItems: "center" }}>
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: "50%",
                      background: "var(--blue-soft)",
                      color: "var(--blue)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 13,
                      fontWeight: 700,
                      flexShrink: 0,
                      border: "1.5px solid var(--line)",
                    }}
                  >
                    {userInitial}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <Link
                      to={`/offboarding/${recId}`}
                      className="link"
                      style={{ fontWeight: 600, display: "block" }}
                    >
                      {userName}
                    </Link>
                    {department && (
                      <span className="small" style={{ color: "var(--ink-3)" }}>
                        {department}
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <ReasonBadge reason={rec.reason} />
                </div>
                <div
                  className="small"
                  style={{
                    color: "var(--ink-2)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {formatDate(rec.lastDay)}
                </div>
                <div>
                  <StatusBadge status={rec.status} />
                </div>
                <div className="row" style={{ gap: 8, alignItems: "center" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Bar pct={pct} tone="var(--blue)" height={5} />
                  </div>
                  <span
                    className="small"
                    style={{
                      width: 36,
                      textAlign: "right",
                      color: pct === 100 ? "var(--green)" : "var(--ink-3)",
                      fontVariantNumeric: "tabular-nums",
                      fontWeight: pct === 100 ? 600 : undefined,
                    }}
                  >
                    {done}/{total}
                  </span>
                </div>
                <div style={{ textAlign: "right", position: "relative" }}>
                  <button
                    onClick={() =>
                      setOpenMenu(openMenu === recId ? null : recId)
                    }
                    aria-label="Afficher les actions"
                    className="btn btn-ghost btn-sm"
                    style={{ padding: 6 }}
                  >
                    <MoreVertical style={{ width: 16, height: 16 }} />
                  </button>
                  {openMenu === recId && (
                    <div
                      style={{
                        position: "absolute",
                        right: 0,
                        top: 36,
                        zIndex: 20,
                        background: "#fff",
                        borderRadius: "var(--radius)",
                        border: "1px solid var(--line)",
                        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                        width: 176,
                        padding: "6px 0",
                      }}
                    >
                      <Link
                        to={`/offboarding/${recId}`}
                        onClick={() => setOpenMenu(null)}
                        style={menuItemStyle}
                      >
                        Voir le détail
                      </Link>
                      {(isAdmin || user?.role === "hr") && (
                        <button
                          onClick={() => {
                            setOpenMenu(null);
                            setStatusTarget({
                              id: recId,
                              current: rec.status,
                            });
                            setNewStatus(rec.status);
                          }}
                          style={menuItemStyle}
                        >
                          Modifier statut
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          onClick={() => {
                            setOpenMenu(null);
                            setDeleteConfirm(recId);
                          }}
                          style={{ ...menuItemStyle, color: "var(--red)" }}
                        >
                          Supprimer
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </Tile>
      )}

      {/* Create slide-over */}
      {showForm && (
        <SlideOverForm
          users={usersData?.data ?? []}
          onClose={() => setShowForm(false)}
          onSubmit={(d) => createMutation.mutate(d)}
          isPending={createMutation.isPending}
        />
      )}

      {/* Delete confirm modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setDeleteConfirm(null)}
          />
          <Tile
            className="relative w-full max-w-sm"
            style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }}
          >
            <h3 className="h3" style={{ marginBottom: 8 }}>
              Confirmer la suppression
            </h3>
            <p className="body" style={{ marginBottom: 20 }}>
              Cette action est irréversible. Êtes-vous sûr de vouloir supprimer
              cette demande ?
            </p>
            <div className="row" style={{ gap: 12 }}>
              <button
                onClick={() => deleteMutation.mutate(deleteConfirm)}
                disabled={deleteMutation.isPending}
                className="btn btn-primary"
                style={{ flex: 1, background: "var(--red)" }}
              >
                {deleteMutation.isPending ? "Suppression…" : "Supprimer"}
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="btn btn-ghost"
              >
                Annuler
              </button>
            </div>
          </Tile>
        </div>
      )}

      {/* Modifier statut modal */}
      {statusTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setStatusTarget(null)}
          />
          <Tile
            className="relative w-full max-w-sm"
            style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }}
          >
            <h3 className="h3" style={{ marginBottom: 16 }}>
              Modifier le statut
            </h3>
            <select
              aria-label="Nouveau statut"
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="input"
              style={{ marginBottom: 16 }}
            >
              <option value="pending">En attente</option>
              <option value="in_progress">En cours</option>
              <option value="completed">Terminé</option>
            </select>
            <div className="row" style={{ gap: 12 }}>
              <button
                onClick={() =>
                  changeStatusMutation.mutate({
                    id: statusTarget.id,
                    status: newStatus,
                  })
                }
                disabled={
                  changeStatusMutation.isPending ||
                  newStatus === statusTarget.current
                }
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                {changeStatusMutation.isPending
                  ? "Enregistrement…"
                  : "Enregistrer"}
              </button>
              <button
                onClick={() => setStatusTarget(null)}
                className="btn btn-ghost"
              >
                Annuler
              </button>
            </div>
          </Tile>
        </div>
      )}

      {/* Close menus on outside click */}
      {openMenu && (
        <div className="fixed inset-0 z-0" onClick={() => setOpenMenu(null)} />
      )}
    </div>
  );
}
