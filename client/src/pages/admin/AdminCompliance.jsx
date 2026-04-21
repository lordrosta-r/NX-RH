// =============================================================================
// AdminCompliance.jsx — Conformité RGPD, route /admin/compliance
// Sections : Rétention · Anonymisation · Export · Audit log RGPD
// =============================================================================

import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useLocale } from '../../hooks/useLocale'
import { t as pageT } from './i18n'
import { AlertTriangle, X } from 'lucide-react'
import './admin.css'

const RETENTION_OPTIONS = [3, 5, 7, 10]

export default function AdminCompliance() {
  const { user, loading } = useAuth()
  const { t } = useLocale(pageT)
  const navigate = useNavigate()
  const [retention, setRetention] = useState(5)
  const [anonUser, setAnonUser] = useState('')
  const [exportUser, setExportUser] = useState('')
  const [confirmModal, setConfirmModal] = useState(null) // null | 'anon' | 'export'

  useEffect(() => {
    if (!loading && user && user.role !== 'admin') navigate('/employee', { replace: true })
  }, [loading, user, navigate])

  if (loading || !user) return null
  if (user.role !== 'admin') return null

  return (
    <div className="adm">
      <header className="adm-hero">
        <p className="adm-hero__eyebrow">{t('admin.compliance.hero.eyebrow')}</p>
        <h1 className="adm-hero__title">
          <span className="adm-hero__accent">{t('admin.compliance.hero.title')}</span>
        </h1>
        <p className="adm-hero__sub">{t('admin.compliance.hero.sub')}</p>
      </header>

      {/* ── Rétention ────────────────────────────────────────────────────────── */}
      <section className="adm-card" aria-labelledby="adm-ret-hd">
        <h2 id="adm-ret-hd" className="adm-card__title">{t('admin.compliance.retention.heading')}</h2>
        <div className="adm-form-group">
          <label className="adm-label" htmlFor="ret-select">
            {t('admin.compliance.retention.label')} — {retention} {t('admin.compliance.retention.unit')}
          </label>
          <select
            id="ret-select"
            className="adm-select"
            value={retention}
            onChange={e => setRetention(Number(e.target.value))}
            style={{ maxWidth: 200 }}
          >
            {RETENTION_OPTIONS.map(n => (
              <option key={n} value={n}>{n} {t('admin.compliance.retention.unit')}</option>
            ))}
          </select>
        </div>
        <button type="button" className="adm-btn adm-btn--primary">
          {t('admin.compliance.retention.save')}
        </button>
      </section>

      {/* ── Anonymisation ────────────────────────────────────────────────────── */}
      <section className="adm-card" aria-labelledby="adm-anon-hd">
        <h2 id="adm-anon-hd" className="adm-card__title">{t('admin.compliance.anonymize.heading')}</h2>
        <div className="adm-form-group">
          <label className="adm-label" htmlFor="anon-user">{t('admin.compliance.anonymize.label')}</label>
          <input
            id="anon-user"
            className="adm-input"
            placeholder={t('admin.compliance.anonymize.placeholder')}
            value={anonUser}
            onChange={e => setAnonUser(e.target.value)}
            style={{ maxWidth: 400 }}
          />
        </div>
        <button
          type="button"
          className="adm-btn adm-btn--danger"
          disabled={!anonUser.trim()}
          onClick={() => setConfirmModal('anon')}
        >
          <AlertTriangle size={15} strokeWidth={2} aria-hidden="true" />
          {t('admin.compliance.anonymize.btn')}
        </button>
      </section>

      {/* ── Export RGPD ──────────────────────────────────────────────────────── */}
      <section className="adm-card" aria-labelledby="adm-export-hd">
        <h2 id="adm-export-hd" className="adm-card__title">{t('admin.compliance.export.heading')}</h2>
        <div className="adm-form-group">
          <label className="adm-label" htmlFor="export-user">{t('admin.compliance.export.label')}</label>
          <input
            id="export-user"
            className="adm-input"
            placeholder={t('admin.compliance.export.placeholder')}
            value={exportUser}
            onChange={e => setExportUser(e.target.value)}
            style={{ maxWidth: 400 }}
          />
        </div>
        <button
          type="button"
          className="adm-btn adm-btn--primary"
          disabled={!exportUser.trim()}
          onClick={() => setConfirmModal('export')}
        >
          {t('admin.compliance.export.btn')}
        </button>
      </section>

      {/* ── Audit log RGPD ───────────────────────────────────────────────────── */}
      <section className="adm-card" aria-labelledby="adm-audit-hd">
        <h2 id="adm-audit-hd" className="adm-card__title">{t('admin.compliance.audit.heading')}</h2>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>{t('admin.compliance.audit.col.date')}</th>
                <th>{t('admin.compliance.audit.col.action')}</th>
                <th>{t('admin.compliance.audit.col.user')}</th>
                <th>{t('admin.compliance.audit.col.details')}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={4} className="adm-empty">{t('admin.compliance.audit.empty')}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Modal confirmation ────────────────────────────────────────────────── */}
      {confirmModal && (
        <div className="adm-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="comp-confirm-title">
          <div className="adm-modal">
            <div className="adm-modal__header">
              <h2 id="comp-confirm-title" className="adm-modal__title">
                {confirmModal === 'anon'
                  ? t('admin.compliance.anonymize.confirm')
                  : t('admin.compliance.export.btn')}
              </h2>
              <button type="button" className="adm-modal__close" onClick={() => setConfirmModal(null)}>
                <X size={18} strokeWidth={2} />
              </button>
            </div>
            <div className="adm-modal__body">
              {confirmModal === 'anon' && (
                <div className="adm-callout adm-callout--warn">
                  <AlertTriangle size={16} strokeWidth={2} aria-hidden="true" />
                  <span>{t('admin.compliance.anonymize.warning')}</span>
                </div>
              )}
              <p style={{ fontSize: '0.9375rem', color: 'var(--color-on-surface)', margin: 0 }}>
                {confirmModal === 'anon' ? anonUser : exportUser}
              </p>
            </div>
            <div className="adm-modal__footer">
              <button type="button" className="adm-btn adm-btn--ghost" onClick={() => setConfirmModal(null)}>
                {t('admin.cancel')}
              </button>
              <button
                type="button"
                className={`adm-btn ${confirmModal === 'anon' ? 'adm-btn--danger' : 'adm-btn--primary'}`}
                onClick={() => {
                  setConfirmModal(null)
                  if (confirmModal === 'anon') setAnonUser('')
                  else setExportUser('')
                }}
              >
                {t('admin.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
