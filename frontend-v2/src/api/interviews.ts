import client from "./client";
import type { Interview } from "../types";

export interface InterviewParams {
  campaignId: string;
  evaluateeId: string;
}

export interface InterviewStateBody {
  campaignId: string;
  evaluateeId: string;
  discussion?: Array<{
    questionId: string;
    employeeComment?: string;
    managerComment?: string;
    agreedAnswer?: string;
  }>;
  objectivesReview?: Array<{
    label: string;
    status?: string;
    comment?: string;
  }>;
  nextYearObjectives?: Array<{ text: string }>;
  synthesis?: { text: string };
}

export interface InterviewSignBody {
  campaignId: string;
  evaluateeId: string;
  role: "evaluatee" | "manager";
  dataUrl: string;
}

export interface InterviewDisagreementBody {
  campaignId: string;
  evaluateeId: string;
  reason: string;
}

export const interviewsApi = {
  getInterview: (params: InterviewParams) =>
    client.get<Interview>("/api/interviews", { params }),

  // Sauvegarde du travail d'entretien (échange par question, revue d'objectifs,
  // objectifs N+1, synthèse) — tout qualitatif, pas de note.
  saveState: (body: InterviewStateBody) =>
    client.patch<{ ok: boolean }>("/api/interviews/state", body),

  // Signature manuscrite (souris) — fait avancer le statut des évaluations.
  sign: (body: InterviewSignBody) =>
    client.post<{ ok: boolean; status: string }>("/api/interviews/sign", body),

  // Marquer un désaccord formel → bascule l'évaluation en litige.
  flagDisagreement: (body: InterviewDisagreementBody) =>
    client.post<{ ok: boolean }>("/api/interviews/disagreement", body),
};
