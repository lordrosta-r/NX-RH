// =============================================================================
// DangerSection — logout button (only "destructive" action since LDAP-only auth)
// =============================================================================

import React from 'react'

export default function DangerSection({ t, onLogout }) {
  return (
    <section className="st-card st-card--danger" aria-labelledby="danger-h">
      <h2 id="danger-h" className="st-card__title">{t('settings.danger.heading')}</h2>
      <p className="st-card__sub">{t('settings.danger.subtitle')}</p>
      <button type="button" className="st-btn st-btn--danger" onClick={onLogout}>
        {t('settings.danger.logout')}
      </button>
    </section>
  )
}
