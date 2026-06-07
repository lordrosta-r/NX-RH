export type {
  Evaluation,
  EvaluationStatus,
  EvaluationSignature,
  FormQuestion,
  QuestionType,
  QuestionPhase,
  Form,
} from "./index";

export type EvaluationMode = "fill" | "review" | "sign" | "readonly";

export interface EvalMutationHandle {
  mutate: () => void;
  isPending: boolean;
}
