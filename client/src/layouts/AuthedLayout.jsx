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
import LogoImg from '../components/ui/icons/images.png'

export default function AuthedLayout() {
  const { user, logout } = useAuth()
  const { theme, cycleTheme } = useThemeCtx()
  const { locale, setLocale } = useLocaleCtx()

  return (
    <div className="page">
      <AppTopbar
        brand={<img src={LogoImg} alt="NanoXplore" style={{ height: 28 }} />}
        locale={locale}
        setLocale={setLocale}
        theme={theme}
        cycleTheme={cycleTheme}
        user={user}
        onLogout={logout}
      />
      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}
