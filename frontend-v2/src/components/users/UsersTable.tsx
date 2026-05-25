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

const ROLE_BADGES: Record<string, string> = {
  admin: "bg-error-50 text-error-700",
  hr: "bg-warning-50 text-warning-700",
  manager: "bg-primary-50 text-primary-700",
  employee: "bg-slate-100 text-slate-700",
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  hr: "RH",
  manager: "Responsable",
  employee: "Collaborateur",
};

function StatusBadge({
  isActive,
  offboarding,
}: {
  isActive: boolean;
  offboarding?: boolean;
}) {
  if (offboarding)
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-warning-50 text-warning-700">
        Offboarding
      </span>
    );
  if (isActive)
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-success-50 text-success-700">
        ● Actif
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
      Inactif
    </span>
  );
}

function Avatar({ user }: { user: User }) {
  const initials =
    `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase();
  return (
    <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 text-xs font-semibold flex items-center justify-center flex-shrink-0">
      {initials}
    </div>
  );
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
  return <span className="text-xs text-slate-500">{label ?? "—"}</span>;
}

function ActionMenu({
  user: u,
  currentRole,
  onOffboard,
  onAnonymize,
}: {
  user: User;
  currentRole: string;
  onOffboard: (id: string) => void;
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

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Actions utilisateur"
        className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-20 bg-white rounded-lg shadow-lg border border-slate-100 w-44 py-1">
          <Link
            to={`/users/${u.id}`}
            className="flex items-center px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 w-full"
            onClick={() => setOpen(false)}
          >
            Voir le profil
          </Link>
          {canEdit && (
            <Link
              to={`/users/${u.id}/edit`}
              className="flex items-center px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 w-full"
              onClick={() => setOpen(false)}
            >
              Modifier
            </Link>
          )}
          {canEdit && (
            <button
              className="flex items-center px-3 py-2 text-sm text-warning-700 hover:bg-warning-50 w-full text-left"
              onClick={() => {
                setOpen(false);
                onOffboard(u.id);
              }}
            >
              Offboarding
            </button>
          )}
          {canAnonymize && (
            <button
              className="flex items-center px-3 py-2 text-sm text-error-700 hover:bg-error-50 w-full text-left"
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
        <tr key={i} className="border-b border-slate-50">
          <td className="px-4 py-4">
            <div className="w-4 h-4 bg-slate-200 rounded animate-pulse" />
          </td>
          <td className="px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-slate-200 animate-pulse" />
              <div className="h-4 bg-slate-200 rounded w-32 animate-pulse" />
            </div>
          </td>
          <td className="px-6 py-4">
            <div className="h-5 bg-slate-200 rounded-full w-20 animate-pulse" />
          </td>
          <td className="px-6 py-4">
            <div className="h-4 bg-slate-200 rounded w-24 animate-pulse" />
          </td>
          <td className="px-6 py-4">
            <div className="h-5 bg-slate-200 rounded-full w-16 animate-pulse" />
          </td>
          <td className="px-6 py-4">
            <div className="h-4 bg-slate-200 rounded w-20 animate-pulse" />
          </td>
          <td className="px-6 py-4">
            <div className="h-4 bg-slate-200 rounded w-6 animate-pulse" />
          </td>
        </tr>
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
  onOffboard: (id: string) => void;
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
  onOffboard,
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
        className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden"
      >
        <div className="overflow-x-auto hidden sm:block">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={onToggleSelectAll}
                    className="rounded border-slate-300 text-primary-500 focus:ring-primary-500"
                    aria-label="Tout sélectionner"
                  />
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">
                  Nom
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">
                  Rôle
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">
                  Département
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">
                  Statut
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">
                  Dernière connexion
                </th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonRows />
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      icon={<Users className="w-8 h-8" />}
                      title="Aucun collaborateur trouvé"
                      description="Aucun utilisateur ne correspond à vos critères de recherche."
                      action={
                        currentRole === "admin" || currentRole === "hr"
                          ? {
                              label: "Créer le premier collaborateur",
                              onClick: () =>
                                window.location.assign("/users/new"),
                            }
                          : undefined
                      }
                    />
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr
                    key={u.id ?? u.email}
                    className="hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                  >
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selected.has(u.id ?? "")}
                        onChange={() => onToggleSelect(u.id ?? "")}
                        className="rounded border-slate-300 text-primary-500 focus:ring-primary-500"
                        aria-label={`Sélectionner ${u.firstName} ${u.lastName}`}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        to={`/users/${u.id}`}
                        className="flex items-center gap-3 group"
                      >
                        <Avatar user={u} />
                        <div>
                          <p className="text-sm font-medium text-slate-900 group-hover:text-primary-600 transition-colors">
                            {u.firstName} {u.lastName}
                          </p>
                          <p className="text-xs text-slate-500">{u.email}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_BADGES[u.role] ?? "bg-slate-100 text-slate-700"}`}
                      >
                        {ROLE_LABELS[u.role] ?? u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {u.department ?? "—"}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge
                        isActive={u.isActive}
                        offboarding={u.offboardingStatus === "in_progress"}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <RelativeDate date={u.updatedAt} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <ActionMenu
                        user={u}
                        currentRole={currentRole}
                        onOffboard={onOffboard}
                        onAnonymize={onAnonymize}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        {!isLoading && users.length > 0 && (
          <div className="sm:hidden divide-y divide-slate-100">
            {users.map((u) => (
              <div key={u.id ?? u.email} className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <input
                    type="checkbox"
                    checked={selected.has(u.id ?? "")}
                    onChange={() => onToggleSelect(u.id ?? "")}
                    className="rounded border-slate-300 text-primary-500 focus:ring-primary-500"
                  />
                  <Link
                    to={`/users/${u.id}`}
                    className="flex items-center gap-3 flex-1 min-w-0 group"
                  >
                    <Avatar user={u} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 group-hover:text-primary-600 truncate">
                        {u.firstName} {u.lastName}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {u.email}
                      </p>
                    </div>
                  </Link>
                  <ActionMenu
                    user={u}
                    currentRole={currentRole}
                    onOffboard={onOffboard}
                    onAnonymize={onAnonymize}
                  />
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm ml-7">
                  <dt className="text-slate-500">Rôle</dt>
                  <dd>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_BADGES[u.role] ?? "bg-slate-100 text-slate-700"}`}
                    >
                      {ROLE_LABELS[u.role] ?? u.role}
                    </span>
                  </dd>
                  <dt className="text-slate-500">Département</dt>
                  <dd className="text-slate-700">{u.department ?? "—"}</dd>
                  <dt className="text-slate-500">Statut</dt>
                  <dd>
                    <StatusBadge
                      isActive={u.isActive}
                      offboarding={u.offboardingStatus === "in_progress"}
                    />
                  </dd>
                  <dt className="text-slate-500">Dernière connexion</dt>
                  <dd>
                    <RelativeDate date={u.updatedAt} />
                  </dd>
                </dl>
              </div>
            ))}
          </div>
        )}
        {!isLoading && users.length === 0 && (
          <div className="sm:hidden px-4 py-6">
            <EmptyState
              icon={<Users className="w-8 h-8" />}
              title="Aucun collaborateur trouvé"
              description="Aucun utilisateur ne correspond à vos critères de recherche."
            />
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
            <p className="text-sm text-slate-500">
              Page {page} sur {totalPages} · {total} utilisateurs
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onPageChange(Math.max(1, page - 1))}
                disabled={page === 1}
                aria-label="Page précédente"
                className="px-2 py-1 text-sm border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {pageNumbers.map((n) => (
                <button
                  key={n}
                  onClick={() => onPageChange(n)}
                  className={`px-3 py-1 text-sm border rounded transition-colors ${
                    n === page
                      ? "bg-primary-500 text-white border-primary-500"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                aria-label="Page suivante"
                className="px-2 py-1 text-sm border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white rounded-xl px-6 py-3 flex items-center gap-4 shadow-xl z-50">
          <span className="text-sm">{selected.size} sélectionné(s)</span>
          <button
            onClick={onBulkDeactivate}
            className="text-sm bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-md"
          >
            Désactiver
          </button>
          <button
            onClick={onBulkExport}
            className="text-sm bg-blue-500 hover:bg-blue-600 px-3 py-1.5 rounded-md"
          >
            Exporter CSV
          </button>
          <button
            onClick={onClearSelection}
            className="text-slate-400 hover:text-white ml-2"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </>
  );
}
