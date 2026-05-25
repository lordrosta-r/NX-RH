import FormField from "../ui/FormField";
import type { WizardFormValues } from "../../hooks/useCampaignForm";
import type { Sector, UserGroup } from "../../types";
import CampaignFormCard from "./CampaignFormCard";
import CampaignChipInput from "./CampaignChipInput";

const inputCls =
  "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500";

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
        <div className="space-y-3">
          {SCOPE_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2 cursor-pointer"
            >
              <input
                type="radio"
                name="targetScope"
                value={opt.value}
                checked={form.targetScope === opt.value}
                onChange={() => set("targetScope", opt.value)}
                className="w-4 h-4 border-slate-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-slate-700">{opt.label}</span>
            </label>
          ))}
        </div>

        {form.targetScope === "department" && (
          <div className="mt-4 pl-6">
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
          <div className="mt-4 pl-6">
            <FormField label="Secteurs">
              {sectorsData && sectorsData.length > 0 ? (
                <div className="space-y-2">
                  {sectorsData.map((sector) => {
                    const sid = sector._id ?? sector.id;
                    return (
                      <label
                        key={sid}
                        className="flex items-center gap-2 cursor-pointer"
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
                          className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-slate-700">
                          {sector.name}
                        </span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  Chargement des secteurs…
                </p>
              )}
            </FormField>
          </div>
        )}

        {form.targetScope === "users" && (
          <div className="mt-4 pl-6">
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
          <div className="mt-4 pl-6">
            <FormField label="Groupe cible">
              <select
                value={form.targetGroupId}
                onChange={(e) => set("targetGroupId", e.target.value)}
                className={inputCls}
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
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.extendedVisibility}
            onChange={(e) => set("extendedVisibility", e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-sm text-slate-700">
            Visibilité étendue (managers voient N+2)
          </span>
        </label>
      </CampaignFormCard>
    </div>
  );
}
