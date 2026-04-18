// =============================================================================
// PreferencesSection — language + theme. Persists to DB via PATCH /preferences.
// =============================================================================

import React, { useState } from 'react'

const LANG_OPTIONS  = ['fr', 'en']
const THEME_OPTIONS = ['dark', 'light', 'light-sidebar']

export default function PreferencesSection({
  t, locale, setLocale, theme, setTheme, savePreferences,
}) {
  const [status, setStatus] = useState('idle') // idle | saving | saved | error

  async function persist(patch) {
    setStatus('saving')
    try {
      await savePreferences(patch)
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 1500)
    } catch {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 3000)
    }
  }

  function handleLang(next) {
    if (next === locale) return
    setLocale(next)
    persist({ locale: next })
  }

  function handleTheme(next) {
    if (next === theme) return
    setTheme(next)
    persist({ theme: next })
  }

  return (
    <section className="st-card" aria-labelledby="prefs-h">
      <div className="st-card__head">
        <h2 id="prefs-h" className="st-card__title">{t('settings.prefs.heading')}</h2>
        {status !== 'idle' && (
          <span className={`st-status st-status--${status}`}>
            {status === 'saving' && t('settings.prefs.saving')}
            {status === 'saved'  && t('settings.prefs.saved')}
            {status === 'error'  && t('settings.prefs.error')}
          </span>
        )}
      </div>

      {/* Language */}
      <div className="st-pref">
        <div className="st-pref__label">{t('settings.prefs.language')}</div>
        <div className="st-segmented" role="radiogroup" aria-label={t('settings.prefs.language')}>
          {LANG_OPTIONS.map(l => (
            <button
              key={l}
              type="button"
              role="radio"
              aria-checked={locale === l}
              className={`st-segmented__btn${locale === l ? ' st-segmented__btn--active' : ''}`}
              onClick={() => handleLang(l)}
            >
              {t(`settings.prefs.lang.${l}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Theme */}
      <div className="st-pref">
        <div className="st-pref__label">{t('settings.prefs.theme')}</div>
        <div className="st-themes" role="radiogroup" aria-label={t('settings.prefs.theme')}>
          {THEME_OPTIONS.map(name => (
            <button
              key={name}
              type="button"
              role="radio"
              aria-checked={theme === name}
              className={`st-theme st-theme--${name}${theme === name ? ' st-theme--active' : ''}`}
              onClick={() => handleTheme(name)}
            >
              <span className={`st-theme__preview st-theme__preview--${name}`} aria-hidden="true">
                <span className="st-theme__preview-side" />
                <span className="st-theme__preview-main" />
              </span>
              <span className="st-theme__name">{t(`settings.prefs.theme.${name}`)}</span>
              <span className="st-theme__desc">{t(`settings.prefs.theme.${name}.desc`)}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
