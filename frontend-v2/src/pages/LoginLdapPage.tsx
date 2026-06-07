import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, Loader2, Server, ArrowLeft } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import type { AxiosError } from 'axios'

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1 text-xs text-error-600">{message}</p>
}

function InlineAlert({ type, message }: { type: 'error' | 'warning'; message: string }) {
  const styles = {
    error: 'bg-error-50 border-error-500 text-error-700',
    warning: 'bg-warning-50 border-warning-500 text-warning-700',
  }
  return (
    <div className={`border-l-4 rounded-lg p-3 text-sm ${styles[type]}`}>
      {message}
    </div>
  )
}

export default function LoginLdapPage() {
  const navigate = useNavigate()
  const { loginLdap, isAuthenticated } = useAuth()

  const ldapEnabled = import.meta.env.VITE_LDAP_ENABLED === 'true'

  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{ login?: string; password?: string }>({})
  const [alertError, setAlertError] = useState<{ type: 'error' | 'warning'; message: string } | null>(null)

  useEffect(() => {
    if (!ldapEnabled) navigate('/login', { replace: true })
  }, [ldapEnabled, navigate])

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true })
  }, [isAuthenticated, navigate])

  function validate(): boolean {
    const errors: typeof fieldErrors = {}
    if (!login.trim()) errors.login = 'Ce champ est requis'
    if (!password) errors.password = 'Ce champ est requis'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setAlertError(null)
    if (!validate()) return

    setIsLoading(true)
    try {
      await loginLdap(login, password)
      navigate('/', { replace: true })
    } catch (err) {
      const status = (err as AxiosError)?.response?.status
      if (status === 401) setAlertError({ type: 'error', message: 'Identifiants LDAP incorrects' })
      else if (status === 403) setAlertError({ type: 'error', message: 'Accès LDAP refusé. Contactez votre administrateur.' })
      else if (status === 503 || !(err as AxiosError)?.response) setAlertError({ type: 'error', message: 'Le serveur LDAP est inaccessible. Réessayez plus tard.' })
      else setAlertError({ type: 'error', message: 'Une erreur est survenue. Réessayez.' })
    } finally {
      setIsLoading(false)
    }
  }

  if (!ldapEnabled) return null

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8">
      {/* Lien retour */}
      <Link
        to="/login"
        className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Connexion standard
      </Link>

      {/* Header avec icône */}
      <div className="flex items-center gap-3 mb-1">
        <div className="w-9 h-9 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <Server className="w-5 h-5 text-primary-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Connexion LDAP</h1>
      </div>
      <p className="text-sm text-slate-500 mt-1">Utilisez vos identifiants d'entreprise</p>

      {alertError && (
        <div className="mt-4">
          <InlineAlert type={alertError.type} message={alertError.message} />
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
        {/* Login LDAP */}
        <div>
          <label htmlFor="ldap-login" className="block text-sm font-medium text-slate-700 mb-1">
            Identifiant LDAP
          </label>
          <input
            id="ldap-login"
            type="text"
            autoFocus
            autoComplete="username"
            value={login}
            onChange={e => { setLogin(e.target.value); setFieldErrors(p => ({ ...p, login: undefined })) }}
            disabled={isLoading}
            className={`w-full h-10 px-3 rounded-lg border bg-white text-slate-900 text-sm transition-colors placeholder:text-slate-500 focus:outline-none focus:ring-2 ${
              fieldErrors.login
                ? 'border-error-500 ring-error-200 focus:ring-error-200'
                : 'border-slate-300 focus:border-primary-500 focus:ring-primary-200'
            } disabled:opacity-60 disabled:cursor-not-allowed`}
            placeholder="jdoe ou CORP\\jdoe"
          />
          <FieldError message={fieldErrors.login} />
        </div>

        {/* Mot de passe */}
        <div>
          <label htmlFor="ldap-password" className="block text-sm font-medium text-slate-700 mb-1">
            Mot de passe
          </label>
          <div className="relative">
            <input
              id="ldap-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={e => { setPassword(e.target.value); setFieldErrors(p => ({ ...p, password: undefined })) }}
              disabled={isLoading}
              className={`w-full h-10 px-3 pr-10 rounded-lg border bg-white text-slate-900 text-sm transition-colors placeholder:text-slate-500 focus:outline-none focus:ring-2 ${
                fieldErrors.password
                  ? 'border-error-500 ring-error-200 focus:ring-error-200'
                  : 'border-slate-300 focus:border-primary-500 focus:ring-primary-200'
              } disabled:opacity-60 disabled:cursor-not-allowed`}
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600"
              aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <FieldError message={fieldErrors.password} />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-11 flex items-center justify-center gap-2 rounded-lg bg-primary-600 text-white font-medium text-sm hover:bg-primary-700 active:bg-primary-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Connexion…
            </>
          ) : (
            'Se connecter via LDAP'
          )}
        </button>
      </form>
    </div>
  )
}
