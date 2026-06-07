import { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  X,
  Users,
} from "lucide-react";
import EmptyState from "../ui/EmptyState";
import type { User } from "../../types";

const GRID_COLS = "40px 2fr 1fr 1fr 1fr 1fr 48px";

const ROLE_TONES: Record<string, "blue" | "green" | "amber" | "red" | "grey"> =
  {
    admin: "red",
    hr: "amber",
    manager: "blue",
    employee: "grey",
  };

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  hr: "RH",
  manager: "Responsable",
  employee: "Collaborateur",
};

function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`badge ${ROLE_TONES[role] ?? "grey"}`}>
      {ROLE_LABELS[role] ?? role}
    </span>
  );
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  if (isActive)
    return (
      <span className="badge green">
        <span className="dot" />
        Actif
      </span>
    );
  return <span className="badge grey">Inactif</span>;
}

function Avatar({ user }: { user: User }) {
  const initials =
    `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase();
  return <div className="avatar">{initials}</div>;
}

function RelativeDate({ date }: { date?: string }) {
  const label = useMemo(() => {
    if (!date) return null;
    // eslint-disable-next-line react-hooks/purity -- Date.now() is intentional for relative time display
    const diff = Date.now() - new Date(date).getTime();
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor(diff / 60000);
    if (days > 30) return new Date(date).toLocaleDateString("fr-FR");
    if (days >= 2) return `il y a ${days}j`;
    if (days === 1) return "hier";
    if (hours >= 1) return `il y a ${hours}h`;
    if (minutes >= 1) return `il y a ${minutes}min`;
    return "à l'instant";
  }, [date]);
  return <span className="small">{label ?? "—"}</span>;
}

function ActionMenu({
  user: u,
  currentRole,
  onAnonymize,
}: {
  user: User;
  currentRole: string;
  onAnonymize: (user: User) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const canEdit = currentRole === "admin" || currentRole === "hr";
  const canAnonymize = currentRole === "admin";

  const itemStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
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
    <div style={{ position: "relative" }} ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Actions utilisateur"
        className="btn btn-ghost btn-sm"
        style={{ padding: 6 }}
      >
        <MoreVertical className="ico" style={{ width: 16, height: 16 }} />
      </button>
      {open && (
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
            to={`/users/${u.id}`}
            style={itemStyle}
            onClick={() => setOpen(false)}
          >
            Voir le profil
          </Link>
          {canEdit && (
            <Link
              to={`/users/${u.id}/edit`}
              style={itemStyle}
              onClick={() => setOpen(false)}
            >
              Modifier
            </Link>
          )}
          {canAnonymize && (
            <button
              style={{ ...itemStyle, color: "var(--red)" }}
              onClick={() => {
                setOpen(false);
                onAnonymize(u);
              }}
            >
              Anonymiser
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="tbl-row"
          style={{ gridTemplateColumns: GRID_COLS }}
        >
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: 4,
              background: "var(--bg-alt-2)",
            }}
          />
          <div className="row" style={{ gap: 12 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: "var(--bg-alt-2)",
                flex: "none",
              }}
            />
            <div
              style={{
                height: 14,
                width: 128,
                borderRadius: 4,
                background: "var(--bg-alt-2)",
              }}
            />
          </div>
          <div
            style={{
              height: 18,
              width: 80,
              borderRadius: 999,
              background: "var(--bg-alt-2)",
            }}
          />
          <div
            style={{
              height: 14,
              width: 96,
              borderRadius: 4,
              background: "var(--bg-alt-2)",
            }}
          />
          <div
            style={{
              height: 18,
              width: 64,
              borderRadius: 999,
              background: "var(--bg-alt-2)",
            }}
          />
          <div
            style={{
              height: 14,
              width: 80,
              borderRadius: 4,
              background: "var(--bg-alt-2)",
            }}
          />
          <div
            style={{
              height: 14,
              width: 24,
              borderRadius: 4,
              background: "var(--bg-alt-2)",
            }}
          />
        </div>
      ))}
    </>
  );
}

interface Props {
  users: User[];
  isLoading: boolean;
  currentRole: string;
  selected: Set<string>;
  page: number;
  totalPages: number;
  total?: number;
  pageNumbers: number[];
  onAnonymize: (user: User) => void;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onPageChange: (page: number) => void;
  onBulkDeactivate: () => void;
  onBulkExport: () => void;
  onClearSelection: () => void;
}

export function UsersTable({
  users,
  isLoading,
  currentRole,
  selected,
  page,
  totalPages,
  total,
  pageNumbers,
  onAnonymize,
  onToggleSelect,
  onToggleSelectAll,
  onPageChange,
  onBulkDeactivate,
  onBulkExport,
  onClearSelection,
}: Props) {
  const allSelected =
    users.length > 0 && users.every((u) => selected.has(u.id ?? ""));

  return (
    <>
      <div
        data-testid="users-table"
        className="tile"
        style={{ padding: 0, overflow: "hidden" }}
      >
        {isLoading ? (
          <>
            <div
              className="tbl-head"
              style={{ gridTemplateColumns: GRID_COLS }}
            >
              <div>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleSelectAll}
                  aria-label="Tout sélectionner"
                />
              </div>
              <div>Nom</div>
              <div>Rôle</div>
              <div>Département</div>
              <div>Statut</div>
              <div>Dernière connexion</div>
              <div />
            </div>
            <SkeletonRows />
          </>
        ) : users.length === 0 ? (
          <div style={{ padding: 24 }}>
            <EmptyState
              icon={<Users className="w-8 h-8" />}
              title="Aucun collaborateur trouvé"
              description="Aucun utilisateur ne correspond à vos critères de recherche."
              action={
                currentRole === "admin" || currentRole === "hr"
                  ? {
                      label: "Créer le premier collaborateur",
                      onClick: () => window.location.assign("/users/new"),
                    }
                  : undefined
              }
            />
          </div>
        ) : (
          <>
            <div
              className="tbl-head"
              style={{ gridTemplateColumns: GRID_COLS }}
            >
              <div>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleSelectAll}
                  aria-label="Tout sélectionner"
                />
              </div>
              <div>Nom</div>
              <div>Rôle</div>
              <div>Département</div>
              <div>Statut</div>
              <div>Dernière connexion</div>
              <div />
            </div>
            {users.map((u) => (
              <div
                key={u.id ?? u.email}
                className="tbl-row"
                style={{ gridTemplateColumns: GRID_COLS }}
              >
                <div>
                  <input
                    type="checkbox"
                    checked={selected.has(u.id ?? "")}
                    onChange={() => onToggleSelect(u.id ?? "")}
                    aria-label={`Sélectionner ${u.firstName} ${u.lastName}`}
                  />
                </div>
                <div style={{ minWidth: 0 }}>
                  <Link
                    to={`/users/${u.id}`}
                    className="row"
                    style={{ gap: 12 }}
                  >
                    <Avatar user={u} />
                    <div style={{ minWidth: 0 }}>
                      <p className="link" style={{ fontWeight: 600 }}>
                        {u.firstName} {u.lastName}
                      </p>
                      <p className="small truncate">{u.email}</p>
                    </div>
                  </Link>
                </div>
                <div>
                  <RoleBadge role={u.role} />
                </div>
                <div className="small">{u.department ?? "—"}</div>
                <div>
                  <StatusBadge isActive={u.isActive} />
                </div>
                <div>
                  <RelativeDate date={u.updatedAt} />
                </div>
                <div style={{ textAlign: "right" }}>
                  <ActionMenu
                    user={u}
                    currentRole={currentRole}
                    onAnonymize={onAnonymize}
                  />
                </div>
              </div>
            ))}
          </>
        )}

        {totalPages > 1 && (
          <div
            className="row between"
            style={{
              padding: "16px 22px",
              borderTop: "1px solid var(--line)",
            }}
          >
            <p className="small">
              Page {page} sur {totalPages} · {total} utilisateurs
            </p>
            <div className="row" style={{ gap: 4 }}>
              <button
                onClick={() => onPageChange(Math.max(1, page - 1))}
                disabled={page === 1}
                aria-label="Page précédente"
                className="btn btn-ghost btn-sm"
                style={{ padding: 6 }}
              >
                <ChevronLeft
                  className="ico"
                  style={{ width: 16, height: 16 }}
                />
              </button>
              {pageNumbers.map((n) => (
                <button
                  key={n}
                  onClick={() => onPageChange(n)}
                  className={`btn btn-sm ${n === page ? "btn-primary" : "btn-ghost"}`}
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                aria-label="Page suivante"
                className="btn btn-ghost btn-sm"
                style={{ padding: 6 }}
              >
                <ChevronRight
                  className="ico"
                  style={{ width: 16, height: 16 }}
                />
              </button>
            </div>
          </div>
        )}
      </div>

      {selected.size > 0 && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--ink)",
            color: "#fff",
            borderRadius: "var(--radius-lg)",
            padding: "12px 24px",
            display: "flex",
            alignItems: "center",
            gap: 16,
            boxShadow: "var(--shadow-lg)",
            zIndex: 50,
          }}
        >
          <span className="small" style={{ color: "#fff" }}>
            {selected.size} sélectionné(s)
          </span>
          <button
            onClick={onBulkDeactivate}
            className="btn btn-sm"
            style={{ background: "var(--red)", color: "#fff" }}
          >
            Désactiver
          </button>
          <button
            onClick={onBulkExport}
            className="btn btn-sm"
            style={{ background: "var(--blue)", color: "#fff" }}
          >
            Exporter CSV
          </button>
          <button
            onClick={onClearSelection}
            aria-label="Effacer la sélection"
            style={{
              background: "none",
              border: "none",
              color: "rgba(255,255,255,0.7)",
              cursor: "pointer",
              marginLeft: 8,
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </>
  );
}
