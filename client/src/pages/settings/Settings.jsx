// =============================================================================
// Settings — Page paramètres utilisateur (/employee/settings, /settings)
//
// Refactorisé SPA : plus de SettingsSidebar ni AppTopbar propres.
// Le shell (sidebar + topbar) est fourni par AuthedLayout.
// =============================================================================

import React from 'react'
import { useNavigate } from 'react-router-dom'

import ProfileSection       from './sections/ProfileSection'
import PreferencesSection   from './sections/PreferencesSection'
import NotificationsSection from './sections/NotificationsSection'
import RoleSpaceSection     from './sections/RoleSpaceSection'
import DangerSection        from './sections/DangerSection'

import { useAuth }                      from '../../contexts/AuthContext'
import { useLocaleCtx, useTranslate }   from '../../contexts/LocaleContext'
import { useThemeCtx }                  from '../../contexts/ThemeContext'
import { t as pageT }                   from './i18n'

export default function Settings() {
  const { user, loading } = useAuth()
  const { locale, setLocale } = useLocaleCtx()
  const t = useTranslate(pageT)
  const { theme, setTheme, cycleTheme } = useThemeCtx()
  const navigate = useNavigate()

  if (loading || !user) return null

  async function handleLogout() {
    try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }) } catch { /* ignore */ }
    sessionStorage.clear()
    navigate('/login')
  }

  async function savePreferences(patch) {
    const res = await fetch('/api/auth/preferences', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  }

  return (
    <div className="st">
      <section className="st-hero">
        <p className="st-hero__eyebrow">{t('settings.hero.eyebrow')}</p>
        <h1 className="st-hero__title">
          <span className="st-hero__accent">{t('settings.hero.title_accent')}</span> {t('settings.hero.title_rest')}
        </h1>
        <p className="st-hero__sub">{t('settings.page.subtitle')}</p>
      </section>

      <div className="st-stack">
        <ProfileSection t={t} locale={locale} user={user} />
        <PreferencesSection
          t={t}
          locale={locale}
          setLocale={(l) => { setLocale(l); savePreferences({ locale: l }).catch(() => {}) }}
          theme={theme}
          setTheme={setTheme}
          savePreferences={savePreferences}
        />
        <NotificationsSection t={t} prefs={user.notificationPrefs} savePreferences={savePreferences} />
        <RoleSpaceSection t={t} role={user.role} />
        <DangerSection t={t} onLogout={handleLogout} />
      </div>
    </div>
  )
}
