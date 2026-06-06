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

  const roleLabels: Record<string, string> = {
    employee: "Employé",
    manager: "Manager",
    hr: "RH",
    admin: "Admin",
  };

  const scopeLabel = (() => {
    switch (form.targetScope) {
      case "all":
        return "Tous les collaborateurs";
      case "role":
        return `Par rôle (${form.targetRoleIds.map((r) => roleLabels[r] ?? r).join(", ") || "—"})`;
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
      <dl
        className="tile"
        style={{ display: "flex", flexDirection: "column", gap: 18 }}
      >
        <SummaryRow label="Nom">
          <span className="h3">
            {form.name || <em style={{ color: "var(--ink-3)" }}>—</em>}
          </span>
        </SummaryRow>

        {form.description && (
          <SummaryRow label="Description">
            <span className="body">{form.description}</span>
          </SummaryRow>
        )}

        <SummaryRow label="Statut initial">
          {form.status === "draft" ? (
            <span className="badge grey">Brouillon</span>
          ) : (
            <span className="badge green">Actif</span>
          )}
        </SummaryRow>

        <SummaryRow label="Début">
          {form.startDate || <em style={{ color: "var(--ink-3)" }}>—</em>}
        </SummaryRow>

        <SummaryRow label="Fin">
          {form.endDate || <em style={{ color: "var(--ink-3)" }}>—</em>}
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
          <SummaryRow label="Édition précédente">
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
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        gap: 24,
        paddingBottom: 14,
        borderBottom: "1px solid var(--line)",
      }}
    >
      <dt className="eyebrow">{label}</dt>
      <dd className="body" style={{ textAlign: "right", color: "var(--ink)" }}>
        {children}
      </dd>
    </div>
  );
}
