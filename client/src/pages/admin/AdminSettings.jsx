// =============================================================================
// AdminSettings.jsx — Paramètres globaux, route /admin/settings
// Sections : Branding · Langue · Politique mots de passe · Maintenance
// =============================================================================

import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useLocale } from '../../hooks/useLocale'
import { t as pageT } from './i18n'

export default function AdminSettings() {
  const { user, loading } = useAuth()
  const { t } = useLocale(pageT)
  const navigate = useNavigate()

  const [branding, setBranding] = useState({ logo: '', company: 'NanoXplore', color: '#b8000b' })
  const [language, setLanguage] = useState('fr')
  const [password, setPassword] = useState({ minLength: 8, uppercase: true, special: false })
  const [maintenance, setMaintenance] = useState(false)
  const [savedSection, setSavedSection] = useState(null)

  useEffect(() => {
    if (!loading && user && user.role !== 'admin') navigate('/employee', { replace: true })
  }, [loading, user, navigate])

  function save(section) {
    setSavedSection(section)
    setTimeout(() => setSavedSection(null), 2000)
  }

  function setBrandingField(k, v) { setBranding(f => ({ ...f, [k]: v })) }
  function setPasswordField(k, v) { setPassword(f => ({ ...f, [k]: v })) }

  if (loading || !user) return null
  if (user.role !== 'admin') return null

  return (
    <div className="adm">
      <header className="adm-hero">
        <p className="adm-hero__eyebrow">{t('admin.settings.hero.eyebrow')}</p>
        <h1 className="adm-hero__title">
          <span className="adm-hero__accent">{t('admin.settings.hero.title')}</span>
        </h1>
        <p className="adm-hero__sub">{t('admin.settings.hero.sub')}</p>
      </header>

      {/* ── Branding ─────────────────────────────────────────────────────────── */}
      <section className="adm-card" aria-labelledby="adm-brand-hd">
        <h2 id="adm-brand-hd" className="adm-card__title">{t('admin.settings.branding.heading')}</h2>
        <div className="adm-form-group">
          <label className="adm-label" htmlFor="brand-logo">{t('admin.settings.branding.logo')}</label>
          <input
            id="brand-logo" type="url" className="adm-input"
            placeholder="https://example.com/logo.svg"
            value={branding.logo}
            onChange={e => setBrandingField('logo', e.target.value)}
            style={{ maxWidth: 400 }}
          />
        </div>
        <div className="adm-form-group">
          <label className="adm-label" htmlFor="brand-company">{t('admin.settings.branding.company')}</label>
          <input
            id="brand-company" className="adm-input"
            value={branding.company}
            onChange={e => setBrandingField('company', e.target.value)}
            style={{ maxWidth: 300 }}
          />
        </div>
        <div className="adm-form-group">
          <label className="adm-label" htmlFor="brand-color">{t('admin.settings.branding.color')}</label>
          <input
            id="brand-color" type="color" className="adm-input"
            value={branding.color}
            onChange={e => setBrandingField('color', e.target.value)}
            style={{ maxWidth: 80, padding: '0.25rem', height: '2.25rem', cursor: 'pointer' }}
          />
        </div>
        <button type="button" className="adm-btn adm-btn--primary" onClick={() => save('branding')}>
          {savedSection === 'branding' ? 'Enregistré' : t('admin.settings.save')}
        </button>
      </section>

      {/* ── Langue par défaut ────────────────────────────────────────────────── */}
      <section className="adm-card" aria-labelledby="adm-lang-hd">
        <h2 id="adm-lang-hd" className="adm-card__title">{t('admin.settings.language.heading')}</h2>
        <div className="adm-form-group">
          <select
            className="adm-select"
            value={language}
            onChange={e => setLanguage(e.target.value)}
            style={{ maxWidth: 200 }}
          >
            <option value="fr">{t('admin.settings.language.fr')}</option>
            <option value="en">{t('admin.settings.language.en')}</option>
          </select>
        </div>
        <button type="button" className="adm-btn adm-btn--primary" onClick={() => save('language')}>
          {savedSection === 'language' ? 'Enregistré' : t('admin.settings.save')}
        </button>
      </section>

      {/* ── Politique mots de passe ──────────────────────────────────────────── */}
      <section className="adm-card" aria-labelledby="adm-pwd-hd">
        <h2 id="adm-pwd-hd" className="adm-card__title">{t('admin.settings.password.heading')}</h2>
        <div className="adm-form-group">
          <label className="adm-label" htmlFor="pwd-min">{t('admin.settings.password.min_length')}</label>
          <input
            id="pwd-min" type="number" min="6" max="128" className="adm-input"
            value={password.minLength}
            onChange={e => setPasswordField('minLength', Number(e.target.value))}
            style={{ maxWidth: 100 }}
          />
        </div>
        <div className="adm-toggle-row">
          <span className="adm-toggle-label">{t('admin.settings.password.uppercase')}</span>
          <label className="adm-toggle" aria-label={t('admin.settings.password.uppercase')}>
            <input type="checkbox" checked={password.uppercase}
              onChange={e => setPasswordField('uppercase', e.target.checked)} />
            <span className="adm-toggle__track" />
            <span className="adm-toggle__thumb" />
          </label>
        </div>
        <div className="adm-toggle-row">
          <span className="adm-toggle-label">{t('admin.settings.password.special')}</span>
          <label className="adm-toggle" aria-label={t('admin.settings.password.special')}>
            <input type="checkbox" checked={password.special}
              onChange={e => setPasswordField('special', e.target.checked)} />
            <span className="adm-toggle__track" />
            <span className="adm-toggle__thumb" />
          </label>
        </div>
        <button type="button" className="adm-btn adm-btn--primary" onClick={() => save('password')}
          style={{ marginTop: '1rem' }}>
          {savedSection === 'password' ? 'Enregistré' : t('admin.settings.save')}
        </button>
      </section>

      {/* ── Mode maintenance ─────────────────────────────────────────────────── */}
      <section className="adm-card" aria-labelledby="adm-maint-hd">
        <h2 id="adm-maint-hd" className="adm-card__title">{t('admin.settings.maintenance.heading')}</h2>
        {maintenance && (
          <div className="adm-callout adm-callout--warn">
            <span>{t('admin.settings.maintenance.warning')}</span>
          </div>
        )}
        <div className="adm-toggle-row">
          <span className="adm-toggle-label">{t('admin.settings.maintenance.label')}</span>
          <label className="adm-toggle" aria-label={t('admin.settings.maintenance.label')}>
            <input type="checkbox" checked={maintenance} onChange={e => setMaintenance(e.target.checked)} />
            <span className="adm-toggle__track" />
            <span className="adm-toggle__thumb" />
          </label>
        </div>
        <button type="button" className="adm-btn adm-btn--primary" onClick={() => save('maintenance')}
          style={{ marginTop: '1rem' }}>
          {savedSection === 'maintenance' ? 'Enregistré' : t('admin.settings.save')}
        </button>
      </section>

      {/* ── SMTP hint ────────────────────────────────────────────────────────── */}
      <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
        {t('admin.settings.smtp.hint')}{' '}
        <Link to="/admin/integrations" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
          {t('admin.settings.smtp.link')}
        </Link>.
      </p>
    </div>
  )
}
