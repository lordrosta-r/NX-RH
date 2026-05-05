import { useState, useRef } from 'react'
import type { ChangeEvent, ReactNode } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import {
  Camera, User as UserIcon, Settings, Database, FileText, Edit2,
  Mail, Building, Briefcase, ChevronDown, Download,
  ChevronRight,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { usersApi } from '../api/users'
import { formsApi } from '../api/forms'
import { evaluationsApi } from '../api/evaluations'
import type { User, Form, Evaluation } from '../types'
import { cn } from '../utils/cn'

type TabId = 'info' | 'avatar' | 'prefs' | 'data' | 'requests'

function Avatar({
  src, initials, size = 96, className,
}: { src?: string; initials: string; size?: number; className?: string }) {
  const colors = ['bg-primary-100 text-primary-700', 'bg-violet-100 text-violet-700', 'bg-amber-100 text-amber-700']
  const color = colors[initials.charCodeAt(0) % colors.length]
  return src ? (
    <img
      src={src}
      alt="avatar"
      className={cn('rounded-full object-cover', className)}
      style={{ width: size, height: size }}
    />
  ) : (
    <div
      className={cn('rounded-full flex items-center justify-center font-bold', color, className)}
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {initials}
    </div>
  )
}

function EvalStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    assigned: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-yellow-100 text-yellow-700',
    submitted: 'bg-purple-100 text-purple-700',
    validated: 'bg-green-100 text-green-700',
    expired: 'bg-slate-100 text-slate-500',
  }
  const labels: Record<string, string> = {
    assigned: 'Assignée', in_progress: 'En cours', submitted: 'Soumise',
    validated: 'Validée', expired: 'Expirée',
  }
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', map[status] ?? 'bg-slate-100 text-slate-600')}>
      {labels[status] ?? status}
    </span>
  )
}

export default function ProfilePage() {
  const { user, refreshUser } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [tab, setTab] = useState<TabId>('info')
  const [editMode, setEditMode] = useState(false)

  // ── Onglet Info ───────────────────────────────────────────────────────────
  const [firstName, setFirstName] = useState(user?.firstName ?? '')
  const [lastName, setLastName] = useState(user?.lastName ?? '')

  const saveInfoMutation = useMutation({
    mutationFn: () => usersApi.updateUser(user!.id, { firstName, lastName }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['me'] })
      await refreshUser()
      setEditMode(false)
    },
  })

  // ── Onglet Avatar ─────────────────────────────────────────────────────────
  const fileRef = useRef<HTMLInputElement>(null)
  const [avatarPreview, setAvatarPreview] = useState<string>('')
  const [avatarError, setAvatarError] = useState<string>('')
  const [avatarBase64, setAvatarBase64] = useState<string>('')

  const avatarMutation = useMutation({
    mutationFn: (base64: string) => usersApi.updateAvatar(user!.id, base64),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['me'] })
      await refreshUser()
      setAvatarPreview('')
      setAvatarBase64('')
    },
  })

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarError('')
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setAvatarError('Format non supporté. Utilisez JPEG, PNG ou WebP.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError('Fichier trop volumineux (max 2 Mo).')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const result = ev.target?.result as string
      setAvatarPreview(result)
      setAvatarBase64(result)
    }
    reader.readAsDataURL(file)
  }

  // ── Onglet Mes demandes ───────────────────────────────────────────────────
  const [requestDropdownOpen, setRequestDropdownOpen] = useState(false)

  const requestTypes = [
    { label: 'Demande de mobilité', formType: 'mobility_request' },
    { label: "Demande d'augmentation", formType: 'salary_raise_request' },
    { label: 'Demande de promotion', formType: 'promotion_request' },
    { label: 'Demande de formation', formType: 'training_request' },
  ]

  const { data: myEvals } = useQuery({
    queryKey: ['my-requests'],
    queryFn: () =>
      evaluationsApi.getEvaluations({
        evaluateeId: user?.id,
        limit: 20,
      }).then((r) => r.data),
    enabled: tab === 'requests' && !!user,
  })

  // ── GDPR export ───────────────────────────────────────────────────────────
  const gdprMutation = useMutation({
    mutationFn: () => usersApi.exportGdpr(user!.id),
    onSuccess: (res) => {
      const url = URL.createObjectURL(res.data as Blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `gdpr-export-${user!.id}.json`
      a.click()
      URL.revokeObjectURL(url)
    },
  })

  async function handleRequestType(formType: string) {
    setRequestDropdownOpen(false)
    try {
      const { data } = await formsApi.getForms({ search: formType, limit: 1 })
      const form = (data as unknown as { data: Form[] }).data?.[0]
      if (form) {
        navigate(`/evaluations/new?formId=${form.id}`)
      } else {
        alert('Aucun formulaire disponible pour ce type de demande.')
      }
    } catch {
      alert('Erreur lors de la recherche du formulaire.')
    }
  }

  if (!user) return null

  const initials = `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase()
  const avatarSrc = (user as User & { avatarUrl?: string }).avatarUrl

  const tabs: { id: TabId; label: string; icon: ReactNode }[] = [
    { id: 'info', label: 'Informations', icon: <UserIcon className="w-4 h-4" /> },
    { id: 'avatar', label: 'Avatar', icon: <Camera className="w-4 h-4" /> },
    { id: 'prefs', label: 'Préférences', icon: <Settings className="w-4 h-4" /> },
    { id: 'data', label: 'Mes données', icon: <Database className="w-4 h-4" /> },
    { id: 'requests', label: 'Mes demandes', icon: <FileText className="w-4 h-4" /> },
  ]

  const roleLabels: Record<string, string> = {
    admin: 'Administrateur', hr: 'RH', director: 'Directeur',
    manager: 'Manager', employee: 'Employé',
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header profil */}
      <div className="bg-white rounded-2xl shadow p-6 flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div className="relative group">
          <Avatar src={avatarSrc} initials={initials} size={96} />
          <button
            onClick={() => { setTab('avatar') }}
            className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
          >
            <span className="text-white text-xs font-medium flex items-center gap-1">
              <Edit2 className="w-3 h-3" /> Modifier
            </span>
          </button>
        </div>
        <div className="flex-1 text-center sm:text-left">
          <h1 className="text-2xl font-bold text-slate-900">
            {user.firstName} {user.lastName}
          </h1>
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-1">
            <span className="bg-primary-100 text-primary-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">
              {roleLabels[user.role] ?? user.role}
            </span>
            {user.department && (
              <span className="text-slate-500 text-sm flex items-center gap-1">
                <Building className="w-3.5 h-3.5" /> {user.department}
              </span>
            )}
            {user.position && (
              <span className="text-slate-500 text-sm flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5" /> {user.position}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-2 text-sm text-slate-500">
            <span className="flex items-center gap-1">
              <Mail className="w-3.5 h-3.5" /> {user.email}
            </span>
            <span className={cn(
              'px-2 py-0.5 rounded text-xs font-medium',
              user.authSource === 'ldap'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-slate-100 text-slate-600',
            )}>
              {user.authSource === 'ldap' ? 'LDAP' : 'Local'}
            </span>
          </div>
        </div>
        <button
          onClick={() => { setTab('info'); setEditMode(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 transition-colors"
        >
          <Edit2 className="w-4 h-4" /> Modifier
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <div className="border-b border-slate-100 flex overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-2 px-5 py-4 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px',
                tab === t.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700',
              )}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* ── Onglet Informations ─────────────────────────────── */}
          {tab === 'info' && (
            <div className="space-y-5 max-w-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Prénom</label>
                  {editMode ? (
                    <input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                    />
                  ) : (
                    <p className="text-sm text-slate-900 px-3 py-2 bg-slate-50 rounded-lg">{user.firstName}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nom</label>
                  {editMode ? (
                    <input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                    />
                  ) : (
                    <p className="text-sm text-slate-900 px-3 py-2 bg-slate-50 rounded-lg">{user.lastName}</p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <p className="text-sm text-slate-500 px-3 py-2 bg-slate-50 rounded-lg">{user.email}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Rôle</label>
                  <p className="text-sm text-slate-500 px-3 py-2 bg-slate-50 rounded-lg">{roleLabels[user.role] ?? user.role}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Département</label>
                  <p className="text-sm text-slate-500 px-3 py-2 bg-slate-50 rounded-lg">{user.department ?? '—'}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Poste</label>
                <p className="text-sm text-slate-500 px-3 py-2 bg-slate-50 rounded-lg">{user.position ?? '—'}</p>
              </div>
              {editMode && (
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => saveInfoMutation.mutate()}
                    disabled={saveInfoMutation.isPending}
                    className="px-4 py-2 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 disabled:opacity-50 transition-colors"
                  >
                    {saveInfoMutation.isPending ? 'Sauvegarde…' : 'Sauvegarder'}
                  </button>
                  <button
                    onClick={() => { setEditMode(false); setFirstName(user.firstName); setLastName(user.lastName) }}
                    className="px-4 py-2 border border-slate-300 text-sm font-medium rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Onglet Avatar ───────────────────────────────────── */}
          {tab === 'avatar' && (
            <div className="flex flex-col items-center gap-6 max-w-sm mx-auto">
              <Avatar
                src={avatarPreview || avatarSrc}
                initials={initials}
                size={96}
                className="ring-4 ring-primary-100"
              />
              {avatarError && (
                <p className="text-sm text-error-600 text-center">{avatarError}</p>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="flex flex-col gap-3 w-full">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full px-4 py-2 border border-slate-300 text-sm font-medium rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Choisir une image
                </button>
                {avatarBase64 && (
                  <button
                    onClick={() => avatarMutation.mutate(avatarBase64)}
                    disabled={avatarMutation.isPending}
                    className="w-full px-4 py-2 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 disabled:opacity-50 transition-colors"
                  >
                    {avatarMutation.isPending ? 'Envoi…' : 'Enregistrer'}
                  </button>
                )}
                {(avatarSrc || avatarPreview) && (
                  <button
                    onClick={() => avatarMutation.mutate('')}
                    disabled={avatarMutation.isPending}
                    className="w-full px-4 py-2 border border-error-500 text-error-600 text-sm font-medium rounded-lg hover:bg-error-50 transition-colors"
                  >
                    Supprimer l'avatar
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Onglet Préférences ──────────────────────────────── */}
          {tab === 'prefs' && (
            <div className="flex flex-col items-start gap-4">
              <p className="text-slate-600 text-sm">
                Gérez vos préférences de langue, thème et notifications.
              </p>
              <Link
                to="/profile/preferences"
                className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 transition-colors"
              >
                Gérer mes préférences <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          )}

          {/* ── Onglet Mes données ──────────────────────────────── */}
          {tab === 'data' && (
            <div className="space-y-4 max-w-md">
              <h3 className="text-sm font-semibold text-slate-700">Accès rapide</h3>
              <div className="flex flex-wrap gap-3">
                <Link
                  to="/evaluations"
                  className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-sm font-medium rounded-lg text-slate-700 hover:bg-primary-50 hover:border-primary-300 hover:text-primary-700 transition-colors"
                >
                  Mes évaluations <ChevronRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/evaluations/history"
                  className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-sm font-medium rounded-lg text-slate-700 hover:bg-primary-50 hover:border-primary-300 hover:text-primary-700 transition-colors"
                >
                  Historique <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="pt-2 border-t border-slate-100">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">RGPD</h3>
                <button
                  onClick={() => gdprMutation.mutate()}
                  disabled={gdprMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-sm font-medium rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  {gdprMutation.isPending ? 'Export en cours…' : 'Exporter mes données RGPD'}
                </button>
              </div>
            </div>
          )}

          {/* ── Onglet Mes demandes ─────────────────────────────── */}
          {tab === 'requests' && (
            <div className="space-y-5">
              <div className="relative inline-block">
                <button
                  onClick={() => setRequestDropdownOpen(!requestDropdownOpen)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 transition-colors"
                >
                  + Déposer une demande <ChevronDown className="w-4 h-4" />
                </button>
                {requestDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-10">
                    {requestTypes.map((rt) => (
                      <button
                        key={rt.formType}
                        onClick={() => handleRequestType(rt.formType)}
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-primary-50 hover:text-primary-700"
                      >
                        {rt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Statut</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {myEvals?.data?.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center py-8 text-slate-400">
                          Aucune demande pour l'instant.
                        </td>
                      </tr>
                    )}
                    {(myEvals?.data as Evaluation[] | undefined)?.map((ev) => (
                      <tr key={ev.id} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-700">{ev.form?.title ?? ev.formId}</td>
                        <td className="px-4 py-3 text-slate-500">{ev.createdAt ? new Date(ev.createdAt).toLocaleDateString('fr-FR') : '—'}</td>
                        <td className="px-4 py-3"><EvalStatusBadge status={ev.status} /></td>
                        <td className="px-4 py-3 text-right">
                          <Link to={`/evaluations/${ev.id}`} className="text-primary-600 hover:underline text-xs font-medium">
                            Voir →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
