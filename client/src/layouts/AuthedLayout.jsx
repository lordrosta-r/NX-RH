// ============================================================
// AuthedLayout — Shared shell for all authenticated pages
// Topbar-only layout (no sidebar). Renders AppTopbar with
// role-aware grouped nav + badge counts, then page content.
// ============================================================

import { Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useThemeCtx } from '../contexts/ThemeContext'
import { useLocaleCtx } from '../contexts/LocaleContext'
import AppTopbar from '../components/ui/AppTopbar'
import { getNavMenuForRole } from '../components/ui/navMenuConfig'
import useNotifBadges from '../hooks/useNotifBadges'

export default function AuthedLayout() {
  const { user, logout } = useAuth()
  const { theme, cycleTheme } = useThemeCtx()
  const { locale, setLocale } = useLocaleCtx()
  const badges = useNotifBadges()

  const navGroups = getNavMenuForRole(user?.role)

  return (
    <div className="db-toponly">
      <AppTopbar
        locale={locale}
        setLocale={setLocale}
        theme={theme}
        cycleTheme={cycleTheme}
        user={user}
        onLogout={logout}
        navGroups={navGroups}
        badges={badges}
      />
      <main className="db-content">
        <Outlet />
      </main>
    </div>
  )
}
