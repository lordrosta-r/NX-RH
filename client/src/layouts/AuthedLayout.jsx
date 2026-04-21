// ============================================================
// AuthedLayout — Shared shell for all authenticated pages
// Renders the top bar (AppTopbar) + page content via <Outlet>.
// Reads auth, theme and locale from their respective contexts.
// ============================================================

import { Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useThemeCtx } from '../contexts/ThemeContext'
import { useLocaleCtx } from '../contexts/LocaleContext'
import AppTopbar from '../components/ui/AppTopbar'
import AppSidebar from '../components/ui/AppSidebar'
import { getNavItemsForRole, getBrandSubForRole } from '../components/layout/navConfig'

export default function AuthedLayout() {
  const { user, logout } = useAuth()
  const { theme, cycleTheme } = useThemeCtx()
  const { locale, setLocale } = useLocaleCtx()

  const role = user?.role
  const navItems = getNavItemsForRole(role)
  const brandSub = getBrandSubForRole(role)

  return (
    <div className="db">
      <AppSidebar brandSub={brandSub} navItems={navItems} />

      <div className="db-main">
        <AppTopbar
          locale={locale}
          setLocale={setLocale}
          theme={theme}
          cycleTheme={cycleTheme}
          user={user}
          onLogout={logout}
        />
        <main className="db-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
