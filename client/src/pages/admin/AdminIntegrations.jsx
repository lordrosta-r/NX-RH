// =============================================================================
// AdminIntegrations.jsx — Intégrations, route /admin/integrations
// Sections : LDAP/AD · SSO · SMTP · Webhooks
// État local uniquement — pas de mutations réelles.
// =============================================================================

import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useLocale } from '../../hooks/useLocale'
import { t as pageT } from './i18n'
import { Plus, CheckCircle, XCircle } from 'lucide-react'
import './admin.css'

const SSO_PROVIDERS = [
  { id: 'google',    name: 'Google Workspace',    configured: false },
  { id: 'microsoft', name: 'Microsoft Entra ID',   configured: false },
  { id: 'okta',      name: 'Okta',                 configured: false },
]

export default function AdminIntegrations() {
  const { user, loading } = useAuth()
  const { t } = useLocale(pageT)
  const navigate = useNavigate()

  const [ldap, setLdap] = useState({ server: '', bindDn: '', baseDn: '', tls: false })
  const [ldapStatus, setLdapStatus] = useState(null) // null | 'testing' | 'ok' | 'fail'
  const [smtp, setSmtp] = useState({ host: '', port: '587', user: '', from: '' })
  const [webhookModal, setWebhookModal] = useState(false)
  const [webhookForm, setWebhookForm] = useState({ url: '', event: '' })

  useEffect(() => {
    if (!loading && user && user.role !== 'admin') navigate('/employee', { replace: true })
  }, [loading, user, navigate])

  function setLdapField(k, v) { setLdap(f => ({ ...f, [k]: v })) }
  function setSmtpField(k, v) { setSmtp(f => ({ ...f, [k]: v })) }

  function testLdap() {
    setLdapStatus('testing')
    setTimeout(() => setLdapStatus('fail'), 1500) // mock
  }

  if (loading || !user) return null
  if (user.role !== 'admin') return null

  return (
    <div className="adm">
      <header className="adm-hero">
        <p className="adm-hero__eyebrow">{t('admin.integrations.hero.eyebrow')}</p>
        <h1 className="adm-hero__title">
          <span className="adm-hero__accent">{t('admin.integrations.hero.title')}</span>
        </h1>
        <p className="adm-hero__sub">{t('admin.integrations.hero.sub')}</p>
      </header>

      {/* ── LDAP ─────────────────────────────────────────────────────────────── */}
      <section className="adm-card" aria-labelledby="adm-ldap-hd">
        <h2 id="adm-ldap-hd" className="adm-card__title">{t('admin.integrations.ldap.heading')}</h2>
        <div className="adm-form-row">
          <div className="adm-form-group">
            <label className="adm-label" htmlFor="ldap-server">{t('admin.integrations.ldap.server')}</label>
            <input id="ldap-server" className="adm-input" placeholder="ldap://ad.example.com"
              value={ldap.server} onChange={e => setLdapField('server', e.target.value)} />
          </div>
          <div className="adm-form-group">
            <label className="adm-label" htmlFor="ldap-bind">{t('admin.integrations.ldap.bindDn')}</label>
            <input id="ldap-bind" className="adm-input" placeholder="cn=admin,dc=example,dc=com"
              value={ldap.bindDn} onChange={e => setLdapField('bindDn', e.target.value)} />
          </div>
        </div>
        <div className="adm-form-row">
          <div className="adm-form-group">
            <label className="adm-label" htmlFor="ldap-base">{t('admin.integrations.ldap.baseDn')}</label>
            <input id="ldap-base" className="adm-input" placeholder="dc=example,dc=com"
              value={ldap.baseDn} onChange={e => setLdapField('baseDn', e.target.value)} />
          </div>
          <div className="adm-form-group">
            <label className="adm-label">{t('admin.integrations.ldap.tls')}</label>
            <div className="adm-toggle-row" style={{ paddingTop: '0.35rem' }}>
              <span className="adm-toggle-label">{ldap.tls ? 'TLS activé' : 'TLS désactivé'}</span>
              <label className="adm-toggle" aria-label={t('admin.integrations.ldap.tls')}>
                <input type="checkbox" checked={ldap.tls} onChange={e => setLdapField('tls', e.target.checked)} />
                <span className="adm-toggle__track" />
                <span className="adm-toggle__thumb" />
              </label>
            </div>
          </div>
        </div>
        <div className="adm-card__actions">
          <button type="button" className="adm-btn adm-btn--ghost" onClick={testLdap}
            disabled={ldapStatus === 'testing'}>
            {ldapStatus === 'testing'
              ? t('admin.integrations.ldap.testing')
              : t('admin.integrations.ldap.test')}
          </button>
          {ldapStatus === 'ok' && (
            <span className="adm-pill adm-pill--on">
              <CheckCircle size={12} strokeWidth={2} aria-hidden="true" />
              {' '}{t('admin.integrations.ldap.success')}
            </span>
          )}
          {ldapStatus === 'fail' && (
            <span className="adm-pill adm-pill--off">
              <XCircle size={12} strokeWidth={2} aria-hidden="true" />
              {' '}{t('admin.integrations.ldap.failed')}
            </span>
          )}
          <button type="button" className="adm-btn adm-btn--primary">{t('admin.integrations.save')}</button>
        </div>
      </section>

      {/* ── SSO ──────────────────────────────────────────────────────────────── */}
      <section className="adm-card" aria-labelledby="adm-sso-hd">
        <h2 id="adm-sso-hd" className="adm-card__title">{t('admin.integrations.sso.heading')}</h2>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Fournisseur</th>
                <th>{t('admin.users.col.status')}</th>
                <th>{t('admin.users.col.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {SSO_PROVIDERS.map(p => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>
                    <span className={`adm-pill adm-pill--${p.configured ? 'on' : 'off'}`}>
                      {p.configured
                        ? t('admin.integrations.sso.configured')
                        : t('admin.integrations.sso.not_configured')}
                    </span>
                  </td>
                  <td>
                    <button type="button" className="adm-btn adm-btn--ghost">
                      {t('admin.edit')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── SMTP ─────────────────────────────────────────────────────────────── */}
      <section className="adm-card" aria-labelledby="adm-smtp-hd">
        <h2 id="adm-smtp-hd" className="adm-card__title">{t('admin.integrations.smtp.heading')}</h2>
        <div className="adm-form-row">
          <div className="adm-form-group">
            <label className="adm-label" htmlFor="smtp-host">{t('admin.integrations.smtp.host')}</label>
            <input id="smtp-host" className="adm-input" placeholder="smtp.example.com"
              value={smtp.host} onChange={e => setSmtpField('host', e.target.value)} />
          </div>
          <div className="adm-form-group">
            <label className="adm-label" htmlFor="smtp-port">{t('admin.integrations.smtp.port')}</label>
            <input id="smtp-port" type="number" className="adm-input" min="1" max="65535"
              value={smtp.port} onChange={e => setSmtpField('port', e.target.value)} />
          </div>
        </div>
        <div className="adm-form-row">
          <div className="adm-form-group">
            <label className="adm-label" htmlFor="smtp-user">{t('admin.integrations.smtp.user')}</label>
            <input id="smtp-user" className="adm-input"
              value={smtp.user} onChange={e => setSmtpField('user', e.target.value)} />
          </div>
          <div className="adm-form-group">
            <label className="adm-label" htmlFor="smtp-from">{t('admin.integrations.smtp.from')}</label>
            <input id="smtp-from" type="email" className="adm-input" placeholder="no-reply@example.com"
              value={smtp.from} onChange={e => setSmtpField('from', e.target.value)} />
          </div>
        </div>
        <div className="adm-card__actions">
          <button type="button" className="adm-btn adm-btn--ghost">
            {t('admin.integrations.smtp.test')}
          </button>
          <button type="button" className="adm-btn adm-btn--primary">{t('admin.integrations.save')}</button>
        </div>
      </section>

      {/* ── Webhooks ─────────────────────────────────────────────────────────── */}
      <section className="adm-card" aria-labelledby="adm-webhooks-hd">
        <div className="adm-card__header">
          <h2 id="adm-webhooks-hd" className="adm-card__title">{t('admin.integrations.webhooks.heading')}</h2>
          <button type="button" className="adm-btn adm-btn--primary" onClick={() => setWebhookModal(true)}>
            <Plus size={15} strokeWidth={2.5} aria-hidden="true" />
            {t('admin.integrations.webhooks.add')}
          </button>
        </div>
        <p className="adm-empty">{t('admin.integrations.webhooks.empty')}</p>
      </section>

      {webhookModal && (
        <div className="adm-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="wh-modal-title">
          <div className="adm-modal">
            <div className="adm-modal__header">
              <h2 id="wh-modal-title" className="adm-modal__title">{t('admin.integrations.webhooks.add')}</h2>
              <button type="button" className="adm-modal__close" onClick={() => setWebhookModal(false)}>
                <XCircle size={18} strokeWidth={1.75} />
              </button>
            </div>
            <div className="adm-modal__body">
              <div className="adm-form-group">
                <label className="adm-label" htmlFor="wh-url">{t('admin.integrations.webhooks.url')}</label>
                <input id="wh-url" type="url" className="adm-input" placeholder="https://"
                  value={webhookForm.url} onChange={e => setWebhookForm(f => ({ ...f, url: e.target.value }))} />
              </div>
              <div className="adm-form-group">
                <label className="adm-label" htmlFor="wh-event">{t('admin.integrations.webhooks.event')}</label>
                <input id="wh-event" className="adm-input" placeholder="campaign.created"
                  value={webhookForm.event} onChange={e => setWebhookForm(f => ({ ...f, event: e.target.value }))} />
              </div>
            </div>
            <div className="adm-modal__footer">
              <button type="button" className="adm-btn adm-btn--ghost" onClick={() => setWebhookModal(false)}>
                {t('admin.cancel')}
              </button>
              <button type="button" className="adm-btn adm-btn--primary" onClick={() => setWebhookModal(false)}>
                {t('admin.add')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
