import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, X, Users, Target, FileText, ClipboardList } from 'lucide-react'
import client from '../../api/client'
import { useDebounce } from '../../hooks/useDebounce'

type SearchResult = {
  id: string
  type: 'user' | 'campaign' | 'form' | 'evaluation'
  title: string
  subtitle?: string
  href: string
}

type SearchOverlayProps = {
  open: boolean
  onClose: () => void
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  user: <Users size={16} />,
  campaign: <Target size={16} />,
  form: <FileText size={16} />,
  evaluation: <ClipboardList size={16} />,
}

const TYPE_LABELS: Record<string, string> = {
  user: 'Utilisateur',
  campaign: 'Campagne',
  form: 'Formulaire',
  evaluation: 'Évaluation',
}

export default function SearchOverlay({ open, onClose }: SearchOverlayProps) {
  const [q, setQ] = useState('')
  const debouncedQ = useDebounce(q, 400)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setQ('')
    }
  }, [open])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const { data: results = [], isFetching } = useQuery<SearchResult[]>({
    queryKey: ['global-search', debouncedQ],
    queryFn: () => client.get(`/api/search?q=${encodeURIComponent(debouncedQ)}`).then(r => r.data),
    enabled: debouncedQ.trim().length >= 2,
    staleTime: 10000,
  })

  const isSearching = q !== debouncedQ

  const handleSelect = (result: SearchResult) => {
    navigate(result.href)
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-16 p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
          <Search size={20} className="text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            className="flex-1 text-base text-slate-900 placeholder:text-slate-500 focus:outline-none"
            placeholder="Rechercher utilisateurs, campagnes, formulaires..."
            value={q}
            onChange={e => setQ(e.target.value)}
          />
          {(isFetching || isSearching) && <div className="w-4 h-4 border-2 border-primary-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />}
          <button onClick={onClose} aria-label="Fermer la recherche" className="p-1 text-slate-400 hover:text-slate-600 rounded-lg flex-shrink-0">
            <X size={20} />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {q.trim().length < 2 ? (
            <div className="p-6 text-center text-slate-600 text-sm">
              Tapez au moins 2 caractères pour rechercher
              <p className="mt-2 text-xs text-slate-300">Raccourci : <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-500 font-mono text-xs">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-500 font-mono text-xs">K</kbd></p>
            </div>
          ) : results.length === 0 && !isFetching && !isSearching ? (
            <div className="p-6 text-center text-slate-600 text-sm">Aucun résultat pour "{q}"</div>
          ) : (
            <ul className="py-2">
              {results.map(result => (
                <li key={`${result.type}-${result.id}`}>
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition text-left"
                    onClick={() => handleSelect(result)}
                  >
                    <span className="text-slate-400">{TYPE_ICONS[result.type]}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{result.title}</p>
                      {result.subtitle && <p className="text-xs text-slate-500 truncate">{result.subtitle}</p>}
                    </div>
                    <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full flex-shrink-0">
                      {TYPE_LABELS[result.type]}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
