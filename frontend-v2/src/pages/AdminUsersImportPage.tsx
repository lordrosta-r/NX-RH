import { useState, useRef, useCallback } from 'react'
import { Upload, AlertCircle, CheckCircle, Download } from 'lucide-react'
import { adminApi } from '../api/admin'
import type { ImportResult } from '../types'

type ParsedRow = Record<string, string>

const REQUIRED_FIELDS = ['email', 'firstName', 'lastName', 'role']
const TEMPLATE_HEADERS = ['firstName', 'lastName', 'email', 'role', 'department', 'managerEmail', 'sector']

function validateRow(row: ParsedRow, idx: number): string | null {
  for (const f of REQUIRED_FIELDS) {
    if (!row[f]?.trim()) return `Ligne ${idx + 1}: champ "${f}" manquant`
  }
  return null
}

function detectSeparator(text: string): ',' | ';' {
  const firstLine = text.split('\n')[0] ?? ''
  return firstLine.includes(';') ? ';' : ','
}

function parseCsv(text: string, sep: ',' | ';' = ','): ParsedRow[] {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []
  const headers = lines[0].split(sep).map(h => h.trim().replace(/^"|"$/g, ''))
  return lines.slice(1).map(line => {
    const vals = line.split(sep).map(v => v.trim().replace(/^"|"$/g, ''))
    return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? '']))
  })
}

function downloadTemplateCsv() {
  const csv = TEMPLATE_HEADERS.join(',') + '\n' + 'Jean,Dupont,jean.dupont@example.com,employee,Finance,manager@example.com,Paris\n'
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'template-import-utilisateurs.csv'; a.click()
  URL.revokeObjectURL(url)
}

export default function AdminUsersImportPage() {
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [result, setResult] = useState<ImportResult | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [dryRun, setDryRun] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)

  function processFile(file: File) {
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target?.result as string
      let parsed: ParsedRow[]
      if (file.name.endsWith('.json')) {
        try { parsed = JSON.parse(text) } catch { setErrors(['JSON invalide']); return }
      } else {
        const sep = detectSeparator(text)
        parsed = parseCsv(text, sep)
      }
      const errs = parsed.map((r, i) => validateRow(r, i)).filter(Boolean) as string[]
      setErrors(errs)
      setRows(parsed)
      setResult(null)
    }
    reader.readAsText(file)
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [])

  async function doImport() {
    if (!rows.length || errors.length) return
    setIsImporting(true)
    try {
      const res = await adminApi.importUsers(rows, dryRun)
      setResult(res.data as ImportResult)
    } catch {
      setResult({ success: 0, errors: rows.length })
    } finally {
      setIsImporting(false)
    }
  }

  const headers = rows.length ? Object.keys(rows[0]) : []

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Import utilisateurs</h1>
        <button
          onClick={downloadTemplateCsv}
          className="inline-flex items-center gap-2 border border-slate-200 hover:bg-slate-50 px-3 py-2 rounded-md text-sm"
        >
          <Download className="w-4 h-4" /> Télécharger le template CSV
        </button>
      </div>

      {/* Colonnes attendues */}
      <div className="mb-4 p-3 bg-slate-50 rounded-lg text-xs text-slate-500">
        Colonnes attendues : <code className="font-mono">firstName · lastName · email · role · department · managerEmail · sector</code>
        {' '}— séparateur <code>;</code> ou <code>,</code> détecté automatiquement
      </div>

      {/* Mode simulation */}
      <label className="flex items-center gap-3 mb-6 cursor-pointer select-none">
        <div
          onClick={() => setDryRun(d => !d)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${dryRun ? 'bg-primary-500' : 'bg-slate-300'}`}
        >
          <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${dryRun ? 'translate-x-6' : 'translate-x-1'}`} />
        </div>
        <div>
          <span className="text-sm font-medium text-slate-700">Mode simulation</span>
          <p className="text-xs text-slate-500">{dryRun ? 'Aperçu uniquement — aucune donnée ne sera modifiée' : 'Import réel — les utilisateurs seront créés/mis à jour'}</p>
        </div>
      </label>

      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-2xl p-10 text-center transition cursor-pointer ${isDragging ? 'border-primary-400 bg-primary-50' : 'border-slate-200 hover:border-primary-300 hover:bg-slate-50'}`}
        onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
      >
        <Upload size={40} className="mx-auto mb-3 text-slate-300" />
        <p className="font-medium text-slate-700">Glissez-déposez un fichier CSV ou JSON</p>
        <p className="text-sm text-slate-500 mt-1">ou cliquez pour sélectionner</p>
        <input ref={inputRef} type="file" accept=".csv,.json" className="hidden" onChange={e => { if (e.target.files?.[0]) processFile(e.target.files[0]) }} />
      </div>

      {/* Preview */}
      {rows.length > 0 && (
        <div className="mt-6">
          <p className="text-sm text-slate-600 mb-3"><strong>{rows.length}</strong> lignes détectées</p>

          {errors.length > 0 && (
            <div className="mb-4 p-4 bg-red-50 rounded-xl">
              <div className="flex items-center gap-2 mb-2"><AlertCircle size={16} className="text-red-500" /><p className="text-sm font-semibold text-red-700">Erreurs de validation ({errors.length})</p></div>
              <ul className="text-sm text-red-600 list-disc list-inside space-y-1">
                {errors.slice(0, 10).map((e, i) => <li key={`${e}-${i}`}>{e}</li>)}
              </ul>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>{headers.map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.slice(0, 10).map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    {headers.map(h => <td key={h} className="px-4 py-3 text-slate-700">{r[h] ?? ''}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 10 && <p className="px-4 py-2 text-xs text-slate-400 border-t border-slate-100">… et {rows.length - 10} autres lignes</p>}
          </div>

          <div className="mt-4 flex items-center gap-4">
            <button
              onClick={doImport}
              disabled={errors.length > 0 || isImporting}
              className="px-5 py-2 bg-primary-500 text-white rounded-md text-sm font-medium hover:bg-primary-600 disabled:opacity-50 transition"
            >
              {isImporting ? 'Import en cours…' : dryRun ? `Simuler (${rows.length} lignes)` : `Importer ${rows.length} utilisateurs`}
            </button>
            <button onClick={() => { setRows([]); setErrors([]); setResult(null) }} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-md hover:bg-slate-50">Réinitialiser</button>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className={`mt-6 p-4 rounded-xl flex items-start gap-3 ${result.errors === 0 ? 'bg-green-50' : 'bg-amber-50'}`}>
          {result.errors === 0 ? <CheckCircle size={20} className="text-green-500 flex-shrink-0 mt-0.5" /> : <AlertCircle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />}
          <div>
            {dryRun && <p className="text-xs font-medium text-amber-700 mb-1">Mode simulation — aucune donnée modifiée</p>}
            <p className="font-semibold text-sm">{result.success} importés, {result.errors} erreurs</p>
            {result.details?.map((d, i) => <p key={d.row ?? i} className="text-xs text-slate-600 mt-1">Ligne {d.row}: {d.error}</p>)}
          </div>
        </div>
      )}
    </div>
  )
}
