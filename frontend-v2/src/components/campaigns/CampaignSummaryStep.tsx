import type { WizardFormValues } from "../../hooks/useCampaignForm";
import type { UserGroup } from "../../types";
import CampaignFormCard from "./CampaignFormCard";

interface CampaignSummaryStepProps {
  form: WizardFormValues;
  groupsData: UserGroup[] | undefined;
}

export default function CampaignSummaryStep({
  form,
  groupsData,
}: CampaignSummaryStepProps) {
  const groupName = (() => {
    if (form.targetScope !== "group") return null;
    const g =
      Array.isArray(groupsData) &&
      groupsData.find((x) => x._id === form.targetGroupId);
    return g ? g.name : form.targetGroupId || "—";
  })();

  const scopeLabel = (() => {
    switch (form.targetScope) {
      case "all":
        return "Tous les collaborateurs";
      case "department":
        return `Départements (${form.targetDepartments.join(", ") || "—"})`;
      case "sector":
        return `Secteurs (${form.targetSectorIds.length} sélectionné(s))`;
      case "users":
        return `Sélection manuelle (${form.targetUserIds.length} utilisateur(s))`;
      case "group":
        return `Groupe : ${groupName ?? "—"}`;
    }
  })();

  return (
    <CampaignFormCard title="Récapitulatif">
      <dl className="space-y-3">
        <SummaryRow label="Nom">
          <span className="font-semibold">
            {form.name || <em className="text-slate-400">—</em>}
          </span>
        </SummaryRow>

        {form.description && (
          <SummaryRow label="Description">
            <span className="max-w-xs text-right">{form.description}</span>
          </SummaryRow>
        )}

        <SummaryRow label="Statut initial">
          {form.status === "draft" ? "Brouillon" : "Actif"}
        </SummaryRow>

        <SummaryRow label="Début">
          {form.startDate || <em className="text-slate-400">—</em>}
        </SummaryRow>

        <SummaryRow label="Fin">
          {form.endDate || <em className="text-slate-400">—</em>}
        </SummaryRow>

        {form.deadlineEmployee && (
          <SummaryRow label="Deadline employé">
            {form.deadlineEmployee}
          </SummaryRow>
        )}

        {form.deadlineManager && (
          <SummaryRow label="Deadline manager">
            {form.deadlineManager}
          </SummaryRow>
        )}

        <SummaryRow label="Périmètre">{scopeLabel}</SummaryRow>

        {form.enableN1Context && (
          <SummaryRow label="Contexte N-1">
            Activé{form.n1VisibleToEmployee ? ", visible par l'employé" : ""}
          </SummaryRow>
        )}

        {form.extendedVisibility && (
          <SummaryRow label="Visibilité étendue">Oui</SummaryRow>
        )}
      </dl>
    </CampaignFormCard>
  );
}

function SummaryRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex justify-between text-sm">
      <dt className="text-slate-500 font-medium">{label}</dt>
      <dd className="text-slate-800">{children}</dd>
    </div>
  );
}
