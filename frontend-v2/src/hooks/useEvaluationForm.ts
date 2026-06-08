import { useState, useRef, useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { evaluationsApi } from "../api/evaluations";
import type { Evaluation, FormQuestion } from "../types";
import type { EvalMutationHandle } from "../types/evaluation";
import { queryKeys } from "../lib/queryKeys";

export type SaveState = "idle" | "saving" | "saved" | "error";

const draftKey = (id: string) => `eval-draft-${id}`;

// Le serveur stocke les réponses en tableau [{questionId, value}] ; le formulaire
// les manipule en Record { [questionId]: value }. Ces deux helpers convertissent.
function answersToRecord(
  answers: unknown,
): Record<string, unknown> {
  if (Array.isArray(answers)) {
    return Object.fromEntries(
      answers
        .filter(
          (a): a is { questionId: string; value: unknown } =>
            !!a && typeof (a as { questionId?: unknown }).questionId === "string",
        )
        .map((a) => [a.questionId, a.value]),
    );
  }
  return (answers as Record<string, unknown>) ?? {};
}

function recordToAnswers(
  record: Record<string, unknown>,
): Array<{ questionId: string; value: unknown }> {
  return Object.entries(record).map(([questionId, value]) => ({
    questionId,
    value,
  }));
}

export interface UseEvaluationFormResult {
  saveState: SaveState;
  answers: Record<string, unknown>;
  currentQuestionIdx: number;
  currentPhase: string | null;
  submitModal: boolean;
  reviewerScore: number | "";
  reviewerComment: string;
  nextYearObjectives: string;
  evaluateeComment: string;
  disagreementFlag: boolean;
  lastSavedAt: Date | null;
  questions: FormQuestion[];
  phases: string[];
  filteredQuestions: FormQuestion[];
  currentQuestion: FormQuestion | undefined;
  answeredCount: number;
  progress: number;
  setAnswer: (questionId: string, value: unknown) => void;
  setCurrentQuestionIdx: Dispatch<SetStateAction<number>>;
  setCurrentPhase: Dispatch<SetStateAction<string | null>>;
  setSubmitModal: Dispatch<SetStateAction<boolean>>;
  setReviewerScore: Dispatch<SetStateAction<number | "">>;
  setReviewerComment: Dispatch<SetStateAction<string>>;
  setNextYearObjectives: Dispatch<SetStateAction<string>>;
  setEvaluateeComment: Dispatch<SetStateAction<string>>;
  setDisagreementFlag: Dispatch<SetStateAction<boolean>>;
  submitMutation: EvalMutationHandle;
  reviewMutation: EvalMutationHandle;
  signMutation: EvalMutationHandle;
  validateMutation: EvalMutationHandle;
  signWithCommentMutation: EvalMutationHandle;
  disputeMutation: EvalMutationHandle;
  resolveReopenMutation: EvalMutationHandle;
  resolveProceedMutation: EvalMutationHandle;
}

export function useEvaluationForm(
  evaluation: Evaluation,
): UseEvaluationFormResult {
  const queryClient = useQueryClient();
  const id = evaluation.id;

  // Restaure un éventuel brouillon local (réponses dont la dernière sauvegarde
  // serveur a échoué) pour ne pas perdre le travail après fermeture d'onglet.
  const [answers, setAnswers] = useState<Record<string, unknown>>(() => {
    // Le serveur stocke les réponses sous forme de tableau [{questionId, value}].
    // Le formulaire les manipule sous forme de Record { [questionId]: value }.
    const base = answersToRecord(evaluation.answers);
    try {
      const raw = localStorage.getItem(draftKey(id));
      if (raw) return { ...base, ...JSON.parse(raw) };
    } catch {
      /* localStorage indisponible ou JSON corrompu → on ignore */
    }
    return base;
  });
  const [saveState, setSaveState] = useState<SaveState>(() => {
    try {
      return localStorage.getItem(draftKey(id)) ? "error" : "idle";
    } catch {
      return "idle";
    }
  });
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [currentPhase, setCurrentPhase] = useState<string | null>(null);
  const [submitModal, setSubmitModal] = useState(false);
  const [reviewerScore, setReviewerScore] = useState<number | "">(
    () => evaluation.reviewerScore ?? "",
  );
  const [reviewerComment, setReviewerComment] = useState(
    () => evaluation.reviewerComment ?? "",
  );
  const [nextYearObjectives, setNextYearObjectives] = useState(
    () => evaluation.nextYearObjectives ?? "",
  );
  const [evaluateeComment, setEvaluateeComment] = useState(
    () => evaluation.evaluateeComment ?? "",
  );
  const [disagreementFlag, setDisagreementFlag] = useState(
    () => evaluation.disagreementFlag ?? false,
  );
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const questions = evaluation.form?.questions ?? [];
  const phases = [
    ...new Set(
      questions
        .map((q) => q.phase)
        .filter((p): p is NonNullable<typeof p> => Boolean(p)),
    ),
  ];
  const filteredQuestions = currentPhase
    ? questions.filter((q) => q.phase === currentPhase)
    : questions;
  const currentQuestion = filteredQuestions[currentQuestionIdx];
  const answeredCount = questions.filter(
    (q) => answers[q.id] !== undefined && answers[q.id] !== "",
  ).length;
  const progress =
    questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const autoSave = useCallback(
    (updatedAnswers: Record<string, unknown>) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      setSaveState("saving");
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          await evaluationsApi.updateEvaluation(id, {
            // Le serveur attend un tableau [{questionId, value}], pas un objet.
            // On n'envoie PAS de status : le serveur passe automatiquement
            // 'assigned' → 'in_progress' au premier enregistrement de réponses.
            // (Envoyer status: 'in_progress' provoquait une transition no-op
            // refusée puisque le serveur avait déjà avancé le statut.)
            answers: recordToAnswers(updatedAnswers),
          });
          setLastSavedAt(new Date());
          setSaveState("saved");
          try {
            localStorage.removeItem(draftKey(id));
          } catch {
            /* ignore */
          }
        } catch {
          // Échec réseau : on bascule en "error" et on persiste un brouillon
          // local pour rejouer/restaurer au prochain montage. L'UI bloque la
          // soumission tant qu'on n'est pas revenu en "saved".
          setSaveState("error");
          try {
            localStorage.setItem(draftKey(id), JSON.stringify(updatedAnswers));
          } catch {
            /* ignore */
          }
        }
      }, 2000);
    },
    [id],
  );

  function setAnswer(questionId: string, value: unknown) {
    const updated = { ...answers, [questionId]: value };
    setAnswers(updated);
    autoSave(updated);
  }

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.evaluations.detail(id),
    });

  const _submitMutation = useMutation({
    mutationFn: () => evaluationsApi.submitEvaluation(id),
    onSuccess: () => {
      void invalidate();
      setSubmitModal(false);
    },
  });

  const _reviewMutation = useMutation({
    mutationFn: () =>
      evaluationsApi
        .updateEvaluation(id, {
          reviewerScore: Number(reviewerScore),
          reviewerComment,
          nextYearObjectives,
        })
        .then(() => evaluationsApi.transitionEvaluation(id, "review")),
    onSuccess: () => void invalidate(),
  });

  const _signMutation = useMutation({
    mutationFn: () => evaluationsApi.signEvaluation(id),
    onSuccess: () => void invalidate(),
  });

  const _validateMutation = useMutation({
    mutationFn: () => evaluationsApi.validateEvaluation(id),
    onSuccess: () => void invalidate(),
  });

  const _signWithCommentMutation = useMutation({
    mutationFn: () =>
      evaluationsApi
        .updateEvaluation(id, { evaluateeComment, disagreementFlag })
        .then(() => evaluationsApi.signEvaluation(id)),
    onSuccess: () => void invalidate(),
  });

  // Litige : l'évalué conteste (reviewed → disputed). On enregistre son
  // commentaire + le flag de désaccord, puis on bascule le statut.
  const _disputeMutation = useMutation({
    mutationFn: () =>
      evaluationsApi.updateEvaluation(id, {
        evaluateeComment,
        disagreementFlag: true,
        status: "disputed",
      }),
    onSuccess: () => void invalidate(),
  });

  // Arbitrage RH : renvoyer en révision (disputed → reviewed) pour correction.
  const _resolveReopenMutation = useMutation({
    mutationFn: () =>
      evaluationsApi.updateEvaluation(id, { status: "reviewed" }),
    onSuccess: () => void invalidate(),
  });

  // Arbitrage RH : acter le litige et faire avancer (disputed → signed_evaluatee).
  const _resolveProceedMutation = useMutation({
    mutationFn: () =>
      evaluationsApi.updateEvaluation(id, { status: "signed_evaluatee" }),
    onSuccess: () => void invalidate(),
  });

  return {
    saveState,
    answers,
    currentQuestionIdx,
    currentPhase,
    submitModal,
    reviewerScore,
    reviewerComment,
    nextYearObjectives,
    evaluateeComment,
    disagreementFlag,
    lastSavedAt,
    questions,
    phases,
    filteredQuestions,
    currentQuestion,
    answeredCount,
    progress,
    setAnswer,
    setCurrentQuestionIdx,
    setCurrentPhase,
    setSubmitModal,
    setReviewerScore,
    setReviewerComment,
    setNextYearObjectives,
    setEvaluateeComment,
    setDisagreementFlag,
    submitMutation: {
      mutate: () => _submitMutation.mutate(),
      isPending: _submitMutation.isPending,
    },
    reviewMutation: {
      mutate: () => _reviewMutation.mutate(),
      isPending: _reviewMutation.isPending,
    },
    signMutation: {
      mutate: () => _signMutation.mutate(),
      isPending: _signMutation.isPending,
    },
    validateMutation: {
      mutate: () => _validateMutation.mutate(),
      isPending: _validateMutation.isPending,
    },
    signWithCommentMutation: {
      mutate: () => _signWithCommentMutation.mutate(),
      isPending: _signWithCommentMutation.isPending,
    },
    disputeMutation: {
      mutate: () => _disputeMutation.mutate(),
      isPending: _disputeMutation.isPending,
    },
    resolveReopenMutation: {
      mutate: () => _resolveReopenMutation.mutate(),
      isPending: _resolveReopenMutation.isPending,
    },
    resolveProceedMutation: {
      mutate: () => _resolveProceedMutation.mutate(),
      isPending: _resolveProceedMutation.isPending,
    },
  };
}
