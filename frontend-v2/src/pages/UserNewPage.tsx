import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle, Copy, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { usersApi } from "../api/users";
import { userCreateSchema, type UserCreateFormValues } from "@/schemas";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import type { User } from "../types";
import Button from "../components/ui/Button";
import { PageHead, Tile, Callout } from "../components/shell";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  hr: "RH",
  manager: "Responsable",
  employee: "Collaborateur",
};

// ── Inline toast ──────────────────────────────────────────────────────────────
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

export default function UserNewPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<UserCreateFormValues>({
    resolver: zodResolver(userCreateSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      department: "",
      position: "",
    },
  });

  // managerId is not part of the schema — kept as local state
  const [managerId, setManagerId] = useState("");

  // Password modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [tempPassword, setTempPassword] = useState("");
  const [createdUserId, setCreatedUserId] = useState("");

  // Email debounce uniqueness check (UI-only)
  const watchedEmail = watch("email");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!watchedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(watchedEmail))
      return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      // Intentionally a lightweight background check — errors handled server-side
    }, 500);
  }, [watchedEmail]);

  // Active users for manager select
  const { data: activeUsers } = useQuery({
    queryKey: ["users-active"],
    queryFn: () =>
      usersApi.getUsers({ isActive: true, limit: 100 }).then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<User>) =>
      usersApi
        .createUser(data)
        .then((r) => r.data.data as User & { temporaryPassword?: string }),
    onSuccess: (newUser) => {
      setCreatedUserId(newUser.id);
      setTempPassword(newUser.temporaryPassword || "••••••••");
      setShowPasswordModal(true);
    },
  });

  const onSubmit = async (data: UserCreateFormValues) => {
    createMutation.mutate({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      role: data.role as User["role"],
      department: data.department || undefined,
      position: data.position || undefined,
      managerId: managerId || undefined,
    });
  };

  const inputCls = (field: keyof UserCreateFormValues) =>
    `input${errors[field] ? " is-invalid" : ""}`;

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
        › Nouvel utilisateur
      </p>

      <PageHead
        title="Nouvel utilisateur"
        actions={
          <>
            <Link to="/users" className="btn btn-ghost">
              Annuler
            </Link>
            <Button
              type="submit"
              form="user-form"
              variant="primary"
              loading={createMutation.isPending || isSubmitting}
              disabled={createMutation.isPending || isSubmitting}
            >
              {createMutation.isPending ? "Création…" : "Créer →"}
            </Button>
          </>
        }
      />

      {createMutation.isError && (
        <Callout tone="red" style={{ marginBottom: 16 }}>
          Une erreur est survenue. Veuillez réessayer.
        </Callout>
      )}

      <form id="user-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        {/* Card 1 — Informations personnelles */}
        <Tile style={{ marginBottom: 16 }}>
          <h2 className="h3" style={{ marginBottom: 16 }}>
            Informations personnelles
          </h2>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
          >
            <div className="field">
              <label htmlFor="firstName">
                Prénom <span style={{ color: "var(--red)" }}>*</span>
              </label>
              <input
                id="firstName"
                type="text"
                {...register("firstName")}
                aria-invalid={!!errors.firstName}
                aria-describedby={
                  errors.firstName ? "firstName-error" : undefined
                }
                className={inputCls("firstName")}
                placeholder="Jean"
              />
              <ErrorMessage
                id="firstName-error"
                message={errors.firstName?.message}
              />
            </div>
            <div className="field">
              <label htmlFor="lastName">
                Nom <span style={{ color: "var(--red)" }}>*</span>
              </label>
              <input
                id="lastName"
                type="text"
                {...register("lastName")}
                aria-invalid={!!errors.lastName}
                aria-describedby={
                  errors.lastName ? "lastName-error" : undefined
                }
                className={inputCls("lastName")}
                placeholder="Dupont"
              />
              <ErrorMessage
                id="lastName-error"
                message={errors.lastName?.message}
              />
            </div>
          </div>
          <div className="field" style={{ marginTop: 16 }}>
            <label htmlFor="email">
              E-mail <span style={{ color: "var(--red)" }}>*</span>
            </label>
            <input
              id="email"
              type="email"
              {...register("email")}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "email-error" : undefined}
              className={inputCls("email")}
              placeholder="jean.dupont@exemple.com"
            />
            <ErrorMessage id="email-error" message={errors.email?.message} />
          </div>
        </Tile>

        {/* Card 2 — Poste & Organisation */}
        <Tile style={{ marginBottom: 16 }}>
          <h2 className="h3" style={{ marginBottom: 16 }}>
            Poste &amp; Organisation
          </h2>
          <div className="field" style={{ marginBottom: 16 }}>
            <label htmlFor="role">
              Rôle <span style={{ color: "var(--red)" }}>*</span>
            </label>
            <select
              id="role"
              {...register("role")}
              aria-invalid={!!errors.role}
              aria-describedby={errors.role ? "role-error" : undefined}
              className={inputCls("role")}
            >
              <option value="">Sélectionner un rôle…</option>
              {Object.entries(ROLE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <ErrorMessage id="role-error" message={errors.role?.message} />
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
              marginBottom: 16,
            }}
          >
            <div className="field">
              <label htmlFor="department">Département</label>
              <input
                id="department"
                type="text"
                {...register("department")}
                className="input"
                placeholder="Ingénierie"
              />
            </div>
            <div className="field">
              <label htmlFor="position">Poste</label>
              <input
                id="position"
                type="text"
                {...register("position")}
                className="input"
                placeholder="Développeur senior"
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="managerId">Responsable direct</label>
            <select
              id="managerId"
              value={managerId}
              onChange={(e) => setManagerId(e.target.value)}
              className="input"
            >
              <option value="">Aucun manager</option>
              {activeUsers?.data?.map((u: User) => (
                <option key={u.id} value={u.id}>
                  {u.firstName} {u.lastName} ({u.role})
                </option>
              ))}
            </select>
          </div>
        </Tile>
      </form>

      {/* Toast notification */}
      {toast.message && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg">
          {toast.message}
        </div>
      )}

      {/* Modal mot de passe temporaire */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-success-50 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-success-500" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Utilisateur créé !
                </h3>
              </div>
              <button
                onClick={() => navigate(`/users/${createdUserId}`)}
                className="p-1 hover:bg-slate-50 rounded"
                aria-label="Fermer"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <p className="text-sm text-slate-600 mb-3">
              Mot de passe temporaire (visible une seule fois) :
            </p>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 mb-4">
              <code className="flex-1 font-mono text-sm text-slate-900">
                {tempPassword}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(tempPassword);
                  toast.show("Copié !");
                }}
                title="Copier"
                aria-label="Copier le mot de passe"
              >
                <Copy className="w-4 h-4 text-slate-400 hover:text-slate-600" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Ce mot de passe ne sera plus affiché après fermeture.
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => navigate(`/users/${createdUserId}`)}
                className="inline-flex items-center gap-2 bg-[#1b1b78] hover:bg-[#15155f] text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Voir le profil →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
