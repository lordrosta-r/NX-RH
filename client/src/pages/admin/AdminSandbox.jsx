// =============================================================================
// AdminSandbox.jsx — Bac à sable, route /admin/sandbox
// =============================================================================

import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useLocale } from '../../hooks/useLocale'
import { t as pageT } from './i18n'
import { Info, AlertTriangle, X } from 'lucide-react'
import './admin.css'

const TEST_USERS = [
  { id: 'test-1', name: 'Alice Martin',    role: 'employee' },
  { id: 'test-2', name: 'Bob Dupont',      role: 'manager'  },
  { id: 'test-3', name: 'Camille Fontaine', role: 'employee' },
]

const STATUS_KEYS = {
  idle:    'admin.sandbox.status.idle',
  running: 'admin.sandbox.status.running',
  done:    'admin.sandbox.status.done',
}

export default function AdminSandbox() {
  const { user, loading } = useAuth()
  const { t } = useLocale(pageT)
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [status, setStatus] = useState('idle') // idle | running | done
  const [confirmCleanup, setConfirmCleanup] = useState(false)

  useEffect(() => {
    if (!loading && user && user.role !== 'admin') navigate('/employee', { replace: true })
  }, [loading, user, navigate])

  function handleLaunch() {
    if (!name.trim()) return
    setStatus('running')
    setTimeout(() => setStatus('done'), 2000) // mock
  }

  function handleCleanup() {
    setStatus('idle')
    setName('')
    setDesc('')
    setConfirmCleanup(false)
  }

  if (loading || !user) return null
  if (user.role !== 'admin') return null

  return (
    <div className="adm">
      <header className="adm-hero">
        <p className="adm-hero__eyebrow">{t('admin.sandbox.hero.eyebrow')}</p>
        <h1 className="adm-hero__title">
          <span className="adm-hero__accent">{t('admin.sandbox.hero.title')}</span>
        </h1>
        <p className="adm-hero__sub">{t('admin.sandbox.hero.sub')}</p>
      </header>

      <div className="adm-callout">
        <Info size={16} strokeWidth={2} aria-hidden="true" />
        <span>{t('admin.sandbox.callout')}</span>
      </div>

      {/* ── Form ─────────────────────────────────────────────────────────────── */}
      <section className="adm-card" aria-labelledby="adm-sb-form-hd">
        <h2 id="adm-sb-form-hd" className="adm-card__title">{t('admin.sandbox.form.heading')}</h2>

        <div className="adm-form-group">
          <label className="adm-label" htmlFor="sb-name">{t('admin.sandbox.form.name')}</label>
          <input
            id="sb-name"
            className="adm-input"
            placeholder={t('admin.sandbox.form.name.placeholder')}
            value={name}
            onChange={e => setName(e.target.value)}
            style={{ maxWidth: 400 }}
          />
        </div>

        <div className="adm-form-group">
          <label className="adm-label" htmlFor="sb-desc">{t('admin.sandbox.form.desc')}</label>
          <textarea
            id="sb-desc"
            className="adm-textarea"
            rows={3}
            value={desc}
            onChange={e => setDesc(e.target.value)}
            style={{ maxWidth: 400 }}
          />
        </div>

        <div className="adm-form-group">
          <p className="adm-label">{t('admin.sandbox.form.users')}</p>
          <div className="adm-roles">
            {TEST_USERS.map(u => (
              <div key={u.id} className="adm-role">
                <span className={`adm-role__badge adm-role__badge--${u.role}`}>{u.role}</span>
                <span className="adm-role__count" style={{ fontSize: '0.9375rem', fontWeight: 500 }}>
                  {u.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          className="adm-btn adm-btn--primary"
          disabled={!name.trim() || status === 'running'}
          onClick={handleLaunch}
        >
          {t('admin.sandbox.form.launch')}
        </button>
      </section>

      {/* ── Status ───────────────────────────────────────────────────────────── */}
      <section className="adm-card" aria-labelledby="adm-sb-status-hd">
        <div className="adm-card__header">
          <h2 id="adm-sb-status-hd" className="adm-card__title">{t('admin.sandbox.status.heading')}</h2>
          <span className={`adm-pill adm-pill--${status === 'idle' ? 'off' : status === 'running' ? 'off' : 'on'}`}>
            {t(STATUS_KEYS[status])}
          </span>
        </div>

        {status !== 'idle' && (
          <button
            type="button"
            className="adm-btn adm-btn--danger"
            onClick={() => setConfirmCleanup(true)}
          >
            <AlertTriangle size={15} strokeWidth={2} aria-hidden="true" />
            {t('admin.sandbox.cleanup.btn')}
          </button>
        )}
      </section>

      {/* ── Cleanup modal ────────────────────────────────────────────────────── */}
      {confirmCleanup && (
        <div className="adm-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="sb-confirm-title">
          <div className="adm-modal">
            <div className="adm-modal__header">
              <h2 id="sb-confirm-title" className="adm-modal__title">{t('admin.sandbox.cleanup.confirm')}</h2>
              <button type="button" className="adm-modal__close" onClick={() => setConfirmCleanup(false)}>
                <X size={18} strokeWidth={2} />
              </button>
            </div>
            <div className="adm-modal__body">
              <div className="adm-callout adm-callout--warn">
                <AlertTriangle size={16} strokeWidth={2} aria-hidden="true" />
                <span>{t('admin.sandbox.cleanup.warning')}</span>
              </div>
            </div>
            <div className="adm-modal__footer">
              <button type="button" className="adm-btn adm-btn--ghost" onClick={() => setConfirmCleanup(false)}>
                {t('admin.cancel')}
              </button>
              <button type="button" className="adm-btn adm-btn--danger" onClick={handleCleanup}>
                {t('admin.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
