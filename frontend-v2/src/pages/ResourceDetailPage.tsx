import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import type { LucideIcon } from 'lucide-react'
import {
  FileText, FileSpreadsheet, FileType, Play,
  Link as LinkIcon, Image as ImageIcon, File,
  Download, ArrowLeft, Pencil, CircleAlert, X,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { resourcesApi } from '../api/resources'
import type { Resource, ResourceType, Role } from '../types'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} Ko`
  return `${bytes} o`
}

function formatDate(iso?: string): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso))
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

const AVAILABLE_ROLES: Role[] = ['admin', 'hr', 'director', 'manager', 'employee']
const RESOURCE_TYPES: ResourceType[] = ['pdf', 'xlsx', 'doc', 'video', 'link', 'image', 'other']

// ─── Loading Skeleton ─────────────────────────────────────────────────────────
function DetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-5 bg-slate-200 rounded w-24" />
      <div className="space-y-3">
        <div className="h-8 bg-slate-200 rounded w-1/2" />
        <div className="h-4 bg-slate-200 rounded w-1/3" />
      </div>
      <div className="bg-white rounded-2xl shadow p-6 space-y-4">
        <div className="h-4 bg-slate-200 rounded w-3/4" />
        <div className="h-4 bg-slate-200 rounded w-full" />
        <div className="h-4 bg-slate-200 rounded w-5/6" />
        <div className="h-4 bg-slate-200 rounded w-2/3" />
        <div className="h-12 bg-slate-200 rounded-xl" />
      </div>
    </div>
  )
}

// ─── Edit Slide-Over ──────────────────────────────────────────────────────────
interface EditResourceSlideOverProps {
  resource: Resource
  open: boolean
  onClose: () => void
}

function EditResourceSlideOver({ resource, open, onClose }: EditResourceSlideOverProps) {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState(resource.title)
  const [description, setDescription] = useState(resource.description ?? '')
  const [type, setType] = useState<ResourceType>(resource.type ?? 'other')
  const [visibleTo, setVisibleTo] = useState<string[]>(resource.visibleTo ?? [])

  const { mutate, isPending } = useMutation({
    mutationFn: (data: Partial<Resource>) =>
      resourcesApi.updateResource(resource.id, data).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources', resource.id] })
      queryClient.invalidateQueries({ queryKey: ['resources'] })
      onClose()
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutate({ title, description, type, visibleTo })
  }

  const toggleRole = (role: string) => {
    setVisibleTo(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    )
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-lg bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
          <h2 className="text-lg font-semibold text-slate-900">Modifier la ressource</h2>
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
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
                rows={4}
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
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
              {isPending ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── ResourceDetailPage ───────────────────────────────────────────────────────
export default function ResourceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const isAdminHr = user?.role === 'admin' || user?.role === 'hr'
  const [showEditSlideOver, setShowEditSlideOver] = useState(false)

  const { data: resource, isLoading, isError } = useQuery({
    queryKey: ['resources', id],
    queryFn: () => resourcesApi.getResource(id!).then(r => r.data),
    enabled: !!id,
    placeholderData: keepPreviousData,
  })

  const { mutate: publishResource, isPending: isPublishing } = useMutation({
    mutationFn: () => resourcesApi.publishResource(id!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['resources', id] }),
  })

  const { mutate: unpublishResource, isPending: isUnpublishing } = useMutation({
    mutationFn: () => resourcesApi.unpublishResource(id!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['resources', id] }),
  })

  if (isLoading) return <DetailSkeleton />

  if (isError || !resource) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/resources')}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </button>
        <div className="flex items-center gap-3 p-4 bg-red-50 text-red-700 rounded-2xl border border-red-200">
          <CircleAlert className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">Ressource introuvable</span>
          <button
            onClick={() => navigate('/resources')}
            className="ml-auto text-sm font-medium underline hover:no-underline"
          >
            Retour à la liste
          </button>
        </div>
      </div>
    )
  }

  const isDraft = resource.status === 'draft' || !resource.isPublished

  // 404 inline: draft resource for non-admin/hr users
  if (isDraft && !isAdminHr) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/resources')}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </button>
        <div className="flex items-center gap-3 p-4 bg-red-50 text-red-700 rounded-2xl border border-red-200">
          <CircleAlert className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">Cette ressource n'est pas disponible (404).</span>
          <button
            onClick={() => navigate('/resources')}
            className="ml-auto text-sm font-medium underline hover:no-underline"
          >
            Retour à la liste
          </button>
        </div>
      </div>
    )
  }

  const config = getTypeConfig(resource.type)
  const IconComponent = config.icon

  const handleDownload = () => {
    const url = resource.fileUrl || `/api/resources/${id}/download`
    window.open(url, '_blank')
  }

  return (
    <>
      <div className="space-y-6">
        {/* Back */}
        <button
          onClick={() => navigate('/resources')}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </button>

        {/* Page header */}
        <div className="flex flex-wrap items-start gap-4 justify-between">
          <div className="flex items-center gap-3 min-w-0 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900">{resource.title}</h1>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
              isDraft ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
            }`}>
              {isDraft ? 'Brouillon' : 'Publié'}
            </span>
          </div>
          {isAdminHr && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setShowEditSlideOver(true)}
                className="flex items-center gap-2 px-3 py-2 border border-slate-300 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                <Pencil className="w-4 h-4" />
                Modifier
              </button>
              {isDraft ? (
                <button
                  onClick={() => publishResource()}
                  disabled={isPublishing}
                  className="flex items-center gap-2 px-3 py-2 bg-primary-500 text-white rounded-xl text-sm font-medium hover:bg-primary-600 transition-colors disabled:opacity-50"
                >
                  {isPublishing ? 'Publication...' : 'Publier'}
                </button>
              ) : (
                <button
                  onClick={() => unpublishResource()}
                  disabled={isUnpublishing}
                  className="flex items-center gap-2 px-3 py-2 border border-slate-300 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  {isUnpublishing ? 'Dépublication...' : 'Dépublier'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${config.bg}`}>
            <IconComponent className={`w-4 h-4 ${config.text}`} />
          </div>
          <span>
            Type : {config.label}
            {resource.fileSize !== undefined && ` · Taille : ${formatFileSize(resource.fileSize)}`}
            {resource.createdAt && ` · Publié le ${formatDate(resource.createdAt)}`}
          </span>
        </div>

        {/* Visible for chips */}
        {(resource.visibleTo?.length ?? 0) > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-500">Visible pour :</span>
            {resource.visibleTo!.map(role => (
              <span
                key={role}
                className="px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-xs font-medium capitalize"
              >
                {role}
              </span>
            ))}
          </div>
        )}

        {/* Detail card */}
        <div className="bg-white rounded-2xl shadow p-6 space-y-5">
          {resource.description && (
            <div>
              <h2 className="text-sm font-semibold text-slate-700 mb-2">Description</h2>
              <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                {resource.description}
              </p>
            </div>
          )}
          {resource.content && (
            <div>
              <h2 className="text-sm font-semibold text-slate-700 mb-2">Contenu</h2>
              <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                {resource.content}
              </p>
            </div>
          )}

          {/* Download button */}
          <button
            onClick={handleDownload}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 active:bg-primary-700 transition-colors"
          >
            <Download className="w-5 h-5" />
            Télécharger le fichier
          </button>
        </div>
      </div>

      {/* Edit slide-over */}
      {showEditSlideOver && (
        <EditResourceSlideOver
          resource={resource}
          open={showEditSlideOver}
          onClose={() => setShowEditSlideOver(false)}
        />
      )}
    </>
  )
}
