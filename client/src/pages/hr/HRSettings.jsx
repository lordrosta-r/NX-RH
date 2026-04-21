// =============================================================================
// HRSettings — Préférences RH (/hr/settings)
//
// Page préférences simple pour les utilisateurs RH.
// Contenu de page uniquement — shell fourni par AuthedLayout.
// =============================================================================

import React, { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useTranslate, useLocaleCtx } from '../../contexts/LocaleContext'
import { useThemeCtx } from '../../contexts/ThemeContext'
import { t as pageT } from './i18n'
import { Save, Globe, Bell, Monitor } from 'lucide-react'
import './hr-settings.css'

export default function HRSettings() {
  const { user } = useAuth()
  const { locale, setLocale } = useLocaleCtx()
  const { theme, setTheme } = useThemeCtx()
  const t = useTranslate(pageT)

  const [notifEmail, setNotifEmail] = useState(
    user?.notificationPrefs?.email ?? true
  )
  const [notifPush, setNotifPush] = useState(
    user?.notificationPrefs?.push ?? false
  )
  const [density, setDensity] = useState('normal')
  const [saveState, setSaveState] = useState('idle') // 'idle'|'saving'|'saved'|'error'

  async function handleSave() {
    setSaveState('saving')
    try {
      const res = await fetch(`/api/users/${user._id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locale,
          notificationPrefs: { email: notifEmail, push: notifPush },
          displayDensity: density,
        }),
      })
      if (!res.ok) throw new Error()
      setSaveState('saved')
      setTimeout(() => setSaveState('idle'), 2500)
    } catch {
      setSaveState('error')
      setTimeout(() => setSaveState('idle'), 3000)
    }
  }

  return (
    <div className="hrst-page">

      {/* ── Hero ──────────────────────────────────────── */}
      <header className="hrst-hero">
        <p className="hrst-hero__eyebrow">{t('hrst.hero.eyebrow')}</p>
        <h1 className="hrst-hero__headline">{t('hrst.hero.title')}</h1>
        <p className="hrst-hero__sub">{t('hrst.hero.sub')}</p>
      </header>

      <div className="hrst-sections">

        {/* ── Langue ────────────────────────────────── */}
        <section className="hrst-section">
          <div className="hrst-section__head">
            <Globe size={17} aria-hidden="true" />
            <h2 className="hrst-section__title">{t('hrst.lang.label')}</h2>
          </div>
          <div className="hrst-radios">
            <label className="hrst-radio">
              <input
                type="radio"
                name="locale"
                value="fr"
                checked={locale === 'fr'}
                onChange={() => setLocale('fr')}
              />
              <span>{t('hrst.lang.fr')}</span>
            </label>
            <label className="hrst-radio">
              <input
                type="radio"
                name="locale"
                value="en"
                checked={locale === 'en'}
                onChange={() => setLocale('en')}
              />
              <span>{t('hrst.lang.en')}</span>
            </label>
          </div>
        </section>

        {/* ── Notifications ─────────────────────────── */}
        <section className="hrst-section">
          <div className="hrst-section__head">
            <Bell size={17} aria-hidden="true" />
            <h2 className="hrst-section__title">{t('hrst.notif.label')}</h2>
          </div>
          <div className="hrst-toggles">
            <label className="hrst-toggle">
              <span>{t('hrst.notif.email')}</span>
              <button
                type="button"
                role="switch"
                aria-checked={notifEmail}
                className={`hrst-switch${notifEmail ? ' hrst-switch--on' : ''}`}
                onClick={() => setNotifEmail(v => !v)}
              >
                <span className="hrst-switch__thumb" />
              </button>
            </label>
            <label className="hrst-toggle">
              <span>{t('hrst.notif.push')}</span>
              <button
                type="button"
                role="switch"
                aria-checked={notifPush}
                className={`hrst-switch${notifPush ? ' hrst-switch--on' : ''}`}
                onClick={() => setNotifPush(v => !v)}
              >
                <span className="hrst-switch__thumb" />
              </button>
            </label>
          </div>
        </section>

        {/* ── Affichage ─────────────────────────────── */}
        <section className="hrst-section">
          <div className="hrst-section__head">
            <Monitor size={17} aria-hidden="true" />
            <h2 className="hrst-section__title">{t('hrst.display.label')}</h2>
          </div>
          <p className="hrst-section__label">{t('hrst.display.density')}</p>
          <div className="hrst-radios">
            <label className="hrst-radio">
              <input
                type="radio"
                name="density"
                value="compact"
                checked={density === 'compact'}
                onChange={() => setDensity('compact')}
              />
              <span>{t('hrst.display.density.compact')}</span>
            </label>
            <label className="hrst-radio">
              <input
                type="radio"
                name="density"
                value="normal"
                checked={density === 'normal'}
                onChange={() => setDensity('normal')}
              />
              <span>{t('hrst.display.density.normal')}</span>
            </label>
          </div>
        </section>

      </div>

      {/* ── Bouton enregistrer ────────────────────────── */}
      <div className="hrst-footer">
        {saveState === 'saved' && (
          <span className="hrst-feedback hrst-feedback--ok">{t('hrst.saved')}</span>
        )}
        {saveState === 'error' && (
          <span className="hrst-feedback hrst-feedback--err">{t('hrst.error')}</span>
        )}
        <button
          type="button"
          className="hrst-save-btn"
          onClick={handleSave}
          disabled={saveState === 'saving'}
        >
          <Save size={16} />
          {saveState === 'saving' ? t('hrst.saving') : t('hrst.save')}
        </button>
      </div>

    </div>
  )
}
