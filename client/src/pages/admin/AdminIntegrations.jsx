// =============================================================================
// AdminIntegrations.jsx — Intégrations, route /admin/integrations
// Sections : LDAP/AD (connecté API) · SSO · SMTP · Webhooks
// =============================================================================

import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../contexts/AuthContext'
import { useLocale } from '../../hooks/useLocale'
import { t as pageT } from './i18n'
import { Plus, CheckCircle, XCircle, Eye, RefreshCw } from 'lucide-react'
import './admin.css'

const SSO_PROVIDERS = [
  { id: 'google',    name: 'Google Workspace',    configured: false },
  { id: 'microsoft', name: 'Microsoft Entra ID',   configured: false },
  { id: 'okta',      name: 'Okta',                 configured: false },
]

const LDAP_DEFAULTS = {
  host:           '',
  bindDN:         '',
  bindPassword:   '',
  baseDN:         '',
  userFilter:     '(objectClass=person)',
  attrFirstName:  'givenName',
  attrLastName:   'sn',
  attrEmail:      'mail',
  attrDepartment: 'department',
  attrTitle:      'title',
  defaultRole:    'employee',
}

export default function AdminIntegrations() {
  const { user, loading } = useAuth()
  const { t } = useLocale(pageT)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [ldap, setLdap] = useState(LDAP_DEFAULTS)
  const [testResult,   setTestResult]   = useState(null)
  const [previewData,  setPreviewData]  = useState(null)
  const [syncReport,   setSyncReport]   = useState(null)
  const [smtp, setSmtp] = useState({ host: '', port: '587', user: '', from: '' })
  const [webhookModal, setWebhookModal] = useState(false)
  const [webhookForm,  setWebhookForm]  = useState({ url: '', event: '' })

  useEffect(() => {
    if (!loading && user && user.role !== 'admin') navigate('/employee', { replace: true })
  }, [loading, user, navigate])

  // ── Charger la config LDAP sauvegardée ──────────────────────────────────────
  const { data: savedConfig } = useQuery({
    queryKey: ['admin-ldap-config'],
    queryFn: () => fetch('/api/admin/ldap/config', { credentials: 'include' }).then(r => r.json()),
    enabled: !!user && user.role === 'admin',
    staleTime: 0,
  })

  useEffect(() => {
    if (savedConfig?.config) {
      const saved = savedConfig.config
      setLdap(prev => ({
        ...LDAP_DEFAULTS,
        host:           saved.host           || '',
        bindDN:         saved.bindDN         || '',
        baseDN:         saved.baseDN         || '',
        userFilter:     saved.userFilter     || LDAP_DEFAULTS.userFilter,
        attrFirstName:  saved.attrFirstName  || LDAP_DEFAULTS.attrFirstName,
        attrLastName:   saved.attrLastName   || LDAP_DEFAULTS.attrLastName,
        attrEmail:      saved.attrEmail      || LDAP_DEFAULTS.attrEmail,
        attrDepartment: saved.attrDepartment || LDAP_DEFAULTS.attrDepartment,
        attrTitle:      saved.attrTitle      || LDAP_DEFAULTS.attrTitle,
        defaultRole:    saved.defaultRole    || LDAP_DEFAULTS.defaultRole,
        bindPassword:   prev.bindPassword,  // ne jamais écraser le champ saisi
      }))
    }
  }, [savedConfig])

  function setLdapField(k, v) { setLdap(f => ({ ...f, [k]: v })) }
  function setSmtpField(k, v) { setSmtp(f => ({ ...f, [k]: v })) }

  // ── Mutations LDAP ───────────────────────────────────────────────────────────

  const saveMutation = useMutation({
    mutationFn: (config) => fetch('/api/admin/ldap/config', {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ config }),
    }).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-ldap-config'] }),
  })

  const testMutation = useMutation({
    mutationFn: (config) => fetch('/api/admin/ldap/test', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ config }),
    }).then(r => r.json()),
    onSuccess:  (data) => setTestResult(data),
    onError:    ()     => setTestResult({ ok: false, error: 'Erreur serveur' }),
  })

  const previewMutation = useMutation({
    mutationFn: (config) => fetch('/api/admin/ldap/preview', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ config }),
    }).then(r => r.json()),
    onSuccess: (data) => { setPreviewData(data.users || []); setSyncReport(null) },
    onError:   ()     => setPreviewData([]),
  })

  const syncMutation = useMutation({
    mutationFn: (config) => fetch('/api/admin/ldap/sync', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ config }),
    }).then(r => r.json()),
    onSuccess: (data) => { setSyncReport(data); setPreviewData(null) },
    onError:   ()     => setSyncReport({ created: 0, updated: 0, skipped: 0, errors: ['Erreur serveur'] }),
  })

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

        {/* Connexion */}
        <div className="adm-form-row">
          <div className="adm-form-group">
            <label className="adm-label" htmlFor="ldap-host">{t('admin.integrations.ldap.server')}</label>
            <input id="ldap-host" className="adm-input" placeholder="ldap://ad.example.com"
              value={ldap.host} onChange={e => setLdapField('host', e.target.value)} />
          </div>
          <div className="adm-form-group">
            <label className="adm-label" htmlFor="ldap-bind">{t('admin.integrations.ldap.bindDn')}</label>
            <input id="ldap-bind" className="adm-input" placeholder="cn=admin,dc=example,dc=com"
              value={ldap.bindDN} onChange={e => setLdapField('bindDN', e.target.value)} />
          </div>
        </div>
        <div className="adm-form-row">
          <div className="adm-form-group">
            <label className="adm-label" htmlFor="ldap-password">{t('admin.integrations.ldap.bindPassword')}</label>
            <input id="ldap-password" type="password" className="adm-input"
              placeholder="••••••••" autoComplete="new-password"
              value={ldap.bindPassword} onChange={e => setLdapField('bindPassword', e.target.value)} />
          </div>
          <div className="adm-form-group">
            <label className="adm-label" htmlFor="ldap-base">{t('admin.integrations.ldap.baseDn')}</label>
            <input id="ldap-base" className="adm-input" placeholder="dc=example,dc=com"
              value={ldap.baseDN} onChange={e => setLdapField('baseDN', e.target.value)} />
          </div>
        </div>
        <div className="adm-form-row">
          <div className="adm-form-group">
            <label className="adm-label" htmlFor="ldap-filter">{t('admin.integrations.ldap.userFilter')}</label>
            <input id="ldap-filter" className="adm-input"
              value={ldap.userFilter} onChange={e => setLdapField('userFilter', e.target.value)} />
          </div>
          <div className="adm-form-group">
            <label className="adm-label" htmlFor="ldap-role">{t('admin.integrations.ldap.defaultRole')}</label>
            <select id="ldap-role" className="adm-select"
              value={ldap.defaultRole} onChange={e => setLdapField('defaultRole', e.target.value)}>
              <option value="employee">Collaborateur</option>
              <option value="manager">Manager</option>
              <option value="hr">RH</option>
            </select>
          </div>
        </div>

        {/* Correspondance des attributs */}
        <p className="adm-section__title" style={{ marginTop: '0.5rem' }}>{t('admin.integrations.ldap.attrMapping')}</p>
        <div className="adm-form-row">
          <div className="adm-form-group">
            <label className="adm-label" htmlFor="ldap-attr-fn">{t('admin.integrations.ldap.attrFirstName')}</label>
            <input id="ldap-attr-fn" className="adm-input"
              value={ldap.attrFirstName} onChange={e => setLdapField('attrFirstName', e.target.value)} />
          </div>
          <div className="adm-form-group">
            <label className="adm-label" htmlFor="ldap-attr-ln">{t('admin.integrations.ldap.attrLastName')}</label>
            <input id="ldap-attr-ln" className="adm-input"
              value={ldap.attrLastName} onChange={e => setLdapField('attrLastName', e.target.value)} />
          </div>
        </div>
        <div className="adm-form-row">
          <div className="adm-form-group">
            <label className="adm-label" htmlFor="ldap-attr-email">{t('admin.integrations.ldap.attrEmail')}</label>
            <input id="ldap-attr-email" className="adm-input"
              value={ldap.attrEmail} onChange={e => setLdapField('attrEmail', e.target.value)} />
          </div>
          <div className="adm-form-group">
            <label className="adm-label" htmlFor="ldap-attr-dept">{t('admin.integrations.ldap.attrDept')}</label>
            <input id="ldap-attr-dept" className="adm-input"
              value={ldap.attrDepartment} onChange={e => setLdapField('attrDepartment', e.target.value)} />
          </div>
        </div>
        <div className="adm-form-row">
          <div className="adm-form-group">
            <label className="adm-label" htmlFor="ldap-attr-title">{t('admin.integrations.ldap.attrTitle')}</label>
            <input id="ldap-attr-title" className="adm-input"
              value={ldap.attrTitle} onChange={e => setLdapField('attrTitle', e.target.value)} />
          </div>
        </div>

        {/* Actions */}
        <div className="adm-card__actions" style={{ flexWrap: 'wrap', marginTop: '0.5rem' }}>
          <button type="button" className="adm-btn adm-btn--ghost"
            onClick={() => { setTestResult(null); testMutation.mutate(ldap) }}
            disabled={testMutation.isPending}>
            {testMutation.isPending
              ? t('admin.integrations.ldap.testing')
              : t('admin.integrations.ldap.test')}
          </button>

          {testResult?.ok === true && (
            <span className="adm-pill adm-pill--on">
              <CheckCircle size={12} strokeWidth={2} aria-hidden="true" />
              {' '}{t('admin.integrations.ldap.success')}
            </span>
          )}
          {testResult?.ok === false && (
            <span className="adm-pill adm-pill--off">
              <XCircle size={12} strokeWidth={2} aria-hidden="true" />
              {' '}{testResult.error || t('admin.integrations.ldap.failed')}
            </span>
          )}

          <button type="button" className="adm-btn adm-btn--ghost"
            onClick={() => previewMutation.mutate(ldap)}
            disabled={previewMutation.isPending}>
            <Eye size={14} strokeWidth={1.75} aria-hidden="true" />
            {' '}{previewMutation.isPending
              ? t('admin.integrations.ldap.previewing')
              : t('admin.integrations.ldap.preview')}
          </button>

          <button type="button" className="adm-btn adm-btn--ghost"
            onClick={() => syncMutation.mutate(ldap)}
            disabled={syncMutation.isPending}>
            <RefreshCw size={14} strokeWidth={1.75} aria-hidden="true" />
            {' '}{syncMutation.isPending
              ? t('admin.integrations.ldap.syncing')
              : t('admin.integrations.ldap.sync')}
          </button>

          <button type="button" className="adm-btn adm-btn--primary"
            onClick={() => saveMutation.mutate(ldap)}
            disabled={saveMutation.isPending}>
            {saveMutation.isPending ? '…' : t('admin.integrations.save')}
          </button>
        </div>

        {/* Résultats — Prévisualisation */}
        {previewData !== null && (
          <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--color-divider)', paddingTop: '1.25rem' }}>
            <p className="adm-section__title">
              {t('admin.integrations.ldap.previewResults')} ({previewData.length})
            </p>
            {previewData.length === 0 ? (
              <p className="adm-empty">{t('admin.integrations.ldap.previewEmpty')}</p>
            ) : (
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>{t('admin.integrations.ldap.col.dn')}</th>
                      <th>{t('admin.integrations.ldap.col.email')}</th>
                      <th>{t('admin.integrations.ldap.col.name')}</th>
                      <th>{t('admin.integrations.ldap.col.dept')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((u, i) => {
                      // eslint-disable-next-line react/no-array-index-key
                      const email = u[ldap.attrEmail]
                      const name  = [u[ldap.attrFirstName], u[ldap.attrLastName]].filter(Boolean).join(' ')
                      const dept  = u[ldap.attrDepartment]
                      return (
                        <tr key={i}>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {u.dn}
                          </td>
                          <td>{email || '—'}</td>
                          <td>{name  || '—'}</td>
                          <td>{dept  || '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Résultats — Rapport de synchronisation */}
        {syncReport && (
          <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--color-divider)', paddingTop: '1.25rem' }}>
            <p className="adm-section__title">{t('admin.integrations.ldap.syncReport')}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <span className="adm-pill adm-pill--on">{syncReport.created} {t('admin.integrations.ldap.syncCreated')}</span>
              <span className="adm-pill adm-pill--on">{syncReport.updated} {t('admin.integrations.ldap.syncUpdated')}</span>
              <span className="adm-pill adm-pill--off">{syncReport.skipped} {t('admin.integrations.ldap.syncSkipped')}</span>
              {(syncReport.errors?.length || 0) > 0 && (
                <span className="adm-pill adm-pill--off">{syncReport.errors.length} {t('admin.integrations.ldap.syncErrors')}</span>
              )}
            </div>
            {syncReport.errors?.length > 0 && (
              <ul style={{ fontSize: '0.8125rem', color: 'var(--color-error)', padding: 0, margin: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {syncReport.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            )}
          </div>
        )}
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

