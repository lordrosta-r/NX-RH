import { useState, type Dispatch, type SetStateAction } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { SignatureSection } from "../SignatureSection";
import ConfirmDialog from "../ui/ConfirmDialog";
import GlossaryTerm from "../ui/GlossaryTerm";
import type { Evaluation, EvaluationStatus } from "../../types";
import type { EvalMutationHandle } from "../../types/evaluation";
import { queryKeys } from "../../lib/queryKeys";

const SIGN_STATUSES = [
  "submitted",
  "reviewed",
  "signed_evaluatee",
  "signed_manager",
  "signed_hr",
] as const;
type SignStatus = (typeof SIGN_STATUSES)[number];

interface StepConfig {
  key: SignStatus;
  label: string;
}

const STEPS: StepConfig[] = [
  { key: "submitted", label: "Soumis" },
  { key: "reviewed", label: "Révisé" },
  { key: "signed_evaluatee", label: "Signé (évalué)" },
  { key: "signed_manager", label: "Signé (responsable)" },
  { key: "signed_hr", label: "Signé (RH)" },
];

interface EvaluationCommentsSectionProps {
  evaluation: Evaluation;
  status: EvaluationStatus;
  id: string;
  isEvaluatee: boolean;
  isManager: boolean;
  isAdminOrHr: boolean;
  evaluateeComment: string;
  disagreementFlag: boolean;
  setEvaluateeComment: Dispatch<SetStateAction<string>>;
  setDisagreementFlag: Dispatch<SetStateAction<boolean>>;
  signMutation: EvalMutationHandle;
  validateMutation: EvalMutationHandle;
  signWithCommentMutation: EvalMutationHandle;
  disputeMutation: EvalMutationHandle;
  resolveReopenMutation: EvalMutationHandle;
  resolveProceedMutation: EvalMutationHandle;
}

export function EvaluationCommentsSection({
  evaluation,
  status,
  id,
  isEvaluatee,
  isManager,
  isAdminOrHr,
  evaluateeComment,
  disagreementFlag,
  setEvaluateeComment,
  setDisagreementFlag,
  signMutation,
  validateMutation,
  signWithCommentMutation,
  disputeMutation,
  resolveReopenMutation,
  resolveProceedMutation,
}: EvaluationCommentsSectionProps) {
  const queryClient = useQueryClient();
  const currentIdx = SIGN_STATUSES.indexOf(status as SignStatus);
  const [confirmValidate, setConfirmValidate] = useState(false);
  const [confirmDispute, setConfirmDispute] = useState(false);

  return (
    <div>
      <h1 className="h2" style={{ marginBottom: 24 }}>
        Compte-rendu d'entretien
      </h1>

      {/* Stepper */}
      <div
        className="tile"
        style={{ padding: 16, marginBottom: 24, overflowX: "auto" }}
      >
        <div
          className="row"
          style={{ gap: 8, minWidth: "max-content", flexWrap: "nowrap" }}
        >
          {STEPS.map((step, idx) => {
            const stepIdx = SIGN_STATUSES.indexOf(step.key);
            const isDone = stepIdx < currentIdx;
            const isCurrent = stepIdx === currentIdx;
            return (
              <div key={step.key} className="row" style={{ gap: 8 }}>
                <div
                  className="small"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    color: isDone
                      ? "var(--green)"
                      : isCurrent
                        ? "var(--blue-text)"
                        : "var(--ink-3)",
                    fontWeight: isCurrent ? 700 : 400,
                  }}
                >
                  {isDone ? "✓" : isCurrent ? "→" : "○"} {step.label}
                </div>
                {idx < STEPS.length - 1 && (
                  <span
                    style={{ color: "var(--line-strong)", margin: "0 4px" }}
                  >
                    ─
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Désaccord */}
      {evaluation.disagreementFlag && (
        <div
          className="callout amber row"
          style={{ gap: 12, marginBottom: 16 }}
        >
          <AlertTriangle
            size={20}
            style={{ color: "var(--amber)", flexShrink: 0 }}
            aria-hidden="true"
          />
          <p
            className="small"
            style={{ color: "var(--amber)", fontWeight: 600 }}
          >
            L'évalué a signalé un désaccord avec cette évaluation.
          </p>
        </div>
      )}

      {/* Résumé révision */}
      <div className="tile" style={{ marginBottom: 24 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 24,
          }}
        >
          {evaluation.reviewerScore !== undefined && (
            <div>
              <p className="eyebrow" style={{ marginBottom: 4 }}>
                Score
              </p>
              <p
                style={{
                  fontSize: 30,
                  fontWeight: 800,
                  lineHeight: 1,
                  color: "var(--ink)",
                }}
              >
                {evaluation.reviewerScore}
                <span
                  style={{
                    fontSize: 16,
                    fontWeight: 400,
                    color: "var(--ink-3)",
                  }}
                >
                  /100
                </span>
              </p>
            </div>
          )}
          {evaluation.reviewerComment && (
            <div style={{ gridColumn: "1 / -1" }}>
              <p className="eyebrow" style={{ marginBottom: 4 }}>
                Commentaire reviewer
              </p>
              <p
                className="small"
                style={{ color: "var(--ink-2)", fontStyle: "italic" }}
              >
                « {evaluation.reviewerComment} »
              </p>
            </div>
          )}
          {evaluation.nextYearObjectives && (
            <div style={{ gridColumn: "1 / -1" }}>
              <p className="eyebrow" style={{ marginBottom: 4 }}>
                Objectifs <GlossaryTerm term="N+1" />
              </p>
              <p className="small" style={{ color: "var(--ink-2)" }}>
                {evaluation.nextYearObjectives}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Zone évalué */}
      {status === "reviewed" && isEvaluatee && (
        <div className="tile" style={{ marginBottom: 24 }}>
          <h2 className="eyebrow" style={{ marginBottom: 16 }}>
            Votre prise de connaissance
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="field">
              <label htmlFor="evaluatee-comment">
                Mon commentaire (facultatif)
              </label>
              <textarea
                id="evaluatee-comment"
                className="input"
                rows={3}
                value={evaluateeComment}
                onChange={(e) => setEvaluateeComment(e.target.value)}
                placeholder="Votre commentaire sur cette évaluation…"
              />
            </div>
            <label
              className="small row"
              style={{
                gap: 12,
                alignItems: "flex-start",
                cursor: "pointer",
                color: "var(--ink-2)",
              }}
            >
              <input
                type="checkbox"
                checked={disagreementFlag}
                onChange={(e) => setDisagreementFlag(e.target.checked)}
                style={{ marginTop: 2, accentColor: "var(--amber)" }}
              />
              <span>Je signale un désaccord avec cette évaluation</span>
            </label>
          </div>
          <div
            className="row"
            style={{ marginTop: 16, gap: 12, flexWrap: "wrap" }}
          >
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => signWithCommentMutation.mutate()}
              disabled={
                signWithCommentMutation.isPending || disputeMutation.isPending
              }
            >
              {signWithCommentMutation.isPending
                ? "Signature…"
                : "Signer et valider la prise de connaissance"}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ color: "var(--red)" }}
              onClick={() => setConfirmDispute(true)}
              disabled={
                disputeMutation.isPending || signWithCommentMutation.isPending
              }
            >
              {disputeMutation.isPending ? "Envoi…" : "Contester l'évaluation"}
            </button>
          </div>
          <p className="small" style={{ marginTop: 8, color: "var(--ink-3)" }}>
            Contester ouvre un litige transmis aux RH pour arbitrage, sans
            signer la prise de connaissance.
          </p>
        </div>
      )}

      {/* Litige en cours */}
      {status === "disputed" && (
        <div
          className="callout red row"
          style={{ gap: 12, marginBottom: 24, alignItems: "flex-start" }}
        >
          <AlertTriangle
            size={20}
            style={{ color: "var(--red)", flexShrink: 0 }}
            aria-hidden="true"
          />
          <div>
            <p
              className="small"
              style={{ color: "var(--red)", fontWeight: 600 }}
            >
              Évaluation en litige — arbitrage RH en cours.
            </p>
            {evaluation.evaluateeComment && (
              <p
                className="small"
                style={{
                  color: "var(--ink-2)",
                  marginTop: 4,
                  fontStyle: "italic",
                }}
              >
                « {evaluation.evaluateeComment} »
              </p>
            )}
          </div>
        </div>
      )}

      {/* Arbitrage RH du litige */}
      {status === "disputed" && isAdminOrHr && (
        <div className="tile" style={{ marginBottom: 24 }}>
          <h2 className="eyebrow" style={{ marginBottom: 16 }}>
            Arbitrage du litige
          </h2>
          <p className="body" style={{ marginBottom: 16 }}>
            Renvoyez l'évaluation au responsable pour correction, ou actez le
            désaccord et poursuivez le circuit de signature.
          </p>
          <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => resolveReopenMutation.mutate()}
              disabled={
                resolveReopenMutation.isPending ||
                resolveProceedMutation.isPending
              }
            >
              {resolveReopenMutation.isPending
                ? "Renvoi…"
                : "Renvoyer en révision"}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => resolveProceedMutation.mutate()}
              disabled={
                resolveProceedMutation.isPending ||
                resolveReopenMutation.isPending
              }
            >
              {resolveProceedMutation.isPending
                ? "Traitement…"
                : "Acter le litige et poursuivre"}
            </button>
          </div>
        </div>
      )}

      {/* Signature manager */}
      {status === "signed_evaluatee" && (isManager || isAdminOrHr) && (
        <div className="tile" style={{ marginBottom: 24 }}>
          <p className="body" style={{ marginBottom: 16 }}>
            L'évalué a signé. Votre signature est maintenant requise.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => signMutation.mutate()}
            disabled={signMutation.isPending}
          >
            {signMutation.isPending ? "Signature…" : "Signer"}
          </button>
        </div>
      )}

      {/* Signature RH */}
      {status === "signed_manager" && isAdminOrHr && (
        <div className="tile" style={{ marginBottom: 24 }}>
          <p className="body" style={{ marginBottom: 16 }}>
            Le manager a signé. La signature RH est requise.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => signMutation.mutate()}
            disabled={signMutation.isPending}
          >
            {signMutation.isPending ? "Signature RH…" : "Signer (RH)"}
          </button>
        </div>
      )}

      {/* Validation finale */}
      {status === "signed_hr" && isAdminOrHr && (
        <div className="tile" style={{ marginBottom: 24 }}>
          <p className="body" style={{ marginBottom: 16 }}>
            Toutes les signatures sont collectées. Vous pouvez valider
            définitivement.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            style={{ background: "var(--green)" }}
            onClick={() => setConfirmValidate(true)}
            disabled={validateMutation.isPending}
          >
            {validateMutation.isPending
              ? "Validation…"
              : "Valider définitivement"}
          </button>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmValidate}
        onClose={() => setConfirmValidate(false)}
        onConfirm={() => {
          setConfirmValidate(false);
          validateMutation.mutate();
        }}
        title="Valider définitivement l'évaluation"
        description="Cette action est irréversible : l'évaluation passera en statut « validée » et ne pourra plus être modifiée. Confirmez-vous la validation définitive ?"
        confirmLabel="Valider définitivement"
        variant="warning"
        loading={validateMutation.isPending}
      />

      <ConfirmDialog
        isOpen={confirmDispute}
        onClose={() => setConfirmDispute(false)}
        onConfirm={() => {
          setConfirmDispute(false);
          disputeMutation.mutate();
        }}
        title="Contester l'évaluation"
        description="Vous allez ouvrir un litige : l'évaluation sera transmise aux RH pour arbitrage et vous ne signez pas la prise de connaissance. Pensez à préciser votre désaccord dans le commentaire. Confirmer la contestation ?"
        confirmLabel="Contester"
        variant="warning"
        loading={disputeMutation.isPending}
      />

      <SignatureSection
        evaluationId={id}
        signatures={evaluation.signatures ?? []}
        status={status}
        evaluatorId={evaluation.evaluatorId}
        evaluateeId={evaluation.evaluateeId}
        onSigned={() =>
          queryClient.invalidateQueries({
            queryKey: queryKeys.evaluations.detail(id),
          })
        }
      />
    </div>
  );
}
