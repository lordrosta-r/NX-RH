import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import client from '../api/client'

export default function UserOffboardingPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['user-offboarding', id],
    queryFn: () =>
      client.get<{ id: string }>(`/api/users/${id}/offboarding-record`).then(r => r.data),
    enabled: !!id,
    retry: false,
  })

  useEffect(() => {
    if (data?.id) {
      navigate(`/offboarding/${data.id}`, { replace: true })
    }
  }, [data, navigate])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="text-center py-16">
      <p className="text-slate-500">Dossier d&apos;offboarding introuvable pour cet utilisateur.</p>
    </div>
  )
}
