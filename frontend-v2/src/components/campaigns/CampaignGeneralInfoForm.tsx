import type { UseFormRegister, FieldErrors } from "react-hook-form";
import UIToggle from "../ui/Toggle";
import type { Campaign, CampaignStatus } from "../../types";
import type { WizardFormValues } from "../../hooks/useCampaignForm";

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
    <div className="flex flex-col gap-6">
      <section className="tile" style={{ padding: 24 }}>
        <h2 className="h3" style={{ marginBottom: 20 }}>
          Informations générales
        </h2>

        <div className="flex flex-col gap-5">
          <div className="field">
            <label htmlFor="campaign-name">
              Nom{" "}
              <span style={{ color: "var(--red)" }} aria-hidden>
                *
              </span>
            </label>
            <input
              id="campaign-name"
              type="text"
              {...register("name")}
              aria-invalid={!!errors.name}
              placeholder="Ex: Entretiens annuels 2025"
              className={errors.name ? "input is-invalid" : "input"}
            />
            {errors.name?.message && (
              <p className="field-error" role="alert">
                {errors.name.message}
              </p>
            )}
          </div>

          <div className="field">
            <label htmlFor="campaign-description">Description</label>
            <textarea
              id="campaign-description"
              {...register("description")}
              rows={3}
              placeholder="Description de la campagne (optionnel)"
              className={errors.description ? "input is-invalid" : "input"}
            />
            {errors.description?.message && (
              <p className="field-error" role="alert">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="field">
            <label id="campaign-status-label">Statut initial</label>
            <div
              className="flex gap-6"
              role="radiogroup"
              aria-labelledby="campaign-status-label"
            >
              {(["draft", "active"] as CampaignStatus[]).map((s) => (
                <label
                  key={s}
                  className="flex items-center gap-2 cursor-pointer"
                  style={{ fontWeight: 400 }}
                >
                  <input
                    type="radio"
                    name="status"
                    value={s}
                    checked={form.status === s}
                    onChange={() => set("status", s)}
                    style={{ accentColor: "var(--blue)" }}
                  />
                  <span className="body" style={{ color: "var(--ink-2)" }}>
                    {s === "draft" ? "Brouillon" : "Activer immédiatement"}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="tile" style={{ padding: 24 }}>
        <h2 className="h3" style={{ marginBottom: 20 }}>
          Calendrier
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="field">
            <label htmlFor="campaign-start-date">
              Date de début{" "}
              <span style={{ color: "var(--red)" }} aria-hidden>
                *
              </span>
            </label>
            <input
              id="campaign-start-date"
              type="date"
              {...register("startDate")}
              aria-invalid={!!errors.startDate}
              className={errors.startDate ? "input is-invalid" : "input"}
            />
            {errors.startDate?.message && (
              <p className="field-error" role="alert">
                {errors.startDate.message}
              </p>
            )}
          </div>

          <div className="field">
            <label htmlFor="campaign-end-date">
              Date de fin{" "}
              <span style={{ color: "var(--red)" }} aria-hidden>
                *
              </span>
            </label>
            <input
              id="campaign-end-date"
              type="date"
              {...register("endDate")}
              aria-invalid={!!errors.endDate}
              className={errors.endDate ? "input is-invalid" : "input"}
            />
            {errors.endDate?.message && (
              <p className="field-error" role="alert">
                {errors.endDate.message}
              </p>
            )}
          </div>

          <div className="field">
            <label htmlFor="campaign-deadline-employee">Deadline employé</label>
            <input
              id="campaign-deadline-employee"
              type="date"
              {...register("deadlineEmployee")}
              className="input"
            />
          </div>

          <div className="field">
            <label htmlFor="campaign-deadline-manager">Deadline manager</label>
            <input
              id="campaign-deadline-manager"
              type="date"
              {...register("deadlineManager")}
              className="input"
            />
          </div>
        </div>
      </section>

      <section className="tile" style={{ padding: 24 }}>
        <h2 className="h3" style={{ marginBottom: 20 }}>
          Édition précédente
        </h2>

        <div className="flex items-center gap-3">
          <UIToggle
            checked={form.enableN1Context}
            onChange={(v) => set("enableN1Context", v)}
            label="Activer la reprise de l'édition précédente"
          />
          <span
            className="body"
            style={{ color: "var(--ink-2)", fontWeight: 600 }}
          >
            Activer la reprise de l'édition précédente
          </span>
        </div>
        <p className="small" style={{ marginTop: 8, color: "var(--ink-3)" }}>
          Le rappel n'apparaît que sur les formulaires DUPLIQUÉS de la campagne
          source (la filiation des questions est alors conservée).
        </p>

        {form.enableN1Context && (
          <div
            className="flex flex-col gap-4"
            style={{
              marginTop: 16,
              paddingLeft: 16,
              borderLeft: "2px solid var(--blue-soft-2)",
            }}
          >
            <div className="flex items-center gap-3">
              <UIToggle
                checked={form.n1VisibleToEmployee}
                onChange={(v) => set("n1VisibleToEmployee", v)}
                label="Visible par l'employé"
              />
              <span
                className="body"
                style={{ color: "var(--ink-2)", fontWeight: 600 }}
              >
                Visible par l'employé
              </span>
            </div>

            <div className="field">
              <label htmlFor="campaign-previous">
                Campagne source (optionnel)
              </label>
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
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
