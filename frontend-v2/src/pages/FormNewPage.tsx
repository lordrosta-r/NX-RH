import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { Plus, Trash2, FileText, Upload, ChevronUp, ChevronDown, X } from 'lucide-react'
import { formsApi } from '../api/forms'
import type { Form, FormQuestion, QuestionType, QuestionPhase } from '../types'

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: 'rating',          label: 'Note (1-10)' },
  { value: 'text',            label: 'Texte libre' },
  { value: 'yes_no',          label: 'Oui / Non' },
  { value: 'choice',          label: 'Choix multiple' },
  { value: 'weather',         label: 'Météo humeur' },
  { value: 'mobility',        label: 'Souhait mobilité' },
  { value: 'n1_import',       label: 'Import N-1 (auto)' },
  { value: 'scale',           label: 'Curseur 0-100%' },
  { value: 'objective_item',  label: 'Objectif structuré' },
]

const PHASES: { value: QuestionPhase; label: string }[] = [
  { value: 'self',        label: 'Auto-évaluation' },
  { value: 'n-1',         label: 'Évaluation N-1' },
  { value: 'objectives',  label: 'Objectifs' },
  { value: 'aspirations', label: 'Aspirations' },
  { value: 'all',         label: 'Toutes phases' },
]

const INPUT_CLS =
  'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none'
const SELECT_CLS =
  'border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none w-full'

// ─── QuestionCard ─────────────────────────────────────────────────────────────

function QuestionCard({
  question,
  index,
  total,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  question: FormQuestion
  index: number
  total: number
  onChange: (q: FormQuestion) => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 mb-3 group">
      <div className="flex items-start gap-3">
        {/* Index + move controls */}
        <div className="flex flex-col items-center gap-1 pt-1">
          <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-xs font-medium flex items-center justify-center flex-shrink-0">
            {index + 1}
          </span>
          <div className="flex flex-col gap-0.5">
            <button
              onClick={onMoveUp}
              disabled={index === 0}
              className="p-0.5 text-slate-300 hover:text-slate-600 disabled:opacity-30"
            >
              <ChevronUp className="w-3 h-3" />
            </button>
            <button
              onClick={onMoveDown}
              disabled={index === total - 1}
              className="p-0.5 text-slate-300 hover:text-slate-600 disabled:opacity-30"
            >
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          {/* Row 1 : Type + Phase */}
          <div className="flex items-center gap-3 mb-3">
            <select
              value={question.type}
              onChange={e => onChange({ ...question, type: e.target.value as QuestionType })}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none flex-1"
            >
              {QUESTION_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <select
              value={question.phase ?? 'all'}
              onChange={e => onChange({ ...question, phase: e.target.value as QuestionPhase })}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
            >
              {PHASES.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* Row 2 : Question text */}
          <textarea
            value={question.text}
            onChange={e => onChange({ ...question, text: e.target.value })}
            placeholder="Texte de la question..."
            rows={2}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none resize-none mb-3"
          />

          {/* Options (choice only) */}
          {question.type === 'choice' && (
            <div className="mb-3">
              <p className="text-xs font-medium text-slate-500 mb-2">Options :</p>
              {(question.options ?? []).map((opt, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <input
                    value={opt}
                    onChange={e => {
                      const opts = [...(question.options ?? [])]
                      opts[i] = e.target.value
                      onChange({ ...question, options: opts })
                    }}
                    className="flex-1 border border-slate-200 rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    placeholder={`Option ${i + 1}`}
                  />
                  <button
                    onClick={() =>
                      onChange({
                        ...question,
                        options: (question.options ?? []).filter((_, j) => j !== i),
                      })
                    }
                    className="text-slate-400 hover:text-error-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                onClick={() =>
                  onChange({ ...question, options: [...(question.options ?? []), ''] })
                }
                className="text-xs text-primary-600 hover:underline"
              >
                + Ajouter une option
              </button>
            </div>
          )}

          {/* Row 3 : Required + Delete */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={question.required}
                onChange={e => onChange({ ...question, required: e.target.checked })}
                className="rounded border-slate-300 text-primary-500"
              />
              <span className="text-xs text-slate-500">Requis</span>
            </label>
            <button
              onClick={onDelete}
              className="text-xs text-slate-400 hover:text-error-500 flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" /> Supprimer
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── FormNewPage ──────────────────────────────────────────────────────────────

export default function FormNewPage() {
  const navigate = useNavigate()

  const [meta, setMeta] = useState({
    title: '',
    description: '',
    formType: '',
    isFrozen: false,
  })
  const [questions, setQuestions] = useState<FormQuestion[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})

  function newQuestion(): FormQuestion {
    return {
      id: crypto.randomUUID(),
      type: 'text',
      text: '',
      required: false,
      phase: 'all',
      options: [],
      order: questions.length,
    }
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!meta.title.trim()) e.title = 'Le titre est requis'
    if (!meta.formType) e.formType = 'Le type est requis'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const createMutation = useMutation({
    mutationFn: () =>
      formsApi.createForm({ ...meta, questions }).then(r => r.data),
    onSuccess: (form: Form) => navigate(`/forms/${form.id}`),
  })

  function handleSave() {
    if (!validate()) return
    createMutation.mutate()
  }

  function moveQuestion(idx: number, dir: -1 | 1) {
    setQuestions(qs => {
      const a = [...qs]
      const target = idx + dir
      if (target < 0 || target >= a.length) return a
      ;[a[idx], a[target]] = [a[target], a[idx]]
      return a
    })
  }

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Nouveau formulaire</h1>
        <div className="flex items-center gap-2">
          <Link
            to="/forms"
            className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            Annuler
          </Link>
          <button
            onClick={handleSave}
            disabled={createMutation.isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 disabled:opacity-50 rounded-lg"
          >
            {createMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* ── Col gauche : Métadonnées ── */}
        <div className="col-span-12 lg:col-span-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 sticky top-4">
            <h2 className="text-base font-semibold text-slate-900 mb-4">Métadonnées</h2>

            {/* Titre */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Titre *</label>
              <input
                className={INPUT_CLS}
                value={meta.title}
                onChange={e => setMeta(m => ({ ...m, title: e.target.value }))}
                placeholder="Titre du formulaire"
              />
              {errors.title && <p className="text-xs text-error-500 mt-1">{errors.title}</p>}
            </div>

            {/* Description */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea
                rows={3}
                className={INPUT_CLS}
                value={meta.description}
                onChange={e => setMeta(m => ({ ...m, description: e.target.value }))}
                placeholder="Description optionnelle"
              />
            </div>

            {/* Type */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Type *</label>
              <select
                className={SELECT_CLS}
                value={meta.formType}
                onChange={e => setMeta(m => ({ ...m, formType: e.target.value }))}
              >
                <option value="">Sélectionner un type...</option>
                <optgroup label="Évaluations">
                  <option value="self_evaluation">Auto-évaluation</option>
                  <option value="manager_evaluation">Évaluation manager</option>
                  <option value="upward_feedback">Feedback ascendant</option>
                  <option value="director_evaluation">Évaluation directeur</option>
                  <option value="peer_review">Peer review</option>
                </optgroup>
                <optgroup label="Objectifs">
                  <option value="objectives">Objectifs</option>
                </optgroup>
                <optgroup label="Formulaires de demande">
                  <option value="mobility_request">Demande de mobilité</option>
                  <option value="salary_raise_request">Demande d'augmentation</option>
                  <option value="promotion_request">Demande de promotion</option>
                  <option value="training_request">Demande de formation</option>
                </optgroup>
              </select>
              {errors.formType && <p className="text-xs text-error-500 mt-1">{errors.formType}</p>}
            </div>

            {/* Objectifs N-1 (si type = objectives) */}
            {meta.formType === 'objectives' && (
              <div className="mb-4 p-3 bg-primary-50 rounded-lg border border-primary-100">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" className="mt-0.5" />
                  <span className="text-sm text-primary-700">
                    📥 Importer automatiquement les objectifs N-1
                  </span>
                </label>
              </div>
            )}

            {/* Import JSON */}
            <Link
              to="/admin/forms/import"
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-primary-600 mt-4"
            >
              <Upload className="w-4 h-4" /> Importer un JSON
            </Link>
          </div>
        </div>

        {/* ── Col droite : FormBuilder ── */}
        <div className="col-span-12 lg:col-span-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-900">
              Questions ({questions.length})
            </h2>
            <button
              onClick={() => setQuestions(qs => [...qs, newQuestion()])}
              className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              <Plus className="w-4 h-4" /> Ajouter une question
            </button>
          </div>

          {/* Empty state */}
          {questions.length === 0 && (
            <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-xl">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">Aucune question pour l'instant</p>
              <button
                onClick={() => setQuestions([newQuestion()])}
                className="mt-3 text-sm text-primary-600 hover:underline"
              >
                + Ajouter la première question
              </button>
            </div>
          )}

          {/* Question list */}
          {questions.map((q, idx) => (
            <QuestionCard
              key={q.id}
              question={q}
              index={idx}
              total={questions.length}
              onChange={updated =>
                setQuestions(qs => qs.map(x => (x.id === updated.id ? updated : x)))
              }
              onDelete={() => setQuestions(qs => qs.filter(x => x.id !== q.id))}
              onMoveUp={() => moveQuestion(idx, -1)}
              onMoveDown={() => moveQuestion(idx, 1)}
            />
          ))}

          {/* Add question footer button */}
          {questions.length > 0 && (
            <button
              onClick={() => setQuestions(qs => [...qs, newQuestion()])}
              className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-500 hover:text-primary-600 hover:border-primary-300 transition-colors mt-2"
            >
              + Ajouter une question
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

