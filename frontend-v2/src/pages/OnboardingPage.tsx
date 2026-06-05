import { useState, useRef } from "react";
import type { ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { User, Camera, Users, MonitorCheck, PartyPopper } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { usersApi } from "../api/users";
import { campaignsApi } from "../api/campaigns";
import { Tile, Bar } from "../components/shell";

const STEP_COUNT = 5;

const DEFAULT_CHECKLIST = [
  "Badge d'accès remis",
  "Ordinateur configuré",
  "Accès email/intranet créés",
  "Présentation à l'équipe",
  "Formation sécurité effectuée",
];

export default function OnboardingPage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  // Step 1
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");

  // Step 2
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [avatarBase64, setAvatarBase64] = useState<string>("");
  const [avatarError, setAvatarError] = useState<string>("");

  // Step 4
  const [checklist, setChecklist] = useState<boolean[]>(
    DEFAULT_CHECKLIST.map(() => false),
  );

  // Manager direct
  const { data: managerData } = useQuery({
    queryKey: ["onboarding-manager", user?.managerId],
    queryFn: () => usersApi.getUser(user!.managerId!).then((r) => r.data.data),
    enabled: step === 2 && !!user?.managerId,
  });

  // Membres de l'équipe (même manager)
  const { data: teammates } = useQuery({
    queryKey: ["onboarding-teammates", user?.managerId],
    queryFn: () =>
      usersApi
        .getUsers({ managerId: user?.managerId, limit: 10 })
        .then((r) => r.data),
    enabled: step === 2 && !!user?.managerId,
  });

  // Active campaign
  const { data: activeCampaign } = useQuery({
    queryKey: ["onboarding-campaign"],
    queryFn: () =>
      campaignsApi
        .getCampaigns({ status: "active", limit: 1 })
        .then((r) => r.data.data?.[0] ?? null),
    enabled: step === 4,
  });

  const updateUserMutation = useMutation({
    mutationFn: () => usersApi.updateUser(user!.id, { firstName, lastName }),
    onSuccess: async () => {
      await usersApi.updateOnboardingStep(user!.id, 0);
      await refreshUser();
      setStep(1);
    },
  });

  const avatarMutation = useMutation({
    mutationFn: (base64: string) => usersApi.updateAvatar(user!.id, base64),
    onSuccess: async () => {
      await usersApi.updateOnboardingStep(user!.id, 1);
      await refreshUser();
      setStep(2);
    },
  });

  const completeMutation = useMutation({
    mutationFn: () => usersApi.completeOnboarding(user!.id),
    onSuccess: async () => {
      await refreshUser();
      navigate("/");
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

  async function goStep(target: number) {
    await usersApi.updateOnboardingStep(user!.id, target - 1);
    setStep(target);
  }

  if (!user) return null;

  const initials =
    `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase();

  const stepTitles = [
    "Complétez votre profil",
    "Photo de profil",
    "Votre équipe",
    "Accès systèmes",
    "Bienvenue !",
  ];

  const stepIcons = [User, Camera, Users, MonitorCheck, PartyPopper];
  const StepIcon = stepIcons[step];

  return (
    <div
      className="nx-app"
      style={{ minHeight: "100vh", background: "var(--bg-alt)" }}
    >
      <div style={{ width: "100%", padding: "32px 28px" }}>
        {/* Header */}
        <div className="row" style={{ gap: 10, marginBottom: 24 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "var(--radius)",
              background: "var(--blue)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ color: "#fff", fontWeight: 800, fontSize: 14 }}>
              NX
            </span>
          </div>
          <span className="h3">NX-RH</span>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: 8 }}>
          <Bar pct={((step + 1) / STEP_COUNT) * 100} />
        </div>
        <p className="small" style={{ marginBottom: 16 }}>
          Étape {step + 1} sur {STEP_COUNT}
        </p>

        {/* Step indicators */}
        <div className="row" style={{ gap: 8, marginBottom: 24 }}>
          {Array.from({ length: STEP_COUNT }).map((_, i) => (
            <span
              key={i}
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background:
                  i === step
                    ? "var(--blue)"
                    : i < step
                      ? "var(--blue-soft-2)"
                      : "var(--bg-alt-2)",
              }}
            />
          ))}
        </div>

        {/* Card */}
        <Tile>
          {/* Illustration */}
          <div className="row" style={{ gap: 14, marginBottom: 20 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "var(--radius)",
                background: "var(--blue-soft)",
                color: "var(--blue-text)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <StepIcon size={28} strokeWidth={1.5} aria-hidden="true" />
            </div>
            <h2 className="h2">{stepTitles[step]}</h2>
          </div>

          {/* ── Step 0: Profil ──────────────────────────────────────── */}
          {step === 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <p className="body">
                Assurez-vous que vos informations sont correctes.
              </p>
              <div className="field">
                <label htmlFor="onboarding-firstName">Prénom</label>
                <input
                  id="onboarding-firstName"
                  className="input"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="onboarding-lastName">Nom</label>
                <input
                  id="onboarding-lastName"
                  className="input"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* ── Step 1: Avatar ──────────────────────────────────────── */}
          {step === 1 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 16,
              }}
            >
              <p className="body" style={{ textAlign: "center" }}>
                Ajoutez une photo pour que vos collègues vous reconnaissent.
              </p>
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Aperçu de la photo de profil"
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: "50%",
                    objectFit: "cover",
                    boxShadow: "0 0 0 4px var(--blue-soft)",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: "50%",
                    background: "var(--blue-soft)",
                    color: "var(--blue-text)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 30,
                    fontWeight: 800,
                  }}
                >
                  {initials}
                </div>
              )}
              {avatarError && <p className="field-error">{avatarError}</p>}
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: "none" }}
                onChange={handleFileChange}
                aria-label="Choisir une photo de profil"
              />
              <button
                className="btn btn-ghost"
                onClick={() => fileRef.current?.click()}
              >
                Choisir une image
              </button>
            </div>
          )}

          {/* ── Step 2: Équipe ──────────────────────────────────────── */}
          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <p className="body">
                Voici votre manager et les membres de votre équipe.
              </p>
              {managerData && (
                <div>
                  <p className="eyebrow" style={{ marginBottom: 8 }}>
                    Responsable direct
                  </p>
                  <div
                    className="row"
                    style={{
                      gap: 12,
                      padding: 12,
                      borderRadius: "var(--radius)",
                      background: "var(--blue-soft)",
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: "var(--blue-soft-2)",
                        color: "var(--blue-text)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 14,
                        fontWeight: 800,
                        flexShrink: 0,
                      }}
                    >
                      {managerData.firstName[0]}
                      {managerData.lastName[0]}
                    </div>
                    <div>
                      <p className="h3" style={{ fontSize: 15 }}>
                        {managerData.firstName} {managerData.lastName}
                      </p>
                      <p className="small">
                        {managerData.position ?? managerData.role}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {(teammates?.data?.filter((m) => m.id !== user.id) ?? []).length >
                0 && (
                <div>
                  <p className="eyebrow" style={{ marginBottom: 8 }}>
                    Équipe
                  </p>
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 8 }}
                  >
                    {teammates?.data
                      ?.filter((m) => m.id !== user.id)
                      .slice(0, 4)
                      .map((member) => (
                        <div
                          key={member.id}
                          className="row"
                          style={{
                            gap: 12,
                            padding: 12,
                            borderRadius: "var(--radius)",
                            background: "var(--bg-alt)",
                          }}
                        >
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: "50%",
                              background: "var(--blue-soft)",
                              color: "var(--blue-text)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 14,
                              fontWeight: 800,
                              flexShrink: 0,
                            }}
                          >
                            {member.firstName[0]}
                            {member.lastName[0]}
                          </div>
                          <div>
                            <p className="h3" style={{ fontSize: 15 }}>
                              {member.firstName} {member.lastName}
                            </p>
                            <p className="small">
                              {member.position ?? member.role}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
              {!managerData &&
                (!teammates?.data?.length ||
                  teammates.data.filter((m) => m.id !== user.id).length ===
                    0) && (
                  <p
                    className="body"
                    style={{ textAlign: "center", padding: "16px 0" }}
                  >
                    Aucun membre d'équipe trouvé.
                  </p>
                )}
            </div>
          )}

          {/* ── Step 3: Accès systèmes ──────────────────────────────── */}
          {step === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <p className="body">Cochez les accès que vous avez reçus.</p>
              {DEFAULT_CHECKLIST.map((item, i) => (
                <label
                  key={item}
                  className="row"
                  style={{
                    gap: 12,
                    padding: 12,
                    borderRadius: "var(--radius)",
                    background: "var(--bg-alt)",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checklist[i]}
                    onChange={() =>
                      setChecklist((prev) =>
                        prev.map((v, idx) => (idx === i ? !v : v)),
                      )
                    }
                    style={{ width: 16, height: 16, flexShrink: 0 }}
                  />
                  <span className="small" style={{ color: "var(--ink)" }}>
                    {item}
                  </span>
                </label>
              ))}
            </div>
          )}

          {/* ── Step 4: Bienvenue ───────────────────────────────────── */}
          {step === 4 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <p className="body">
                Votre espace NX-RH est prêt. Bienvenue dans l'équipe !
              </p>
              {activeCampaign && (
                <div
                  style={{
                    background: "var(--blue-soft)",
                    borderRadius: "var(--radius)",
                    padding: 16,
                  }}
                >
                  <p className="eyebrow" style={{ marginBottom: 6 }}>
                    Campagne active
                  </p>
                  <p
                    className="h3"
                    style={{ fontSize: 15, color: "var(--blue-text)" }}
                  >
                    {activeCampaign.name}
                  </p>
                  <p
                    className="small"
                    style={{ marginTop: 4, color: "var(--blue-text)" }}
                  >
                    Du{" "}
                    {new Date(activeCampaign.startDate).toLocaleDateString(
                      "fr-FR",
                    )}{" "}
                    au{" "}
                    {new Date(activeCampaign.endDate).toLocaleDateString(
                      "fr-FR",
                    )}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Footer buttons */}
          <div
            className="row between"
            style={{
              marginTop: 28,
              paddingTop: 16,
              borderTop: "1px solid var(--line)",
            }}
          >
            {step > 0 ? (
              <button
                className="link"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
                onClick={async () => {
                  await goStep(step + 1);
                }}
              >
                Passer cette étape
              </button>
            ) : (
              <span />
            )}

            {step === 0 && (
              <button
                className="btn btn-primary"
                onClick={() => updateUserMutation.mutate()}
                disabled={updateUserMutation.isPending}
              >
                {updateUserMutation.isPending ? "Sauvegarde…" : "Suivant →"}
              </button>
            )}

            {step === 1 && (
              <button
                className="btn btn-primary"
                onClick={() => {
                  if (avatarBase64) {
                    avatarMutation.mutate(avatarBase64);
                  } else {
                    goStep(2);
                  }
                }}
                disabled={avatarMutation.isPending}
              >
                {avatarMutation.isPending ? "Envoi…" : "Suivant →"}
              </button>
            )}

            {step === 2 && (
              <button className="btn btn-primary" onClick={() => goStep(3)}>
                Suivant →
              </button>
            )}

            {step === 3 && (
              <button className="btn btn-primary" onClick={() => goStep(4)}>
                Suivant →
              </button>
            )}

            {step === 4 && (
              <button
                className="btn btn-primary"
                onClick={() => completeMutation.mutate()}
                disabled={completeMutation.isPending}
              >
                {completeMutation.isPending
                  ? "Finalisation…"
                  : "Accéder à mon espace →"}
              </button>
            )}
          </div>
        </Tile>
      </div>
    </div>
  );
}
