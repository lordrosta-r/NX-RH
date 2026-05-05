import { useState, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Lock, Unlock, Download, Trash2, Plus, ChevronUp, ChevronDown } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { formsApi } from '../api/forms'
import type { FormQuestion } from '../types'

const FORM_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  self_evaluation:      { label: 'Auto-évaluation',       color: 'bg-primary-50 text-primary-700' },
  manager_evaluation:   { label: 'Évaluation manager',    color: 'bg-warning-50 text-warning-700' },
  upward_feedback:      { label: 'Feedback ascendant',    color: 'bg-purple-50 text-purple-700' },
  director_evaluation:  { label: 'Évaluation directeur',  color: 'bg-error-50 text-error-700' },
  peer_review:          { label: 'Peer review',           color: 'bg-cyan-50 text-cyan-700' },
  objectives:           { label: 'Objectifs',             color: 'bg-success-50 text-success-700' },
  mobility_request:     { label: 'Demande mobilité',      color: 'bg-orange-50 text-orange-700' },
  salary_raise_request: { label: 'Demande augmentation',  color: 'bg-emerald-50 text-emerald-700' },
  promotion_request:    { label: 'Demande promotion',     color: 'bg-indigo-50 text-indigo-700' },
  training_request:     { label: 'Demande formation',     color: 'bg-teal-50 text-teal-700' },
}

export default function FormDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: form, isLoading } = useQuery({
    queryKey: ['form', id],
    queryFn: () => formsApi.getForm(id!).then(r => r.data),
    enabled: !!id,
  })

  const [meta, setMeta] = useState({ title: '', description: '' })
  const [questions, setQuestions] = useState<FormQuestion[]>([])
  const [isDirty, setIsDirty] = useState(false)

  const [deleteModal, setDeleteModal] = useState(false)
  const [freezeModal, setFreezeModal] = useState(false)
  const [unfreezeModal, setUnfreezeModal] = useState(false)

  useEffect(() => {
    if (form) {
      setMeta({ title: form.title, description: form.description || '' })
      setQuestions(form.questions || [])
      setIsDirty(false)
    }
  }, [form])

  const isAdminOrHr = user?.role === 'admin' || user?.role === 'hr'
  const isAdmin = user?.role === 'admin'
  const isFrozen = form?.isFrozen ?? false
  const canEdit = isAdminOrHr && !isFrozen

  const saveMutation = useMutation({
    mutationFn: () => formsApi.updateForm(id!, { title: meta.title, description: meta.description, questions }).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['form', id] })
      setIsDirty(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => formsApi.deleteForm(id!),
    onSuccess: () => navigate('/forms'),
  })

  const freezeMutation = useMutation({
    mutationFn: () => formsApi.freezeForm(id!),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['form', id] }); setFreezeModal(false) },
  })

  const unfreezeMutation = useMutation({
    mutationFn: () => formsApi.unfreezeForm(id!),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['form', id] }); setUnfreezeModal(false) },
  })

  function handleExport() {
    formsApi.exportForm(id!).then(r => {
      const blob = r.data instanceof Blob ? r.data : new Blob([JSON.stringify(r.data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `form-${id}.json`
      a.click()
      URL.revokeObjectURL(url)
    })
  }

  function addQuestion() {
    const newQ: FormQuestion = { id: crypto.randomUUID(), type: 'text', text: '', required: false }
    setQuestions(qs => [...qs, newQ])
    setIsDirty(true)
  }

  if (isLoading) return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />
      ))}
    </div>
  )

  if (!form) return (
    <div className="text-center py-16">
      <p className="text-slate-500">Formulaire introuvable.</p>
      <Link to="/forms" className="text-primary-600 hover:underline text-sm mt-2 inline-block">← Retour aux formulaires</Link>
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <nav className="text-sm text-slate-500 mb-1">
            <Link to="/" className="hover:text-slate-700">Accueil</Link>
            {' › '}
            <Link to="/forms" className="hover:text-slate-700">Formulaires</Link>
            {' › '}
            <span className="text-slate-900">{form.title}</span>
          </nav>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900">{form.title}</h1>
            {isFrozen && (
              <span className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-600 border border-slate-200 rounded-full text-sm">
                <Lock className="w-3.5 h-3.5" /> Gelé
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {FORM_TYPE_CONFIG[form.formType]?.label ?? form.formType} · {form.questions?.length ?? 0} questions
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {isAdminOrHr && (
            <button onClick={handleExport} className="inline-flex items-center gap-2 border border-slate-200 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-medium text-slate-700 transition-colors">
              <Download className="w-4 h-4" /> Exporter JSON
            </button>
          )}
          {isAdmin && !isFrozen && (
            <button onClick={() => setFreezeModal(true)} className="inline-flex items-center gap-2 bg-error-500 hover:bg-error-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              <Lock className="w-4 h-4" /> Geler
            </button>
          )}
          {isAdmin && isFrozen && (
            <button onClick={() => setUnfreezeModal(true)} className="inline-flex items-center gap-2 bg-warning-500 hover:bg-warning-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              <Unlock className="w-4 h-4" /> Dégeler
            </button>
          )}
          {canEdit && (
            <button
              onClick={() => saveMutation.mutate()}
              disabled={!isDirty || saveMutation.isPending}
              className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {saveMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          )}
        </div>
      </div>

      {/* Bandeau gelé */}
      {isFrozen && (
        <div className="border-l-4 border-slate-400 bg-slate-50 p-4 rounded-lg mb-6 flex items-center gap-3">
          <Lock className="w-5 h-5 text-slate-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-slate-700">
              Formulaire gelé — les questions ne sont plus modifiables.
            </p>
            <p className="text-sm text-slate-500 mt-0.5">
              Le titre et la description restent éditables.
              {form.frozenAt && ` Gelé le ${new Date(form.frozenAt).toLocaleDateString('fr-FR')}.`}
            </p>
          </div>
        </div>
      )}

      {/* Layout 2 colonnes */}
      <div className="grid grid-cols-12 gap-6">
        {/* Colonne gauche — Métadonnées */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">Métadonnées</h2>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Titre <span className="text-error-500">*</span></label>
              <input
                type="text"
                value={meta.title}
                onChange={e => { setMeta(m => ({ ...m, title: e.target.value })); setIsDirty(true) }}
                disabled={isFrozen}
                className="w-full h-10 px-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea
                rows={3}
                value={meta.description}
                onChange={e => { setMeta(m => ({ ...m, description: e.target.value })); setIsDirty(true) }}
                disabled={isFrozen}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400 resize-none"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
              <div className={`inline-flex px-3 py-1.5 rounded-lg text-sm font-medium ${FORM_TYPE_CONFIG[form.formType]?.color ?? 'bg-slate-100 text-slate-700'}`}>
                {FORM_TYPE_CONFIG[form.formType]?.label ?? form.formType}
              </div>
            </div>

            {isAdminOrHr && !isFrozen && (
              <div className="mt-6 pt-4 border-t border-slate-100">
                <button
                  onClick={() => setDeleteModal(true)}
                  className="flex items-center gap-2 text-sm text-error-600 hover:text-error-700 transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> Supprimer le formulaire
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Colonne droite — Questions */}
        <div className="col-span-12 lg:col-span-8">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
                Questions ({questions.length})
                {isFrozen && <span className="ml-2 text-xs text-slate-400 font-normal normal-case">(lecture seule)</span>}
              </h2>
              {!isFrozen && isAdminOrHr && (
                <button onClick={addQuestion} className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium">
                  <Plus className="w-4 h-4" /> Ajouter
                </button>
              )}
            </div>

            {questions.length === 0 && (
              <div className="text-center py-10 text-slate-400">
                <p className="text-sm">Aucune question dans ce formulaire.</p>
                {!isFrozen && isAdminOrHr && (
                  <button onClick={addQuestion} className="mt-2 text-sm text-primary-600 hover:underline">+ Ajouter une question</button>
                )}
              </div>
            )}

            <div className="space-y-3">
              {questions.map((q, idx) =>
                isFrozen ? (
                  <div key={q.id} className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 text-xs font-medium flex items-center justify-center flex-shrink-0">{idx + 1}</span>
                      <span className="text-xs px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-500">{q.type}</span>
                      {q.phase && <span className="text-xs text-slate-400">{q.phase}</span>}
                      {q.required && <span className="text-xs text-primary-600 font-medium">Requis</span>}
                    </div>
                    <p className="text-sm text-slate-700">{q.text || <em className="text-slate-400">Sans texte</em>}</p>
                    {q.options && q.options.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {q.options.map((opt, i) => (
                          <li key={i} className="text-xs text-slate-500 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 flex-shrink-0" />
                            {opt}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <div key={q.id} className="border border-slate-200 rounded-xl p-4 bg-white">
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col gap-1 pt-1">
                        <button
                          disabled={idx === 0}
                          onClick={() => {
                            if (idx === 0) return
                            setQuestions(qs => { const a = [...qs]; [a[idx - 1], a[idx]] = [a[idx], a[idx - 1]]; return a })
                            setIsDirty(true)
                          }}
                          className="text-slate-300 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          disabled={idx === questions.length - 1}
                          onClick={() => {
                            if (idx === questions.length - 1) return
                            setQuestions(qs => { const a = [...qs]; [a[idx], a[idx + 1]] = [a[idx + 1], a[idx]]; return a })
                            setIsDirty(true)
                          }}
                          className="text-slate-300 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="w-6 h-6 rounded-full bg-primary-50 text-primary-700 text-xs font-semibold flex items-center justify-center flex-shrink-0">{idx + 1}</span>
                          <select
                            value={q.type}
                            onChange={e => { setQuestions(qs => qs.map(x => x.id === q.id ? { ...x, type: e.target.value as FormQuestion['type'] } : x)); setIsDirty(true) }}
                            className="h-7 px-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-300"
                          >
                            {(['text', 'textarea', 'rating', 'multiple_choice', 'yes_no'] as const).map(t => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                          <label className="flex items-center gap-1 text-xs text-slate-600 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={q.required}
                              onChange={e => { setQuestions(qs => qs.map(x => x.id === q.id ? { ...x, required: e.target.checked } : x)); setIsDirty(true) }}
                              className="rounded border-slate-300 text-primary-500"
                            />
                            Requis
                          </label>
                        </div>
                        <input
                          type="text"
                          value={q.text}
                          onChange={e => { setQuestions(qs => qs.map(x => x.id === q.id ? { ...x, text: e.target.value } : x)); setIsDirty(true) }}
                          placeholder="Texte de la question…"
                          className="w-full h-10 px-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400"
                        />
                        {q.type === 'multiple_choice' && (
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Options (une par ligne)</p>
                            <textarea
                              rows={3}
                              value={(q.options ?? []).join('\n')}
                              onChange={e => { setQuestions(qs => qs.map(x => x.id === q.id ? { ...x, options: e.target.value.split('\n') } : x)); setIsDirty(true) }}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary-200 resize-none"
                            />
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => { setQuestions(qs => qs.filter(x => x.id !== q.id)); setIsDirty(true) }}
                        className="text-slate-300 hover:text-error-500 transition-colors p-1"
                        title="Supprimer la question"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal suppression */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Supprimer ce formulaire ?</h3>
            <p className="text-sm text-slate-600 mb-4">Cette action est irréversible. Les campagnes liées ne seront pas affectées.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteModal(false)} className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50">Annuler</button>
              <button onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending} className="px-4 py-2 text-sm font-medium bg-error-500 text-white rounded-lg hover:bg-error-600 disabled:opacity-50">
                {deleteMutation.isPending ? 'Suppression…' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal gel */}
      {freezeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-error-50 flex items-center justify-center flex-shrink-0">
                <Lock className="w-5 h-5 text-error-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Geler ce formulaire ?</h3>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              Une fois gelé, les questions ne seront plus modifiables. Cette version sera utilisée pour toutes les évaluations associées.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setFreezeModal(false)} className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50">Annuler</button>
              <button onClick={() => freezeMutation.mutate()} disabled={freezeMutation.isPending} className="px-4 py-2 text-sm font-medium bg-error-500 text-white rounded-lg hover:bg-error-600 disabled:opacity-50">
                {freezeMutation.isPending ? 'Gel en cours…' : 'Geler le formulaire'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal dégel */}
      {unfreezeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-warning-50 flex items-center justify-center flex-shrink-0">
                <Unlock className="w-5 h-5 text-warning-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Dégeler ce formulaire ?</h3>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              Les questions redeviendront modifiables. Les évaluations en cours conserveront leurs réponses.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setUnfreezeModal(false)} className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50">Annuler</button>
              <button onClick={() => unfreezeMutation.mutate()} disabled={unfreezeMutation.isPending} className="px-4 py-2 text-sm font-medium bg-warning-500 text-white rounded-lg hover:bg-warning-600 disabled:opacity-50">
                {unfreezeMutation.isPending ? 'Dégel en cours…' : 'Dégeler'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
