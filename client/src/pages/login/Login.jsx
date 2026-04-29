import { useState, useEffect }               from 'react'
import { useNavigate }                       from 'react-router-dom'
import LoginControls                         from './LoginControls'
import InputField                            from '../../components/ui/InputField'
import Checkbox                              from '../../components/ui/Checkbox'
import { t as pageT }                        from './i18n'
import { useLocaleCtx, useTranslate }        from '../../contexts/LocaleContext'
import { useAuth }                           from '../../contexts/AuthContext'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

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
      <a href="#main-content" className="skip-link">{t('login.a11y.skip')}</a>

      <main className="login-content" id="main-content">

        <header className="login-header">
          <img src="/nx-logo.png" alt="NanoXplore" className="login-header__logo" />
        </header>

        <div className="login-card">
          <h2 className="login-card__title">{t('login.title')}</h2>

          <form onSubmit={handleSubmit} className="login-form" noValidate aria-label={t('login.title')}>
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

            <div className="login-utility">
              <Checkbox
                id="remember"
                label={t('login.remember')}
                checked={remember}
                onChange={e => setRemember(e.target.checked)}
              />
            </div>

            <button type="submit" className="btn--login" disabled={loading}>
              {loading ? t('login.submit.loading') : t('login.submit')}
            </button>
          </form>

          <div className="login-card__footer">
            <p className="login-trouble">
              {t('login.trouble')}{' '}
              <a href="mailto:it@nanoxplore.com" className="login-trouble__link">
                {t('login.contact.admin')}
              </a>
            </p>
            <p className="login-legal">
              {t('login.legal.text')}{' '}
              <span className="login-legal__link">{t('login.legal.link')}</span>
              {' '}{t('login.legal.suffix')}
            </p>
          </div>
        </div>

        <footer className="login-page-footer">{t('login.copyright')}</footer>
      </main>

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
