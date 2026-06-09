import client from "./client";
import type {
  Evaluation,
  N1Context,
  PaginatedResponse,
  PaginationParams,
} from "../types";

export interface EvaluationFilters extends PaginationParams {
  campaignId?: string;
  status?: string;
  evaluateeId?: string;
  evaluatorId?: string;
  department?: string;
  q?: string;
  year?: string;
  /** "mine" = mes propres évals (espace perso) ; "my_team" = évals que je conduis. */
  scope?: "mine" | "my_team";
}

export const evaluationsApi = {
  getEvaluations: (params?: EvaluationFilters) =>
    client.get<PaginatedResponse<Evaluation>>("/api/evaluations", { params }),

  // « Mes évaluations » : pas de route /me côté serveur — on interroge la liste
  // standard, scopée par le RBAC backend + le paramètre `scope: 'mine'` passé par
  // l'appelant (sinon /api/evaluations/me tombait sur /:id → 400 « ID invalide »,
  // d'où la liste vide pour l'employé).
  getMyEvaluations: (params?: EvaluationFilters) =>
    client.get<PaginatedResponse<Evaluation>>("/api/evaluations", {
      params,
    }),

  getHistory: () => client.get<Evaluation[]>("/api/evaluations/history"),

  getEvaluation: (id: string) =>
    client.get<Evaluation>(`/api/evaluations/${id}`),

  // 204 No Content → axios renvoie data === "" ; le consommateur traite ce cas.
  getN1Context: (id: string) =>
    client.get<N1Context | "">(`/api/evaluations/${id}/n1-context`),

  updateEvaluation: (id: string, data: Partial<Evaluation>) =>
    client.patch<Evaluation>(`/api/evaluations/${id}`, data),

  submitEvaluation: (id: string) =>
    client.patch<Evaluation>(`/api/evaluations/${id}`, { status: "submitted" }),

  signEvaluation: (id: string) =>
    client.post<Evaluation>(`/api/evaluations/${id}/sign`),

  validateEvaluation: (id: string) =>
    client.post<Evaluation>(`/api/evaluations/${id}/validate`),

  getEvaluationPdf: (id: string) =>
    client.get(`/api/evaluations/${id}/pdf`, { responseType: "blob" }),

  createEvaluation: (data: {
    campaignId: string;
    evaluateeId: string;
    evaluatorId: string;
  }) => client.post<Evaluation>("/api/evaluations", data),

  transitionEvaluation: (id: string, action: string) =>
    client.post<Evaluation>(`/api/evaluations/${id}/transition`, { action }),

  createBulk: (data: {
    campaignId: string;
    pairs: Array<{ evaluateeId: string; evaluatorId: string }>;
  }) => client.post("/api/evaluations/bulk", data),

  bulkAction: (data: {
    ids: string[];
    action: "archive" | "sign_hr" | "assign_reviewer";
    reviewerId?: string;
  }) =>
    client.patch<{
      success: number;
      skipped: number;
      errors: Array<{ id: string; reason: string }>;
    }>("/api/evaluations/bulk", data),
};
