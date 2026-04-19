// =============================================================================
// DangerSection — logout button (only "destructive" action since LDAP-only auth)
// =============================================================================

import React from 'react'

export default function DangerSection({ t, onLogout }) {
  return (
    <div className="st-signout">
      <button type="button" className="st-signout__btn" onClick={onLogout}>
        {t('settings.danger.logout')}
      </button>
    </div>
  )
}
