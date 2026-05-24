import { useState, useRef, useCallback } from 'react'
import { Upload, AlertCircle, CheckCircle, Download, FileText, ClipboardList } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { adminApi } from '../api/admin'

type FormJson = { title?: string; formType?: string; questions?: unknown[] } & Record<string, unknown>

const VALID_FORM_TYPES = ['self_evaluation', 'manager_evaluation', 'upward_feedback', 'director_evaluation', 'peer_review', 'objectives', 'mobility_request', 'salary_raise_request', 'promotion_request', 'training_request']
const VALID_QUESTION_TYPES = ['rating', 'text', 'yes_no', 'choice', 'weather', 'mobility', 'n1_import', 'scale', 'objective_item']

function validateForm(json: unknown): string[] {
  const errs: string[] = []
  if (typeof json !== 'object' || json === null || Array.isArray(json)) {
    errs.push('Le fichier doit être un objet JSON')
    return errs
  }
  const f = json as FormJson
  if (!f.title) errs.push('Champ "title" manquant')
  if (!f.formType) errs.push('Champ "formType" manquant')
  else if (!VALID_FORM_TYPES.includes(f.formType)) errs.push(`formType "${f.formType}" invalide. Valeurs: ${VALID_FORM_TYPES.join(', ')}`)
  if (!Array.isArray(f.questions)) errs.push('Champ "questions" manquant ou non tableau')
  else {
    const ids = new Set<string>()
    f.questions.forEach((q: unknown, i) => {
      const qObj = q as { id?: string; type?: string }
      if (!qObj.id) errs.push(`Question ${i + 1}: champ "id" manquant`)
      else if (ids.has(qObj.id)) errs.push(`Question ${i + 1}: ID "${qObj.id}" en double`)
      else ids.add(qObj.id)
      if (!qObj.type) errs.push(`Question ${i + 1}: champ "type" manquant`)
      else if (!VALID_QUESTION_TYPES.includes(qObj.type)) errs.push(`Question ${i + 1}: type "${qObj.type}" invalide`)
    })
  }
  return errs
}

async function downloadTemplate() {
  const res = await adminApi.getFormTemplate()
  const blob = new Blob([res.data as BlobPart], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = 'template-formulaire.json'; a.click()
  URL.revokeObjectURL(url)
}

export default function AdminFormsImportPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<'file' | 'paste'>('file')
  const [json, setJson] = useState<FormJson | null>(null)
  const [, setRawText] = useState('')
  const [pasteText, setPasteText] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importedId, setImportedId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function parseAndValidate(text: string) {
    setRawText(text)
    try {
      const parsed = JSON.parse(text)
      const errs = validateForm(parsed)
      setErrors(errs)
      setJson(errs.length === 0 ? parsed as FormJson : null)
    } catch {
      setErrors(['JSON invalide ou malformé'])
      setJson(null)
    }
  }

  function processFile(file: File) {
    const reader = new FileReader()
    reader.onload = e => parseAndValidate(e.target?.result as string)
    reader.readAsText(file)
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [])

  function handlePaste() {
    parseAndValidate(pasteText)
  }

  async function doImport() {
    if (!json || errors.length) return
    setIsImporting(true)
    try {
      const res = await adminApi.importForm(json)
      const id = res.data?.id
      setImportedId(id ?? null)
      setTimeout(() => navigate(id ? `/forms/${id}` : '/forms'), 2000)
    } catch {
      setErrors(["Erreur lors de l'import. Vérifiez le format."])
    } finally {
      setIsImporting(false)
    }
  }

  function reset() { setJson(null); setRawText(''); setPasteText(''); setErrors([]); setImportedId(null) }

  const questions = Array.isArray(json?.questions) ? json!.questions as { id?: string; type?: string; text?: string }[] : []

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Import formulaires</h1>
        <button
          onClick={downloadTemplate}
          className="inline-flex items-center gap-2 border border-slate-200 hover:bg-slate-50 px-3 py-2 rounded-md text-sm"
        >
          <Download className="w-4 h-4" /> Télécharger le template JSON
        </button>
      </div>

      {/* Onglets */}
      <div className="flex border-b border-slate-200 mb-6">
        <button
          onClick={() => setTab('file')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === 'file' ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <FileText className="w-4 h-4" /> 📁 Fichier
        </button>
        <button
          onClick={() => setTab('paste')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === 'paste' ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <ClipboardList className="w-4 h-4" /> 📋 Coller JSON
        </button>
      </div>

      {/* Tab: Fichier */}
      {tab === 'file' && (
        <div
          className={`border-2 border-dashed rounded-2xl p-10 text-center transition cursor-pointer ${isDragging ? 'border-primary-400 bg-primary-50' : 'border-slate-200 hover:border-primary-300 hover:bg-slate-50'}`}
          onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
        >
          <Upload size={40} className="mx-auto mb-3 text-slate-300" />
          <p className="font-medium text-slate-700">Glissez-déposez un fichier JSON</p>
          <p className="text-sm text-slate-400 mt-1">ou cliquez pour sélectionner</p>
          <input ref={inputRef} type="file" accept=".json" className="hidden" onChange={e => { if (e.target.files?.[0]) processFile(e.target.files[0]) }} />
        </div>
      )}

      {/* Tab: Paste */}
      {tab === 'paste' && (
        <div>
          <textarea
            value={pasteText}
            onChange={e => setPasteText(e.target.value)}
            placeholder='Collez votre JSON ici…\n{\n  "title": "...",\n  "formType": "self_evaluation",\n  "questions": [...]\n}'
            rows={12}
            className="w-full font-mono text-xs border border-slate-300 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-primary-200 resize-y"
          />
          <button
            onClick={handlePaste}
            disabled={!pasteText.trim()}
            className="mt-3 px-4 py-2 bg-slate-700 text-white rounded-md text-sm hover:bg-slate-800 disabled:opacity-50"
          >
            Valider
          </button>
        </div>
      )}

      {/* Erreurs */}
      {errors.length > 0 && (
        <div className="mt-4 p-4 bg-red-50 rounded-xl">
          <div className="flex items-center gap-2 mb-2"><AlertCircle size={16} className="text-red-500" /><p className="text-sm font-semibold text-red-700">Erreurs de validation</p></div>
          <ul className="text-sm text-red-600 list-disc list-inside space-y-1">{errors.map((e, i) => <li key={`${e}-${i}`}>{e}</li>)}</ul>
        </div>
      )}

      {/* Aperçu riche */}
      {json && !errors.length && (
        <div className="mt-6 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-3 font-semibold">Aperçu</p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-slate-400">Titre</p>
                <p className="text-sm font-medium text-slate-900">{json.title}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Type</p>
                <p className="text-sm font-medium text-slate-900">{json.formType}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Questions</p>
                <p className="text-sm font-medium text-slate-900">{questions.length}</p>
              </div>
            </div>
          </div>

          {questions.length > 0 && (
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-semibold">Questions ({questions.length})</p>
              <ul className="space-y-1">
                {questions.slice(0, 5).map((q, i) => (
                  <li key={q.id ?? `q-${i}`} className="flex items-center gap-2 text-sm">
                    <span className="text-xs bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-mono">{q.type}</span>
                    <span className="text-slate-700 truncate">{q.text}</span>
                  </li>
                ))}
                {questions.length > 5 && <li className="text-xs text-slate-400">… et {questions.length - 5} autres</li>}
              </ul>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={doImport}
              disabled={isImporting || !!importedId}
              className="px-5 py-2 bg-primary-500 text-white rounded-md text-sm font-medium hover:bg-primary-600 disabled:opacity-50 transition flex items-center gap-2"
            >
              {isImporting ? 'Import en cours…' : 'Importer le formulaire'}
            </button>
            <button onClick={reset} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-md hover:bg-slate-50">Réinitialiser</button>
          </div>

          {importedId && (
            <div className="p-3 bg-green-50 rounded-xl flex items-center gap-2">
              <CheckCircle size={16} className="text-green-500" />
              <p className="text-sm text-green-700">Formulaire importé ! Redirection…</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
