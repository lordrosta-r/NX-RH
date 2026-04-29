// =============================================================================
// AdminRoles.jsx — Matrice RBAC, route /admin/roles
// Lecture seule — les rôles système ne sont pas modifiables.
// =============================================================================

import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useLocale } from '../../hooks/useLocale'
import { t as pageT } from './i18n'
import { Check, Minus } from 'lucide-react'

const PERMISSIONS = [
  'view-evaluations',
  'create-campaign',
  'manage-users',
  'view-analytics',
  'manage-settings',
  'impersonate',
  'view-audit-log',
  'manage-integrations',
]

// Matrice RBAC — rôles système, lecture seule
const RBAC = {
  employee: ['view-evaluations'],
  manager:  ['view-evaluations', 'create-campaign', 'view-analytics'],
  hr:       ['view-evaluations', 'create-campaign', 'manage-users', 'view-analytics'],
  admin:    PERMISSIONS, // tous les droits
}

const ROLES_ORDER = ['employee', 'manager', 'hr', 'admin']

export default function AdminRoles() {
  const { user, loading } = useAuth()
  const { t } = useLocale(pageT)
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && user && user.role !== 'admin') navigate('/employee', { replace: true })
  }, [loading, user, navigate])

  if (loading || !user) return null
  if (user.role !== 'admin') return null

  return (
    <div className="adm">
      <header className="adm-hero">
        <p className="adm-hero__eyebrow">{t('admin.roles.hero.eyebrow')}</p>
        <h1 className="adm-hero__title">
          <span className="adm-hero__accent">{t('admin.roles.hero.title')}</span>
        </h1>
        <p className="adm-hero__sub">{t('admin.roles.hero.sub')}</p>
      </header>

      <section className="adm-card" aria-labelledby="adm-matrix-hd">
        <h2 id="adm-matrix-hd" className="adm-card__title">{t('admin.roles.matrix.heading')}</h2>
        <div className="adm-table-wrap">
          <table className="adm-matrix" aria-label={t('admin.roles.matrix.heading')}>
            <thead>
              <tr>
                <th scope="col"></th>
                {PERMISSIONS.map(p => (
                  <th scope="col" key={p}>{t(`admin.roles.perm.${p}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROLES_ORDER.map(role => (
                <tr key={role}>
                  <td>
                    <span className={`adm-role__badge adm-role__badge--${role}`}>
                      {t(`admin.roles.role.${role}`)}
                    </span>
                  </td>
                  {PERMISSIONS.map(p => {
                    const has = RBAC[role].includes(p)
                    return (
                      <td key={p}>
                        <span
                          className={`adm-matrix__check adm-matrix__check--${has ? 'yes' : 'no'}`}
                          aria-label={has ? t('admin.yes') : t('admin.no')}
                        >
                          {has
                            ? <Check size={13} strokeWidth={2.5} aria-hidden="true" />
                            : <Minus size={13} strokeWidth={2} color="var(--color-surface-container-high)" aria-hidden="true" />
                          }
                        </span>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="adm-card" aria-labelledby="adm-roadmap-hd">
        <h2 id="adm-roadmap-hd" className="adm-card__title">{t('admin.roles.roadmap.heading')}</h2>
        <p style={{ fontSize: '0.9375rem', color: 'var(--color-on-surface-variant)', lineHeight: '1.6', margin: 0 }}>
          {t('admin.roles.roadmap.text')}
        </p>
      </section>
    </div>
  )
}
