// =============================================================================
// useNotifBadges — Fetch notification badge counts per section.
// Returns an object: { [key]: count }
// Falls back to mock counts if the endpoint is unavailable.
// =============================================================================

import { useQuery } from '@tanstack/react-query'

const MOCK_BADGES = { requests: 3 }

async function fetchBadges() {
  try {
    const res = await fetch('/api/notifications/badges', { credentials: 'include' })
    if (res.ok) return res.json()
  } catch { /* ignore */ }
  return MOCK_BADGES
}

export default function useNotifBadges() {
  const { data } = useQuery({
    queryKey: ['notif-badges'],
    queryFn: fetchBadges,
    staleTime: 30_000,
    retry: false,
  })
  return data ?? MOCK_BADGES
}
