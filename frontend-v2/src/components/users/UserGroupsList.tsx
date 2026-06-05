import { useState, useEffect, useRef } from "react";
import { MoreVertical, Trash2, Edit2, UserPlus, Users } from "lucide-react";
import type { UserGroup } from "../../types";

const GROUP_TONES = [
  { bg: "var(--blue-soft)", color: "var(--blue-text)" },
  { bg: "var(--green-soft)", color: "var(--green)" },
  { bg: "var(--amber-soft)", color: "var(--amber)" },
  { bg: "var(--red-soft)", color: "var(--red)" },
  { bg: "var(--bg-alt-2)", color: "var(--ink-2)" },
] as const;

function groupTone(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return GROUP_TONES[Math.abs(hash) % GROUP_TONES.length];
}

function GroupInitials({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/);
  const initials =
    parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();
  const tone = groupTone(name);
  return (
    <div
      className="row"
      style={{
        width: 48,
        height: 48,
        borderRadius: "var(--radius)",
        justifyContent: "center",
        fontSize: 14,
        fontWeight: 800,
        flexShrink: 0,
        background: tone.bg,
        color: tone.color,
      }}
    >
      {initials}
    </div>
  );
}

function GroupActionMenu({
  onEdit,
  onManageMembers,
  onDelete,
}: {
  onEdit: () => void;
  onManageMembers: () => void;
  onDelete: () => void;
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

  const itemStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    width: "100%",
    textAlign: "left",
    padding: "9px 14px",
    fontSize: 14,
    fontWeight: 600,
    color: "var(--ink-2)",
    background: "none",
    border: "none",
    cursor: "pointer",
  };

  return (
    <div style={{ position: "relative" }} ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="btn btn-ghost btn-sm"
        style={{ padding: 6 }}
        aria-label="Actions groupe"
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
          <button
            style={itemStyle}
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
          >
            <Edit2 style={{ width: 16, height: 16 }} /> Modifier
          </button>
          <button
            style={itemStyle}
            onClick={() => {
              setOpen(false);
              onManageMembers();
            }}
          >
            <UserPlus style={{ width: 16, height: 16 }} /> Gérer membres
          </button>
          <button
            style={{ ...itemStyle, color: "var(--red)" }}
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
          >
            <Trash2 style={{ width: 16, height: 16 }} /> Supprimer
          </button>
        </div>
      )}
    </div>
  );
}

function GroupCard({
  group,
  canManage,
  onEdit,
  onManageMembers,
  onDelete,
}: {
  group: UserGroup;
  canManage: boolean;
  onEdit: (g: UserGroup) => void;
  onManageMembers: (g: UserGroup) => void;
  onDelete: (g: UserGroup) => void;
}) {
  return (
    <div
      className="tile"
      style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}
    >
      <div className="row between" style={{ alignItems: "flex-start" }}>
        <div className="row" style={{ gap: 12 }}>
          <GroupInitials name={group.name} />
          <div>
            <h3 className="h3">{group.name}</h3>
            {group.description && (
              <p className="small line-clamp-2" style={{ marginTop: 2 }}>
                {group.description}
              </p>
            )}
          </div>
        </div>
        {canManage && (
          <GroupActionMenu
            onEdit={() => onEdit(group)}
            onManageMembers={() => onManageMembers(group)}
            onDelete={() => onDelete(group)}
          />
        )}
      </div>
      <div className="row between">
        <span className="badge grey">
          <Users style={{ width: 14, height: 14 }} />
          {group.members.length} membre{group.members.length !== 1 ? "s" : ""}
        </span>
        <span className="small">
          {new Date(group.createdAt).toLocaleDateString("fr-FR")}
        </span>
      </div>
      {group.members.length > 0 && (
        <div className="row" style={{ marginLeft: 0 }}>
          {group.members.slice(0, 5).map((m, idx) => (
            <div
              key={m._id}
              title={`${m.firstName} ${m.lastName}`}
              className="row"
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 700,
                background: "var(--blue-soft)",
                color: "var(--blue-text)",
                boxShadow: "0 0 0 2px #fff",
                marginLeft: idx === 0 ? 0 : -8,
              }}
            >
              {(m.firstName?.[0] ?? "") + (m.lastName?.[0] ?? "")}
            </div>
          ))}
          {group.members.length > 5 && (
            <div
              className="row"
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 700,
                background: "var(--bg-alt-2)",
                color: "var(--ink-3)",
                boxShadow: "0 0 0 2px #fff",
                marginLeft: -8,
              }}
            >
              +{group.members.length - 5}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface Props {
  groups: UserGroup[];
  isLoading: boolean;
  canManage: boolean;
  onEdit: (g: UserGroup) => void;
  onManageMembers: (g: UserGroup) => void;
  onDelete: (g: UserGroup) => void;
  onCreateFirst: () => void;
}

export function UserGroupsList({
  groups,
  isLoading,
  canManage,
  onEdit,
  onManageMembers,
  onDelete,
  onCreateFirst,
}: Props) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="tile animate-pulse"
            style={{
              padding: 20,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div className="row" style={{ gap: 12 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "var(--radius)",
                  background: "var(--bg-alt-2)",
                }}
              />
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                <div
                  style={{
                    height: 16,
                    borderRadius: "var(--radius)",
                    background: "var(--bg-alt-2)",
                    width: "75%",
                  }}
                />
                <div
                  style={{
                    height: 12,
                    borderRadius: "var(--radius)",
                    background: "var(--bg-alt-2)",
                    width: "50%",
                  }}
                />
              </div>
            </div>
            <div
              style={{
                height: 12,
                borderRadius: "var(--radius)",
                background: "var(--bg-alt-2)",
                width: "33%",
              }}
            />
          </div>
        ))}
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "80px 0" }}>
        <Users
          style={{
            width: 56,
            height: 56,
            color: "var(--line-strong)",
            margin: "0 auto 16px",
          }}
        />
        <p className="h3">Aucun groupe créé</p>
        <p className="small" style={{ marginTop: 4 }}>
          Créez votre premier groupe pour organiser vos utilisateurs.
        </p>
        {canManage && (
          <button
            onClick={onCreateFirst}
            className="btn btn-primary"
            style={{ marginTop: 20 }}
          >
            Créer un groupe
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {groups.map((group) => (
        <GroupCard
          key={group._id}
          group={group}
          canManage={canManage}
          onEdit={onEdit}
          onManageMembers={onManageMembers}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
