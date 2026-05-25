import type { UseFormRegister, FieldErrors } from "react-hook-form";
import UIToggle from "../ui/Toggle";
import FormField from "../ui/FormField";
import type { Campaign, CampaignStatus } from "../../types";
import type { WizardFormValues } from "../../hooks/useCampaignForm";
import CampaignFormCard from "./CampaignFormCard";

const inputCls =
  "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500";

interface CampaignGeneralInfoFormProps {
  register: UseFormRegister<WizardFormValues>;
  errors: FieldErrors<WizardFormValues>;
  form: WizardFormValues;
  set: <K extends keyof WizardFormValues>(
    key: K,
    value: WizardFormValues[K],
  ) => void;
  prevCampaigns: Campaign[] | undefined;
}

export default function CampaignGeneralInfoForm({
  register,
  errors,
  form,
  set,
  prevCampaigns,
}: CampaignGeneralInfoFormProps) {
  return (
    <div className="space-y-6">
      <CampaignFormCard title="Informations générales">
        <FormField label="Nom" required error={errors.name?.message}>
          <input
            type="text"
            {...register("name")}
            aria-invalid={!!errors.name}
            placeholder="Ex: Entretiens annuels 2025"
            className={inputCls}
          />
        </FormField>

        <FormField label="Description" error={errors.description?.message}>
          <textarea
            {...register("description")}
            rows={3}
            placeholder="Description de la campagne (optionnel)"
            className={inputCls}
          />
        </FormField>

        <FormField label="Statut initial">
          <div className="flex gap-4">
            {(["draft", "active"] as CampaignStatus[]).map((s) => (
              <label key={s} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value={s}
                  checked={form.status === s}
                  onChange={() => set("status", s)}
                  className="w-4 h-4 border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-slate-700">
                  {s === "draft" ? "Brouillon" : "Activer immédiatement"}
                </span>
              </label>
            ))}
          </div>
        </FormField>
      </CampaignFormCard>

      <CampaignFormCard title="Calendrier">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            label="Date de début"
            required
            error={errors.startDate?.message}
          >
            <input
              type="date"
              {...register("startDate")}
              aria-invalid={!!errors.startDate}
              className={inputCls}
            />
          </FormField>
          <FormField
            label="Date de fin"
            required
            error={errors.endDate?.message}
          >
            <input
              type="date"
              {...register("endDate")}
              aria-invalid={!!errors.endDate}
              className={inputCls}
            />
          </FormField>
          <FormField label="Deadline employé">
            <input
              type="date"
              {...register("deadlineEmployee")}
              className={inputCls}
            />
          </FormField>
          <FormField label="Deadline manager">
            <input
              type="date"
              {...register("deadlineManager")}
              className={inputCls}
            />
          </FormField>
        </div>
      </CampaignFormCard>

      <CampaignFormCard title="Contexte N-1">
        <div className="flex items-center gap-3">
          <UIToggle
            checked={form.enableN1Context}
            onChange={(v) => set("enableN1Context", v)}
            label="Activer le contexte N-1"
          />
          <span className="text-sm font-medium text-slate-700">
            Activer le contexte N-1
          </span>
        </div>

        {form.enableN1Context && (
          <div className="mt-2 space-y-4 pl-4 border-l-2 border-primary-100">
            <div className="flex items-center gap-3">
              <UIToggle
                checked={form.n1VisibleToEmployee}
                onChange={(v) => set("n1VisibleToEmployee", v)}
                label="Visible par l'employé"
              />
              <span className="text-sm font-medium text-slate-700">
                Visible par l'employé
              </span>
            </div>

            <FormField label="Campagne source (optionnel)">
              <select
                value={form.previousCampaignId}
                onChange={(e) => set("previousCampaignId", e.target.value)}
                className={inputCls}
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
            </FormField>
          </div>
        )}
      </CampaignFormCard>
    </div>
  );
}
