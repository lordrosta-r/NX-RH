import { useQuery } from '@tanstack/react-query'
import client from '../api/client'
import { campaignsApi } from '../api/campaigns'
import { evaluationsApi } from '../api/evaluations'
import { usersApi } from '../api/users'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DashboardHrStats {
  users: { total: number; active: number }
  campaigns: { active: number; draft: number }
  evaluations: { total: number; completed: number; pending: number; completionRate: number }
  recentCampaigns: Array<{ _id: string; name: string; status: string; createdAt: string }>
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useDashboardAdmin() {
  const campaigns = useQuery({
    queryKey: ['dashboard', 'campaigns'],
    queryFn: () => campaignsApi.getCampaigns({ status: 'active' }),
  })
  const evaluations = useQuery({
    queryKey: ['dashboard', 'evaluations'],
    queryFn: () => evaluationsApi.getEvaluations({ limit: 100 }),
  })
  const users = useQuery({
    queryKey: ['dashboard', 'users'],
    queryFn: () => usersApi.getUsers({ isActive: true }),
  })
  return { campaigns, evaluations, users }
}

export function useDashboardHr() {
  const campaigns = useQuery({
    queryKey: ['dashboard-hr', 'campaigns'],
    queryFn: () => campaignsApi.getCampaigns({ status: 'active' }),
  })
  const flags = useQuery({
    queryKey: ['dashboard-hr', 'flags'],
    queryFn: () => evaluationsApi.getEvaluations({ status: 'submitted', limit: 5 }),
  })
  return { campaigns, flags }
}

export function useDashboardHrStats() {
  return useQuery<DashboardHrStats>({
    queryKey: ['dashboard', 'hr', 'stats'],
    queryFn: () =>
      client.get<{ data: DashboardHrStats }>('/api/dashboard/hr').then(r => r.data.data),
    staleTime: 5 * 60 * 1000,
  })
}
