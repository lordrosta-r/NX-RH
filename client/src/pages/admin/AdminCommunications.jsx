// =============================================================================
// AdminCommunications.jsx — Modèles email, route /admin/communications
// =============================================================================

import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useLocale } from '../../hooks/useLocale'
import { t as pageT } from './i18n'

const TEMPLATES = [
  {
    id: 'welcome',
    key: 'admin.communications.template.welcome',
    vars: ['{{employee.firstName}}', '{{employee.email}}', '{{platform.url}}'],
    body: 'Bonjour {{employee.firstName}},\n\nVotre compte a été créé sur la plateforme NanoXplore RH.\nConnectez-vous ici : {{platform.url}}\n\nCordialement,\nL\'équipe RH',
  },
  {
    id: 'campaign',
    key: 'admin.communications.template.campaign',
    vars: ['{{employee.firstName}}', '{{campaign.name}}', '{{campaign.deadline}}'],
    body: 'Bonjour {{employee.firstName}},\n\nUne nouvelle campagne d\'évaluation « {{campaign.name}} » a été lancée.\nDate limite : {{campaign.deadline}}\n\nCordialement,\nL\'équipe RH',
  },
  {
    id: 'reminder',
    key: 'admin.communications.template.reminder',
    vars: ['{{employee.firstName}}', '{{campaign.name}}', '{{deadline}}'],
    body: 'Bonjour {{employee.firstName}},\n\nRappel : votre évaluation « {{campaign.name}} » est à compléter avant le {{deadline}}.\n\nCordialement,\nL\'équipe RH',
  },
  {
    id: 'signature',
    key: 'admin.communications.template.signature',
    vars: ['{{employee.firstName}}', '{{evaluator.name}}', '{{document.link}}'],
    body: 'Bonjour {{employee.firstName}},\n\nVotre évaluation par {{evaluator.name}} est prête à être signée.\nAccédez au document : {{document.link}}\n\nCordialement,\nL\'équipe RH',
  },
]

export default function AdminCommunications() {
  const { user, loading } = useAuth()
  const { t } = useLocale(pageT)
  const navigate = useNavigate()
  const [selected, setSelected] = useState(null)
  const [body, setBody] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!loading && user && user.role !== 'admin') navigate('/employee', { replace: true })
  }, [loading, user, navigate])

  function selectTemplate(tpl) {
    setSelected(tpl)
    setBody(tpl.body)
    setSaved(false)
  }

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading || !user) return null
  if (user.role !== 'admin') return null

  return (
    <div className="adm">
      <header className="adm-hero">
        <p className="adm-hero__eyebrow">{t('admin.communications.hero.eyebrow')}</p>
        <h1 className="adm-hero__title">
          <span className="adm-hero__accent">{t('admin.communications.hero.title')}</span>
        </h1>
        <p className="adm-hero__sub">{t('admin.communications.hero.sub')}</p>
      </header>

      <div className="adm-split">
        {/* Template list */}
        <section className="adm-card" aria-labelledby="adm-tpl-hd">
          <h2 id="adm-tpl-hd" className="adm-card__title">{t('admin.communications.templates.heading')}</h2>
          <div className="adm-tpl-list">
            {TEMPLATES.map(tpl => (
              <button
                key={tpl.id}
                type="button"
                className={`adm-tpl-item${selected?.id === tpl.id ? ' adm-tpl-item--active' : ''}`}
                onClick={() => selectTemplate(tpl)}
              >
                {t(tpl.key)}
              </button>
            ))}
          </div>
        </section>

        {/* Editor */}
        <section className="adm-card" aria-labelledby="adm-editor-hd">
          <h2 id="adm-editor-hd" className="adm-card__title">{t('admin.communications.editor.heading')}</h2>

          {!selected && (
            <p className="adm-empty">{t('admin.communications.editor.select_prompt')}</p>
          )}

          {selected && (
            <>
              <p className="adm-section__title">{t('admin.communications.editor.vars')}</p>
              <div className="adm-var-chips">
                {selected.vars.map(v => (
                  <span key={v} className="adm-chip">{v}</span>
                ))}
              </div>
              <div className="adm-form-group">
                <textarea
                  className="adm-textarea"
                  rows={10}
                  placeholder={t('admin.communications.editor.placeholder')}
                  value={body}
                  onChange={e => { setBody(e.target.value); setSaved(false) }}
                />
              </div>
              <div className="adm-card__actions">
                <button type="button" className="adm-btn adm-btn--primary" onClick={handleSave}>
                  {saved ? 'Enregistré' : t('admin.communications.editor.save')}
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
