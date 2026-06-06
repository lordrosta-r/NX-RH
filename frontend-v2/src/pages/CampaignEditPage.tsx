import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { campaignsApi } from "../api/campaigns";
import { orgApi } from "../api/org";
import { groupsApi } from "../api/groups";
import type { Campaign, CampaignStatus, UserGroup } from "../types";
import { PageHead, Tile } from "../components/shell";
import { queryKeys } from "../lib/queryKeys";

// ─── Shared sub-components ────────────────────────────────────────────────────

function Field({
  label,
  htmlFor,
  required,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>
        {label}
        {required && (
          <span style={{ color: "var(--red)", marginLeft: 2 }}>*</span>
        )}
      </label>
      {children}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label
      className="row"
      style={{ gap: 12, cursor: "pointer", alignItems: "center" }}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        style={{
          position: "relative",
          width: 44,
          height: 24,
          borderRadius: 9999,
          border: "none",
          cursor: "pointer",
          padding: 0,
          background: checked ? "var(--blue)" : "var(--line)",
          transition: "background 0.12s",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            left: 2,
            width: 20,
            height: 20,
            borderRadius: 9999,
            background: "#fff",
            boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
            transform: checked ? "translateX(20px)" : "translateX(0)",
            transition: "transform 0.12s",
          }}
        />
      </button>
      <span className="body" style={{ fontWeight: 600 }}>
        {label}
      </span>
    </label>
  );
}

function ChipInput({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState("");

  function add() {
    const v = input.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setInput("");
  }

  return (
    <div>
      <div className="row" style={{ gap: 8, marginBottom: 8 }}>
        <input
          type="text"
          value={input}
          aria-label={placeholder ?? "Ajouter une valeur"}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className="input"
          style={{ flex: 1 }}
        />
        <button type="button" onClick={add} className="btn btn-ghost">
          Ajouter
        </button>
      </div>
      {values.length > 0 && (
        <div className="row wrap" style={{ gap: 8 }}>
          {values.map((v) => (
            <span key={v} className="badge blue">
              {v}
              <button
                type="button"
                aria-label={`Retirer ${v}`}
                onClick={() => onChange(values.filter((x) => x !== v))}
                style={{
                  marginLeft: 4,
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  fontWeight: 700,
                  color: "inherit",
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type FormState = {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  deadlineEmployee: string;
  deadlineManager: string;
  targetDepartments: string[];
  extendedVisibility: boolean;
  enableN1Context: boolean;
  n1VisibleToEmployee: boolean;
  previousCampaignId: string;
  targetScope: "all" | "department" | "sector" | "users" | "group";
  targetSectorIds: string[];
  targetUserIds: string[];
  targetGroupId: string;
};

const initialForm: FormState = {
  name: "",
  description: "",
  startDate: "",
  endDate: "",
  deadlineEmployee: "",
  deadlineManager: "",
  targetDepartments: [],
  extendedVisibility: false,
  enableN1Context: false,
  n1VisibleToEmployee: false,
  previousCampaignId: "",
  targetScope: "all",
  targetSectorIds: [],
  targetUserIds: [],
  targetGroupId: "",
};

function buildPayload(
  form: FormState,
  status?: CampaignStatus,
): Partial<Campaign> {
  return {
    name: form.name.trim(),
    description: form.description || undefined,
    ...(status ? { status } : {}),
    startDate: form.startDate,
    endDate: form.endDate,
    deadlineEmployee: form.deadlineEmployee || undefined,
    deadlineManager: form.deadlineManager || undefined,
    targetDepartments:
      form.targetDepartments.length > 0 ? form.targetDepartments : undefined,
    extendedVisibility: form.extendedVisibility,
    enableN1Context: form.enableN1Context,
    n1VisibleToEmployee: form.enableN1Context
      ? form.n1VisibleToEmployee
      : undefined,
    previousCampaignId:
      form.enableN1Context && form.previousCampaignId
        ? form.previousCampaignId
        : undefined,
    targetScope: form.targetScope,
    targetSectorIds:
      form.targetScope === "sector" ? form.targetSectorIds : undefined,
    targetUserIds:
      form.targetScope === "users" ? form.targetUserIds : undefined,
    targetGroupIds:
      form.targetScope === "group" && form.targetGroupId
        ? [form.targetGroupId]
        : undefined,
  };
}

export default function CampaignEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const { data: campaign, isLoading: campaignLoading } = useQuery({
    queryKey: queryKeys.campaigns.detail(id ?? ""),
    queryFn: () => campaignsApi.getCampaign(id!).then((r) => r.data.data),
    enabled: !!id,
  });

  useEffect(() => {
    if (campaign) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydratation du formulaire depuis la campagne chargée
      setForm({
        name: campaign.name,
        description: campaign.description ?? "",
        startDate: campaign.startDate,
        endDate: campaign.endDate,
        deadlineEmployee: campaign.deadlineEmployee ?? "",
        deadlineManager: campaign.deadlineManager ?? "",
        targetDepartments: campaign.targetDepartments ?? [],
        extendedVisibility: campaign.extendedVisibility ?? false,
        enableN1Context: campaign.enableN1Context ?? false,
        n1VisibleToEmployee: campaign.n1VisibleToEmployee ?? false,
        previousCampaignId: campaign.previousCampaignId ?? "",
        targetScope: campaign.targetScope ?? "all",
        targetSectorIds: campaign.targetSectorIds ?? [],
        targetUserIds: campaign.targetUserIds ?? [],
        targetGroupId: campaign.targetGroupIds?.[0] ?? "",
      });
    }
  }, [campaign]);

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Le nom est requis";
    if (!form.startDate) e.startDate = "La date de début est requise";
    if (!form.endDate) e.endDate = "La date de fin est requise";
    if (form.startDate && form.endDate && form.endDate <= form.startDate)
      e.endDate = "La date de fin doit être après la date de début";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  const { data: prevCampaigns } = useQuery({
    queryKey: ["campaigns-prev"],
    queryFn: () =>
      Promise.all([
        campaignsApi
          .getCampaigns({ status: "closed", limit: 100 })
          .then((r) => r.data.data),
        campaignsApi
          .getCampaigns({ status: "archived", limit: 100 })
          .then((r) => r.data.data),
      ]).then(([c, a]) => [...c, ...a]),
    enabled: form.enableN1Context,
  });

  const { data: sectorsData } = useQuery({
    queryKey: ["org-sectors"],
    queryFn: () => orgApi.getSectors().then((r) => r.data),
    enabled: form.targetScope === "sector",
  });

  const { data: groupsData } = useQuery({
    queryKey: ["admin-groups"],
    queryFn: () => groupsApi.list().then((r) => r.data as UserGroup[]),
    enabled: form.targetScope === "group",
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Campaign>) =>
      campaignsApi.updateCampaign(id!, data).then((r) => r.data.data),
    onSuccess: (updated: Campaign) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.lists() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.campaigns.detail(id ?? ""),
      });
      navigate(`/campaigns/${updated.id}`);
    },
  });

  function handleSave() {
    if (!validate()) return;
    updateMutation.mutate(buildPayload(form));
  }

  if (campaignLoading) {
    return (
      <div className="nx-app">
        <div className="row" style={{ justifyContent: "center", padding: 96 }}>
          <p className="body">Chargement…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="nx-app">
      <p className="eyebrow" style={{ marginBottom: 12 }}>
        <Link to="/" className="link">
          Accueil
        </Link>
        {" › "}
        <Link to="/campaigns" className="link">
          Campagnes
        </Link>
        {" › "}
        <Link to={`/campaigns/${id}`} className="link">
          {campaign?.name ?? "…"}
        </Link>
        {" › "}
        Modifier
      </p>

      <PageHead
        title={`Modifier — ${campaign?.name ?? "…"}`}
        actions={
          <>
            <Link to={`/campaigns/${id}`} className="btn btn-ghost">
              Annuler
            </Link>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSave}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Enregistrement…" : "Enregistrer"}
            </button>
          </>
        }
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Tile 1 — Identité */}
        <Tile>
          <h2 className="h3" style={{ marginBottom: 16 }}>
            Identité de la campagne
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Field
              label="Nom"
              htmlFor="campaign-name"
              required
              error={errors.name}
            >
              <input
                id="campaign-name"
                type="text"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Ex: Entretiens annuels 2025"
                className="input"
              />
            </Field>
            <Field label="Description" htmlFor="campaign-description">
              <textarea
                id="campaign-description"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={3}
                placeholder="Description de la campagne (optionnel)"
                className="input"
              />
            </Field>
          </div>
        </Tile>

        {/* Tile 2 — Calendrier */}
        <Tile>
          <h2 className="h3" style={{ marginBottom: 16 }}>
            Calendrier
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
            }}
          >
            <Field
              label="Date de début"
              htmlFor="campaign-start-date"
              required
              error={errors.startDate}
            >
              <input
                id="campaign-start-date"
                type="date"
                value={form.startDate}
                onChange={(e) => set("startDate", e.target.value)}
                className="input"
              />
            </Field>
            <Field
              label="Date de fin"
              htmlFor="campaign-end-date"
              required
              error={errors.endDate}
            >
              <input
                id="campaign-end-date"
                type="date"
                value={form.endDate}
                onChange={(e) => set("endDate", e.target.value)}
                className="input"
              />
            </Field>
            <Field
              label="Deadline employé"
              htmlFor="campaign-deadline-employee"
            >
              <input
                id="campaign-deadline-employee"
                type="date"
                value={form.deadlineEmployee}
                onChange={(e) => set("deadlineEmployee", e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Deadline manager" htmlFor="campaign-deadline-manager">
              <input
                id="campaign-deadline-manager"
                type="date"
                value={form.deadlineManager}
                onChange={(e) => set("deadlineManager", e.target.value)}
                className="input"
              />
            </Field>
          </div>
        </Tile>

        {/* Tile 3 — Ciblage */}
        <Tile>
          <h2 className="h3" style={{ marginBottom: 16 }}>
            Ciblage
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Field label="Départements cibles">
              <ChipInput
                values={form.targetDepartments}
                onChange={(v) => set("targetDepartments", v)}
                placeholder="Ajouter un département…"
              />
            </Field>
            <label
              className="row"
              style={{ gap: 8, cursor: "pointer", alignItems: "center" }}
            >
              <input
                type="checkbox"
                checked={form.extendedVisibility}
                onChange={(e) => set("extendedVisibility", e.target.checked)}
              />
              <span className="body">
                Visibilité étendue (managers voient N+2)
              </span>
            </label>
          </div>
        </Tile>

        {/* Tile 4 — Édition précédente */}
        <Tile>
          <h2 className="h3" style={{ marginBottom: 16 }}>
            Édition précédente
          </h2>
          <Toggle
            checked={form.enableN1Context}
            onChange={(v) => set("enableN1Context", v)}
            label="Activer la reprise de l'édition précédente"
          />
          {form.enableN1Context && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 16,
                marginTop: 16,
                paddingLeft: 16,
                borderLeft: "2px solid var(--line)",
              }}
            >
              <Toggle
                checked={form.n1VisibleToEmployee}
                onChange={(v) => set("n1VisibleToEmployee", v)}
                label="Visible par l'employé"
              />
              <Field
                label="Campagne source (optionnel)"
                htmlFor="campaign-previous"
              >
                <select
                  id="campaign-previous"
                  value={form.previousCampaignId}
                  onChange={(e) => set("previousCampaignId", e.target.value)}
                  className="input"
                >
                  <option value="">
                    Auto-sélection (campagne précédente la plus récente)
                  </option>
                  {prevCampaigns?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          )}
        </Tile>

        {/* Tile 5 — Périmètre */}
        <Tile>
          <h2 className="h3" style={{ marginBottom: 16 }}>
            Périmètre de la campagne
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {(
              [
                { value: "all", label: "Tous les collaborateurs actifs" },
                { value: "department", label: "Par département" },
                { value: "sector", label: "Par secteur" },
                { value: "users", label: "Sélection manuelle" },
                { value: "group", label: "Par groupe" },
              ] as const
            ).map((opt) => (
              <label
                key={opt.value}
                className="row"
                style={{ gap: 8, cursor: "pointer", alignItems: "center" }}
              >
                <input
                  type="radio"
                  name="targetScope"
                  value={opt.value}
                  checked={form.targetScope === opt.value}
                  onChange={() => set("targetScope", opt.value)}
                />
                <span className="body">{opt.label}</span>
              </label>
            ))}
          </div>

          {form.targetScope === "department" && (
            <div style={{ marginTop: 16, paddingLeft: 24 }}>
              <Field label="Départements sélectionnés">
                <ChipInput
                  values={form.targetDepartments}
                  onChange={(v) => set("targetDepartments", v)}
                  placeholder="Ajouter un département…"
                />
              </Field>
            </div>
          )}

          {form.targetScope === "sector" && (
            <div style={{ marginTop: 16, paddingLeft: 24 }}>
              <Field label="Secteurs">
                {sectorsData && sectorsData.length > 0 ? (
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 8 }}
                  >
                    {sectorsData.map((sector) => (
                      <label
                        key={sector._id ?? sector.id}
                        className="row"
                        style={{
                          gap: 8,
                          cursor: "pointer",
                          alignItems: "center",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={form.targetSectorIds.includes(
                            sector._id ?? sector.id ?? "",
                          )}
                          onChange={(e) => {
                            const sid = sector._id ?? sector.id ?? "";
                            if (e.target.checked) {
                              set("targetSectorIds", [
                                ...form.targetSectorIds,
                                sid,
                              ]);
                            } else {
                              set(
                                "targetSectorIds",
                                form.targetSectorIds.filter((id) => id !== sid),
                              );
                            }
                          }}
                        />
                        <span className="body">{sector.name}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="small" style={{ fontStyle: "italic" }}>
                    Chargement des secteurs…
                  </p>
                )}
              </Field>
            </div>
          )}

          {form.targetScope === "users" && (
            <div style={{ marginTop: 16, paddingLeft: 24 }}>
              <Field label="Utilisateurs sélectionnés">
                <ChipInput
                  values={form.targetUserIds}
                  onChange={(v) => set("targetUserIds", v)}
                  placeholder="Identifiant ou nom d'utilisateur…"
                />
              </Field>
            </div>
          )}

          {form.targetScope === "group" && (
            <div style={{ marginTop: 16, paddingLeft: 24 }}>
              <Field label="Groupe cible" htmlFor="campaign-group">
                <select
                  id="campaign-group"
                  value={form.targetGroupId}
                  onChange={(e) => set("targetGroupId", e.target.value)}
                  className="input"
                >
                  <option value="">Sélectionner un groupe…</option>
                  {Array.isArray(groupsData) &&
                    groupsData.map((g: UserGroup) => (
                      <option key={g._id} value={g._id}>
                        {g.name}
                      </option>
                    ))}
                </select>
              </Field>
            </div>
          )}
        </Tile>

        {/* Tile 6 — Formulaires */}
        <Tile>
          <h2 className="h3" style={{ marginBottom: 16 }}>
            Formulaires
          </h2>
          <p className="body">
            Les formulaires se gèrent depuis la page de la campagne, dans
            l'onglet <span style={{ fontWeight: 600 }}>Formulaires</span>.
            Accédez à la page de détail pour ajouter ou retirer des formulaires.
          </p>
        </Tile>
      </div>
    </div>
  );
}
