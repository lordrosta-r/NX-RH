// =============================================================================
// Settings — User personal settings page
// Layout: dynamic sidebar (role-aware) + Editorial Enterprise main content.
// =============================================================================

import React, { useState, useEffect, useRef } from 'react'
import './settings.css'

import SettingsSidebar      from './SettingsSidebar'
import AppTopbar            from '../../components/ui/AppTopbar'
import ProfileSection       from './sections/ProfileSection'
import PreferencesSection   from './sections/PreferencesSection'
import NotificationsSection from './sections/NotificationsSection'
import RoleSpaceSection     from './sections/RoleSpaceSection'
import DangerSection        from './sections/DangerSection'

import { t as pageT }   from './i18n'
import { useLocale }    from '../../hooks/useLocale'
import { useTheme }     from '../../hooks/useTheme'
import { useAuthUser }  from '../../hooks/useAuthUser'

export default function Settings() {
  const { t, locale, setLocale }       = useLocale(pageT)
  const { theme, setTheme, cycleTheme } = useTheme()
  const { user, loading: authLoading } = useAuthUser()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Sync locale + theme from server prefs when /me arrives.
  // Runs only once when user becomes available (subsequent local changes
  // are persisted via savePreferences below — no loop).
  const syncedRef = useRef(false)
  useEffect(() => {
    if (!user || syncedRef.current) return
    syncedRef.current = true
    if (user.locale && user.locale !== locale) setLocale(user.locale)
  }, [user, locale, setLocale])

  if (authLoading) return null
  if (!user)       return null

  async function handleLogout() {
    try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }) } catch { /* ignore */ }
    sessionStorage.clear()
    window.location.href = '/'
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
    <div className="db">
      <SettingsSidebar t={t} role={user.role} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="db-main">
        <AppTopbar
          searchPlaceholder={t('settings.search.placeholder')}
          locale={locale} setLocale={(l) => { setLocale(l); savePreferences({ locale: l }).catch(() => {}) }}
          theme={theme} cycleTheme={cycleTheme}
          notifItems={[]}
          user={user} onLogout={handleLogout}
          onMenuToggle={() => setSidebarOpen(o => !o)}
        />

        <main className="db-content st" id="main-content">
          <section className="st-hero">
            <p className="st-hero__eyebrow">{t('settings.hero.eyebrow')}</p>
            <h1 className="st-hero__title">
              <span className="st-hero__accent">{t('settings.hero.title_accent')}</span> {t('settings.hero.title_rest')}
            </h1>
            <p className="st-hero__sub">{t('settings.page.subtitle')}</p>
          </section>

          <div className="st-stack">
            <ProfileSection       t={t} locale={locale} user={user} />
            <PreferencesSection
              t={t}
              locale={locale} setLocale={setLocale}
              theme={theme}   setTheme={setTheme}
              savePreferences={savePreferences}
            />
            <NotificationsSection
              t={t}
              prefs={user.notificationPrefs}
              savePreferences={savePreferences}
            />
            <RoleSpaceSection t={t} role={user.role} />
            <DangerSection    t={t} onLogout={handleLogout} />
          </div>
        </main>
      </div>
    </div>
  )
}
