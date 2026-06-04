import { useQuery } from "@tanstack/react-query";
import client from "../api/client";
import type { Evaluation, DashboardManagerStats } from "../types";

interface EvaluationListResponse {
  data: Evaluation[];
  total: number;
}

export function useDashboardManager() {
  const evaluations = useQuery({
    queryKey: ["dashboard-manager", "evaluations"],
    queryFn: () =>
      client
        .get<EvaluationListResponse>("/api/evaluations?scope=my_team")
        .then((r) => r.data),
  });

  return { evaluations };
}

export function useDashboardManagerStats() {
  return useQuery<DashboardManagerStats>({
    queryKey: ["dashboard", "manager", "stats"],
    queryFn: () =>
      client
        .get<{ data: DashboardManagerStats }>("/api/dashboard/manager")
        .then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  });
}
