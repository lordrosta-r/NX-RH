import { useQuery } from '@tanstack/react-query'
import { CheckCircle, Circle, ChevronRight, Mail, Users, Settings, Rocket } from 'lucide-react'
import { Link } from 'react-router-dom'
import { adminApi } from '../api/admin'

type SetupCheckData = {
  envVars: { key: string; set: boolean; required: boolean }[]
  hasNonAdminUsers: boolean
  smtpConfigured: boolean
}

type SetupStep = {
  id: string
  icon: React.ElementType
  title: string
  description: string
  checkFn: (data: SetupCheckData) => boolean
  actionLabel: string
  actionHref: string
}

const STEPS: SetupStep[] = [
  {
    id: 'smtp',
    icon: Mail,
    title: 'Configurer le serveur email',
    description: 'Nécessaire pour envoyer des notifications et des rappels aux utilisateurs.',
    checkFn: (d) => d.smtpConfigured,
    actionLabel: 'Configurer SMTP',
    actionHref: '/admin/config',
  },
  {
    id: 'users',
    icon: Users,
    title: 'Créer des utilisateurs',
    description: 'Ajoutez des utilisateurs RH, managers et employés pour commencer.',
    checkFn: (d) => d.hasNonAdminUsers,
    actionLabel: 'Gérer les utilisateurs',
    actionHref: '/admin/users',
  },
  {
    id: 'config',
    icon: Settings,
    title: 'Vérifier la configuration',
    description: "Assurez-vous que toutes les variables d'environnement nécessaires sont définies.",
    checkFn: (d) => d.envVars.filter(v => v.required && !v.set).length === 0,
    actionLabel: 'Voir la configuration',
    actionHref: '/admin/config',
  },
]

export default function AdminSetupWizardPage() {
  const { data: envVars = [], isLoading: envLoading } = useQuery({
    queryKey: ['admin-env-check'],
    queryFn: () => adminApi.getEnvCheck().then(r => r.data as { key: string; set: boolean; required: boolean }[]),
  })

  const { data: statusData, isLoading: statusLoading } = useQuery({
    queryKey: ['admin-status'],
    queryFn: () => adminApi.getSystemStatus().then(r => r.data),
  })

  const { data: usersPage, isLoading: usersLoading } = useQuery({
    queryKey: ['users-setup-check'],
    queryFn: () => adminApi.getUsers({ page: 1, limit: 20 }).then(r => r.data),
  })

  const isLoading = envLoading || statusLoading || usersLoading

  const users = (usersPage as any)?.users ?? (usersPage as any) ?? []
  const checkData: SetupCheckData = {
    envVars: envVars as { key: string; set: boolean; required: boolean }[],
    hasNonAdminUsers: users.some((u: any) => u.role !== 'admin'),
    smtpConfigured: (statusData as any)?.smtp?.ok ?? false,
  }

  const completedCount = STEPS.filter(s => s.checkFn(checkData)).length
  const allDone = completedCount === STEPS.length

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        Vérification de la configuration...
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Configuration initiale</h1>
        <p className="text-slate-500 mt-1">Suivez ces étapes pour mettre en service NX-RH</p>
      </div>

      {allDone ? (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6 flex items-center gap-4 mb-6">
          <CheckCircle size={32} className="text-green-500 flex-shrink-0" />
          <div>
            <p className="font-bold text-green-800">Configuration complète !</p>
            <p className="text-green-600 text-sm">Toutes les étapes de configuration ont été effectuées.</p>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex items-center gap-3">
          <Rocket size={20} className="text-amber-500" />
          <span className="text-amber-600 font-bold">{completedCount}/{STEPS.length}</span>
          <p className="text-amber-700 text-sm">étapes complètes</p>
        </div>
      )}

      <div className="space-y-4">
        {STEPS.map(step => {
          const done = step.checkFn(checkData)
          const Icon = step.icon
          return (
            <div key={step.id} className={`bg-white rounded-2xl shadow p-6 flex items-start gap-4 ${done ? 'opacity-70' : ''}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${done ? 'bg-green-100' : 'bg-slate-100'}`}>
                <Icon size={20} className={done ? 'text-green-600' : 'text-slate-500'} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className={`font-bold ${done ? 'text-slate-500 line-through' : 'text-slate-900'}`}>{step.title}</h3>
                  {done ? <CheckCircle size={16} className="text-green-500" /> : <Circle size={16} className="text-slate-300" />}
                </div>
                <p className="text-sm text-slate-500 mt-1">{step.description}</p>
              </div>
              {!done && (
                <Link
                  to={step.actionHref}
                  className="flex items-center gap-1 px-4 py-2 bg-primary-600 text-white text-sm rounded-xl hover:bg-primary-700 transition flex-shrink-0"
                >
                  {step.actionLabel} <ChevronRight size={16} />
                </Link>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
