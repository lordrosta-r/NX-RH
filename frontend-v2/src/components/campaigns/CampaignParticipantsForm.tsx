import FormField from "../ui/FormField";
import type { WizardFormValues } from "../../hooks/useCampaignForm";
import type { Sector, UserGroup } from "../../types";
import CampaignFormCard from "./CampaignFormCard";
import CampaignChipInput from "./CampaignChipInput";

const SCOPE_OPTIONS = [
  { value: "all", label: "Tous les collaborateurs actifs" },
  { value: "department", label: "Par département" },
  { value: "sector", label: "Par secteur" },
  { value: "users", label: "Sélection manuelle" },
  { value: "group", label: "Par groupe" },
] as const;

interface CampaignParticipantsFormProps {
  form: WizardFormValues;
  set: <K extends keyof WizardFormValues>(
    key: K,
    value: WizardFormValues[K],
  ) => void;
  sectorsData: Sector[] | undefined;
  groupsData: UserGroup[] | undefined;
}

export default function CampaignParticipantsForm({
  form,
  set,
  sectorsData,
  groupsData,
}: CampaignParticipantsFormProps) {
  return (
    <div className="space-y-6">
      <CampaignFormCard title="Périmètre de la campagne">
        <div className="space-y-2">
          {SCOPE_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-3 cursor-pointer"
            >
              <input
                type="radio"
                name="targetScope"
                value={opt.value}
                checked={form.targetScope === opt.value}
                onChange={() => set("targetScope", opt.value)}
                style={{ accentColor: "var(--blue)", width: 16, height: 16 }}
              />
              <span className="body" style={{ fontSize: 15 }}>
                {opt.label}
              </span>
            </label>
          ))}
        </div>

        {form.targetScope === "department" && (
          <div style={{ marginTop: 16, paddingLeft: 24 }}>
            <FormField label="Départements sélectionnés">
              <CampaignChipInput
                values={form.targetDepartments}
                onChange={(v) => set("targetDepartments", v)}
                placeholder="Ajouter un département…"
              />
            </FormField>
          </div>
        )}

        {form.targetScope === "sector" && (
          <div style={{ marginTop: 16, paddingLeft: 24 }}>
            <FormField label="Secteurs">
              {sectorsData && sectorsData.length > 0 ? (
                <div className="space-y-2">
                  {sectorsData.map((sector) => {
                    const sid = sector._id ?? sector.id;
                    return (
                      <label
                        key={sid}
                        className="flex items-center gap-3 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={form.targetSectorIds.includes(sid)}
                          onChange={(e) => {
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
                          style={{
                            accentColor: "var(--blue)",
                            width: 16,
                            height: 16,
                          }}
                        />
                        <span className="body" style={{ fontSize: 15 }}>
                          {sector.name}
                        </span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <p className="small" style={{ fontStyle: "italic" }}>
                  Chargement des secteurs…
                </p>
              )}
            </FormField>
          </div>
        )}

        {form.targetScope === "users" && (
          <div style={{ marginTop: 16, paddingLeft: 24 }}>
            <FormField label="Utilisateurs sélectionnés">
              <CampaignChipInput
                values={form.targetUserIds}
                onChange={(v) => set("targetUserIds", v)}
                placeholder="Identifiant ou nom d'utilisateur…"
              />
            </FormField>
          </div>
        )}

        {form.targetScope === "group" && (
          <div style={{ marginTop: 16, paddingLeft: 24 }}>
            <FormField label="Groupe cible">
              <select
                aria-label="Groupe cible"
                value={form.targetGroupId}
                onChange={(e) => set("targetGroupId", e.target.value)}
                className="input"
              >
                <option value="">Sélectionner un groupe…</option>
                {Array.isArray(groupsData) &&
                  groupsData.map((g) => (
                    <option key={g._id} value={g._id}>
                      {g.name}
                    </option>
                  ))}
              </select>
            </FormField>
          </div>
        )}
      </CampaignFormCard>

      <CampaignFormCard title="Visibilité">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.extendedVisibility}
            onChange={(e) => set("extendedVisibility", e.target.checked)}
            style={{ accentColor: "var(--blue)", width: 16, height: 16 }}
          />
          <span className="body" style={{ fontSize: 15 }}>
            Visibilité étendue (managers voient N+2)
          </span>
        </label>
      </CampaignFormCard>
    </div>
  );
}
