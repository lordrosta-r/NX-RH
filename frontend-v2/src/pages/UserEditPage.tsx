import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { usersApi } from '../api/users'
import type { User } from '../types'
import { useAuth } from '../contexts/AuthContext'
import Button from '../components/ui/Button'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin', hr: 'RH', manager: 'Manager', employee: 'Employé',
}

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

export default function UserEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate  = useNavigate()
  const queryClient = useQueryClient()
  const { user: currentUser } = useAuth()
  const toast = useToast()

  // Form state
  const [firstName, setFirstName]   = useState('')
  const [lastName, setLastName]     = useState('')
  const [email, setEmail]           = useState('')
  const [role, setRole]             = useState('')
  const [department, setDepartment] = useState('')
  const [position, setPosition]     = useState('')
  const [managerId, setManagerId]   = useState('')
  const [isActive, setIsActive]     = useState(true)
  const [authSource, setAuthSource] = useState<'local' | 'ldap'>('local')
  const [errors, setErrors]         = useState<Record<string, string>>({})

  // Fetch current user data
  const { data: userData, isLoading } = useQuery({
    queryKey: ['user', id],
    queryFn: () => usersApi.getUser(id!).then(r => r.data),
    enabled: !!id,
  })

  // Prefill form when data arrives
  useEffect(() => {
    if (userData) {
      setFirstName(userData.firstName)
      setLastName(userData.lastName)
      setEmail(userData.email)
      setRole(userData.role)
      setDepartment(userData.department || '')
      setPosition(userData.position || '')
      setManagerId(userData.managerId || '')
      setIsActive(userData.isActive)
      setAuthSource(userData.authSource)
    }
  }, [userData])

  // Active users for manager select
  const { data: activeUsers } = useQuery({
    queryKey: ['users-active'],
    queryFn: () => usersApi.getUsers({ isActive: true, limit: 100 }).then(r => r.data),
  })

  const isSelf   = currentUser?.id === id
  const canEditAll = currentUser?.role === 'admin' || currentUser?.role === 'hr'
  const isAdmin  = currentUser?.role === 'admin'

  function isDisabled(field: string): boolean {
    if (canEditAll) return false
    if (isSelf && (field === 'firstName' || field === 'lastName')) return false
    return true
  }

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

  const updateMutation = useMutation({
    mutationFn: (data: Partial<User>) => usersApi.updateUser(id!, data).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', id] })
      toast.show('Modifications enregistrées.')
      setTimeout(() => navigate(`/users/${id}`), 800)
    },
    onError: () => {
      setErrors({ submit: 'Une erreur est survenue. Veuillez réessayer.' })
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    const payload: Partial<User> = { firstName, lastName }
    if (canEditAll) {
      Object.assign(payload, {
        email,
        role: role as User['role'],
        department: department || undefined,
        position: position || undefined,
        managerId: managerId || undefined,
      })
    }
    if (isAdmin) {
      Object.assign(payload, { isActive, authSource })
    }
    updateMutation.mutate(payload)
  }

  const inputCls = (field: string) => {
    const disabled = isDisabled(field)
    const hasErr   = !!errors[field]
    return `w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
      disabled ? 'bg-slate-100 cursor-not-allowed border-slate-200' :
      hasErr   ? 'border-error-500' : 'border-slate-200'
    }`
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Breadcrumb */}
      <nav className="text-sm text-slate-500 mb-4">
        <Link to="/" className="hover:text-primary-600">Accueil</Link>
        {' › '}
        <Link to="/users" className="hover:text-primary-600">Collaborateurs</Link>
        {' › '}
        <Link to={`/users/${id}`} className="hover:text-primary-600">
          {userData?.firstName} {userData?.lastName}
        </Link>
        {' › '}
        <span className="text-slate-900">Modifier</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          Modifier — {userData?.firstName} {userData?.lastName}
        </h1>
        <div className="flex gap-3">
          <Link
            to={`/users/${id}`}
            className="inline-flex items-center gap-2 border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium"
          >
            Voir le profil
          </Link>
          <Button
            type="submit"
            form="edit-form"
            variant="primary"
            loading={updateMutation.isPending}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? 'Enregistrement…' : 'Enregistrer →'}
          </Button>
        </div>
      </div>

      {errors.submit && (
        <div className="border-l-4 border-error-500 bg-error-50 p-4 rounded-lg mb-4 text-sm text-error-700">
          {errors.submit}
        </div>
      )}

      {isSelf && !canEditAll && (
        <div className="border-l-4 border-warning-500 bg-warning-50 p-4 rounded-lg mb-4 text-sm text-warning-700">
          Vous pouvez uniquement modifier votre prénom et votre nom.
        </div>
      )}

      <form id="edit-form" onSubmit={handleSubmit} noValidate>
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
                disabled={isDisabled('firstName')}
                className={inputCls('firstName')}
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
                disabled={isDisabled('lastName')}
                className={inputCls('lastName')}
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
              disabled={isDisabled('email')}
              className={inputCls('email')}
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
              disabled={isDisabled('role')}
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
                disabled={isDisabled('department')}
                className={inputCls('department')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Poste</label>
              <input
                type="text"
                value={position}
                onChange={e => setPosition(e.target.value)}
                disabled={isDisabled('position')}
                className={inputCls('position')}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Manager direct</label>
            <select
              value={managerId}
              onChange={e => setManagerId(e.target.value)}
              disabled={isDisabled('managerId')}
              className={inputCls('managerId')}
            >
              <option value="">Aucun manager</option>
              {activeUsers?.data
                ?.filter((u: User) => u.id !== id)
                .map((u: User) => (
                  <option key={u.id} value={u.id}>
                    {u.firstName} {u.lastName} ({u.role})
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Card 3 — Sécurité (admin only) */}
        {isAdmin && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 mb-4">
            <h2 className="text-base font-semibold text-slate-900 mb-4">Sécurité</h2>
            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <div>
                <p className="text-sm font-medium text-slate-700">Compte actif</p>
                <p className="text-xs text-slate-400">L&apos;utilisateur peut se connecter</p>
              </div>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isActive ? 'bg-primary-500' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    isActive ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <div className="pt-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Source d&apos;authentification</label>
              <select
                value={authSource}
                onChange={e => setAuthSource(e.target.value as 'local' | 'ldap')}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="local">Local</option>
                <option value="ldap">LDAP</option>
              </select>
            </div>
          </div>
        )}
      </form>

      {/* Toast */}
      {toast.message && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg">
          {toast.message}
        </div>
      )}
    </div>
  )
}
