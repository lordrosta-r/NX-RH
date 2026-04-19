// =============================================================================
// Employee — Shell mini-SPA du portail Employee
// Routes internes (History API) :
//   /employee              → EmployeeOverview
//   /employee/evaluation   → Evaluation (embedded)
//   /employee/settings     → Settings (embedded)
//
// Pas de sidebar : la navigation est intégrée dans le topbar (AppTopbarNav).
// =============================================================================

import React, { useState } from 'react'
import './employee.css'
import EmployeeOverview from './EmployeeOverview'
import Evaluation       from '../evaluation/Evaluation'
import Settings         from '../settings/Settings'
import AppTopbar        from '../../components/ui/AppTopbar'
import AppTopbarNav     from '../../components/ui/AppTopbarNav'
import { t as pageT }   from './i18n'
import { useLocale }    from '../../hooks/useLocale'
import { useTheme }     from '../../hooks/useTheme'
import { useAuthUser }  from '../../hooks/useAuthUser'
import { useRouter }    from '../../hooks/useRouter'


export default function Employee() {
  const { t, locale, setLocale } = useLocale(pageT)
  const { theme, cycleTheme }    = useTheme()
  const { user, loading: authLoading } = useAuthUser()
  const { path }                 = useRouter('/employee')
  const [notifItems, setNotifItems] = useState([])

  if (authLoading) return null
  if (!user)       return null

  async function handleLogout() {
    try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }) } catch { /* ignore */ }
    sessionStorage.clear()
    window.location.href = '/'
  }

  const navItems = [
    { id: 'overview',   href: '/employee',            label: t('employee.nav.overview'),   active: path === '' },
    { id: 'evaluation', href: '/employee/evaluation', label: t('employee.nav.evaluation'), active: path === 'evaluation' },
    { id: 'settings',   href: '/employee/settings',   label: t('employee.nav.settings'),   active: path === 'settings' },
  ]

  return (
    <div className="emp">
      <AppTopbar
        nav={<AppTopbarNav items={navItems} />}
        locale={locale} setLocale={setLocale}
        theme={theme} cycleTheme={cycleTheme}
        notifItems={path === '' ? notifItems : []}
        user={user} onLogout={handleLogout}
      />

      {path === '' && (
        <EmployeeOverview
          t={t} locale={locale} user={user}
          onNotifItemsChange={setNotifItems}
        />
      )}

      {path === 'evaluation' && <Evaluation embedded />}
      {path === 'settings'   && <Settings   embedded />}
    </div>
  )
}
