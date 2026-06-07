import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MessagesSquare } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { evaluationsApi } from "../api/evaluations";
import Breadcrumbs from "../components/ui/Breadcrumbs";
import PageGuide from "../components/shared/PageGuide";
import {
  EvaluationHeader,
  EvaluationSkillsForm,
  EvaluationObjectivesForm,
  EvaluationCommentsSection,
  EvaluationActions,
} from "../components/evaluations";
import { useEvaluationForm } from "../hooks/useEvaluationForm";
import { PageHead, Tile } from "../components/shell";
import type { Evaluation } from "../types";
import type { EvaluationMode } from "../types/evaluation";

/** Extrait un id string depuis une valeur string ou un objet peuplé { id } / { _id } / { name }. */
function idOf(
  val: string | { id?: string; _id?: string } | undefined,
): string {
  if (!val) return "";
  if (typeof val === "string") return val;
  return val.id ?? val._id ?? "";
}

// Statuts pour lesquels manager/hr/admin peuvent ouvrir la Vue Entretien.
const INTERVIEW_STATUSES = [
  "submitted",
  "in_progress",
  "assigned",
  "reviewed",
  "signed_evaluatee",
];

interface FormSectionProps {
  evaluation: Evaluation;
  mode: EvaluationMode;
  id: string;
  isEvaluatee: boolean;
  isManager: boolean;
  isAdminOrHr: boolean;
}

function EvaluationFormSection({
  evaluation,
  mode,
  id,
  isEvaluatee,
  isManager,
  isAdminOrHr,
}: FormSectionProps) {
  const form = useEvaluationForm(evaluation);
  const status = evaluation.status;
  return (
    <>
      {mode === "fill" && (
        <EvaluationSkillsForm evaluation={evaluation} {...form} />
      )}
      {mode === "review" && (
        <EvaluationObjectivesForm
          evaluation={evaluation}
          isAdminOrHr={isAdminOrHr}
          isManager={isManager}
          {...form}
        />
      )}
      {mode === "sign" && (
        <EvaluationCommentsSection
          evaluation={evaluation}
          status={status}
          id={id}
          isEvaluatee={isEvaluatee}
          isManager={isManager}
          isAdminOrHr={isAdminOrHr}
          {...form}
        />
      )}
      {mode === "readonly" && (
        <EvaluationActions evaluation={evaluation} id={id} />
      )}
    </>
  );
}

export default function EvaluationDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const { data: evaluation, isLoading } = useQuery({
    queryKey: ["evaluation", id],
    queryFn: () => evaluationsApi.getEvaluation(id!).then((r) => r.data),
    enabled: !!id,
  });

  const isEvaluator = evaluation?.evaluatorId === user?.id;
  const isEvaluatee = evaluation?.evaluateeId === user?.id;
  const isAdminOrHr = user?.role === "admin" || user?.role === "hr";
  const isManager = user?.role === "manager";
  const status = evaluation?.status ?? "assigned";

  const mode = useMemo<EvaluationMode>(() => {
    if (["assigned", "in_progress"].includes(status) && isEvaluator)
      return "fill";
    if (status === "submitted" && (isAdminOrHr || isManager)) return "review";
    if (
      [
        "reviewed",
        "disputed",
        "signed_evaluatee",
        "signed_manager",
        "signed_hr",
      ].includes(status)
    )
      return "sign";
    return "readonly";
  }, [status, isEvaluator, isAdminOrHr, isManager]);

  if (isLoading)
    return (
      <div className="nx-app">
        <div className="section-gap" style={{ gap: 16 }}>
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-24 bg-slate-100 rounded-xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );

  if (!evaluation)
    return (
      <div className="nx-app">
        <Tile>
          <div className="text-center" style={{ padding: "40px 0" }}>
            <p className="body">Évaluation introuvable ou accès refusé.</p>
            <Link
              to="/evaluations"
              className="link small"
              style={{ marginTop: 8, display: "inline-block" }}
            >
              ← Retour aux évaluations
            </Link>
          </div>
        </Tile>
      </div>
    );

  const evaluateeName =
    `${evaluation.evaluatee?.firstName ?? ""} ${evaluation.evaluatee?.lastName ?? ""}`.trim() ||
    "…";

  const canOpenInterview =
    (isManager || isAdminOrHr) && INTERVIEW_STATUSES.includes(status);
  const interviewCampaignId = idOf(evaluation.campaignId);
  const interviewEvaluateeId = evaluation.evaluateeId;
  const interviewHref = `/interview?campaignId=${interviewCampaignId}&evaluateeId=${interviewEvaluateeId}`;

  // Guide contextuel selon le mode courant.
  const guideKey =
    mode === "fill"
      ? "stepsFill"
      : mode === "review"
        ? "stepsReview"
        : mode === "sign"
          ? "stepsSign"
          : "stepsReadonly";
  const guideSteps = t(`guides.evaluationDetail.${guideKey}`, {
    returnObjects: true,
  }) as string[];

  return (
    <div className="nx-app">
      <Breadcrumbs
        items={[
          { label: "Évaluations", href: "/evaluations" },
          { label: evaluateeName },
        ]}
      />

      <PageHead
        eyebrow="Évaluation"
        title={evaluateeName}
        desc="Détail de l’évaluation et étapes associées."
        actions={
          canOpenInterview && interviewCampaignId ? (
            <Link
              to={interviewHref}
              className="btn btn-ghost"
              style={{ border: "1px solid var(--line)", gap: 6 }}
            >
              <MessagesSquare size={15} aria-hidden="true" />
              Ouvrir l'entretien
            </Link>
          ) : undefined
        }
      />

      <PageGuide
        id="evaluation-detail"
        title={t("guides.evaluationDetail.title")}
        steps={guideSteps}
        color="blue"
      />

      <Tile className="mb-6">
        <EvaluationHeader evaluation={evaluation} />
      </Tile>

      <EvaluationFormSection
        key={evaluation.id}
        evaluation={evaluation}
        mode={mode}
        id={id!}
        isEvaluatee={isEvaluatee}
        isManager={isManager}
        isAdminOrHr={isAdminOrHr}
      />
    </div>
  );
}
