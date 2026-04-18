// =============================================================================
// NotificationsSection — checkboxes for the user's notification preferences.
//
// Le filtrage par rôle est entièrement géré côté backend :
//   • GET  /api/auth/me                 → renvoie uniquement les clés autorisées
//   • PATCH /api/auth/preferences       → rejette toute clé non autorisée (403)
// On affiche donc simplement ce que le serveur a renvoyé.
// =============================================================================

import React, { useState } from 'react'

export default function NotificationsSection({ t, prefs, savePreferences }) {
  const [local, setLocal] = useState(prefs || {})
  const [status, setStatus] = useState('idle')

  const keys = Object.keys(local)

  async function toggle(key) {
    const next = !local[key]
    const updated = { ...local, [key]: next }
    setLocal(updated)
    setStatus('saving')
    try {
      const fresh = await savePreferences({ notificationPrefs: { [key]: next } })
      // Le backend renvoie l'état canonique filtré par rôle — on s'aligne dessus.
      if (fresh && fresh.notificationPrefs) setLocal(fresh.notificationPrefs)
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 1500)
    } catch {
      setLocal(local) // revert
      setStatus('error')
      setTimeout(() => setStatus('idle'), 3000)
    }
  }

  return (
    <section className="st-card" aria-labelledby="notif-h">
      <div className="st-card__head">
        <h2 id="notif-h" className="st-card__title">{t('settings.notif.heading')}</h2>
        {status !== 'idle' && (
          <span className={`st-status st-status--${status}`}>
            {status === 'saving' && t('settings.prefs.saving')}
            {status === 'saved'  && t('settings.prefs.saved')}
            {status === 'error'  && t('settings.prefs.error')}
          </span>
        )}
      </div>
      <p className="st-card__sub">{t('settings.notif.subtitle')}</p>

      {keys.length === 0 ? (
        <p className="st-card__sub">—</p>
      ) : (
        <ul className="st-checklist">
          {keys.map(k => (
            <li key={k} className="st-checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={!!local[k]}
                  onChange={() => toggle(k)}
                />
                <span>{t(`settings.notif.${k}`)}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
