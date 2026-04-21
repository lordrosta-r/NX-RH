import { useState }                          from 'react'
import { useNavigate }                       from 'react-router-dom'
import MosaicBackground                      from './MosaicBackground'
import LoginControls                         from './LoginControls'
import InputField                            from '../../components/ui/InputField'
import Checkbox                              from '../../components/ui/Checkbox'
import { t as pageT }                        from './i18n'
import { useLocaleCtx, useTranslate }        from '../../contexts/LocaleContext'
import { useAuth }                           from '../../contexts/AuthContext'
import './login.css'

// =============================================================================
// Login — Page racine
// Tout ce qui est spécifique à cette page vit dans ce dossier.
// Les composants partagés (InputField, Checkbox…) viennent de components/ui/.
// =============================================================================

// Vérification basique d'email — le serveur fait la validation complète
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Table de correspondance rôle → route d'accueil
const ROLE_HOME = {
  admin:    '/admin',
  hr:       '/hr',
  director: '/manager',
  manager:  '/manager',
  employee: '/employee',
}

export default function Login() {
  const { locale, setLocale }  = useLocaleCtx()
  const t                      = useTranslate(pageT)
  const { refreshUser }        = useAuth()
  const navigate               = useNavigate()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [error,    setError]    = useState(null)
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    const trimmedEmail = email.trim()
    if (!trimmedEmail || !password) { setError(t('login.error.empty')); return }
    if (!EMAIL_RE.test(trimmedEmail)) { setError(t('login.error.email')); return }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method:      'POST',
        headers:     { 'Content-Type': 'application/json' },
        credentials: 'include',
        body:        JSON.stringify({ email: trimmedEmail, password, remember }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || t('login.error.invalid'))
        setLoading(false)
        return
      }
      const data = await res.json().catch(() => null)
      if (!data?.user?.role) {
        setError(t('login.error.invalid'))
        setLoading(false)
        return
      }
      // Le cookie HttpOnly est posé par le serveur.
      // On rafraîchit le contexte Auth puis on navigue via React Router.
      await refreshUser()
      navigate(ROLE_HOME[data.user.role] ?? '/employee', { replace: true })
    } catch {
      setError(t('login.error.network'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">

      {/* Skip link — accessibilité clavier */}
      <a href="#main-content" className="skip-link">
        {t('login.a11y.skip')}
      </a>

      {/* Mosaïque + overlay (z:0-1) */}
      <MosaicBackground />

      {/* Contenu (z:2) */}
      <main className="login-content" id="main-content">

        <header className="login-header">
          <h1 className="login-header__title">NanoXplore RH</h1>
          <p className="login-header__tagline">{t('brand.tagline')}</p>
        </header>

        <div className="login-card">
          <h2 className="login-card__title">{t('login.title')}</h2>

          <form
            onSubmit={handleSubmit}
            className="login-form"
            noValidate
            aria-label={t('login.title')}
          >
            <InputField
              id="email"
              label={t('login.email.label')}
              type="email"
              placeholder={t('login.email.placeholder')}
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              disabled={loading}
              required
              error={!!error}
              errorMessage={error || null}
            />
            <InputField
              id="password"
              label={t('login.password.label')}
              type="password"
              placeholder={t('login.password.placeholder')}
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={loading}
              required
              error={!!error}
              labelShowPassword={t('login.input.show_password')}
              labelHidePassword={t('login.input.hide_password')}
            />

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
            </div>
          </form>

          <div className="login-card__footer">
            <p>
              {t('login.legal.text')}{' '}
              {/* TODO: future feature — link to privacy policy */}
              <span className="login-legal-link">{t('login.legal.link')}</span>
              {' '}{t('login.legal.suffix')}
            </p>
            {/* Lien externe (mailto) — reste en <a href> */}
            <a href="mailto:admin@nanoxplore.com" className="login-contact">
              {t('login.contact.admin')}
            </a>
          </div>
        </div>

        <footer className="login-page-footer">{t('login.copyright')}</footer>

      </main>

      {/* Pill flottante bas-droite (z:30) */}
      <LoginControls
        locale={locale}
        onLocaleChange={setLocale}
        labelLight={t('login.theme.to_dark')}
        labelDark={t('login.theme.to_light')}
        labelFr={t('login.lang.fr')}
        labelEn={t('login.lang.en')}
        labelSelectLanguage={t('login.lang.select')}
      />

    </div>
  )
}

