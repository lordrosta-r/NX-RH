// =============================================================================
// HRResources — Bibliothèque de ressources RH (/hr/resources)
//
// Remplace pages/resources/Resources.jsx (adapté SPA, sans shell).
// Grille de cartes + modal d'ajout.
// =============================================================================

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../contexts/AuthContext'
import { useTranslate } from '../../contexts/LocaleContext'
import { t as pageT } from './i18n'
import { Plus, ExternalLink, FileText, Book, Video, File, X } from 'lucide-react'
import { showToast } from '../../components/ui/Toast'

const RESOURCE_TYPES = ['guide', 'faq', 'template', 'video', 'pdf', 'xlsx', 'docx', 'pptx']

const emptyForm = { title: '', type: 'guide', url: '', description: '' }

function TypeIcon({ type }) {
  if (type === 'video') return <Video size={15} />
  if (type === 'guide' || type === 'faq') return <Book size={15} />
  if (type === 'template') return <FileText size={15} />
  return <File size={15} />
}

// ── Composant principal ───────────────────────────────────────────────────────
export default function HRResources() {
  const { user } = useAuth()
  const t = useTranslate(pageT)
  const queryClient = useQueryClient()

  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ ...emptyForm })

  const { data: resources = [], isLoading } = useQuery({
    queryKey: ['hr-resources'],
    queryFn: () =>
      fetch('/api/resources', { credentials: 'include' })
        .then(r => r.ok ? r.json() : [])
        .then(d => (Array.isArray(d) ? d : (d.data || [])).filter(r => r.status === 'published')),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  })

  const addMutation = useMutation({
    mutationFn: (data) =>
      fetch('/api/resources', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, status: 'published', visibleTo: ['employee', 'manager', 'hr', 'admin'] }),
      }).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-resources'] })
      setModalOpen(false)
      setForm({ ...emptyForm })
    },
    onError: (err) => showToast({ message: err.message || 'Erreur lors de la création', type: 'error' }),
  })

  function handleSave(e) {
    e.preventDefault()
    addMutation.mutate(form)
  }

  return (
    <div className="hrres-page">

      {/* ── Hero ──────────────────────────────────────── */}
      <header className="hrres-hero">
        <p className="hrres-hero__eyebrow">{t('hrres.hero.eyebrow')}</p>
        <h1 className="hrres-hero__headline">{t('hrres.hero.title')}</h1>
        <p className="hrres-hero__sub">{t('hrres.hero.sub')}</p>
      </header>

      {/* ── Barre d'actions ───────────────────────────── */}
      <div className="hrres-actions">
        <button type="button" className="hrres-add-btn" onClick={() => setModalOpen(true)}>
          <Plus size={16} />
          {t('hrres.add')}
        </button>
      </div>

      {/* ── Grille de cartes ──────────────────────────── */}
      {isLoading ? (
        <p className="hrres-status">{t('hrres.loading')}</p>
      ) : resources.length === 0 ? (
        <p className="hrres-status">{t('hrres.empty')}</p>
      ) : (
        <div className="hrres-grid">
          {resources.map(r => (
            <article key={r._id} className="hrres-card">
              <div className="hrres-card__head">
                <span className={`hrres-badge hrres-badge--${r.type}`}>
                  <TypeIcon type={r.type} />
                  {t(`hrres.type.${r.type}`) || r.type}
                </span>
              </div>
              <h3 className="hrres-card__title">{r.title}</h3>
              {r.description && (
                <p className="hrres-card__desc">{r.description}</p>
              )}
              <div className="hrres-card__footer">
                {r.url || r.filename ? (
                  <a
                    href={r.url || r.filename}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hrres-open-btn"
                  >
                    <ExternalLink size={14} />
                    {t('hrres.open')}
                  </a>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}

      {/* ── Modal ajout ───────────────────────────────── */}
      {modalOpen && (
        <div className="hrres-modal-backdrop" onClick={() => setModalOpen(false)}>
          <div
            className="hrres-modal"
            role="dialog"
            aria-labelledby="hrres-modal-title"
            onClick={e => e.stopPropagation()}
          >
            <div className="hrres-modal__header">
              <h3 id="hrres-modal-title" className="hrres-modal__title">
                {t('hrres.modal.add.title')}
              </h3>
              <button
                type="button"
                className="hrres-modal__close"
                onClick={() => setModalOpen(false)}
                aria-label={t('hrres.modal.cancel')}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="hrres-form">
              <label className="hrres-field">
                <span>{t('hrres.modal.title')}</span>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                />
              </label>

              <label className="hrres-field">
                <span>{t('hrres.modal.type')}</span>
                <select
                  value={form.type}
                  onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                >
                  {RESOURCE_TYPES.map(rt => (
                    <option key={rt} value={rt}>{t(`hrres.type.${rt}`) || rt}</option>
                  ))}
                </select>
              </label>

              <label className="hrres-field">
                <span>{t('hrres.modal.url')}</span>
                <input
                  type="url"
                  value={form.url}
                  onChange={e => setForm(p => ({ ...p, url: e.target.value }))}
                  placeholder="https://"
                />
              </label>

              <label className="hrres-field">
                <span>{t('hrres.modal.description')}</span>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                />
              </label>

              <div className="hrres-modal__actions">
                <button
                  type="button"
                  className="hrres-btn"
                  onClick={() => setModalOpen(false)}
                >
                  {t('hrres.modal.cancel')}
                </button>
                <button
                  type="submit"
                  className="hrres-btn hrres-btn--primary"
                  disabled={addMutation.isPending}
                >
                  {t('hrres.modal.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
