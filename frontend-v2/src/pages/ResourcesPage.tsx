import { useState, useEffect, useRef } from 'react'
import { useDebounce } from '../hooks/useDebounce'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import type { LucideIcon } from 'lucide-react'
import {
  FileText, FileSpreadsheet, FileType, Play,
  Link as LinkIcon, Image as ImageIcon, File, BookOpen,
  Download, Plus, X, EllipsisVertical, Pencil, Trash,
  ChevronDown, Search,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { resourcesApi } from '../api/resources'
import type { Resource, ResourceType, Role } from '../types'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} Ko`
  return `${bytes} o`
}

interface TypeConfig {
  icon: LucideIcon
  bg: string
  text: string
  label: string
}

const TYPE_CONFIG: Record<ResourceType, TypeConfig> = {
  pdf:   { icon: FileText,        bg: 'bg-red-100',    text: 'text-red-600',    label: 'PDF' },
  xlsx:  { icon: FileSpreadsheet, bg: 'bg-green-100',  text: 'text-green-600',  label: 'Excel' },
  doc:   { icon: FileType,        bg: 'bg-blue-100',   text: 'text-blue-600',   label: 'Word' },
  video: { icon: Play,            bg: 'bg-purple-100', text: 'text-purple-600', label: 'Vidéo' },
  link:  { icon: LinkIcon,        bg: 'bg-amber-100',  text: 'text-amber-600',  label: 'Lien' },
  image: { icon: ImageIcon,       bg: 'bg-pink-100',   text: 'text-pink-600',   label: 'Image' },
  other: { icon: File,            bg: 'bg-slate-100',  text: 'text-slate-600',  label: 'Autre' },
}

function getTypeConfig(type?: ResourceType): TypeConfig {
  if (type && type in TYPE_CONFIG) return TYPE_CONFIG[type]
  return TYPE_CONFIG.other
}

const AVAILABLE_ROLES: Role[] = ['admin', 'hr', 'manager', 'employee']
const RESOURCE_TYPES: ResourceType[] = ['pdf', 'xlsx', 'doc', 'video', 'link', 'image', 'other']

// ─── ResourceCard ─────────────────────────────────────────────────────────────
interface ResourceCardProps {
  resource: Resource
  isAdminHr: boolean
  onPublish: (id: string) => void
  onUnpublish: (id: string) => void
  onDelete: (id: string) => void
}

function ResourceCard({ resource, isAdminHr, onPublish, onUnpublish, onDelete }: ResourceCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const config = getTypeConfig(resource.type)
  const IconComponent = config.icon
  const isDraft = resource.status === 'draft' || !resource.isPublished

  useEffect(() => {
    if (!menuOpen) return
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  const handleDownload = () => {
    const url = resource.fileUrl || `/api/resources/${resource.id}/download`
    window.open(url, '_blank')
  }

  return (
    <div className="bg-white rounded-2xl shadow p-6 flex flex-col gap-4 relative">
      {/* Type icon */}
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${config.bg}`}>
        <IconComponent className={`w-6 h-6 ${config.text}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-slate-900 text-base leading-snug line-clamp-2">
          {resource.title}
        </h3>
        <p className="text-sm text-slate-500 mt-1">
          {config.label}
          {resource.fileSize !== undefined && ` · ${formatFileSize(resource.fileSize)}`}
        </p>
        <p className="text-xs text-slate-400 mt-0.5">
          Visible : {(resource.visibleTo?.length ?? 0) > 0 ? resource.visibleTo!.join(', ') : 'Tous'}
        </p>
      </div>

      {/* Status + publish/unpublish */}
      <div className="flex items-center justify-between gap-2">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          isDraft ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
        }`}>
          {isDraft ? 'Brouillon' : 'Publié'}
        </span>
        {isAdminHr && isDraft && (
          <button
            onClick={() => onPublish(resource.id)}
            className="text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors"
          >
            Publier
          </button>
        )}
        {isAdminHr && !isDraft && (
          <button
            onClick={() => onUnpublish(resource.id)}
            className="text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors"
          >
            Dépublier
          </button>
        )}
      </div>

      {/* Download */}
      <button
        onClick={handleDownload}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-xl text-sm font-medium hover:bg-primary-600 active:bg-primary-700 transition-colors"
      >
        <Download className="w-4 h-4" />
        Télécharger
      </button>

      {/* Admin menu */}
      {isAdminHr && (
        <div ref={menuRef} className="absolute top-3 right-3">
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
            aria-label="Actions"
          >
            <EllipsisVertical className="w-4 h-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-9 bg-white border border-slate-200 rounded-xl shadow-lg z-20 min-w-[140px] py-1">
              <button
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                onClick={() => { setMenuOpen(false); navigate(`/resources/${resource.id}`) }}
              >
                <Pencil className="w-3.5 h-3.5" />
                Modifier
              </button>
              <button
                onClick={() => { setMenuOpen(false); onDelete(resource.id) }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash className="w-3.5 h-3.5" />
                Supprimer
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Skeleton Card ────────────────────────────────────────────────────────────
function ResourceCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow p-6 flex flex-col gap-4 animate-pulse">
      <div className="w-12 h-12 rounded-xl bg-slate-200" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-slate-200 rounded w-3/4" />
        <div className="h-3 bg-slate-200 rounded w-1/2" />
        <div className="h-3 bg-slate-200 rounded w-2/5" />
      </div>
      <div className="h-5 bg-slate-200 rounded-full w-20" />
      <div className="h-9 bg-slate-200 rounded-xl" />
    </div>
  )
}

// ─── New Resource Slide-Over ──────────────────────────────────────────────────
interface NewResourceSlideOverProps {
  open: boolean
  onClose: () => void
}

function NewResourceSlideOver({ open, onClose }: NewResourceSlideOverProps) {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [type, setType] = useState<ResourceType>('other')
  const [description, setDescription] = useState('')
  const [fileUrl, setFileUrl] = useState('')
  const [visibleTo, setVisibleTo] = useState<string[]>([])
  const [status, setStatus] = useState<'published' | 'draft'>('draft')

  const { mutate, isPending, reset } = useMutation({
    mutationFn: (data: Partial<Resource>) =>
      resourcesApi.createResource(data).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] })
      handleReset()
      onClose()
    },
  })

  const handleReset = () => {
    setTitle('')
    setType('other')
    setDescription('')
    setFileUrl('')
    setVisibleTo([])
    setStatus('draft')
    reset()
  }

  const toggleRole = (role: string) => {
    setVisibleTo(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutate({ title, type, description, fileUrl, visibleTo, status, isPublished: status === 'published' })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-lg bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
          <h2 className="text-lg font-semibold text-slate-900">Nouvelle ressource</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Titre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder-slate-400"
                placeholder="Nom de la ressource"
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Type</label>
              <select
                value={type}
                onChange={e => setType(e.target.value as ResourceType)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
              >
                {RESOURCE_TYPES.map(t => (
                  <option key={t} value={t}>{TYPE_CONFIG[t].label}</option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
              <textarea
                rows={3}
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none placeholder-slate-400"
                placeholder="Description de la ressource"
              />
            </div>

            {/* File URL */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">URL du fichier</label>
              <input
                type="text"
                value={fileUrl}
                onChange={e => setFileUrl(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder-slate-400"
                placeholder="https://..."
              />
            </div>

            {/* Visible to */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Visible pour</label>
              <div className="flex flex-wrap gap-3">
                {AVAILABLE_ROLES.map(role => (
                  <label key={role} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={visibleTo.includes(role)}
                      onChange={() => toggleRole(role)}
                      className="w-4 h-4 text-primary-500 rounded border-slate-300"
                    />
                    <span className="text-sm text-slate-700 capitalize">{role}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Status toggle */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Statut</label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setStatus(s => s === 'published' ? 'draft' : 'published')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                    status === 'published' ? 'bg-primary-500' : 'bg-slate-300'
                  }`}
                  role="switch"
                  aria-checked={status === 'published'}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    status === 'published' ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
                <span className="text-sm text-slate-700">
                  {status === 'published' ? 'Publié' : 'Brouillon'}
                </span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isPending || !title.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? 'Création...' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── ResourcesPage ────────────────────────────────────────────────────────────
export default function ResourcesPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const isAdminHr = user?.role === 'admin' || user?.role === 'hr'

  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 400)
  const [showNewSlideOver, setShowNewSlideOver] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['resources', { typeFilter, statusFilter, search: debouncedSearch, isAdminHr }],
    queryFn: () =>
      resourcesApi.getResources({
        category: typeFilter !== 'all' ? typeFilter : undefined,
        publishedOnly: !isAdminHr ? true : statusFilter === 'published' ? true : undefined,
        search: debouncedSearch || undefined,
      }).then(r => r.data),
    placeholderData: keepPreviousData,
  })

  // Client-side draft filter for admin/hr
  const resources = (data?.data ?? []).filter(resource => {
    if (!isAdminHr) return resource.isPublished && resource.status !== 'draft'
    if (statusFilter === 'draft') return resource.status === 'draft' || !resource.isPublished
    if (statusFilter === 'published') return resource.status === 'published' || resource.isPublished
    return true
  })

  const { mutate: publishResource } = useMutation({
    mutationFn: (id: string) => resourcesApi.publishResource(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['resources'] }),
  })

  const { mutate: unpublishResource } = useMutation({
    mutationFn: (id: string) => resourcesApi.unpublishResource(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['resources'] }),
  })

  const { mutate: deleteResource } = useMutation({
    mutationFn: (id: string) => resourcesApi.deleteResource(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['resources'] }),
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Ressources</h1>
          <p className="text-slate-500 mt-1">Accédez aux documents et ressources partagés</p>
        </div>
        {isAdminHr && (
          <button
            onClick={() => setShowNewSlideOver(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-white rounded-xl text-sm font-medium hover:bg-primary-600 transition-colors flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            Nouvelle ressource
          </button>
        )}
      </div>

      {/* Filters — admin/hr only */}
      {isAdminHr && (
        <div className="flex flex-wrap items-center gap-3">
          {/* Type */}
          <div className="relative">
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="pl-3 pr-8 py-2 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none"
            >
              <option value="all">Tous les types</option>
              {RESOURCE_TYPES.map(t => (
                <option key={t} value={t}>{TYPE_CONFIG[t].label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Status */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="pl-3 pr-8 py-2 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none"
            >
              <option value="all">Tous les statuts</option>
              <option value="published">Publiés</option>
              <option value="draft">Brouillons</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className="w-full pl-9 pr-9 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <ResourceCardSkeleton key={i} />
          ))}
        </div>
      ) : resources.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-slate-300" />
          </div>
          <p className="text-slate-500 text-sm">Aucune ressource disponible.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {resources.map(resource => (
            <ResourceCard
              key={resource.id}
              resource={resource}
              isAdminHr={!!isAdminHr}
              onPublish={publishResource}
              onUnpublish={unpublishResource}
              onDelete={deleteResource}
            />
          ))}
        </div>
      )}

      {/* New resource slide-over */}
      <NewResourceSlideOver
        open={showNewSlideOver}
        onClose={() => setShowNewSlideOver(false)}
      />
    </div>
  )
}
