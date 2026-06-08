import client from "./client";
import type { Interview } from "../types";

export interface TeamObjectivesRow {
  evaluatee: { _id: string; firstName: string; lastName: string; email?: string } | null;
  campaign: { _id: string; name: string; startDate?: string } | null;
  nextYearObjectives: string[];
  objectivesReview: Array<{ label?: string; status?: string; comment?: string }>;
  scheduledAt: string | null;
}

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

  // Suivi des objectifs de l'équipe (manager) ou de toute l'organisation (RH).
  getTeamObjectives: () =>
    client.get<{ data: TeamObjectivesRow[] }>(
      "/api/interviews/team-objectives",
    ),

  // Programmer le rendez-vous d'entretien (manager/RH/admin, après remplissage).
  schedule: (body: {
    campaignId: string;
    evaluateeId: string;
    scheduledAt: string;
    location?: string;
  }) =>
    client.patch<{ ok: boolean; scheduledAt: string; location: string }>(
      "/api/interviews/schedule",
      body,
    ),
};
