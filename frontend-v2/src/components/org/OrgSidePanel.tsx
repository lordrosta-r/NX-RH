import {
  X,
  Mail,
  Building2,
  Users,
  ChevronRight,
  Save,
  ExternalLink,
  CheckSquare,
  Square,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { orgApi } from "../../api/org";
import type { OrgNodeData } from "../../hooks/useOrgLayout";
import type { Role } from "../../types";
import { queryKeys } from "../../lib/queryKeys";

const ROLE_OPTIONS: { value: Role; label: string; color: string }[] = [
  { value: "admin", label: "Admin", color: "#0D9488" },
  { value: "hr", label: "RH", color: "#059669" },
  { value: "manager", label: "Responsable", color: "#2563EB" },
  { value: "employee", label: "Collaborateur", color: "#64748B" },
];

const ROLE_TONES: Record<string, string> = {
  admin: "red",
  hr: "amber",
  manager: "blue",
  employee: "grey",
};

interface OrgSidePanelProps {
  person: OrgNodeData;
  canEdit: boolean;
  onClose: () => void;
  onNavigateTo: (id: string) => void;
  sectors?: { _id?: string; id?: string; name: string }[];
  allUsers?: OrgNodeData[];
}

export default function OrgSidePanel({
  person,
  canEdit,
  onClose,
  onNavigateTo,
  sectors = [],
  allUsers = [],
}: OrgSidePanelProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [editRole, setEditRole] = useState<Role>(person.role);
  const [editSectorId, setEditSectorId] = useState<string>(
    person.sectorId ?? "",
  );
  const [editManagerId, setEditManagerId] = useState<string>(
    person.managerId ?? "",
  );
  const [editDotted, setEditDotted] = useState<string[]>(
    person.dottedLineManagerIds ?? [],
  );
  const [managerSearch, setManagerSearch] = useState("");
  const [dirty, setDirty] = useState(false);

  // Reset on person change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- réinitialisation du panneau au changement de personne sélectionnée
    setEditRole(person.role);
    setEditSectorId(person.sectorId ?? "");
    setEditManagerId(person.managerId ?? "");
    setEditDotted(person.dottedLineManagerIds ?? []);
    setDirty(false);
  }, [person.id]);

  const mutation = useMutation({
    mutationFn: () =>
      orgApi.patchOrgUser(person.id, {
        role: editRole !== person.role ? editRole : undefined,
        sectorId:
          editSectorId !== (person.sectorId ?? "")
            ? editSectorId || null
            : undefined,
        managerId:
          editManagerId !== (person.managerId ?? "")
            ? editManagerId || null
            : undefined,
        dottedLineManagerIds: editDotted,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.org.all });
      setDirty(false);
    },
  });

  const toggleDotted = (uid: string) => {
    setEditDotted((prev) =>
      prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid],
    );
    setDirty(true);
  };

  const filteredManagers = allUsers
    .filter((u) => {
      if (u.id === person.id) return false;
      const name = `${u.firstName} ${u.lastName}`.toLowerCase();
      return !managerSearch || name.includes(managerSearch.toLowerCase());
    })
    .slice(0, 8);

  const currentManager = allUsers.find(
    (u) => u.id === (editManagerId || person.managerId),
  );

  return (
    <div
      className="absolute right-0 top-0 h-full w-80 z-20 flex flex-col animate-[slideInRight_0.2s_ease]"
      style={{
        background: "#fff",
        borderLeft: "1px solid var(--line)",
        boxShadow: "var(--shadow-lg)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-start justify-between p-4"
        style={{ borderBottom: "1px solid var(--line)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="avatar flex-shrink-0"
            style={{
              width: 48,
              height: 48,
              fontSize: 16,
              backgroundColor: person.color,
            }}
          >
            {person.initials}
          </div>
          <div className="flex flex-col gap-1 items-start">
            <h3 className="h3" style={{ fontSize: 16 }}>
              {person.firstName} {person.lastName}
            </h3>
            <span className={`badge ${ROLE_TONES[person.role] ?? "grey"}`}>
              {ROLE_OPTIONS.find((r) => r.value === person.role)?.label ??
                person.role}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Fermer"
          className="icon-btn flex-shrink-0"
          style={{ width: 32, height: 32, borderRadius: "var(--radius)" }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Info section */}
        <div className="space-y-2">
          {person.email && (
            <div className="small flex items-center gap-2">
              <Mail
                size={14}
                className="flex-shrink-0"
                style={{ color: "var(--ink-3)" }}
              />
              <span className="truncate">{person.email}</span>
            </div>
          )}
          {person.department && (
            <div className="small flex items-center gap-2">
              <Building2
                size={14}
                className="flex-shrink-0"
                style={{ color: "var(--ink-3)" }}
              />
              <span>{person.department}</span>
            </div>
          )}
          <div className="small flex items-center gap-2">
            <Users
              size={14}
              className="flex-shrink-0"
              style={{ color: "var(--ink-3)" }}
            />
            <span>
              {person.reportCount} reporté{person.reportCount !== 1 ? "s" : ""}{" "}
              direct{person.reportCount !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Manager */}
        {currentManager && !canEdit && (
          <div>
            <p className="eyebrow mb-2" style={{ fontSize: 11 }}>
              Responsable direct
            </p>
            <button
              onClick={() => onNavigateTo(currentManager.id)}
              className="flex items-center gap-2 w-full p-2 text-left group"
              style={{ borderRadius: "var(--radius)" }}
            >
              <div
                className="avatar flex-shrink-0"
                style={{
                  width: 28,
                  height: 28,
                  fontSize: 11,
                  backgroundColor: currentManager.color,
                }}
              >
                {currentManager.initials}
              </div>
              <span
                className="body flex-1"
                style={{ fontSize: 14, color: "var(--ink)" }}
              >
                {currentManager.firstName} {currentManager.lastName}
              </span>
              <ChevronRight
                size={14}
                style={{ color: "var(--ink-3)" }}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </button>
          </div>
        )}

        {/* Edit section (admin/hr only) */}
        {canEdit && (
          <div className="space-y-3">
            <p className="eyebrow" style={{ fontSize: 11 }}>
              Modifier
            </p>

            {/* Role */}
            <div className="field">
              <label htmlFor="edit-role" style={{ fontSize: 13 }}>
                Rôle
              </label>
              <select
                id="edit-role"
                value={editRole}
                onChange={(e) => {
                  setEditRole(e.target.value as Role);
                  setDirty(true);
                }}
                className="input"
                style={{ fontSize: 14, padding: "9px 12px" }}
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sector */}
            {sectors.length > 0 && (
              <div className="field">
                <label htmlFor="edit-sector" style={{ fontSize: 13 }}>
                  Secteur
                </label>
                <select
                  id="edit-sector"
                  value={editSectorId}
                  onChange={(e) => {
                    setEditSectorId(e.target.value);
                    setDirty(true);
                  }}
                  className="input"
                  style={{ fontSize: 14, padding: "9px 12px" }}
                >
                  <option value="">— Aucun secteur —</option>
                  {sectors.map((s) => (
                    <option key={s._id ?? s.id} value={s._id ?? s.id ?? ""}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Manager */}
            <div className="field">
              <label htmlFor="manager-search" style={{ fontSize: 13 }}>
                Responsable direct
              </label>
              <input
                id="manager-search"
                type="text"
                placeholder="Rechercher un manager…"
                value={managerSearch}
                onChange={(e) => setManagerSearch(e.target.value)}
                className="input"
                style={{ fontSize: 14, padding: "9px 12px" }}
              />
              <div
                className="overflow-hidden max-h-36 overflow-y-auto"
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius)",
                }}
              >
                <button
                  onClick={() => {
                    setEditManagerId("");
                    setDirty(true);
                  }}
                  className="w-full text-left px-3 py-2 small"
                  style={
                    !editManagerId
                      ? {
                          background: "var(--blue-soft)",
                          color: "var(--blue-text)",
                          fontWeight: 600,
                        }
                      : { color: "var(--ink-3)" }
                  }
                >
                  — Aucun manager —
                </button>
                {filteredManagers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      setEditManagerId(u.id);
                      setDirty(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 small"
                    style={
                      editManagerId === u.id
                        ? { background: "var(--blue-soft)" }
                        : undefined
                    }
                  >
                    <div
                      className="avatar flex-shrink-0"
                      style={{
                        width: 20,
                        height: 20,
                        fontSize: 9,
                        backgroundColor: u.color,
                      }}
                    >
                      {u.initials}
                    </div>
                    <span style={{ color: "var(--ink)" }}>
                      {u.firstName} {u.lastName}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Responsables transverses (matriciel) */}
            <div className="field">
              <label style={{ fontSize: 13 }}>Responsables transverses</label>
              <p
                className="small"
                style={{ color: "var(--ink-3)", marginBottom: 6 }}
              >
                Liens fonctionnels (visibilité). La signature reste au manager
                direct.
              </p>
              <div
                className="overflow-hidden max-h-36 overflow-y-auto"
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius)",
                }}
              >
                {allUsers
                  .filter(
                    (u) =>
                      u.id !== person.id &&
                      u.id !== editManagerId &&
                      (!managerSearch ||
                        `${u.firstName} ${u.lastName}`
                          .toLowerCase()
                          .includes(managerSearch.toLowerCase())),
                  )
                  .slice(0, 8)
                  .map((u) => {
                    const checked = editDotted.includes(u.id);
                    return (
                      <button
                        key={u.id}
                        onClick={() => toggleDotted(u.id)}
                        className="w-full flex items-center gap-2 px-3 py-2 small"
                        style={
                          checked
                            ? { background: "var(--blue-soft)" }
                            : undefined
                        }
                      >
                        {checked ? (
                          <CheckSquare
                            size={14}
                            style={{ color: "var(--blue-text)" }}
                          />
                        ) : (
                          <Square size={14} style={{ color: "var(--ink-3)" }} />
                        )}
                        <span style={{ color: "var(--ink)" }}>
                          {u.firstName} {u.lastName}
                        </span>
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className="p-4 space-y-2"
        style={{ borderTop: "1px solid var(--line)" }}
      >
        {canEdit && dirty && (
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="btn btn-primary btn-sm btn-block"
          >
            <Save size={14} />
            {mutation.isPending ? "Enregistrement…" : "Enregistrer"}
          </button>
        )}
        {mutation.isError && (
          <p className="small text-center" style={{ color: "var(--red)" }}>
            Erreur lors de la sauvegarde
          </p>
        )}
        <button
          onClick={() => navigate(`/users/${person.id}`)}
          className="btn btn-ghost btn-sm btn-block"
        >
          <ExternalLink size={13} />
          Voir le profil
        </button>
      </div>
    </div>
  );
}
