import React, { useState } from "react";
import { Search, Filter, Globe, Users, LayoutGrid, Building2 } from "lucide-react";
import type { Role } from "../../types";

export type OrgView = "all" | "teams" | "sector" | "department";

const ROLES: { value: Role; label: string; color: string }[] = [
  { value: "admin", label: "Admin", color: "#0D9488" },
  { value: "hr", label: "RH", color: "#059669" },
  { value: "manager", label: "Responsable", color: "#2563EB" },
  { value: "employee", label: "Collaborateur", color: "#64748B" },
];

interface OrgToolbarProps {
  activeView: OrgView;
  onViewChange: (view: OrgView) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeRoles: Role[];
  onRolesChange: (roles: Role[]) => void;
  totalCount: number;
  filteredCount: number;
}

export default function OrgToolbar({
  activeView,
  onViewChange,
  searchQuery,
  onSearchChange,
  activeRoles,
  onRolesChange,
  totalCount,
  filteredCount,
}: OrgToolbarProps) {
  const [showRoleFilter, setShowRoleFilter] = useState(false);

  const toggleRole = (role: Role) => {
    if (activeRoles.includes(role)) {
      onRolesChange(activeRoles.filter((r) => r !== role));
    } else {
      onRolesChange([...activeRoles, role]);
    }
  };

  const clearFilters = () => {
    onSearchChange("");
    onRolesChange([]);
  };

  const hasFilters = searchQuery || activeRoles.length > 0;

  return (
    <div
      className="flex w-full items-center gap-4 px-4 py-2.5"
      style={{
        background: "#fff",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {/* View selector */}
      <div className="flex items-center gap-1.5">
        {(
          [
            { view: "all", label: "Tout", icon: <Globe size={14} /> },
            { view: "teams", label: "Équipes", icon: <Users size={14} /> },
            {
              view: "department",
              label: "Départements",
              icon: <Building2 size={14} />,
            },
            {
              view: "sector",
              label: "Secteurs",
              icon: <LayoutGrid size={14} />,
            },
          ] as { view: OrgView; label: string; icon: React.ReactNode }[]
        ).map(({ view, label, icon }) => (
          <button
            key={view}
            onClick={() => onViewChange(view)}
            className={`btn btn-sm ${activeView === view ? "btn-primary" : "btn-ghost"}`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* Separator */}
      <div className="h-6 w-px" style={{ background: "var(--line)" }} />

      {/* Search */}
      <div className="relative min-w-[160px] flex-1">
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: "var(--ink-3)" }}
          aria-hidden="true"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Rechercher…"
          aria-label="Rechercher dans l'organigramme"
          className="input"
          style={{ paddingLeft: 36 }}
        />
      </div>

      {/* Role filter */}
      <div className="relative">
        <button
          onClick={() => setShowRoleFilter((v) => !v)}
          aria-label="Filtrer par rôle"
          aria-expanded={showRoleFilter}
          className={`btn btn-sm ${activeRoles.length > 0 ? "btn-secondary" : "btn-ghost"}`}
        >
          <Filter size={14} />
          Rôles
          {activeRoles.length > 0 && (
            <span className="badge blue">{activeRoles.length}</span>
          )}
        </button>

        {showRoleFilter && (
          <div
            className="absolute top-full right-0 z-50 mt-2 min-w-[180px] p-3"
            style={{
              background: "#fff",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            <p className="eyebrow mb-2" style={{ color: "var(--ink-3)" }}>
              Filtrer par rôle
            </p>
            {ROLES.map(({ value, label, color }) => (
              <label
                key={value}
                className="flex cursor-pointer items-center gap-2 rounded px-1 py-1"
              >
                <input
                  type="checkbox"
                  checked={activeRoles.includes(value)}
                  onChange={() => toggleRole(value)}
                  aria-label={label}
                  className="h-3.5 w-3.5"
                  style={{ accentColor: "var(--blue)" }}
                />
                <span
                  className="h-2 w-2 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="small" style={{ color: "var(--ink-2)" }}>
                  {label}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Count + clear */}
      {hasFilters && (
        <div className="flex items-center gap-3">
          <span className="small" style={{ color: "var(--ink-3)" }}>
            {filteredCount}/{totalCount}
          </span>
          <button onClick={clearFilters} className="btn btn-ghost btn-sm">
            Réinitialiser
          </button>
        </div>
      )}
    </div>
  );
}
