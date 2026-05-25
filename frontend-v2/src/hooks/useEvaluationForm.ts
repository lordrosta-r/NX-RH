import { useState, useRef, useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { evaluationsApi } from "../api/evaluations";
import type { Evaluation, FormQuestion } from "../types";
import type { EvalMutationHandle } from "../types/evaluation";

export interface UseEvaluationFormResult {
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
}

export function useEvaluationForm(
  evaluation: Evaluation,
): UseEvaluationFormResult {
  const queryClient = useQueryClient();
  const id = evaluation.id;

  const [answers, setAnswers] = useState<Record<string, unknown>>(
    () => evaluation.answers ?? {},
  );
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
      questions.map((q) => q.phase).filter((p): p is NonNullable<typeof p> => Boolean(p)),
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
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          await evaluationsApi.updateEvaluation(id, {
            answers: updatedAnswers,
            status: "in_progress",
          });
          setLastSavedAt(new Date());
        } catch {
          // silent auto-save failure
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
    queryClient.invalidateQueries({ queryKey: ["evaluation", id] });

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

  return {
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
  };
}
