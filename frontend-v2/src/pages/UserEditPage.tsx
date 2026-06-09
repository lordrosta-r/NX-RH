import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usersApi } from "../api/users";
import type { User, PaginatedEnvelope } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { PageHead, Tile, Callout } from "../components/shell";
import { queryKeys } from "../lib/queryKeys";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  hr: "RH",
  manager: "Responsable",
  employee: "Collaborateur",
};

const ACTIVE_PAGE_LIMIT = 100;

// Récupère TOUS les utilisateurs actifs en parcourant toutes les pages.
// Indispensable pour détecter de façon fiable les subordonnés (managerId)
// quand l'effectif dépasse une page : le backend plafonne `limit` à 100 et
// n'expose pas de filtre `managerId` pour un admin/hr.
async function fetchAllActiveUsers(): Promise<User[]> {
  const first = await usersApi
    .getUsers({ isActive: true, page: 1, limit: ACTIVE_PAGE_LIMIT })
    .then((r) => r.data as unknown as PaginatedEnvelope<User>);
  const all = [...first.data];
  const totalPages = first.meta?.pages ?? 1;
  for (let page = 2; page <= totalPages; page++) {
    const next = await usersApi
      .getUsers({ isActive: true, page, limit: ACTIVE_PAGE_LIMIT })
      .then((r) => r.data as unknown as PaginatedEnvelope<User>);
    all.push(...next.data);
  }
  return all;
}

function useToast() {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = (msg: string) => {
    setMessage(msg);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(null), 2500);
  };
  return { message, show };
}

export default function UserEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const toast = useToast();

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [department, setDepartment] = useState("");
  const [position, setPosition] = useState("");
  const [managerId, setManagerId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [canViewSubtree, setCanViewSubtree] = useState(false);
  const [authSource, setAuthSource] = useState<"local" | "ldap">("local");
  const [replacementManagerId, setReplacementManagerId] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch current user data
  const { data: userData, isLoading } = useQuery({
    queryKey: queryKeys.users.detail(id ?? ""),
    queryFn: () => usersApi.getUser(id!).then((r) => r.data.data),
    enabled: !!id,
  });

  // Prefill form when data arrives
  useEffect(() => {
    if (userData) {
      // Synchro one-shot de la donnée serveur vers l'état éditable du formulaire.
      /* eslint-disable react-hooks/set-state-in-effect */
      setFirstName(userData.firstName);
      setLastName(userData.lastName);
      setEmail(userData.email);
      setRole(userData.role);
      setDepartment(userData.department || "");
      setPosition(userData.position || "");
      setManagerId(userData.managerId || "");
      setIsActive(userData.isActive);
      setCanViewSubtree(userData.canViewSubtree ?? false);
      setAuthSource(userData.authSource);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [userData]);

  // Tous les utilisateurs actifs (sélecteurs manager/remplaçant + détection
  // d'équipe). On pagine côté front car l'API plafonne `limit` à 100 et ne
  // filtre pas par `managerId` pour un admin/hr : se limiter à une fenêtre
  // arbitraire de 100 manquerait des subordonnés au-delà (équipe orpheline).
  const { data: activeUsersList } = useQuery({
    queryKey: ["users-active-all"],
    queryFn: () => fetchAllActiveUsers(),
  });
  const activeUsers = { data: activeUsersList ?? [] };

  const isSelf = currentUser?.id === id;
  const canEditAll =
    currentUser?.role === "admin" || currentUser?.role === "hr";
  const isAdmin = currentUser?.role === "admin";

  // Subordonnés rattachés à l'utilisateur édité
  const subordinates =
    activeUsers?.data?.filter((u: User) => u.managerId === id) ?? [];
  // Un remplaçant est requis si on retire le rôle manager à qqn qui a une équipe
  const needsReplacement =
    canEditAll &&
    userData?.role === "manager" &&
    role !== "manager" &&
    subordinates.length > 0;

  function isDisabled(field: string): boolean {
    if (canEditAll) return false;
    if (isSelf && (field === "firstName" || field === "lastName")) return false;
    return true;
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!firstName.trim()) e.firstName = "Le prénom est requis";
    if (!lastName.trim()) e.lastName = "Le nom est requis";
    if (!email.trim()) e.email = "L'email est requis";
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      e.email = "Email invalide";
    if (!role) e.role = "Le rôle est requis";
    if (needsReplacement && !replacementManagerId)
      e.replacementManagerId = "Un remplaçant pour l'équipe est requis";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  const updateMutation = useMutation({
    mutationFn: (data: Partial<User>) =>
      usersApi.updateUser(id!, data).then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.users.detail(id ?? ""),
      });
      toast.show("Modifications enregistrées.");
      setTimeout(() => navigate(`/users/${id}`), 800);
    },
    onError: (err: unknown) => {
      const status =
        typeof err === "object" && err !== null && "response" in err
          ? (err as { response?: { status?: number } }).response?.status
          : undefined;
      if (status === 400 && needsReplacement) {
        setErrors({
          replacementManagerId:
            "Un remplaçant pour l'équipe est requis pour retirer le rôle Responsable.",
        });
      } else {
        setErrors({ submit: "Une erreur est survenue. Veuillez réessayer." });
      }
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    const payload: Partial<User> = { firstName, lastName };
    if (canEditAll) {
      Object.assign(payload, {
        email,
        role: role as User["role"],
        department: department || undefined,
        position: position || undefined,
        managerId: managerId || undefined,
      });
      if (role === "manager") {
        Object.assign(payload, { canViewSubtree });
      }
      if (needsReplacement) {
        Object.assign(payload, { replacementManagerId });
      }
    }
    if (isAdmin) {
      Object.assign(payload, { isActive, authSource });
    }
    updateMutation.mutate(payload);
  }

  const inputCls = (field: string) =>
    `input${errors[field] ? " is-invalid" : ""}`;

  if (isLoading) {
    return (
      <div className="nx-app">
        <div className="row" style={{ justifyContent: "center", padding: 96 }}>
          <div className="w-8 h-8 border-4 border-[#1b1b78] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="nx-app">
      <p className="eyebrow" style={{ marginBottom: 12 }}>
        <Link to="/" className="link">
          Accueil
        </Link>{" "}
        ›{" "}
        <Link to="/users" className="link">
          Collaborateurs
        </Link>{" "}
        ›{" "}
        <Link to={`/users/${id}`} className="link">
          {userData?.firstName} {userData?.lastName}
        </Link>{" "}
        › Modifier
      </p>

      <PageHead
        title={`Modifier — ${userData?.firstName ?? ""} ${userData?.lastName ?? ""}`}
        actions={
          <>
            <Link to={`/users/${id}`} className="btn btn-ghost">
              Voir le profil
            </Link>
            <button
              type="submit"
              form="edit-form"
              className="btn btn-primary"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Enregistrement…" : "Enregistrer →"}
            </button>
          </>
        }
      />

      {errors.submit && (
        <Callout tone="red" style={{ marginBottom: 16 }}>
          {errors.submit}
        </Callout>
      )}

      {isSelf && !canEditAll && (
        <Callout tone="amber" style={{ marginBottom: 16 }}>
          Vous pouvez uniquement modifier votre prénom et votre nom.
        </Callout>
      )}

      <form id="edit-form" onSubmit={handleSubmit} noValidate>
        {/* Card 1 — Informations personnelles */}
        <Tile style={{ marginBottom: 16 }}>
          <h2 className="h2" style={{ marginBottom: 16 }}>
            Informations personnelles
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 16,
            }}
          >
            <div className="field">
              <label htmlFor="firstName">
                Prénom <span style={{ color: "var(--red)" }}>*</span>
              </label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={isDisabled("firstName")}
                className={inputCls("firstName")}
              />
              {errors.firstName && (
                <p className="field-error">{errors.firstName}</p>
              )}
            </div>
            <div className="field">
              <label htmlFor="lastName">
                Nom <span style={{ color: "var(--red)" }}>*</span>
              </label>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={isDisabled("lastName")}
                className={inputCls("lastName")}
              />
              {errors.lastName && (
                <p className="field-error">{errors.lastName}</p>
              )}
            </div>
          </div>
          <div className="field" style={{ marginTop: 16 }}>
            <label htmlFor="email">
              E-mail <span style={{ color: "var(--red)" }}>*</span>
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isDisabled("email")}
              className={inputCls("email")}
            />
            {errors.email && <p className="field-error">{errors.email}</p>}
          </div>
        </Tile>

        {/* Card 2 — Poste & Organisation */}
        <Tile style={{ marginBottom: 16 }}>
          <h2 className="h2" style={{ marginBottom: 16 }}>
            Poste &amp; Organisation
          </h2>
          <div className="field" style={{ marginBottom: 16 }}>
            <label htmlFor="role">
              Rôle <span style={{ color: "var(--red)" }}>*</span>
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={isDisabled("role")}
              className={inputCls("role")}
            >
              <option value="">Sélectionner un rôle…</option>
              {Object.entries(ROLE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            {errors.role && <p className="field-error">{errors.role}</p>}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 16,
              marginBottom: 16,
            }}
          >
            <div className="field">
              <label htmlFor="department">Département</label>
              <input
                id="department"
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                disabled={isDisabled("department")}
                className={inputCls("department")}
              />
            </div>
            <div className="field">
              <label htmlFor="position">Poste</label>
              <input
                id="position"
                type="text"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                disabled={isDisabled("position")}
                className={inputCls("position")}
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="managerId">Responsable direct</label>
            <select
              id="managerId"
              value={managerId}
              onChange={(e) => setManagerId(e.target.value)}
              disabled={isDisabled("managerId")}
              className={inputCls("managerId")}
            >
              <option value="">Aucun manager</option>
              {activeUsers?.data
                ?.filter((u: User) => u.id !== id)
                .map((u: User) => (
                  <option key={u.id} value={u.id}>
                    {u.firstName} {u.lastName} ({u.role})
                  </option>
                ))}
            </select>
          </div>

          {/* Remplaçant — requis quand on retire le rôle manager à qqn qui a une équipe */}
          {needsReplacement && (
            <div className="field" style={{ marginTop: 16 }}>
              <label htmlFor="replacementManagerId">
                Remplaçant pour l&apos;équipe ({subordinates.length}{" "}
                collaborateur{subordinates.length > 1 ? "·s" : ""}){" "}
                <span style={{ color: "var(--red)" }}>*</span>
              </label>
              <select
                id="replacementManagerId"
                value={replacementManagerId}
                onChange={(e) => setReplacementManagerId(e.target.value)}
                className={inputCls("replacementManagerId")}
              >
                <option value="">Sélectionner un remplaçant…</option>
                {activeUsers?.data
                  ?.filter((u: User) => u.role === "manager" && u.id !== id)
                  .map((u: User) => (
                    <option key={u.id} value={u.id}>
                      {u.firstName} {u.lastName}
                    </option>
                  ))}
              </select>
              {errors.replacementManagerId && (
                <p className="field-error">{errors.replacementManagerId}</p>
              )}
            </div>
          )}

          {/* Visibilité hiérarchique — managers uniquement, réglable par hr/admin */}
          {canEditAll && role === "manager" && (
            <div
              className="row between"
              style={{
                gap: 16,
                padding: "12px 0",
                marginTop: 16,
                borderTop: "1px solid var(--line)",
              }}
            >
              <div>
                <p className="body" style={{ fontWeight: 600 }}>
                  Voir toute la descendance
                </p>
                <p className="small">
                  Accès aux sous-équipes hiérarchiques, pas seulement aux
                  subordonnés directs
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCanViewSubtree(!canViewSubtree)}
                aria-pressed={canViewSubtree}
                aria-label="Voir toute la descendance"
                style={{
                  position: "relative",
                  display: "inline-flex",
                  alignItems: "center",
                  height: 24,
                  width: 44,
                  flexShrink: 0,
                  borderRadius: 9999,
                  border: "none",
                  cursor: "pointer",
                  transition: "background 0.12s",
                  background: canViewSubtree ? "var(--blue)" : "var(--line)",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    height: 16,
                    width: 16,
                    borderRadius: 9999,
                    background: "#fff",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                    transition: "transform 0.12s",
                    transform: canViewSubtree
                      ? "translateX(24px)"
                      : "translateX(4px)",
                  }}
                />
              </button>
            </div>
          )}
        </Tile>

        {/* Card 3 — Sécurité (admin only) */}
        {isAdmin && (
          <Tile style={{ marginBottom: 16 }}>
            <h2 className="h2" style={{ marginBottom: 16 }}>
              Sécurité
            </h2>
            <div
              className="row between"
              style={{
                gap: 16,
                padding: "12px 0",
                borderBottom: "1px solid var(--line)",
              }}
            >
              <div>
                <p className="body" style={{ fontWeight: 600 }}>
                  Compte actif
                </p>
                <p className="small">L&apos;utilisateur peut se connecter</p>
              </div>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                aria-pressed={isActive}
                aria-label="Compte actif"
                style={{
                  position: "relative",
                  display: "inline-flex",
                  alignItems: "center",
                  height: 24,
                  width: 44,
                  flexShrink: 0,
                  borderRadius: 9999,
                  border: "none",
                  cursor: "pointer",
                  transition: "background 0.12s",
                  background: isActive ? "var(--blue)" : "var(--line)",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    height: 16,
                    width: 16,
                    borderRadius: 9999,
                    background: "#fff",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                    transition: "transform 0.12s",
                    transform: isActive
                      ? "translateX(24px)"
                      : "translateX(4px)",
                  }}
                />
              </button>
            </div>
            <div className="field" style={{ marginTop: 16 }}>
              <label htmlFor="authSource">Source d&apos;authentification</label>
              <select
                id="authSource"
                value={authSource}
                onChange={(e) =>
                  setAuthSource(e.target.value as "local" | "ldap")
                }
                className="input"
              >
                <option value="local">Local</option>
                <option value="ldap">LDAP</option>
              </select>
            </div>
          </Tile>
        )}
      </form>

      {/* Toast */}
      {toast.message && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 50,
            background: "var(--ink)",
            color: "#fff",
            fontSize: 14,
            padding: "8px 16px",
            borderRadius: "var(--radius)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
          }}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
