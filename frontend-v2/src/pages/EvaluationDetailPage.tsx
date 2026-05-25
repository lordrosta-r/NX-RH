import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import { evaluationsApi } from "../api/evaluations";
import Breadcrumbs from "../components/ui/Breadcrumbs";
import {
  EvaluationHeader,
  EvaluationSkillsForm,
  EvaluationObjectivesForm,
  EvaluationCommentsSection,
  EvaluationActions,
} from "../components/evaluations";
import { useEvaluationForm } from "../hooks/useEvaluationForm";
import type { Evaluation } from "../types";
import type { EvaluationMode } from "../types/evaluation";

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
      ["reviewed", "signed_evaluatee", "signed_manager", "signed_hr"].includes(
        status,
      )
    )
      return "sign";
    return "readonly";
  }, [status, isEvaluator, isAdminOrHr, isManager]);

  if (isLoading)
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );

  if (!evaluation)
    return (
      <div className="text-center py-16">
        <p className="text-slate-500">
          Évaluation introuvable ou accès refusé.
        </p>
        <Link
          to="/evaluations"
          className="text-primary-600 hover:underline text-sm mt-2 inline-block"
        >
          ← Retour aux évaluations
        </Link>
      </div>
    );

  const evaluateeName =
    `${evaluation.evaluatee?.firstName ?? ""} ${evaluation.evaluatee?.lastName ?? ""}`.trim() ||
    "…";

  return (
    <div className="max-w-3xl mx-auto py-6 px-4">
      <Breadcrumbs
        items={[
          { label: "Évaluations", href: "/evaluations" },
          { label: evaluateeName },
        ]}
      />
      <EvaluationHeader evaluation={evaluation} />
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
