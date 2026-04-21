// =============================================================================
// Admin.jsx — Dashboard administrateur, route /admin
//
// Sections :
//   1. Hero — eyebrow + titre + sous-titre
//   2. KPI bento (6 tuiles) — utilisateurs + santé système
//   3. Répartition par rôle
//   4. Accès rapides aux 9 sous-pages admin
//   5. Santé du système (si /api/health répond)
//
// Données : react-query → /api/users, /api/health
// Pas de sidebar/topbar : pris en charge par AuthedLayout.
// =============================================================================

import React, { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../contexts/AuthContext'
import { useLocale } from '../../hooks/useLocale'
import { t as pageT } from './i18n'
import {
  Users, Activity, Shield, Database, Link2,
  Mail, FileText, Settings, GitBranch, Lock, Box,
} from 'lucide-react'
import './admin.css'

const QUICK_LINKS = [
  { to: '/admin/users',          Icon: Users,     lk: 'admin.quicklink.users.label',          dk: 'admin.quicklink.users.desc' },
  { to: '/admin/org-chart',      Icon: GitBranch, lk: 'admin.quicklink.orgchart.label',       dk: 'admin.quicklink.orgchart.desc' },
  { to: '/admin/roles',          Icon: Shield,    lk: 'admin.quicklink.roles.label',          dk: 'admin.quicklink.roles.desc' },
  { to: '/admin/integrations',   Icon: Link2,     lk: 'admin.quicklink.integrations.label',   dk: 'admin.quicklink.integrations.desc' },
  { to: '/admin/communications', Icon: Mail,      lk: 'admin.quicklink.communications.label', dk: 'admin.quicklink.communications.desc' },
  { to: '/admin/compliance',     Icon: FileText,  lk: 'admin.quicklink.compliance.label',     dk: 'admin.quicklink.compliance.desc' },
  { to: '/admin/security',       Icon: Lock,      lk: 'admin.quicklink.security.label',       dk: 'admin.quicklink.security.desc' },
  { to: '/admin/sandbox',        Icon: Box,       lk: 'admin.quicklink.sandbox.label',        dk: 'admin.quicklink.sandbox.desc' },
  { to: '/admin/settings',       Icon: Settings,  lk: 'admin.quicklink.settings.label',       dk: 'admin.quicklink.settings.desc' },
]

export default function Admin() {
  const { user, loading } = useAuth()
  const { t } = useLocale(pageT)
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && user && user.role !== 'admin') navigate('/employee', { replace: true })
  }, [loading, user, navigate])

  const { data: users = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () =>
      fetch('/api/users?limit=200', { credentials: 'include' })
        .then(r => r.ok ? r.json() : [])
        .then(d => Array.isArray(d) ? d : (d.users || [])),
    enabled: !!user && user.role === 'admin',
    staleTime: 2 * 60 * 1000,
  })

  const { data: health = null } = useQuery({
    queryKey: ['admin-health'],
    queryFn: () =>
      fetch('/api/health', { credentials: 'include' })
        .then(r => r.json())
        .catch(() => null),
    enabled: !!user && user.role === 'admin',
    staleTime: 60 * 1000,
  })

  if (loading || !user) return null
  if (user.role !== 'admin') return null

  const stats = {
    total:    users.length,
    active:   users.filter(u => u.isActive).length,
    inactive: users.filter(u => !u.isActive).length,
    ldap:     users.filter(u => u.authSource === 'ldap').length,
    local:    users.filter(u => u.authSource !== 'ldap').length,
    byRole:   users.reduce((acc, u) => { acc[u.role] = (acc[u.role] || 0) + 1; return acc }, {}),
  }

  const systemOk = health?.status === 'ok' || health?.db === 'connected'

  return (
    <div className="adm">

      <header className="adm-hero">
        <p className="adm-hero__eyebrow">{t('admin.hero.eyebrow')}</p>
        <h1 className="adm-hero__title">
          <span className="adm-hero__accent">{t('admin.hero.title_accent')}</span>
          {' '}{t('admin.hero.title_rest')}
        </h1>
        <p className="adm-hero__sub">{t('admin.hero.sub')}</p>
      </header>

      <section className="adm-kpis" aria-label={t('admin.kpis.label')}>
        <div className="adm-kpi">
          <span className="adm-kpi__value">{stats.total}</span>
          <span className="adm-kpi__label">{t('admin.kpi.users_total')}</span>
        </div>
        <div className="adm-kpi">
          <span className="adm-kpi__value">{stats.active}</span>
          <span className="adm-kpi__label">{t('admin.kpi.users_active')}</span>
        </div>
        <div className="adm-kpi">
          <span className="adm-kpi__value">{stats.inactive}</span>
          <span className="adm-kpi__label">{t('admin.kpi.users_inactive')}</span>
        </div>
        <div className="adm-kpi">
          <span className="adm-kpi__value">{stats.ldap}</span>
          <span className="adm-kpi__label">{t('admin.kpi.users_ldap')}</span>
        </div>
        <div className="adm-kpi">
          <span className="adm-kpi__value">{stats.local}</span>
          <span className="adm-kpi__label">{t('admin.kpi.users_local')}</span>
        </div>
        <div className="adm-kpi">
          <span className={`adm-kpi__value adm-kpi__value--${systemOk ? 'ok' : 'warn'}`}>
            <Activity size={22} strokeWidth={2} aria-hidden="true" />
          </span>
          <span className="adm-kpi__label">{t('admin.kpi.system')}</span>
        </div>
      </section>

      <section className="adm-card" aria-labelledby="adm-roles-hd">
        <h2 id="adm-roles-hd" className="adm-card__title">{t('admin.roles.heading')}</h2>
        <div className="adm-roles">
          {['admin', 'hr', 'manager', 'employee'].map(r => (
            <div key={r} className="adm-role">
              <span className={`adm-role__badge adm-role__badge--${r}`}>{r}</span>
              <span className="adm-role__count">{stats.byRole[r] || 0}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="adm-card" aria-labelledby="adm-links-hd">
        <h2 id="adm-links-hd" className="adm-card__title">{t('admin.actions.heading')}</h2>
        <nav className="adm-quicklinks" aria-label={t('admin.actions.heading')}>
          {QUICK_LINKS.map(({ to, Icon, lk, dk }) => (
            <Link key={to} to={to} className="adm-quicklink">
              <span className="adm-quicklink__icon" aria-hidden="true">
                <Icon size={16} strokeWidth={1.75} />
              </span>
              <span className="adm-quicklink__body">
                <span className="adm-quicklink__name">{t(lk)}</span>
                <span className="adm-quicklink__desc">{t(dk)}</span>
              </span>
            </Link>
          ))}
        </nav>
      </section>

      {health && (
        <section className="adm-card" aria-labelledby="adm-health-hd">
          <h2 id="adm-health-hd" className="adm-card__title">{t('admin.health.heading')}</h2>
          <div className="adm-roles">
            <div className="adm-role">
              <span className="adm-role__badge adm-role__badge--employee">
                <Database size={12} strokeWidth={2} aria-hidden="true" />
                {' '}{t('admin.health.db')}
              </span>
              <span className="adm-role__count">
                <span className={`adm-status adm-status--${systemOk ? 'on' : 'off'}`}>
                  {systemOk ? t('admin.health.ok') : t('admin.health.warn')}
                </span>
              </span>
            </div>
            {health.uptime != null && (
              <div className="adm-role">
                <span className="adm-role__badge adm-role__badge--employee">
                  {t('admin.health.uptime')}
                </span>
                <span className="adm-role__count">
                  {Math.round(health.uptime / 3600)}h
                </span>
              </div>
            )}
          </div>
        </section>
      )}

    </div>
  )
}
