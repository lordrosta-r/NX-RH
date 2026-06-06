import client from "./client";
import type { Interview } from "../types";

export interface InterviewParams {
  campaignId: string;
  evaluateeId: string;
}

export interface SynthesisBody {
  campaignId: string;
  evaluateeId: string;
  reviewerScore: number | null;
  reviewerComment: string;
}

export const interviewsApi = {
  getInterview: (params: InterviewParams) =>
    client.get<Interview>("/api/interviews", { params }),

  saveSynthesis: (body: SynthesisBody) =>
    client.patch<{ ok: boolean; evaluationId: string }>(
      "/api/interviews/synthesis",
      body,
    ),
};
