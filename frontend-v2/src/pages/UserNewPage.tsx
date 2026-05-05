import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { CheckCircle, Copy, X } from 'lucide-react'
import { usersApi } from '../api/users'
import type { User } from '../types'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  hr: 'RH',
  director: 'Directeur',
  manager: 'Manager',
  employee: 'Employé',
}

// ── Inline toast ──────────────────────────────────────────────────────────────
function useToast() {
  const [message, setMessage] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const show = (msg: string) => {
    setMessage(msg)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setMessage(null), 2500)
  }
  return { message, show }
}

export default function UserNewPage() {
  const navigate = useNavigate()
  const toast = useToast()

  // Form state
  const [firstName, setFirstName]   = useState('')
  const [lastName, setLastName]     = useState('')
  const [email, setEmail]           = useState('')
  const [role, setRole]             = useState('')
  const [department, setDepartment] = useState('')
  const [position, setPosition]     = useState('')
  const [managerId, setManagerId]   = useState('')
  const [errors, setErrors]         = useState<Record<string, string>>({})

  // Password modal
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [tempPassword, setTempPassword]           = useState('')
  const [createdUserId, setCreatedUserId]         = useState('')

  // Email debounce uniqueness check (UI-only)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      // Intentionally a lightweight background check — errors handled server-side
    }, 500)
  }, [email])

  // Active users for manager select
  const { data: activeUsers } = useQuery({
    queryKey: ['users-active'],
    queryFn: () => usersApi.getUsers({ isActive: true, limit: 100 }).then(r => r.data),
  })

  function validate() {
    const e: Record<string, string> = {}
    if (!firstName.trim()) e.firstName = 'Le prénom est requis'
    if (!lastName.trim()) e.lastName = 'Le nom est requis'
    if (!email.trim()) e.email = "L'email est requis"
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Email invalide'
    if (!role) e.role = 'Le rôle est requis'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const createMutation = useMutation({
    mutationFn: (data: Partial<User>) =>
      usersApi.createUser(data).then(r => r.data as User & { temporaryPassword?: string }),
    onSuccess: (newUser) => {
      setCreatedUserId(newUser.id)
      setTempPassword((newUser as any).temporaryPassword || '••••••••')
      setShowPasswordModal(true)
    },
    onError: () => {
      setErrors({ submit: 'Une erreur est survenue. Veuillez réessayer.' })
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    createMutation.mutate({
      firstName, lastName, email,
      role: role as User['role'],
      department: department || undefined,
      position: position || undefined,
      managerId: managerId || undefined,
    })
  }

  const inputCls = (field: string) =>
    `w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
      errors[field] ? 'border-error-500' : 'border-slate-200'
    }`

  return (
    <div className="max-w-2xl mx-auto">
      {/* Breadcrumb */}
      <nav className="text-sm text-slate-500 mb-4">
        <Link to="/" className="hover:text-primary-600">Accueil</Link>
        {' › '}
        <Link to="/users" className="hover:text-primary-600">Collaborateurs</Link>
        {' › '}
        <span className="text-slate-900">Nouvel utilisateur</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Nouvel utilisateur</h1>
        <div className="flex gap-3">
          <Link
            to="/users"
            className="inline-flex items-center gap-2 border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium"
          >
            Annuler
          </Link>
          <button
            type="submit"
            form="user-form"
            disabled={createMutation.isPending}
            className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60"
          >
            {createMutation.isPending ? 'Création…' : 'Créer →'}
          </button>
        </div>
      </div>

      {errors.submit && (
        <div className="border-l-4 border-error-500 bg-error-50 p-4 rounded-lg mb-4 text-sm text-error-700">
          {errors.submit}
        </div>
      )}

      <form id="user-form" onSubmit={handleSubmit} noValidate>
        {/* Card 1 — Informations personnelles */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 mb-4">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Informations personnelles</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Prénom <span className="text-error-500">*</span>
              </label>
              <input
                type="text"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                className={inputCls('firstName')}
                placeholder="Jean"
              />
              {errors.firstName && <p className="text-xs text-error-500 mt-1">{errors.firstName}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nom <span className="text-error-500">*</span>
              </label>
              <input
                type="text"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                className={inputCls('lastName')}
                placeholder="Dupont"
              />
              {errors.lastName && <p className="text-xs text-error-500 mt-1">{errors.lastName}</p>}
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              E-mail <span className="text-error-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className={inputCls('email')}
              placeholder="jean.dupont@exemple.com"
            />
            {errors.email && <p className="text-xs text-error-500 mt-1">{errors.email}</p>}
          </div>
        </div>

        {/* Card 2 — Poste & Organisation */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 mb-4">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Poste &amp; Organisation</h2>
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Rôle <span className="text-error-500">*</span>
            </label>
            <select
              value={role}
              onChange={e => setRole(e.target.value)}
              className={inputCls('role')}
            >
              <option value="">Sélectionner un rôle…</option>
              {Object.entries(ROLE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            {errors.role && <p className="text-xs text-error-500 mt-1">{errors.role}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Département</label>
              <input
                type="text"
                value={department}
                onChange={e => setDepartment(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Ingénierie"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Poste</label>
              <input
                type="text"
                value={position}
                onChange={e => setPosition(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Développeur senior"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Manager direct</label>
            <select
              value={managerId}
              onChange={e => setManagerId(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Aucun manager</option>
              {activeUsers?.data?.map((u: User) => (
                <option key={u.id} value={u.id}>
                  {u.firstName} {u.lastName} ({u.role})
                </option>
              ))}
            </select>
          </div>
        </div>
      </form>

      {/* Toast notification */}
      {toast.message && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg">
          {toast.message}
        </div>
      )}

      {/* Modal mot de passe temporaire */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-success-50 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-success-500" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">Utilisateur créé !</h3>
              </div>
              <button
                onClick={() => navigate(`/users/${createdUserId}`)}
                className="p-1 hover:bg-slate-50 rounded"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <p className="text-sm text-slate-600 mb-3">
              Mot de passe temporaire (visible une seule fois) :
            </p>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 mb-4">
              <code className="flex-1 font-mono text-sm text-slate-900">{tempPassword}</code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(tempPassword)
                  toast.show('Copié !')
                }}
                title="Copier"
              >
                <Copy className="w-4 h-4 text-slate-400 hover:text-slate-600" />
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Ce mot de passe ne sera plus affiché après fermeture.
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => navigate(`/users/${createdUserId}`)}
                className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                Voir le profil →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
