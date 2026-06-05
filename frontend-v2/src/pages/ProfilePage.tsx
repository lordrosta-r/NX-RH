import { useState, useRef } from "react";
import type { ChangeEvent, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import {
  Camera,
  User as UserIcon,
  Settings,
  Database,
  FileText,
  Edit2,
  Building,
  Briefcase,
  ChevronDown,
  Download,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { usersApi } from "../api/users";
import { formsApi } from "../api/forms";
import { evaluationsApi } from "../api/evaluations";
import type { User, Form, Evaluation } from "../types";
import { queryKeys } from "../lib/queryKeys";
import { Tile, Badge } from "../components/shell";

type TabId = "info" | "avatar" | "prefs" | "data" | "requests";
type Tone = "blue" | "green" | "amber" | "red" | "grey";

function Avatar({
  src,
  initials,
  size = 96,
  style,
}: {
  src?: string;
  initials: string;
  size?: number;
  style?: React.CSSProperties;
}) {
  return src ? (
    <img
      src={src}
      alt="avatar"
      className="avatar"
      style={{ width: size, height: size, objectFit: "cover", ...style }}
    />
  ) : (
    <div
      className="avatar"
      style={{ width: size, height: size, fontSize: size * 0.35, ...style }}
    >
      {initials}
    </div>
  );
}

const EVAL_STATUS_TONES: Record<string, Tone> = {
  assigned: "blue",
  in_progress: "amber",
  submitted: "blue",
  validated: "green",
  expired: "grey",
};

const EVAL_STATUS_LABELS: Record<string, string> = {
  assigned: "Assignée",
  in_progress: "En cours",
  submitted: "Soumise",
  validated: "Validée",
  expired: "Expirée",
};

function EvalStatusBadge({ status }: { status: string }) {
  return (
    <Badge tone={EVAL_STATUS_TONES[status] ?? "grey"}>
      {EVAL_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

const ROLE_TONES: Record<string, Tone> = {
  admin: "red",
  hr: "amber",
  manager: "blue",
  employee: "grey",
};

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabId>("info");
  const [editMode, setEditMode] = useState(false);

  // ── Onglet Info ───────────────────────────────────────────────────────────
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");

  const saveInfoMutation = useMutation({
    mutationFn: () => usersApi.updateUser(user!.id, { firstName, lastName }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.me.all });
      await refreshUser();
      setEditMode(false);
    },
  });

  // ── Onglet Avatar ─────────────────────────────────────────────────────────
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [avatarError, setAvatarError] = useState<string>("");
  const [avatarBase64, setAvatarBase64] = useState<string>("");

  const avatarMutation = useMutation({
    mutationFn: (base64: string) => usersApi.updateAvatar(user!.id, base64),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.me.all });
      await refreshUser();
      setAvatarPreview("");
      setAvatarBase64("");
    },
  });

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarError("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setAvatarError("Format non supporté. Utilisez JPEG, PNG ou WebP.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError("Fichier trop volumineux (max 2 Mo).");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setAvatarPreview(result);
      setAvatarBase64(result);
    };
    reader.readAsDataURL(file);
  }

  // ── Manager (lecture seule) ───────────────────────────────────────────────
  const { data: managerData } = useQuery({
    queryKey: ["manager", user?.managerId],
    queryFn: () => usersApi.getUser(user!.managerId!).then((r) => r.data.data),
    enabled: !!user?.managerId,
  });

  // ── Onglet Mes demandes ───────────────────────────────────────────────────
  const [requestDropdownOpen, setRequestDropdownOpen] = useState(false);

  const requestTypes = [
    { label: "Demande de mobilité", formType: "mobility_request" },
    { label: "Demande d'augmentation", formType: "salary_raise_request" },
    { label: "Demande de promotion", formType: "promotion_request" },
    { label: "Demande de formation", formType: "training_request" },
  ];

  const REQUEST_FORM_TYPES =
    "mobility_request,salary_raise_request,promotion_request,training_request";

  const { data: myEvals } = useQuery({
    queryKey: ["my-requests"],
    queryFn: () =>
      evaluationsApi
        .getEvaluations({
          evaluateeId: user?.id,
          formType: REQUEST_FORM_TYPES,
          limit: 20,
        })
        .then((r) => r.data),
    enabled: tab === "requests" && !!user,
  });

  // ── GDPR export ───────────────────────────────────────────────────────────
  const gdprMutation = useMutation({
    mutationFn: () => usersApi.exportGdpr(user!.id),
    onSuccess: (res) => {
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gdpr-export-${user!.id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    },
  });

  async function handleRequestType(formType: string) {
    setRequestDropdownOpen(false);
    try {
      const { data } = await formsApi.getForms({
        formType: formType,
        limit: 1,
      });
      const form = (data as unknown as { data: Form[] }).data?.[0];
      if (form) {
        navigate(`/evaluations/new?formId=${form.id}`);
      } else {
        alert("Aucun formulaire disponible pour ce type de demande.");
      }
    } catch {
      alert("Erreur lors de la recherche du formulaire.");
    }
  }

  if (!user) return null;

  const initials =
    `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase();
  const avatarSrc = (user as User & { avatarUrl?: string }).avatarUrl;

  const tabs: { id: TabId; label: string; icon: ReactNode }[] = [
    {
      id: "info",
      label: "Informations",
      icon: <UserIcon className="ico" style={{ width: 16, height: 16 }} />,
    },
    {
      id: "avatar",
      label: "Avatar",
      icon: <Camera className="ico" style={{ width: 16, height: 16 }} />,
    },
    {
      id: "prefs",
      label: "Préférences",
      icon: <Settings className="ico" style={{ width: 16, height: 16 }} />,
    },
    {
      id: "data",
      label: "Mes données",
      icon: <Database className="ico" style={{ width: 16, height: 16 }} />,
    },
    {
      id: "requests",
      label: "Mes demandes",
      icon: <FileText className="ico" style={{ width: 16, height: 16 }} />,
    },
  ];

  const roleLabels: Record<string, string> = {
    admin: "Administrateur",
    hr: "RH",
    manager: "Responsable",
    employee: "Collaborateur",
  };

  return (
    <div className="nx-app">
      {/* Header profil */}
      <Tile className="mb-6">
        <div
          className="row between wrap"
          style={{ gap: 16, alignItems: "flex-start" }}
        >
          <div
            className="row"
            style={{ gap: 16, alignItems: "center", minWidth: 0 }}
          >
            <div className="relative group" style={{ flex: "none" }}>
              <Avatar src={avatarSrc} initials={initials} size={96} />
              <button
                onClick={() => {
                  setTab("avatar");
                }}
                aria-label="Modifier l'avatar"
                className="absolute inset-0 flex items-center justify-center"
                style={{
                  borderRadius: "50%",
                  background: "rgba(0,0,0,.4)",
                  opacity: 0,
                  transition: "opacity .15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = "1";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = "0";
                }}
              >
                <span
                  className="row"
                  style={{
                    gap: 4,
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 500,
                  }}
                >
                  <Edit2 className="ico" style={{ width: 12, height: 12 }} />{" "}
                  Modifier
                </span>
              </button>
            </div>
            <div style={{ minWidth: 0 }}>
              <h1 className="h1">
                {user.firstName} {user.lastName}
              </h1>
              <div
                className="row wrap"
                style={{ gap: 8, marginTop: 6, alignItems: "center" }}
              >
                <Badge tone={ROLE_TONES[user.role] ?? "grey"}>
                  {roleLabels[user.role] ?? user.role}
                </Badge>
                {user.department && (
                  <span
                    className="small row"
                    style={{ gap: 4, alignItems: "center" }}
                  >
                    <Building
                      className="ico"
                      style={{ width: 14, height: 14 }}
                    />{" "}
                    {user.department}
                  </span>
                )}
                {user.position && (
                  <span
                    className="small row"
                    style={{ gap: 4, alignItems: "center" }}
                  >
                    <Briefcase
                      className="ico"
                      style={{ width: 14, height: 14 }}
                    />{" "}
                    {user.position}
                  </span>
                )}
                {user.authSource === "ldap" ? (
                  <Badge tone="blue">LDAP</Badge>
                ) : (
                  <Badge tone="grey">Local</Badge>
                )}
              </div>
              <p className="small" style={{ marginTop: 6 }}>
                {user.email}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setTab("info");
              setEditMode(true);
            }}
            className="btn btn-primary"
          >
            <Edit2 className="ico" style={{ width: 16, height: 16 }} /> Modifier
          </button>
        </div>
      </Tile>

      {/* Tabs */}
      <div
        className="row wrap"
        style={{
          gap: 24,
          borderBottom: "1px solid var(--line)",
          marginBottom: 24,
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="small row"
            style={{
              gap: 8,
              alignItems: "center",
              paddingBottom: 12,
              whiteSpace: "nowrap",
              borderBottom:
                tab === t.id
                  ? "2px solid var(--blue)"
                  : "2px solid transparent",
              color: tab === t.id ? "var(--blue-text)" : "var(--ink-3)",
              fontWeight: tab === t.id ? 600 : 400,
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── Onglet Informations ─────────────────────────────── */}
      {tab === "info" && (
        <Tile>
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 md:col-span-6">
              <label
                htmlFor="profile-firstname"
                className="eyebrow"
                style={{ display: "block", marginBottom: 8 }}
              >
                Prénom
              </label>
              {editMode ? (
                <input
                  id="profile-firstname"
                  className="input"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              ) : (
                <p
                  className="body"
                  style={{
                    padding: "8px 12px",
                    background: "var(--bg-alt)",
                    borderRadius: "var(--radius)",
                    color: "var(--ink)",
                  }}
                >
                  {user.firstName}
                </p>
              )}
            </div>
            <div className="col-span-12 md:col-span-6">
              <label
                htmlFor="profile-lastname"
                className="eyebrow"
                style={{ display: "block", marginBottom: 8 }}
              >
                Nom
              </label>
              {editMode ? (
                <input
                  id="profile-lastname"
                  className="input"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              ) : (
                <p
                  className="body"
                  style={{
                    padding: "8px 12px",
                    background: "var(--bg-alt)",
                    borderRadius: "var(--radius)",
                    color: "var(--ink)",
                  }}
                >
                  {user.lastName}
                </p>
              )}
            </div>
            <div className="col-span-12">
              <p className="eyebrow" style={{ marginBottom: 8 }}>
                Email
              </p>
              <p
                className="body"
                style={{
                  padding: "8px 12px",
                  background: "var(--bg-alt)",
                  borderRadius: "var(--radius)",
                  color: "var(--ink-2)",
                }}
              >
                {user.email}
              </p>
            </div>
            <div className="col-span-12 md:col-span-6">
              <p className="eyebrow" style={{ marginBottom: 8 }}>
                Rôle
              </p>
              <p
                className="body"
                style={{
                  padding: "8px 12px",
                  background: "var(--bg-alt)",
                  borderRadius: "var(--radius)",
                  color: "var(--ink-2)",
                }}
              >
                {roleLabels[user.role] ?? user.role}
              </p>
            </div>
            <div className="col-span-12 md:col-span-6">
              <p className="eyebrow" style={{ marginBottom: 8 }}>
                Département
              </p>
              <p
                className="body"
                style={{
                  padding: "8px 12px",
                  background: "var(--bg-alt)",
                  borderRadius: "var(--radius)",
                  color: "var(--ink-2)",
                }}
              >
                {user.department ?? "—"}
              </p>
            </div>
            <div className="col-span-12 md:col-span-6">
              <p className="eyebrow" style={{ marginBottom: 8 }}>
                Poste
              </p>
              <p
                className="body"
                style={{
                  padding: "8px 12px",
                  background: "var(--bg-alt)",
                  borderRadius: "var(--radius)",
                  color: "var(--ink-2)",
                }}
              >
                {user.position ?? "—"}
              </p>
            </div>
            <div className="col-span-12 md:col-span-6">
              <p className="eyebrow" style={{ marginBottom: 8 }}>
                Responsable
              </p>
              <p
                className="body"
                style={{
                  padding: "8px 12px",
                  background: "var(--bg-alt)",
                  borderRadius: "var(--radius)",
                  color: "var(--ink-2)",
                }}
              >
                {managerData
                  ? `${managerData.firstName} ${managerData.lastName}`
                  : "—"}
              </p>
            </div>
          </div>
          {editMode && (
            <div className="row" style={{ gap: 12, marginTop: 20 }}>
              <button
                onClick={() => saveInfoMutation.mutate()}
                disabled={saveInfoMutation.isPending}
                className="btn btn-primary"
              >
                {saveInfoMutation.isPending ? "Sauvegarde…" : "Sauvegarder"}
              </button>
              <button
                onClick={() => {
                  setEditMode(false);
                  setFirstName(user.firstName);
                  setLastName(user.lastName);
                }}
                className="btn btn-ghost"
              >
                Annuler
              </button>
            </div>
          )}
        </Tile>
      )}

      {/* ── Onglet Avatar ───────────────────────────────────── */}
      {tab === "avatar" && (
        <Tile>
          <div
            className="grid grid-cols-12 gap-6"
            style={{ alignItems: "center" }}
          >
            <div
              className="col-span-12 md:col-span-4"
              style={{ display: "flex", justifyContent: "center" }}
            >
              <Avatar
                src={avatarPreview || avatarSrc}
                initials={initials}
                size={120}
              />
            </div>
            <div className="col-span-12 md:col-span-8">
              {avatarError && (
                <p
                  className="small"
                  style={{ color: "var(--red)", marginBottom: 12 }}
                >
                  {avatarError}
                </p>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileChange}
                aria-label="Choisir une image d'avatar"
              />
              <div className="row wrap" style={{ gap: 12 }}>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="btn btn-ghost"
                >
                  Choisir une image
                </button>
                {avatarBase64 && (
                  <button
                    onClick={() => avatarMutation.mutate(avatarBase64)}
                    disabled={avatarMutation.isPending}
                    className="btn btn-primary"
                  >
                    {avatarMutation.isPending ? "Envoi…" : "Enregistrer"}
                  </button>
                )}
                {(avatarSrc || avatarPreview) && (
                  <button
                    onClick={() => avatarMutation.mutate("")}
                    disabled={avatarMutation.isPending}
                    className="btn btn-ghost"
                    style={{ color: "var(--red)", borderColor: "var(--red)" }}
                  >
                    Supprimer l&apos;avatar
                  </button>
                )}
              </div>
            </div>
          </div>
        </Tile>
      )}

      {/* ── Onglet Préférences ──────────────────────────────── */}
      {tab === "prefs" && (
        <Tile>
          <p className="body" style={{ marginBottom: 16 }}>
            Gérez vos préférences de langue, thème et notifications.
          </p>
          <Link to="/profile/preferences" className="btn btn-primary">
            Gérer mes préférences{" "}
            <ChevronRight className="ico" style={{ width: 16, height: 16 }} />
          </Link>
        </Tile>
      )}

      {/* ── Onglet Mes données ──────────────────────────────── */}
      {tab === "data" && (
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 md:col-span-6">
            <Tile style={{ height: "100%" }}>
              <h3 className="h3" style={{ marginBottom: 16 }}>
                Accès rapide
              </h3>
              <div className="row wrap" style={{ gap: 12 }}>
                <Link to="/evaluations" className="btn btn-ghost">
                  Mes évaluations{" "}
                  <ChevronRight
                    className="ico"
                    style={{ width: 16, height: 16 }}
                  />
                </Link>
                <Link to="/evaluations/history" className="btn btn-ghost">
                  Historique{" "}
                  <ChevronRight
                    className="ico"
                    style={{ width: 16, height: 16 }}
                  />
                </Link>
              </div>
            </Tile>
          </div>
          <div className="col-span-12 md:col-span-6">
            <Tile style={{ height: "100%" }}>
              <h3 className="h3" style={{ marginBottom: 16 }}>
                RGPD
              </h3>
              <button
                onClick={() => gdprMutation.mutate()}
                disabled={gdprMutation.isPending}
                className="btn btn-ghost"
              >
                <Download className="ico" style={{ width: 16, height: 16 }} />
                {gdprMutation.isPending
                  ? "Export en cours…"
                  : "Exporter mes données RGPD"}
              </button>
            </Tile>
          </div>
        </div>
      )}

      {/* ── Onglet Mes demandes ─────────────────────────────── */}
      {tab === "requests" && (
        <Tile>
          <div className="relative inline-block" style={{ marginBottom: 20 }}>
            <button
              onClick={() => setRequestDropdownOpen(!requestDropdownOpen)}
              className="btn btn-primary"
            >
              + Déposer une demande{" "}
              <ChevronDown className="ico" style={{ width: 16, height: 16 }} />
            </button>
            {requestDropdownOpen && (
              <div
                className="absolute z-10"
                style={{
                  top: "100%",
                  left: 0,
                  marginTop: 4,
                  width: 224,
                  background: "#fff",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius-lg)",
                  overflow: "hidden",
                  boxShadow: "0 8px 24px rgba(0,0,0,.12)",
                }}
              >
                {requestTypes.map((rt) => (
                  <button
                    key={rt.formType}
                    onClick={() => handleRequestType(rt.formType)}
                    className="w-full text-left"
                    style={{
                      padding: "10px 16px",
                      fontSize: 14,
                      color: "var(--ink-2)",
                    }}
                  >
                    {rt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full" style={{ fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--line)" }}>
                  <th
                    className="small"
                    style={{
                      textAlign: "left",
                      padding: "8px 0",
                      fontWeight: 600,
                    }}
                  >
                    Type
                  </th>
                  <th
                    className="small"
                    style={{
                      textAlign: "left",
                      padding: "8px 0",
                      fontWeight: 600,
                    }}
                  >
                    Date
                  </th>
                  <th
                    className="small"
                    style={{
                      textAlign: "left",
                      padding: "8px 0",
                      fontWeight: 600,
                    }}
                  >
                    Statut
                  </th>
                  <th style={{ padding: "8px 0" }} />
                </tr>
              </thead>
              <tbody>
                {myEvals?.data?.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="small"
                      style={{
                        textAlign: "center",
                        padding: "32px 0",
                        fontStyle: "italic",
                      }}
                    >
                      Aucune demande pour l&apos;instant.
                    </td>
                  </tr>
                )}
                {(myEvals?.data as Evaluation[] | undefined)?.map((ev) => (
                  <tr
                    key={ev.id}
                    style={{ borderBottom: "1px solid var(--line)" }}
                  >
                    <td style={{ padding: "8px 0", color: "var(--ink)" }}>
                      {ev.form?.title ?? ev.formId}
                    </td>
                    <td className="small" style={{ padding: "8px 0" }}>
                      {ev.createdAt
                        ? new Date(ev.createdAt).toLocaleDateString("fr-FR")
                        : "—"}
                    </td>
                    <td style={{ padding: "8px 0" }}>
                      <EvalStatusBadge status={ev.status} />
                    </td>
                    <td style={{ padding: "8px 0", textAlign: "right" }}>
                      <Link to={`/evaluations/${ev.id}`} className="link small">
                        Voir →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Tile>
      )}
    </div>
  );
}
