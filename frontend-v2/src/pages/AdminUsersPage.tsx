import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Download,
  UserX,
  X,
  ShieldOff,
  AlertTriangle,
} from "lucide-react";
import { adminApi } from "../api/admin";
import type { User, PaginatedResponse } from "../types";
import { useAuth } from "../contexts/AuthContext";
import ActionMenu from "../components/ui/ActionMenu";
import { queryKeys } from "../lib/queryKeys";
import { PageHead, Tile, Badge, Callout } from "../components/shell";

const COLS = "1.6fr 1.8fr 0.8fr 0.8fr 1fr 1fr 1fr 48px";

const ROLE_TONE: Record<string, "blue" | "green" | "amber" | "red" | "grey"> = {
  admin: "red",
  hr: "amber",
  manager: "blue",
  employee: "grey",
};

function RoleBadge({ role }: { role: string }) {
  return <Badge tone={ROLE_TONE[role] ?? "grey"}>{role}</Badge>;
}

function AuthSourceBadge({ source }: { source: string }) {
  return <Badge tone={source === "ldap" ? "blue" : "grey"}>{source}</Badge>;
}

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const { user: currentUser } = useAuth();
  const [q, setQ] = useState("");
  const [authSourceFilter, setAuthSourceFilter] = useState("");
  const [confirmUser, setConfirmUser] = useState<User | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [deactivateTarget, setDeactivateTarget] = useState<User | null>(null);

  const isAdminOrHr =
    currentUser?.role === "admin" || currentUser?.role === "hr";

  const { data, isLoading } = useQuery<PaginatedResponse<User>>({
    queryKey: queryKeys.adminUsers.all,
    queryFn: () =>
      adminApi
        .getAdminUsers({
          q,
          ...(authSourceFilter ? { authSource: authSourceFilter } : {}),
        })
        .then((r) => r.data),
  });

  const anonymizeMut = useMutation({
    mutationFn: (id: string) => adminApi.anonymizeUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.adminUsers.all });
      setConfirmUser(null);
      setConfirmText("");
    },
  });

  const forceDeactivateMut = useMutation({
    mutationFn: (id: string) => adminApi.forceDeactivateUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.adminUsers.all });
      setDeactivateTarget(null);
    },
  });

  async function exportGdpr(user: User) {
    const res = await adminApi.exportUserGdpr(user.id);
    const url = URL.createObjectURL(res.data as Blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gdpr-${user.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const hasOffboarding = data?.data?.some(
    (u) => u.offboardingStatus === "offboarding",
  );

  return (
    <div className="nx-app">
      <PageHead
        eyebrow="Administration"
        title="Gestion avancée des utilisateurs"
      />

      <Callout tone="blue" style={{ marginBottom: 16 }}>
        <p className="small" style={{ margin: 0 }}>
          Les données utilisateur sont soumises au RGPD. Toute anonymisation est
          irréversible et auditée.
        </p>
      </Callout>

      {hasOffboarding && (
        <Callout tone="amber" style={{ marginBottom: 16 }}>
          <div className="row" style={{ gap: 10, alignItems: "center" }}>
            <AlertTriangle
              className="ico"
              style={{ width: 18, height: 18, color: "var(--amber)" }}
            />
            <p className="small" style={{ margin: 0, fontWeight: 600 }}>
              Des utilisateurs sont en cours d'offboarding. Vérifiez les
              dossiers.
            </p>
          </div>
        </Callout>
      )}

      <div
        className="row wrap"
        style={{ gap: 12, marginBottom: 16, alignItems: "flex-end" }}
      >
        <div className="field" style={{ flex: "1 1 320px", minWidth: 0 }}>
          <label htmlFor="admin-users-search">Rechercher</label>
          <div style={{ position: "relative" }}>
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
              id="admin-users-search"
              className="input"
              style={{ paddingLeft: 36 }}
              placeholder="Rechercher un utilisateur..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
        <div className="field" style={{ flex: "0 1 220px" }}>
          <label htmlFor="admin-users-source">Source d'authentification</label>
          <select
            id="admin-users-source"
            className="input"
            value={authSourceFilter}
            onChange={(e) => setAuthSourceFilter(e.target.value)}
          >
            <option value="">Toutes sources</option>
            <option value="local">Local</option>
            <option value="ldap">LDAP</option>
          </select>
        </div>
      </div>

      <Tile style={{ padding: 0, overflow: "hidden" }}>
        <div className="tbl-head" style={{ gridTemplateColumns: COLS }}>
          <div>Nom</div>
          <div>Email</div>
          <div>Rôle</div>
          <div>Auth</div>
          <div>Département</div>
          <div>Créé le</div>
          <div>Désactivé le</div>
          <div />
        </div>

        {isLoading ? (
          <div className="small" style={{ padding: 40, textAlign: "center" }}>
            Chargement…
          </div>
        ) : !data?.data?.length ? (
          <div
            className="body"
            style={{ padding: 64, textAlign: "center", color: "var(--ink-3)" }}
          >
            Aucun utilisateur trouvé
          </div>
        ) : (
          data.data.map((user) => (
            <div
              key={user.id}
              className="tbl-row"
              style={{
                gridTemplateColumns: COLS,
                background:
                  user.offboardingStatus === "offboarding"
                    ? "var(--amber-soft)"
                    : undefined,
              }}
            >
              <div
                className="row"
                style={{ gap: 10, alignItems: "center", minWidth: 0 }}
              >
                <span className="avatar">
                  {user.firstName[0]}
                  {user.lastName[0]}
                </span>
                <span style={{ fontWeight: 600, color: "var(--ink)" }}>
                  {user.firstName} {user.lastName}
                </span>
                {user.gdprAnonymized && (
                  <span className="small" style={{ fontStyle: "italic" }}>
                    (anonymisé)
                  </span>
                )}
              </div>
              <div
                className="small"
                style={{
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {user.email}
              </div>
              <div>
                <RoleBadge role={user.role} />
              </div>
              <div>
                <AuthSourceBadge source={user.authSource} />
              </div>
              <div className="small">{user.department ?? "—"}</div>
              <div className="small">
                {user.createdAt
                  ? new Date(user.createdAt).toLocaleDateString("fr-FR")
                  : "—"}
              </div>
              <div className="small">
                {!user.isActive
                  ? user.deactivatedAt
                    ? new Date(user.deactivatedAt).toLocaleDateString("fr-FR")
                    : "—"
                  : "—"}
              </div>
              <div style={{ textAlign: "right" }}>
                <ActionMenu
                  align="right"
                  items={[
                    {
                      label: "Exporter JSON RGPD",
                      icon: <Download size={14} />,
                      onClick: () => exportGdpr(user),
                    },
                    {
                      label: "Anonymiser RGPD",
                      icon: <UserX size={14} />,
                      onClick: () => {
                        setConfirmUser(user);
                        setConfirmText("");
                      },
                      disabled: !!user.gdprAnonymized,
                      danger: true,
                    },
                    ...(isAdminOrHr
                      ? [
                          {
                            label: "Forcer désactivation",
                            icon: <ShieldOff size={14} />,
                            onClick: () => setDeactivateTarget(user),
                            disabled: !user.isActive,
                            danger: true,
                            separator: true,
                          },
                        ]
                      : []),
                  ]}
                />
              </div>
            </div>
          ))
        )}
      </Tile>

      {/* Confirm anonymize modal */}
      {confirmUser && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.4)",
            padding: 16,
          }}
        >
          <Tile style={{ width: "100%", maxWidth: 460 }}>
            <div
              className="row between"
              style={{ alignItems: "center", marginBottom: 16 }}
            >
              <h2 className="h3" style={{ color: "var(--red)", margin: 0 }}>
                Anonymisation RGPD
              </h2>
              <button
                onClick={() => setConfirmUser(null)}
                className="btn btn-ghost btn-sm"
                aria-label="Fermer"
                style={{ padding: 6 }}
              >
                <X size={18} className="ico" />
              </button>
            </div>
            <p className="body" style={{ marginBottom: 8 }}>
              Vous êtes sur le point d'anonymiser{" "}
              <strong>
                {confirmUser.firstName} {confirmUser.lastName}
              </strong>
              .
            </p>
            <p
              className="small row"
              style={{
                color: "var(--red)",
                fontWeight: 600,
                gap: 6,
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <AlertTriangle
                className="ico"
                style={{ width: 16, height: 16 }}
              />{" "}
              Cette action est irréversible. Toutes les données personnelles
              seront effacées.
            </p>
            <div className="field" style={{ marginBottom: 16 }}>
              <label htmlFor="anonymize-confirm">
                Saisissez <strong>CONFIRMER</strong> pour continuer
              </label>
              <input
                id="anonymize-confirm"
                className="input"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="CONFIRMER"
              />
            </div>
            <div
              className="row"
              style={{ justifyContent: "flex-end", gap: 12 }}
            >
              <button
                onClick={() => setConfirmUser(null)}
                className="btn btn-ghost"
              >
                Annuler
              </button>
              <button
                onClick={() => anonymizeMut.mutate(confirmUser.id)}
                disabled={confirmText !== "CONFIRMER" || anonymizeMut.isPending}
                className="btn btn-primary"
              >
                {anonymizeMut.isPending ? "Anonymisation…" : "Anonymiser"}
              </button>
            </div>
          </Tile>
        </div>
      )}

      {/* Confirm force deactivate modal */}
      {deactivateTarget && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.4)",
            padding: 16,
          }}
        >
          <Tile style={{ width: "100%", maxWidth: 460 }}>
            <div
              className="row between"
              style={{ alignItems: "center", marginBottom: 16 }}
            >
              <h2 className="h3" style={{ margin: 0 }}>
                Forcer la désactivation
              </h2>
              <button
                onClick={() => setDeactivateTarget(null)}
                className="btn btn-ghost btn-sm"
                aria-label="Fermer"
                style={{ padding: 6 }}
              >
                <X size={18} className="ico" />
              </button>
            </div>
            <p className="body" style={{ marginBottom: 16 }}>
              Forcer la désactivation désactivera immédiatement l'accès de{" "}
              <strong>
                {deactivateTarget.firstName} {deactivateTarget.lastName}
              </strong>
              .
            </p>
            <p
              className="small"
              style={{
                color: "var(--amber)",
                fontWeight: 600,
                marginBottom: 24,
              }}
            >
              Cette action désactivera immédiatement l'accès de cet utilisateur.
            </p>
            <div
              className="row"
              style={{ justifyContent: "flex-end", gap: 12 }}
            >
              <button
                onClick={() => setDeactivateTarget(null)}
                className="btn btn-ghost"
              >
                Annuler
              </button>
              <button
                onClick={() => forceDeactivateMut.mutate(deactivateTarget.id)}
                disabled={forceDeactivateMut.isPending}
                className="btn btn-primary"
              >
                {forceDeactivateMut.isPending
                  ? "Désactivation…"
                  : "Forcer la désactivation"}
              </button>
            </div>
          </Tile>
        </div>
      )}
    </div>
  );
}
