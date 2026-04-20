// =============================================================================
// Employee — Shell mini-SPA du portail Employee
// Routes (React Router, basename implicite /employee via BrowserRouter) :
//   /employee              → EmployeeOverview
//   /employee/evaluation   → Evaluation (embedded)
//   /employee/settings     → Settings (embedded)
//
// Pas de sidebar : la navigation est intégrée dans le topbar (AppTopbarNav).
// =============================================================================

import React, { useState } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import './employee.css'
import LogoImg          from '../../components/ui/icons/images.png'
import EmployeeOverview from './EmployeeOverview'
import Evaluation       from '../evaluation/Evaluation'
import Settings         from '../settings/Settings'
import AppTopbar        from '../../components/ui/AppTopbar'
import AppTopbarNav     from '../../components/ui/AppTopbarNav'
import { t as pageT }   from './i18n'
import { useLocale }    from '../../hooks/useLocale'
import { useTheme }     from '../../hooks/useTheme'
import { useAuthUser }  from '../../hooks/useAuthUser'


export default function Employee() {
  const { t, locale, setLocale } = useLocale(pageT)
  const { theme, cycleTheme }    = useTheme()
  const { user, loading: authLoading } = useAuthUser()
  const { pathname }             = useLocation()
  const [notifItems, setNotifItems] = useState([])

  if (authLoading) return null
  if (!user)       return null

  async function handleLogout() {
    try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }) } catch { /* ignore */ }
    sessionStorage.clear()
    window.location.href = '/'
  }

  // pathname est l'URL complète (/employee, /employee/evaluation…)
  const navItems = [
    { id: 'overview',   href: '/employee',            label: t('employee.nav.overview'),   active: pathname === '/employee' },
    { id: 'evaluation', href: '/employee/evaluation', label: t('employee.nav.evaluation'), active: pathname.startsWith('/employee/evaluation') },
    { id: 'settings',   href: '/employee/settings',   label: t('employee.nav.settings'),   active: pathname.startsWith('/employee/settings') },
  ]

  return (
    <div className="emp">
      <AppTopbar
        brand={<img src={LogoImg} alt="NanoXplore" />}
        nav={<AppTopbarNav items={navItems} />}
        locale={locale} setLocale={setLocale}
        theme={theme} cycleTheme={cycleTheme}
        notifItems={pathname === '/employee' ? notifItems : []}
        user={user} onLogout={handleLogout}
      />

      <Routes>
        <Route path="/employee" element={
          <EmployeeOverview
            t={t} locale={locale} user={user}
            onNotifItemsChange={setNotifItems}
          />
        } />
        <Route path="/employee/evaluation" element={<Evaluation embedded />} />
        <Route path="/employee/evaluation/:id" element={<Evaluation embedded />} />
        <Route path="/employee/settings"   element={<Settings   embedded />} />
      </Routes>
    </div>
  )
}
