import { Search, X } from "lucide-react";

interface Props {
  searchInput: string;
  onSearchChange: (v: string) => void;
  roleFilter: string;
  onRoleChange: (v: string) => void;
  deptFilter: string;
  onDeptChange: (v: string) => void;
  statusFilter: string;
  onStatusChange: (v: string) => void;
  departments: string[];
  hasFilters: boolean;
  onReset: () => void;
}

export function UsersFilterBar({
  searchInput,
  onSearchChange,
  roleFilter,
  onRoleChange,
  deptFilter,
  onDeptChange,
  statusFilter,
  onStatusChange,
  departments,
  hasFilters,
  onReset,
}: Props) {
  return (
    <div className="row wrap" style={{ gap: 12, marginBottom: 16 }}>
      <div style={{ position: "relative", width: 256 }}>
        <Search
          className="ico"
          style={{
            position: "absolute",
            left: 12,
            top: "50%",
            transform: "translateY(-50%)",
            width: 16,
            height: 16,
            color: "var(--ink-3)",
          }}
        />
        <input
          type="text"
          data-testid="users-search"
          aria-label="Rechercher un utilisateur"
          placeholder="Rechercher..."
          value={searchInput}
          onChange={(e) => onSearchChange(e.target.value)}
          className="input"
          style={{ paddingLeft: 36 }}
        />
      </div>

      <select
        value={roleFilter}
        onChange={(e) => onRoleChange(e.target.value)}
        aria-label="Filtrer par rôle"
        className="input"
        style={{ width: "auto" }}
      >
        <option value="">Tous les rôles</option>
        <option value="admin">Admin</option>
        <option value="hr">RH</option>
        <option value="manager">Responsable</option>
        <option value="employee">Collaborateur</option>
      </select>

      <select
        value={deptFilter}
        onChange={(e) => onDeptChange(e.target.value)}
        aria-label="Filtrer par département"
        className="input"
        style={{ width: "auto" }}
      >
        <option value="">Tous les départements</option>
        {departments.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>

      <select
        value={statusFilter}
        onChange={(e) => onStatusChange(e.target.value)}
        aria-label="Filtrer par statut"
        className="input"
        style={{ width: "auto" }}
      >
        <option value="">Tous les statuts</option>
        <option value="active">Actif</option>
        <option value="inactive">Inactif</option>
      </select>

      {hasFilters && (
        <button onClick={onReset} className="btn btn-ghost btn-sm">
          <X className="ico" style={{ width: 16, height: 16 }} />
          Réinitialiser
        </button>
      )}
    </div>
  );
}
