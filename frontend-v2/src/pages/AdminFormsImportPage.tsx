import { useState, useRef, useCallback } from 'react'
import { Upload, AlertCircle, CheckCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { adminApi } from '../api/admin'

type FormJson = { title?: string; sections?: unknown[]; questions?: unknown[] } & Record<string, unknown>

function validateForm(json: unknown): string[] {
  const errs: string[] = []
  if (typeof json !== 'object' || json === null) { errs.push('Le fichier doit être un objet JSON'); return errs }
  const f = json as FormJson
  if (!f.title) errs.push('Champ "title" manquant')
  if (!Array.isArray(f.sections)) errs.push('Champ "sections" manquant ou non tableau')
  if (!Array.isArray(f.questions)) errs.push('Champ "questions" manquant ou non tableau')
  return errs
}

export default function AdminFormsImportPage() {
  const navigate = useNavigate()
  const [json, setJson] = useState<FormJson | null>(null)
  const [rawText, setRawText] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [success, setSuccess] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function processFile(file: File) {
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target?.result as string
      setRawText(text)
      try {
        const parsed = JSON.parse(text)
        const errs = validateForm(parsed)
        setErrors(errs)
        setJson(errs.length === 0 ? parsed : null)
      } catch {
        setErrors(['JSON invalide ou malformé'])
        setJson(null)
      }
    }
    reader.readAsText(file)
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [])

  async function doImport() {
    if (!json || errors.length) return
    setIsImporting(true)
    try {
      await adminApi.importForm(json)
      setSuccess(true)
      setTimeout(() => navigate('/forms'), 2000)
    } catch {
      setErrors(["Erreur lors de l'import. Vérifiez le format."])
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900 mb-6">Import formulaires</h1>

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

      {errors.length > 0 && (
        <div className="mt-4 p-4 bg-red-50 rounded-xl">
          <div className="flex items-center gap-2 mb-2"><AlertCircle size={16} className="text-red-500" /><p className="text-sm font-semibold text-red-700">Erreurs de validation</p></div>
          <ul className="text-sm text-red-600 list-disc list-inside space-y-1">{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
        </div>
      )}

      {rawText && !errors.length && (
        <div className="mt-6">
          <p className="text-sm font-semibold text-slate-700 mb-2">Prévisualisation JSON</p>
          <div className="bg-slate-900 rounded-2xl p-4 overflow-auto max-h-96">
            <pre className="text-xs text-slate-100 font-mono whitespace-pre-wrap">{JSON.stringify(json, null, 2)}</pre>
          </div>
          <div className="mt-4 flex gap-3">
            <button
              onClick={doImport}
              disabled={isImporting || success}
              className="px-5 py-2 bg-primary-500 text-white rounded-xl text-sm font-medium hover:bg-primary-600 disabled:opacity-50 transition flex items-center gap-2"
            >
              {isImporting ? 'Import en cours…' : 'Importer le formulaire'}
            </button>
            <button onClick={() => { setJson(null); setRawText(''); setErrors([]) }} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50">Réinitialiser</button>
          </div>
          {success && (
            <div className="mt-4 p-3 bg-green-50 rounded-xl flex items-center gap-2">
              <CheckCircle size={16} className="text-green-500" />
              <p className="text-sm text-green-700">Formulaire importé ! Redirection vers /forms…</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

