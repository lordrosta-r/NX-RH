import { useQuery } from '@tanstack/react-query'
import client from '../api/client'
import { campaignsApi } from '../api/campaigns'
import { evaluationsApi } from '../api/evaluations'
import { usersApi } from '../api/users'
import type { DashboardHrStats, MonthlyTrendPoint } from '../types'

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

export function useMonthlyTrend() {
  return useQuery<MonthlyTrendPoint[]>({
    queryKey: ['analytics', 'monthly-trend'],
    queryFn: () =>
      client.get<{ data: MonthlyTrendPoint[] }>('/api/analytics/monthly-trend').then(r => r.data.data),
    staleTime: 10 * 60 * 1000,
  })
}

export function useAnalyticsSummary() {
  return useQuery({
    queryKey: ['analytics', 'summary'],
    queryFn: () => client.get('/api/analytics/summary').then(r => r.data),
    staleTime: 10 * 60 * 1000,
  })
}
