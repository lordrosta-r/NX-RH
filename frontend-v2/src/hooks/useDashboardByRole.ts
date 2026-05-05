import { useQuery } from '@tanstack/react-query'
import client from '../api/client'
import type { Evaluation, Campaign } from '../types'

interface EvaluationListResponse {
  data: Evaluation[]
  total: number
}

interface CampaignListResponse {
  data: Campaign[]
  total: number
}

export function useDashboardDirector() {
  const evaluations = useQuery({
    queryKey: ['dashboard-director', 'evaluations'],
    queryFn: () =>
      client
        .get<EvaluationListResponse>('/api/evaluations?scope=subtree&limit=20')
        .then(r => r.data),
  })

  const campaigns = useQuery({
    queryKey: ['dashboard-director', 'campaigns'],
    queryFn: () =>
      client
        .get<CampaignListResponse>('/api/campaigns?status=active')
        .then(r => r.data),
  })

  return { evaluations, campaigns }
}

export function useDashboardManager() {
  const evaluations = useQuery({
    queryKey: ['dashboard-manager', 'evaluations'],
    queryFn: () =>
      client
        .get<EvaluationListResponse>('/api/evaluations?scope=my_team')
        .then(r => r.data),
  })

  return { evaluations }
}
