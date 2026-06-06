import { useState, useRef, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MoreVertical, Edit, Download, Trash2, Eye } from "lucide-react";
import { usersApi } from "../api/users";
import client from "../api/client";
import type { User, Evaluation, PaginatedResponse } from "../types";
import { getCampaignName } from "../types";
import { useAuth } from "../contexts/AuthContext";
import Breadcrumbs from "../components/ui/Breadcrumbs";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import { queryKeys } from "../lib/queryKeys";
import { Tile, Badge } from "../components/shell";

// ── Helpers ───────────────────────────────────────────────────────────────────
type Tone = "blue" | "green" | "amber" | "red" | "grey";

const ROLE_TONES: Record<string, Tone> = {
  admin: "red",
  hr: "amber",
  manager: "blue",
  employee: "grey",
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  hr: "RH",
  manager: "Responsable",
  employee: "Collaborateur",
};

const EVAL_STATUS_LABELS: Record<string, string> = {
  assigned: "Assignée",
  in_progress: "En cours",
  submitted: "Soumise",
  reviewed: "Révisée",
  signed_evaluatee: "Signée (évalué)",
  signed_manager: "Signée (manager)",
  signed_hr: "Signée (RH)",
  validated: "Validée",
  expired: "Expirée",
  archived: "Archivée",
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
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

// ── Component ─────────────────────────────────────────────────────────────────
export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<"profile" | "evaluations">(
    "profile",
  );
  const [actionsOpen, setActionsOpen] = useState(false);
  const [gdprDeleteModal, setGdprDeleteModal] = useState(false);

  // Close dropdown on outside click
  const dropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setActionsOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Fetch user
  const { data: userData, isLoading } = useQuery({
    queryKey: queryKeys.users.detail(id ?? ""),
    queryFn: () => usersApi.getUser(id!).then((r) => r.data.data),
    enabled: !!id,
  });

  // Fetch manager
  const { data: managerData } = useQuery({
    queryKey: ["manager", userData?.managerId],
    queryFn: () =>
      usersApi.getUser(userData!.managerId!).then((r) => r.data.data),
    enabled: !!userData?.managerId,
  });

  // Fetch direct reports
  const { data: reportsData } = useQuery({
    queryKey: ["users-reports", id],
    queryFn: () =>
      usersApi
        .getUsers({ limit: 100 })
        .then(
          (r) => r.data.data?.filter((u: User) => u.managerId === id) ?? [],
        ),
    enabled: !!id,
  });

  // Fetch evaluations
  const { data: evaluationsData } = useQuery({
    queryKey: ["evaluations-user", id],
    queryFn: () =>
      client
        .get<
          PaginatedResponse<Evaluation>
        >("/api/evaluations", { params: { evaluateeId: id, limit: 50 } })
        .then((r) => r.data),
    enabled: activeTab === "evaluations" && !!id,
  });

  // RGPD delete mutation
  const gdprDeleteMutation = useMutation({
    mutationFn: () => usersApi.gdprAnonymize(id!),
    onSuccess: () => {
      setGdprDeleteModal(false);
      toast.show("Utilisateur supprimé (RGPD).");
      navigate("/users");
    },
    onError: () => toast.show("Erreur lors de la suppression RGPD."),
  });

  const canManage = currentUser?.role === "admin" || currentUser?.role === "hr";

  if (isLoading) {
    return (
      <div className="nx-app">
        <div className="flex items-center justify-center h-64">
          <div
            className="w-8 h-8 border-2 rounded-full animate-spin"
            style={{
              borderColor: "var(--line)",
              borderTopColor: "var(--blue)",
            }}
          />
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="nx-app">
        <div className="text-center py-16">
          <p className="body">Utilisateur introuvable.</p>
          <Link
            to="/users"
            className="link small"
            style={{ marginTop: 8, display: "inline-block" }}
          >
            Retour à la liste
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="nx-app">
      {/* Breadcrumb */}
      <Breadcrumbs
        items={[
          { label: "Utilisateurs", href: "/users" },
          { label: `${userData.firstName} ${userData.lastName}` },
        ]}
      />

      {/* Profile header tile */}
      <Tile className="mb-6">
        <div
          className="row between wrap"
          style={{ gap: 16, alignItems: "flex-start" }}
        >
          <div
            className="row"
            style={{ gap: 16, alignItems: "center", minWidth: 0 }}
          >
            <div
              className="avatar"
              style={{ width: 72, height: 72, fontSize: 24 }}
            >
              {userData.firstName?.[0]}
              {userData.lastName?.[0]}
            </div>
            <div style={{ minWidth: 0 }}>
              <h1 className="h1">
                {userData.firstName} {userData.lastName}
              </h1>
              <div
                className="row wrap"
                style={{ gap: 8, marginTop: 6, alignItems: "center" }}
              >
                <Badge tone={ROLE_TONES[userData.role] ?? "grey"}>
                  {ROLE_LABELS[userData.role] ?? userData.role}
                </Badge>
                {userData.department && (
                  <span className="small">{userData.department}</span>
                )}
                {userData.position && (
                  <span className="small">· {userData.position}</span>
                )}
                {userData.authSource === "ldap" && (
                  <Badge tone="blue">LDAP</Badge>
                )}
              </div>
              <p className="small" style={{ marginTop: 6 }}>
                {userData.email}
              </p>
            </div>
          </div>

          {/* Actions menu */}
          {canManage && (
            <div className="relative" ref={dropdownRef}>
              <div className="row" style={{ gap: 8 }}>
                <Link to={`/users/${id}/edit`} className="btn btn-ghost">
                  <Edit className="ico" style={{ width: 16, height: 16 }} />{" "}
                  Modifier
                </Link>
                <button
                  onClick={() => setActionsOpen(!actionsOpen)}
                  className="btn btn-ghost btn-sm"
                  aria-label="Plus d'actions"
                >
                  <MoreVertical
                    className="ico"
                    style={{ width: 18, height: 18 }}
                  />
                </button>
              </div>
              {actionsOpen && (
                <div
                  className="absolute right-0 top-12 z-10"
                  style={{
                    background: "#fff",
                    border: "1px solid var(--line)",
                    borderRadius: "var(--radius-lg)",
                    width: 224,
                    overflow: "hidden",
                    boxShadow: "0 8px 24px rgba(0,0,0,.12)",
                  }}
                >
                  <button
                    onClick={() => {
                      usersApi
                        .gdprExport(id!)
                        .then((r) =>
                          downloadBlob(r.data as Blob, "export-rgpd.json"),
                        );
                      setActionsOpen(false);
                    }}
                    className="row w-full text-left"
                    style={{
                      gap: 8,
                      padding: "10px 16px",
                      fontSize: 14,
                      color: "var(--ink-2)",
                    }}
                  >
                    <Download
                      className="ico"
                      style={{ width: 16, height: 16 }}
                    />{" "}
                    Exporter données RGPD
                  </button>
                  {currentUser?.role === "admin" &&
                    userData.role !== "admin" &&
                    userData.isActive &&
                    userData.id !== currentUser.id && (
                      <button
                        onClick={async () => {
                          setActionsOpen(false);
                          await client.post(`/api/admin/impersonate/${id}`);
                          window.location.href = "/";
                        }}
                        className="row w-full text-left"
                        style={{
                          gap: 8,
                          padding: "10px 16px",
                          fontSize: 14,
                          color: "var(--ink-2)",
                        }}
                      >
                        <Eye
                          className="ico"
                          style={{ width: 16, height: 16 }}
                        />{" "}
                        Voir en tant que
                      </button>
                    )}
                  {currentUser?.role === "admin" &&
                    userData.role !== "admin" && (
                      <button
                        onClick={() => {
                          setGdprDeleteModal(true);
                          setActionsOpen(false);
                        }}
                        className="row w-full text-left"
                        style={{
                          gap: 8,
                          padding: "10px 16px",
                          fontSize: 14,
                          color: "var(--red)",
                          borderTop: "1px solid var(--line)",
                        }}
                      >
                        <Trash2
                          className="ico"
                          style={{ width: 16, height: 16 }}
                        />{" "}
                        Supprimer l&apos;utilisateur (RGPD)
                      </button>
                    )}
                </div>
              )}
            </div>
          )}
        </div>
      </Tile>

      {/* Tabs */}
      <div
        className="row"
        style={{
          gap: 24,
          borderBottom: "1px solid var(--line)",
          marginBottom: 24,
        }}
      >
        {(["profile", "evaluations"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="small"
            style={{
              paddingBottom: 12,
              borderBottom:
                activeTab === tab
                  ? "2px solid var(--blue)"
                  : "2px solid transparent",
              color: activeTab === tab ? "var(--blue-text)" : "var(--ink-3)",
              fontWeight: activeTab === tab ? 600 : 400,
            }}
          >
            {tab === "profile" ? "Profil" : "Évaluations"}
          </button>
        ))}
      </div>

      {/* ── Tab: Profil ─────────────────────────────────────────────────── */}
      {activeTab === "profile" && (
        <div className="grid grid-cols-12 gap-6">
          {/* Informations */}
          <div className="col-span-12 lg:col-span-6">
            <Tile style={{ height: "100%" }}>
              <h2 className="h2" style={{ marginBottom: 16 }}>
                Informations
              </h2>
              <dl>
                {[
                  ["Prénom", userData.firstName],
                  ["Nom", userData.lastName],
                  ["E-mail", userData.email],
                  ["Rôle", ROLE_LABELS[userData.role] ?? userData.role],
                  ["Département", userData.department ?? "—"],
                  ["Poste", userData.position ?? "—"],
                  ["Statut", userData.isActive ? "Actif" : "Inactif"],
                  ["Source auth.", userData.authSource],
                  [
                    "Créé le",
                    userData.createdAt
                      ? new Date(userData.createdAt).toLocaleDateString("fr-FR")
                      : "—",
                  ],
                ].map(([label, value], i) => (
                  <div
                    key={label}
                    className="row between"
                    style={{
                      padding: "12px 0",
                      borderTop: i ? "1px solid var(--line)" : "none",
                    }}
                  >
                    <dt className="small">{label}</dt>
                    <dd
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "var(--ink)",
                        textAlign: "right",
                      }}
                    >
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </Tile>
          </div>

          {/* Hiérarchie */}
          <div className="col-span-12 lg:col-span-6">
            <Tile style={{ height: "100%" }}>
              <h2 className="h2" style={{ marginBottom: 16 }}>
                Hiérarchie
              </h2>
              <div style={{ marginBottom: 20 }}>
                <p className="eyebrow" style={{ marginBottom: 8 }}>
                  Responsable direct
                </p>
                {managerData ? (
                  <Link
                    to={`/users/${managerData.id}`}
                    className="row"
                    style={{
                      gap: 12,
                      padding: 12,
                      borderRadius: "var(--radius)",
                      color: "inherit",
                      alignItems: "center",
                    }}
                  >
                    <div className="avatar">
                      {managerData.firstName?.[0]}
                      {managerData.lastName?.[0]}
                    </div>
                    <div>
                      <p
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: "var(--ink)",
                        }}
                      >
                        {managerData.firstName} {managerData.lastName}
                      </p>
                      <p className="small">
                        {ROLE_LABELS[managerData.role] ?? managerData.role}
                      </p>
                    </div>
                  </Link>
                ) : (
                  <p className="small" style={{ fontStyle: "italic" }}>
                    Aucun manager assigné
                  </p>
                )}
              </div>
              <div>
                <p className="eyebrow" style={{ marginBottom: 8 }}>
                  Subordonnés directs ({reportsData?.length ?? 0})
                </p>
                {reportsData && reportsData.length > 0 ? (
                  <ul>
                    {reportsData.map((u: User) => (
                      <li key={u.id}>
                        <Link
                          to={`/users/${u.id}`}
                          className="row small"
                          style={{
                            gap: 8,
                            padding: "8px",
                            borderRadius: "var(--radius)",
                            color: "var(--ink-2)",
                            alignItems: "center",
                          }}
                        >
                          <div
                            className="avatar"
                            style={{
                              width: 28,
                              height: 28,
                              fontSize: 12,
                              background: "var(--bg-alt-2)",
                              color: "var(--ink-2)",
                            }}
                          >
                            {u.firstName?.[0]}
                            {u.lastName?.[0]}
                          </div>
                          {u.firstName} {u.lastName}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="small" style={{ fontStyle: "italic" }}>
                    Aucun subordonné
                  </p>
                )}
              </div>
            </Tile>
          </div>
        </div>
      )}

      {/* ── Tab: Évaluations ────────────────────────────────────────────── */}
      {activeTab === "evaluations" && (
        <Tile>
          <h2 className="h2" style={{ marginBottom: 16 }}>
            Évaluations
          </h2>
          {evaluationsData?.data?.length === 0 ? (
            <p className="small" style={{ fontStyle: "italic" }}>
              Aucune évaluation.
            </p>
          ) : (
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
                      Campagne
                    </th>
                    <th
                      className="small"
                      style={{
                        textAlign: "left",
                        padding: "8px 0",
                        fontWeight: 600,
                      }}
                    >
                      Évaluateur
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
                  </tr>
                </thead>
                <tbody>
                  {evaluationsData?.data?.map((ev: Evaluation) => (
                    <tr
                      key={ev.id}
                      style={{ borderBottom: "1px solid var(--line)" }}
                    >
                      <td style={{ padding: "8px 0", color: "var(--ink)" }}>
                        {ev.campaign?.name ?? getCampaignName(ev.campaignId)}
                      </td>
                      <td style={{ padding: "8px 0", color: "var(--ink-2)" }}>
                        {ev.evaluator
                          ? `${ev.evaluator.firstName} ${ev.evaluator.lastName}`
                          : ev.evaluatorId}
                      </td>
                      <td style={{ padding: "8px 0" }}>
                        <Badge tone="grey">
                          {EVAL_STATUS_LABELS[ev.status] ?? ev.status}
                        </Badge>
                      </td>
                      <td className="small" style={{ padding: "8px 0" }}>
                        {ev.createdAt
                          ? new Date(ev.createdAt).toLocaleDateString("fr-FR")
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Tile>
      )}

      {/* ── Toast ────────────────────────────────────────────────────────── */}
      {toast.message && (
        <div
          className="fixed bottom-6 right-6 z-50"
          style={{
            background: "var(--ink)",
            color: "#fff",
            fontSize: 14,
            padding: "8px 16px",
            borderRadius: "var(--radius)",
            boxShadow: "0 8px 24px rgba(0,0,0,.2)",
          }}
        >
          {toast.message}
        </div>
      )}

      {/* ── Modal anonymisation (S-06-M2) ────────────────────────────────── */}
      {/* ── Modal suppression RGPD ───────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={gdprDeleteModal}
        onClose={() => setGdprDeleteModal(false)}
        onConfirm={() => gdprDeleteMutation.mutate()}
        title="Supprimer l'utilisateur (RGPD)"
        description="Anonymiser définitivement cet utilisateur ? Ses données personnelles seront effacées (droit à l'effacement RGPD), l'historique d'évaluations est conservé."
        confirmLabel="Supprimer définitivement"
        variant="danger"
        loading={gdprDeleteMutation.isPending}
      />
    </div>
  );
}
