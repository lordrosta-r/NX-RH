import { useQuery } from '@tanstack/react-query'
import { campaignsApi } from '../api/campaigns'
import { evaluationsApi } from '../api/evaluations'
import { usersApi } from '../api/users'

export function useDashboardAdmin() {
  const campaigns = useQuery({
    queryKey: ['dashboard', 'campaigns'],
    queryFn: () => campaignsApi.getCampaigns({ status: 'active' }),
  })
  const evaluations = useQuery({
    queryKey: ['dashboard', 'evaluations'],
    queryFn: () => evaluationsApi.getEvaluations({ status: 'in_progress,submitted,reviewed' }),
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
