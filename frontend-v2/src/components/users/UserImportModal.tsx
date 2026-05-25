import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Upload, X, FileText, CheckCircle, AlertCircle } from 'lucide-react'
import { usersApi } from '../../api/users'
import { toast } from '../../hooks/useToast'
import type { ImportResult } from '../../types'

interface CsvRow {
  [key: string]: string
}

function parseCsvPreview(text: string, maxRows = 5): { headers: string[]; rows: CsvRow[] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length === 0) return { headers: [], rows: [] }

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  const rows = lines.slice(1, maxRows + 1).map(line => {
    const cells = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''))
    return Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? '']))
  })
  return { headers, rows }
}

interface Props {
  onClose: () => void
}

export function UserImportModal({ onClose }: Props) {
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<{ headers: string[]; rows: CsvRow[] } | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)

  const importMutation = useMutation({
    mutationFn: (f: File) => usersApi.importUsers(f).then(r => r.data),
    onSuccess: (data) => {
      setResult(data)
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success(
        'Import terminé',
        `${data.success} créé(s)${data.skipped ? `, ${data.skipped} ignoré(s)` : ''}, ${data.errors} erreur(s).`
      )
    },
    onError: () => toast.error('Erreur import', "Impossible d'importer le fichier CSV."),
  })

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0]
    if (!selected) return
    setFile(selected)
    setResult(null)

    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      setPreview(parseCsvPreview(text, 5))
    }
    reader.readAsText(selected)
  }

  function handleImport() {
    if (file) importMutation.mutate(file)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary-500" />
            <h3 className="text-lg font-semibold text-slate-900">Importer des utilisateurs</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* File picker */}
        <div
          className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50/30 transition-colors mb-5"
          onClick={() => inputRef.current?.click()}
        >
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          {file ? (
            <p className="text-sm font-medium text-slate-700">{file.name}</p>
          ) : (
            <>
              <p className="text-sm font-medium text-slate-600">Cliquez pour sélectionner un fichier CSV</p>
              <p className="text-xs text-slate-400 mt-1">Format attendu : prénom, nom, email, rôle, département</p>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* CSV Preview */}
        {preview && preview.headers.length > 0 && !result && (
          <div className="mb-5">
            <p className="text-sm font-medium text-slate-700 mb-2">
              Aperçu ({preview.rows.length} ligne{preview.rows.length !== 1 ? 's' : ''} sur 5 max)
            </p>
            <div className="overflow-x-auto rounded-lg border border-slate-100">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50">
                    {preview.headers.map(h => (
                      <th key={h} className="px-3 py-2 text-left text-slate-500 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row, i) => (
                    <tr key={i} className="border-t border-slate-50">
                      {preview.headers.map(h => (
                        <td key={h} className="px-3 py-2 text-slate-600 truncate max-w-[120px]">{row[h]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Import result */}
        {result && (
          <div className="mb-5 rounded-xl border border-slate-100 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-success-500 shrink-0" />
              <span className="text-sm font-medium text-slate-800">Import terminé</span>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-success-50 text-success-700 font-medium">
                {result.success} créé{result.success !== 1 ? 's' : ''}
              </span>
              {result.skipped !== undefined && result.skipped > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-warning-50 text-warning-700 font-medium">
                  {result.skipped} ignoré{result.skipped !== 1 ? 's' : ''}
                </span>
              )}
              {result.errors > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-error-50 text-error-700 font-medium">
                  {result.errors} erreur{result.errors !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            {result.details && result.details.length > 0 && (
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {result.details.map((d, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-error-700 bg-error-50 rounded px-2 py-1">
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>Ligne {d.row} : {d.error}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            {result ? 'Fermer' : 'Annuler'}
          </button>
          {!result && (
            <button
              disabled={!file || importMutation.isPending}
              onClick={handleImport}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {importMutation.isPending ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Import en cours...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Importer
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
