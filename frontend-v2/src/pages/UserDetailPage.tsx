import { useState, useRef, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MoreVertical,
  Edit,
  LogOut,
  Download,
  Trash2,
  CheckSquare,
  Square,
  AlertTriangle,
  Eye,
} from "lucide-react";
import { usersApi } from "../api/users";
import client from "../api/client";
import type { User, Evaluation, PaginatedResponse } from "../types";
import { getCampaignName } from "../types";
import { useAuth } from "../contexts/AuthContext";
import Breadcrumbs from "../components/ui/Breadcrumbs";
import { queryKeys } from "../lib/queryKeys";
import { Tile, Badge, Callout, Bar } from "../components/shell";

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

// ── Onboarding steps ──────────────────────────────────────────────────────────
const ONBOARDING_STEPS = [
  "Compte créé et accès configuré",
  "Présentation à l'équipe",
  "Formation sur les outils internes",
  "Signature du contrat et documents RH",
  "Entretien d'intégration (J+30)",
];

// ── Component ─────────────────────────────────────────────────────────────────
export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<
    "profile" | "evaluations" | "onboarding"
  >("profile");
  const [actionsOpen, setActionsOpen] = useState(false);
  const [offboardModal, setOffboardModal] = useState(false);
  const [anonymizeModal, setAnonymizeModal] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [checkedSteps, setCheckedSteps] = useState<boolean[]>(
    ONBOARDING_STEPS.map(() => false),
  );

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

  // Offboard mutation
  const offboardMutation = useMutation({
    mutationFn: () => usersApi.offboard(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.users.detail(id ?? ""),
      });
      setOffboardModal(false);
      toast.show("Offboarding déclenché avec succès.");
    },
    onError: () => toast.show("Erreur lors du déclenchement de l'offboarding."),
  });

  // Anonymize mutation
  const anonymizeMutation = useMutation({
    mutationFn: () => usersApi.anonymize(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.users.detail(id ?? ""),
      });
      setAnonymizeModal(false);
      toast.show("Données anonymisées.");
    },
    onError: () => toast.show("Erreur lors de l'anonymisation."),
  });

  const canManage = currentUser?.role === "admin" || currentUser?.role === "hr";
  const completedSteps = checkedSteps.filter(Boolean).length;
  const progressPct = Math.round(
    (completedSteps / ONBOARDING_STEPS.length) * 100,
  );

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

      {/* Offboarding banner */}
      {userData.offboardingStatus === "offboarding" && (
        <Callout tone="amber" className="mb-6">
          <p
            className="row"
            style={{ gap: 8, fontWeight: 600, color: "var(--ink)" }}
          >
            <AlertTriangle
              className="ico"
              style={{ width: 16, height: 16, flex: "none" }}
            />
            Cet utilisateur est en cours d&apos;offboarding
          </p>
        </Callout>
      )}

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
                      setOffboardModal(true);
                      setActionsOpen(false);
                    }}
                    className="row w-full text-left"
                    style={{
                      gap: 8,
                      padding: "10px 16px",
                      fontSize: 14,
                      color: "var(--amber)",
                    }}
                  >
                    <LogOut className="ico" style={{ width: 16, height: 16 }} />{" "}
                    Déclencher l&apos;offboarding
                  </button>
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
                  {currentUser?.role === "admin" && (
                    <button
                      onClick={() => {
                        setAnonymizeModal(true);
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
                      Anonymiser
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
        {(["profile", "evaluations", "onboarding"] as const).map((tab) => (
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
            {tab === "profile"
              ? "Profil"
              : tab === "evaluations"
                ? "Évaluations"
                : "Onboarding"}
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

      {/* ── Tab: Onboarding ─────────────────────────────────────────────── */}
      {activeTab === "onboarding" && (
        <Tile>
          <div className="row between" style={{ marginBottom: 16 }}>
            <h2 className="h2">Onboarding</h2>
            <span className="small">
              {completedSteps}/{ONBOARDING_STEPS.length} étapes
            </span>
          </div>
          {/* Progress bar */}
          <div style={{ marginBottom: 24 }}>
            <Bar pct={progressPct} tone="var(--blue)" />
          </div>
          {/* Steps */}
          <ul className="section-gap" style={{ gap: 12, marginBottom: 24 }}>
            {ONBOARDING_STEPS.map((step, i) => (
              <li
                key={step}
                className="row"
                style={{ gap: 12, alignItems: "center" }}
              >
                <button
                  onClick={() =>
                    setCheckedSteps((prev) =>
                      prev.map((v, j) => (j === i ? !v : v)),
                    )
                  }
                  style={{
                    flex: "none",
                    color: checkedSteps[i]
                      ? "var(--blue)"
                      : "var(--line-strong)",
                  }}
                  aria-label={
                    checkedSteps[i] ? `Décocher : ${step}` : `Cocher : ${step}`
                  }
                >
                  {checkedSteps[i] ? (
                    <CheckSquare
                      className="ico"
                      style={{ width: 20, height: 20 }}
                    />
                  ) : (
                    <Square className="ico" style={{ width: 20, height: 20 }} />
                  )}
                </button>
                <span
                  style={{
                    fontSize: 14,
                    textDecoration: checkedSteps[i] ? "line-through" : "none",
                    color: checkedSteps[i] ? "var(--ink-3)" : "var(--ink-2)",
                  }}
                >
                  {step}
                </span>
              </li>
            ))}
          </ul>
          {completedSteps === ONBOARDING_STEPS.length ? (
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--green)" }}>
              ✓ Onboarding terminé
            </p>
          ) : (
            <button
              onClick={() => setCheckedSteps(ONBOARDING_STEPS.map(() => true))}
              className="btn btn-primary"
            >
              Marquer tout comme terminé
            </button>
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

      {/* ── Modal offboarding (S-06-M1) ──────────────────────────────────── */}
      {offboardModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,.5)" }}
        >
          <Tile
            className="w-full max-w-md"
            style={{ boxShadow: "0 12px 40px rgba(0,0,0,.25)" }}
          >
            <h3 className="h3" style={{ marginBottom: 8 }}>
              Déclencher le départ de {userData.firstName}
            </h3>
            <p className="body" style={{ marginBottom: 16 }}>
              Les évaluations actives de cet utilisateur seront archivées.
            </p>
            <div
              className="row"
              style={{ gap: 12, justifyContent: "flex-end" }}
            >
              <button
                onClick={() => setOffboardModal(false)}
                className="btn btn-ghost"
              >
                Annuler
              </button>
              <button
                onClick={() => offboardMutation.mutate()}
                disabled={offboardMutation.isPending}
                className="btn btn-primary"
                style={{ background: "var(--red)" }}
              >
                {offboardMutation.isPending
                  ? "Traitement…"
                  : "Confirmer le départ"}
              </button>
            </div>
          </Tile>
        </div>
      )}

      {/* ── Modal anonymisation (S-06-M2) ────────────────────────────────── */}
      {anonymizeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,.5)" }}
        >
          <Tile
            className="w-full max-w-md"
            style={{ boxShadow: "0 12px 40px rgba(0,0,0,.25)" }}
          >
            <h3 className="h3" style={{ marginBottom: 8 }}>
              Anonymiser les données
            </h3>
            <Callout tone="amber" className="mb-4">
              <p
                className="row"
                style={{
                  gap: 8,
                  color: "var(--ink)",
                  alignItems: "flex-start",
                }}
              >
                <AlertTriangle
                  className="ico"
                  style={{ width: 16, height: 16, flex: "none", marginTop: 2 }}
                />
                Cette action est irréversible. Toutes les données personnelles
                de cet utilisateur seront définitivement anonymisées
                conformément au RGPD.
              </p>
            </Callout>
            <p className="body" style={{ marginBottom: 8 }}>
              Saisissez <strong>CONFIRMER</strong> pour valider :
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="input"
              style={{ marginBottom: 16 }}
              placeholder="CONFIRMER"
              aria-label="Confirmer l'anonymisation"
            />
            <div
              className="row"
              style={{ gap: 12, justifyContent: "flex-end" }}
            >
              <button
                onClick={() => {
                  setAnonymizeModal(false);
                  setConfirmText("");
                }}
                className="btn btn-ghost"
              >
                Annuler
              </button>
              <button
                onClick={() => anonymizeMutation.mutate()}
                disabled={
                  confirmText !== "CONFIRMER" || anonymizeMutation.isPending
                }
                className="btn btn-primary"
                style={{ background: "var(--red)" }}
              >
                {anonymizeMutation.isPending
                  ? "Anonymisation…"
                  : "Anonymiser définitivement"}
              </button>
            </div>
          </Tile>
        </div>
      )}
    </div>
  );
}
