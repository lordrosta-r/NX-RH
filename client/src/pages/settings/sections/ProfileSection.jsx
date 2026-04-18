// =============================================================================
// ProfileSection — read-only profile data + LDAP password note
// =============================================================================

import React, { useEffect, useState } from 'react'

function fmtDate(value, locale) {
  if (!value) return null
  try {
    return new Date(value).toLocaleString(
      locale === 'fr' ? 'fr-FR' : 'en-US',
      { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' },
    )
  } catch { return null }
}

export default function ProfileSection({ t, locale, user }) {
  const [manager, setManager] = useState(null)

  useEffect(() => {
    if (!user?.managerId) { setManager(null); return }
    let cancelled = false
    fetch(`/api/users/${user.managerId}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (!cancelled && data) setManager(data) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [user?.managerId])

  const empty = t('settings.profile.empty')
  const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || empty
  const lastLogin = fmtDate(user.lastLoginAt, locale) || t('settings.profile.never')
  const created   = fmtDate(user.createdAt, locale) || empty
  const authLabel = user.authSource === 'ldap'
    ? t('settings.profile.authsource.ldap')
    : t('settings.profile.authsource.local')
  const roleLabel = t(`settings.role.${user.role}`)
  const managerLabel = manager ? `${manager.firstName} ${manager.lastName}` : empty

  return (
    <section className="st-card" aria-labelledby="profile-h">
      <h2 id="profile-h" className="st-card__title">{t('settings.profile.heading')}</h2>

      <dl className="st-grid">
        <div className="st-field"><dt>{t('settings.profile.name')}</dt><dd>{fullName}</dd></div>
        <div className="st-field"><dt>{t('settings.profile.email')}</dt><dd>{user.email || empty}</dd></div>
        <div className="st-field">
          <dt>{t('settings.profile.role')}</dt>
          <dd><span className={`st-badge st-badge--${user.role}`}>{roleLabel}</span></dd>
        </div>
        <div className="st-field"><dt>{t('settings.profile.department')}</dt><dd>{user.department || empty}</dd></div>
        <div className="st-field"><dt>{t('settings.profile.position')}</dt><dd>{user.position || empty}</dd></div>
        <div className="st-field"><dt>{t('settings.profile.manager')}</dt><dd>{managerLabel}</dd></div>
        <div className="st-field"><dt>{t('settings.profile.authsource')}</dt><dd>{authLabel}</dd></div>
        <div className="st-field"><dt>{t('settings.profile.lastlogin')}</dt><dd>{lastLogin}</dd></div>
        <div className="st-field"><dt>{t('settings.profile.created')}</dt><dd>{created}</dd></div>
      </dl>

      <p className="st-note">{t('settings.profile.password.note')}</p>
    </section>
  )
}
