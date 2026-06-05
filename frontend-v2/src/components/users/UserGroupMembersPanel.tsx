import { useState } from "react";
import { Search, X, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { usersApi } from "../../api/users";
import { useDebounce } from "../../hooks/useDebounce";
import type { UserGroup } from "../../types";

interface Props {
  group: UserGroup;
  onClose: () => void;
  onAddMember: (userId: string) => void;
  onRemoveMember: (userId: string) => void;
}

export function UserGroupMembersPanel({
  group,
  onClose,
  onAddMember,
  onRemoveMember,
}: Props) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);

  const { data: searchResults, isLoading: searching } = useQuery({
    queryKey: ["users-search", debouncedSearch],
    queryFn: () =>
      usersApi.getUsers({ q: debouncedSearch, limit: 10 }).then((r) => r.data),
    enabled: debouncedSearch.length >= 2,
  });

  const memberIds = new Set(group.members.map((m) => m._id));
  const filteredResults = (searchResults?.data ?? []).filter(
    (u) => !memberIds.has(u._id ?? u.id ?? ""),
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(22, 22, 29, 0.45)" }}
    >
      <div
        className="card w-full"
        style={{ maxWidth: 540, boxShadow: "var(--shadow-lg)" }}
      >
        <div
          className="row between"
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <h3 className="h3">Gérer les membres — {group.name}</h3>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="icon-btn"
            style={{ width: 36, height: 36 }}
          >
            <X className="ico" size={18} aria-hidden="true" />
          </button>
        </div>

        <div style={{ padding: "20px 24px" }}>
          <div style={{ marginBottom: 22 }}>
            <p className="eyebrow" style={{ marginBottom: 10 }}>
              Membres actuels ({group.members.length})
            </p>
            {group.members.length === 0 ? (
              <p className="small" style={{ fontStyle: "italic" }}>
                Aucun membre
              </p>
            ) : (
              <ul
                style={{
                  maxHeight: 180,
                  overflowY: "auto",
                  listStyle: "none",
                  margin: 0,
                  padding: 0,
                }}
              >
                {group.members.map((m) => (
                  <li
                    key={m._id}
                    className="row between"
                    style={{
                      padding: "10px 12px",
                      background: "var(--bg-alt)",
                      borderRadius: "var(--radius)",
                      marginBottom: 6,
                      gap: 12,
                    }}
                  >
                    <div className="row nxgap-12">
                      <div
                        className="avatar"
                        style={{ width: 32, height: 32, fontSize: 12 }}
                      >
                        {(m.firstName?.[0] ?? "") + (m.lastName?.[0] ?? "")}
                      </div>
                      <div>
                        <p
                          className="body"
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: "var(--ink)",
                          }}
                        >
                          {m.firstName} {m.lastName}
                        </p>
                        <p className="small" style={{ fontSize: 12 }}>
                          {m.email}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => onRemoveMember(m._id ?? "")}
                      className="icon-btn"
                      style={{
                        width: 32,
                        height: 32,
                        border: "none",
                        background: "transparent",
                        color: "var(--ink-3)",
                      }}
                      aria-label={`Retirer ${m.firstName}`}
                    >
                      <X size={16} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="field">
            <label htmlFor="group-member-search">Ajouter des membres</label>
            <div style={{ position: "relative" }}>
              <Search
                size={16}
                aria-hidden="true"
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--ink-3)",
                  pointerEvents: "none",
                }}
              />
              <input
                id="group-member-search"
                type="text"
                placeholder="Rechercher un utilisateur..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input"
                style={{ paddingLeft: 36 }}
              />
            </div>
            {debouncedSearch.length >= 2 && (
              <ul
                style={{
                  maxHeight: 180,
                  overflowY: "auto",
                  listStyle: "none",
                  margin: "6px 0 0",
                  padding: 0,
                }}
              >
                {searching && (
                  <li
                    className="small"
                    style={{ textAlign: "center", padding: "8px 0" }}
                  >
                    Recherche...
                  </li>
                )}
                {!searching && filteredResults.length === 0 && (
                  <li
                    className="small"
                    style={{ textAlign: "center", padding: "8px 0" }}
                  >
                    Aucun résultat
                  </li>
                )}
                {filteredResults.map((u) => (
                  <li
                    key={u.id ?? u._id}
                    className="row between"
                    style={{
                      padding: "10px 12px",
                      borderRadius: "var(--radius)",
                      cursor: "pointer",
                      gap: 12,
                    }}
                    onClick={() => onAddMember(u._id ?? u.id ?? "")}
                  >
                    <div className="row nxgap-12">
                      <div
                        className="avatar"
                        style={{ width: 32, height: 32, fontSize: 12 }}
                      >
                        {(u.firstName?.[0] ?? "") + (u.lastName?.[0] ?? "")}
                      </div>
                      <div>
                        <p
                          className="body"
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: "var(--ink)",
                          }}
                        >
                          {u.firstName} {u.lastName}
                        </p>
                        <p className="small" style={{ fontSize: 12 }}>
                          {u.email}
                        </p>
                      </div>
                    </div>
                    <button
                      className="icon-btn"
                      style={{
                        width: 32,
                        height: 32,
                        border: "none",
                        background: "transparent",
                        color: "var(--blue-text)",
                      }}
                      aria-label={`Ajouter ${u.firstName}`}
                    >
                      <Plus size={16} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {debouncedSearch.length < 2 && debouncedSearch.length > 0 && (
              <p className="hint">
                Saisissez au moins 2 caractères pour rechercher
              </p>
            )}
          </div>
        </div>

        <div
          className="row"
          style={{
            justifyContent: "flex-end",
            padding: "16px 24px",
            borderTop: "1px solid var(--line)",
          }}
        >
          <button onClick={onClose} className="btn btn-ghost btn-sm">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
