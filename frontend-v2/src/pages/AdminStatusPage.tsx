import { useQuery } from '@tanstack/react-query'
import { RefreshCw, Database, Mail, Users, Clock } from 'lucide-react'
import { adminApi } from '../api/admin'

type SystemStatus = {
  mongo: { ok: boolean }
  smtp: { ok: boolean; error?: string }
  ldap: { configured: boolean }
  uptime: number
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const parts: string[] = []
  if (d > 0) parts.push(`${d}j`)
  if (h > 0) parts.push(`${h}h`)
  parts.push(`${m}min`)
  return parts.join(' ')
}

type BadgeVariant = 'ok' | 'error' | 'warning'

function StatusBadge({ variant, label }: { variant: BadgeVariant; label: string }) {
  const styles: Record<BadgeVariant, string> = {
    ok: 'bg-green-100 text-green-700',
    error: 'bg-red-100 text-red-700',
    warning: 'bg-yellow-100 text-yellow-700',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${styles[variant]}`}>
      {label}
    </span>
  )
}

function StatusCard({
  icon: Icon,
  name,
  badge,
  detail,
}: {
  icon: React.ComponentType<{ className?: string }>
  name: string
  badge: React.ReactNode
  detail?: string
}) {
  return (
    <div className="bg-white rounded-2xl shadow p-6 flex items-start gap-4">
      <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
        <Icon className="w-6 h-6 text-slate-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <p className="font-semibold text-slate-900">{name}</p>
          {badge}
        </div>
        {detail && <p className="text-xs text-slate-500 truncate">{detail}</p>}
      </div>
    </div>
  )
}

export default function AdminStatusPage() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery<SystemStatus>({
    queryKey: ['admin-system-status'],
    queryFn: () => adminApi.getSystemStatus().then(r => r.data as SystemStatus),
    refetchInterval: 30000,
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Santé système</h1>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-sm font-medium text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl shadow p-6 h-24 animate-pulse bg-slate-100" />
          ))}
        </div>
      )}

      {isError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          Impossible de récupérer le statut système. L'endpoint est peut-être indisponible.
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
            <StatusCard
              icon={Database}
              name="MongoDB"
              badge={
                <StatusBadge
                  variant={data.mongo.ok ? 'ok' : 'error'}
                  label={data.mongo.ok ? 'Opérationnel' : 'Erreur'}
                />
              }
            />
            <StatusCard
              icon={Mail}
              name="SMTP"
              badge={
                <StatusBadge
                  variant={data.smtp.ok ? 'ok' : 'error'}
                  label={data.smtp.ok ? 'Opérationnel' : 'Erreur'}
                />
              }
              detail={data.smtp.error}
            />
            <StatusCard
              icon={Users}
              name="LDAP"
              badge={
                data.ldap.configured
                  ? <StatusBadge variant="ok" label="Opérationnel" />
                  : <StatusBadge variant="warning" label="Non configuré" />
              }
            />
          </div>

          <div className="bg-white rounded-2xl shadow p-6 inline-flex items-center gap-3">
            <Clock className="w-5 h-5 text-slate-400" />
            <div>
              <p className="text-xs text-slate-500 font-medium uppercase mb-0.5">Uptime</p>
              <p className="text-lg font-semibold text-slate-900">{formatUptime(data.uptime)}</p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
