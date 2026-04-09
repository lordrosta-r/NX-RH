import { useState }       from 'react'
import MosaicBackground   from '../../components/login/MosaicBackground'
import LoginControls      from '../../components/login/LoginControls'
import InputField         from '../../components/ui/InputField'
import Checkbox           from '../../components/ui/Checkbox'
import { useLocale }      from '../../hooks/useLocale'
import { useTheme }       from '../../hooks/useTheme'
import './login.css'

// =============================================================================
// Login — Root page component
// Design ref: docs/design/login/DESIGN.md ("Editorial Enterprise")
// =============================================================================

export default function Login() {
  // ── i18n + theme ──────────────────────────────────────────────────────────
  const { t, locale, setLocale } = useLocale()
  useTheme()   // initialises data-theme on <html> from localStorage

  // ── Form state ─────────────────────────────────────────────────────────────
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [error,    setError]    = useState(null)
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res  = await fetch('/api/auth/login', {
        method:      'POST',
        headers:     { 'Content-Type': 'application/json' },
        credentials: 'include',
        body:        JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || t('login.error'))
        return
      }

      sessionStorage.setItem('token', data.token)
      sessionStorage.setItem('user',  JSON.stringify(data.user))

      window.location.href = ['admin', 'manager'].includes(data.user.role)
        ? '/manager'
        : '/dashboard'

    } catch {
      setError('Erreur réseau — veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">

      {/* ── Layer 0+1 — Cinematic background + overlay ── */}
      <MosaicBackground />

      {/* ── Layer 2 — Foreground ── */}
      <main className="login-content">

        <header className="login-header">
          <h1 className="login-header__title">NanoXplore RH</h1>
          <p className="login-header__tagline">{t('brand.tagline')}</p>
        </header>

        <div className="login-card">
          <h2 className="login-card__title">{t('login.title')}</h2>

          <form onSubmit={handleSubmit} className="login-form" noValidate>

            <InputField
              id="email"
              label={t('login.email.label')}
              type="email"
              placeholder={t('login.email.placeholder')}
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
            />

            <InputField
              id="password"
              label={t('login.password.label')}
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
            />

            {error && <p className="login-error" role="alert">{error}</p>}

            <button type="submit" className="btn--login" disabled={loading}>
              {loading ? t('login.submit.loading') : t('login.submit')}
            </button>

            <div className="login-utility">
              <Checkbox
                id="remember"
                label={t('login.remember')}
                checked={remember}
                onChange={e => setRemember(e.target.checked)}
              />
              <a href="#" className="login-utility__link">
                {t('login.help')}
              </a>
            </div>

          </form>

          {/* Legal + Contact admin */}
          <div className="login-card__footer">
            <p>
              {t('login.legal.text')}{' '}
              <a href="#">{t('login.legal.link')}</a>
              {' '}{t('login.legal.suffix')}
            </p>
            <a href="mailto:admin@nanoxplore.com" className="login-contact">
              {t('login.contact.admin')}
            </a>
          </div>
        </div>

        <footer className="login-page-footer">
          {t('login.copyright')}
        </footer>

      </main>

      {/* ── Layer 3 — Floating controls (theme + language) ── */}
      <LoginControls locale={locale} onLocaleChange={setLocale} />

    </div>
  )
}
