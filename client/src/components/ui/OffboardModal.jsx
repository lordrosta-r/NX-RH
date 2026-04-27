// =============================================================================
// OffboardModal.jsx — Modale de départ collaborateur (offboarding)
//
// Flux en 2 étapes :
//   Step 1 "preview"  : affiche le nombre d'évaluations en cours et les
//                       campagnes actives concernées.
//   Step 2 "confirm"  : formulaire avec motif et date d'effet.
// =============================================================================

import { useState, useEffect } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import { showToast } from './Toast'

export default function OffboardModal({ userId, userName, isOpen, onClose, onSuccess }) {
  const [step, setStep]       = useState('preview') // 'preview' | 'confirm'
  const [preview, setPreview] = useState(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [previewError, setPreviewError]     = useState(null)

  const [reason, setReason]             = useState('')
  const [effectiveDate, setEffectiveDate] = useState('')
  const [submitting, setSubmitting]     = useState(false)

  useEffect(() => {
    if (!isOpen || !userId) return
    setStep('preview')
    setPreview(null)
    setPreviewError(null)
    setReason('')
    setEffectiveDate('')
    setSubmitting(false)
    setLoadingPreview(true)

    fetch(`/api/users/${userId}/offboard-preview`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => setPreview(data))
      .catch(() => setPreviewError('Impossible de charger l\'aperçu.'))
      .finally(() => setLoadingPreview(false))
  }, [isOpen, userId])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!reason.trim() || !effectiveDate) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/users/${userId}/offboard`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim(), effectiveDate }),
      })
      if (!res.ok) throw new Error('offboard_failed')
      showToast({ message: `Depart de ${userName} enregistre.`, type: 'success' })
      onSuccess()
    } catch {
      showToast({ message: 'Erreur lors du traitement du depart.', type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="offboard-modal-title"
    >
      <div className="bg-[var(--color-surface)] text-[var(--color-on-surface)] rounded-xl shadow-2xl w-full max-w-md mx-4 flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
          <h2 id="offboard-modal-title" className="text-base font-semibold">
            Depart de {userName}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="text-[var(--color-muted)] hover:text-[var(--color-on-surface)] transition-colors"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex-1">

          {/* ── Step 1 : Preview ─────────────────────────────────────────── */}
          {step === 'preview' && (
            <>
              {loadingPreview && (
                <p className="text-sm text-[var(--color-muted)]">Chargement de l&apos;aperçu…</p>
              )}
              {previewError && (
                <p className="text-sm text-red-500">{previewError}</p>
              )}
              {!loadingPreview && preview && (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
                    <AlertTriangle size={16} strokeWidth={2} className="text-amber-600 mt-0.5 shrink-0" aria-hidden="true" />
                    <p className="text-sm text-amber-800 dark:text-amber-300">
                      Cette action archivera <strong>{preview.pendingEvaluations}</strong> evaluation(s) en cours et marquera le compte comme &quot;en cours de depart&quot;.
                    </p>
                  </div>

                  {preview.pendingEvaluations > 0 && (
                    <div>
                      <p className="text-xs font-medium text-[var(--color-muted)] uppercase tracking-wide mb-2">
                        Campagnes concernees
                      </p>
                      {preview.activeCampaigns.length > 0 ? (
                        <ul className="space-y-1">
                          {preview.activeCampaigns.map(name => (
                            <li key={name} className="text-sm px-2 py-1 rounded bg-[var(--color-surface-raised)] border border-[var(--color-border)]">
                              {name}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-[var(--color-muted)]">Aucune campagne identifiee.</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ── Step 2 : Confirm ─────────────────────────────────────────── */}
          {step === 'confirm' && (
            <form id="offboard-form" onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="offboard-reason" className="block text-sm font-medium mb-1">
                  Motif du depart <span className="text-red-500" aria-hidden="true">*</span>
                </label>
                <textarea
                  id="offboard-reason"
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  rows={3}
                  required
                  maxLength={2000}
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Demission, fin de contrat, retraite…"
                />
              </div>
              <div>
                <label htmlFor="offboard-date" className="block text-sm font-medium mb-1">
                  Date d&apos;effet <span className="text-red-500" aria-hidden="true">*</span>
                </label>
                <input
                  id="offboard-date"
                  type="date"
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  required
                  value={effectiveDate}
                  onChange={e => setEffectiveDate(e.target.value)}
                />
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--color-border)]">
          <button
            type="button"
            className="adm-btn adm-btn--ghost"
            onClick={onClose}
          >
            Annuler
          </button>

          {step === 'preview' && (
            <button
              type="button"
              disabled={loadingPreview || !!previewError}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-primary)' }}
              onClick={() => setStep('confirm')}
            >
              Continuer
            </button>
          )}

          {step === 'confirm' && (
            <button
              type="submit"
              form="offboard-form"
              disabled={submitting || !reason.trim() || !effectiveDate}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Traitement…' : 'Confirmer le depart'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
