import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '../contexts/AuthContext'
import type { AxiosError } from 'axios'
import { loginSchema, type LoginFormValues } from '../schemas'
import { ErrorMessage } from '../components/ui/ErrorMessage'

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

export default function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { login, isAuthenticated } = useAuth()

  const [remember, setRemember] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [alertError, setAlertError] = useState<{ type: 'error' | 'warning'; message: string } | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  })

  const ldapEnabled = import.meta.env.VITE_LDAP_ENABLED === 'true'
  const redirect = searchParams.get('redirect') || '/'

  useEffect(() => {
    if (isAuthenticated) navigate(redirect, { replace: true })
  }, [isAuthenticated, navigate, redirect])

  async function onSubmit(data: LoginFormValues) {
    setAlertError(null)
    try {
      await login(data.email, data.password, remember)
      navigate(redirect, { replace: true })
    } catch (err) {
      const status = (err as AxiosError)?.response?.status
      if (status === 401) setAlertError({ type: 'error', message: 'E-mail ou mot de passe incorrect' })
      else if (status === 429) setAlertError({ type: 'warning', message: 'Trop de tentatives. Réessayez dans quelques minutes.' })
      else if (status === 403) setAlertError({ type: 'error', message: 'Votre compte est désactivé. Contactez votre RH.' })
      else setAlertError({ type: 'error', message: 'Une erreur est survenue. Réessayez.' })
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8">
      <h1 className="text-2xl font-bold text-slate-900">Connexion</h1>
      <p className="text-sm text-slate-500 mt-1">Bienvenue sur NX-RH NanoXplore</p>

      {alertError && (
        <div className="mt-4">
          <InlineAlert type={alertError.type} message={alertError.message} />
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
            Adresse e-mail
          </label>
          <input
            id="email"
            type="email"
            autoFocus
            autoComplete="username"
            {...register('email')}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'email-error' : undefined}
            disabled={isSubmitting}
            className={`w-full h-10 px-3 rounded-lg border bg-white text-slate-900 text-sm transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
              errors.email
                ? 'border-error-500 ring-error-200 focus:ring-error-200'
                : 'border-slate-300 focus:border-primary-500 focus:ring-primary-200'
            } disabled:opacity-60 disabled:cursor-not-allowed`}
            placeholder="prenom.nom@nanoxplore.com"
          />
          <ErrorMessage id="email-error" message={errors.email?.message} />
        </div>

        {/* Mot de passe */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
            Mot de passe
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              {...register('password')}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? 'password-error' : undefined}
              disabled={isSubmitting}
              className={`w-full h-10 px-3 pr-10 rounded-lg border bg-white text-slate-900 text-sm transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                errors.password
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
          <ErrorMessage id="password-error" message={errors.password?.message} />
        </div>

        {/* Remember me */}
        <div className="flex items-center gap-2">
          <input
            id="remember"
            type="checkbox"
            checked={remember}
            onChange={e => setRemember(e.target.checked)}
            disabled={isSubmitting}
            className="h-4 w-4 rounded border-slate-300 text-primary-500 focus:ring-primary-200"
          />
          <label htmlFor="remember" className="text-sm text-slate-600">
            Se souvenir de moi
          </label>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-11 flex items-center justify-center gap-2 rounded-lg bg-primary-600 text-white font-medium text-sm hover:bg-primary-700 active:bg-primary-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Connexion…
            </>
          ) : (
            'Se connecter'
          )}
        </button>

        {/* Divider + LDAP */}
        {ldapEnabled && (
          <>
            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs text-slate-400">
                <span className="bg-white px-3">ou</span>
              </div>
            </div>
            <Link
              to="/login/ldap"
              className="w-full h-11 flex items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 font-medium text-sm hover:bg-slate-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
            >
              Connexion via LDAP
            </Link>
          </>
        )}
      </form>
    </div>
  )
}
