import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Mail, ChevronDown, ChevronUp, RefreshCw, Save, AlertCircle } from 'lucide-react'
import { adminApi } from '../api/admin'
import type { MailTemplate } from '../types'

const SLUG_LABELS: Record<string, string> = {
  campaign_activated: 'Campagne activée',
  campaign_closed: 'Campagne clôturée',
  evaluation_assigned: 'Évaluation assignée',
  evaluation_reminder: 'Rappel d\'évaluation',
  evaluation_submitted: 'Évaluation soumise',
  evaluation_validated: 'Évaluation validée',
  hr_flag_created: 'Signal RH créé',
  hr_flag_resolved: 'Signal RH résolu',
  password_reset: 'Réinitialisation mot de passe',
  welcome: 'Bienvenue',
}

function formatDate(d?: string) {
  if (!d) return '–'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function TemplateEditor({ template, onClose }: { template: MailTemplate; onClose: () => void }) {
  const qc = useQueryClient()
  const [subject, setSubject] = useState(template.subject)
  const [bodyText, setBodyText] = useState(template.bodyText)

  const updateMut = useMutation({
    mutationFn: (data: { subject: string; bodyText: string }) =>
      adminApi.updateMailTemplate(template.slug, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mail-templates'] })
      onClose()
    },
  })

  const resetMut = useMutation({
    mutationFn: () => adminApi.updateMailTemplate(template.slug, { reset: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mail-templates'] })
      onClose()
    },
  })

  const isDirty = subject !== template.subject || bodyText !== template.bodyText

  return (
    <div className="border-t border-slate-100 pt-4 mt-4 space-y-4">
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Objet</label>
        <input
          type="text"
          value={subject}
          onChange={e => setSubject(e.target.value)}
          className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Corps (texte brut)</label>
        <textarea
          value={bodyText}
          onChange={e => setBodyText(e.target.value)}
          rows={8}
          className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 font-mono resize-y"
        />
        <p className="text-xs text-slate-400 mt-1">
          Variables disponibles entre doubles accolades : <code className="bg-slate-100 px-1 rounded">{'{{firstName}}'}</code>,{' '}
          <code className="bg-slate-100 px-1 rounded">{'{{campaignName}}'}</code>, etc.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => updateMut.mutate({ subject, bodyText })}
          disabled={updateMut.isPending || !isDirty}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg disabled:opacity-50 hover:bg-primary-700 transition-colors"
        >
          <Save className="w-4 h-4" />
          {updateMut.isPending ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        <button
          onClick={() => resetMut.mutate()}
          disabled={resetMut.isPending}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          title="Remettre les valeurs par défaut"
        >
          <RefreshCw className="w-4 h-4" />
          Réinitialiser
        </button>
        <button
          onClick={onClose}
          className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          Annuler
        </button>
      </div>
      {(updateMut.isError || resetMut.isError) && (
        <p className="text-sm text-red-600 flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4" />
          Une erreur est survenue.
        </p>
      )}
    </div>
  )
}

function TemplateRow({ template }: { template: MailTemplate }) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
      <button
        onClick={() => { setExpanded(e => !e); if (editing) setEditing(false) }}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors rounded-xl"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary-50 rounded-lg flex items-center justify-center shrink-0">
            <Mail className="w-4 h-4 text-primary-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-800">
              {SLUG_LABELS[template.slug] ?? template.slug}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">{template.subject}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-slate-400 hidden sm:block">
            Modifié {formatDate(template.updatedAt)}
          </span>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5">
          {!editing ? (
            <>
              <div className="mb-3">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Aperçu (texte brut)</p>
                <pre className="text-xs text-slate-600 bg-slate-50 rounded-lg p-3 whitespace-pre-wrap max-h-48 overflow-y-auto font-mono">
                  {template.bodyText || <span className="italic text-slate-400">Aucun corps défini</span>}
                </pre>
              </div>
              <button
                onClick={() => setEditing(true)}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                Modifier ce template
              </button>
            </>
          ) : (
            <TemplateEditor template={template} onClose={() => setEditing(false)} />
          )}
        </div>
      )}
    </div>
  )
}

export default function AdminMailTemplatesPage() {
  const { data: templates, isLoading, isError } = useQuery<MailTemplate[]>({
    queryKey: ['mail-templates'],
    queryFn: () => adminApi.getMailTemplates().then(r => r.data),
  })

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Modèles email</h1>
        <p className="text-sm text-slate-500 mt-1">
          Personnalisez l'objet et le corps des emails envoyés automatiquement par la plateforme.
        </p>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {isError && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          Impossible de charger les templates.
        </div>
      )}

      {templates && templates.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <Mail className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Aucun template configuré.</p>
        </div>
      )}

      {templates && templates.length > 0 && (
        <div className="space-y-3">
          {templates.map(t => (
            <TemplateRow key={t.slug} template={t} />
          ))}
        </div>
      )}
    </div>
  )
}

