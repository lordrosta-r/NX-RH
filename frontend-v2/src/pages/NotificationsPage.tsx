import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import {
  Bell,
  BellOff,
  ClipboardList,
  Send,
  CheckCircle,
  PenLine,
  Clock,
  BadgeCheck,
  FolderClosed,
  FileText,
  XCircle,
  Settings,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Notification } from '../types'
import { notificationsApi } from '../api/notifications'
import EmptyState from '../components/ui/EmptyState'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeTime(date: string): string {
  const diff = Date.now() - new Date(date).getTime()
  if (diff < 60_000) return "à l'instant"
  if (diff < 3_600_000) return `il y a ${Math.floor(diff / 60_000)} min`
  if (diff < 86_400_000) return `il y a ${Math.floor(diff / 3_600_000)} h`
  if (diff < 172_800_000) return 'hier'
  if (diff < 604_800_000) return `il y a ${Math.floor(diff / 86_400_000)} jours`
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

type GroupedNotifications = {
  today: Notification[]
  thisWeek: Notification[]
  earlier: Notification[]
}

function groupNotifications(notifications: Notification[]): GroupedNotifications {
  const now = Date.now()
  const today: Notification[] = []
  const thisWeek: Notification[] = []
  const earlier: Notification[] = []

  for (const n of notifications) {
    const diff = now - new Date(n.createdAt).getTime()
    if (diff < 86_400_000) today.push(n)
    else if (diff < 604_800_000) thisWeek.push(n)
    else earlier.push(n)
  }
  return { today, thisWeek, earlier }
}

// ─── Icon map ─────────────────────────────────────────────────────────────────

type IconConfig = { Icon: LucideIcon; bg: string }

function getIconConfig(type: string): IconConfig {
  switch (type) {
    case 'eval_assigned':
      return { Icon: ClipboardList, bg: 'bg-primary-100 text-primary-600' }
    case 'eval_submitted':
      return { Icon: Send, bg: 'bg-blue-100 text-blue-600' }
    case 'eval_reviewed':
      return { Icon: CheckCircle, bg: 'bg-green-100 text-green-600' }
    case 'eval_signed_evaluatee':
    case 'eval_signed_manager':
    case 'eval_signed_hr':
      return { Icon: PenLine, bg: 'bg-purple-100 text-purple-600' }
    case 'eval_reminder_deadline':
      return { Icon: Clock, bg: 'bg-amber-100 text-amber-600' }
    case 'eval_validated':
      return { Icon: BadgeCheck, bg: 'bg-green-100 text-green-600' }
    case 'campaign_closed':
      return { Icon: FolderClosed, bg: 'bg-slate-100 text-slate-600' }
    case 'request_submitted':
      return { Icon: FileText, bg: 'bg-blue-100 text-blue-600' }
    case 'request_treated':
      return { Icon: CheckCircle, bg: 'bg-green-100 text-green-600' }
    case 'request_rejected':
      return { Icon: XCircle, bg: 'bg-red-100 text-red-600' }
    case 'system':
      return { Icon: Settings, bg: 'bg-slate-100 text-slate-600' }
    default:
      return { Icon: Bell, bg: 'bg-slate-100 text-slate-500' }
  }
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function NotificationSkeleton() {
  return (
    <div className="flex gap-3 p-4 border-b border-slate-100 animate-pulse">
      <div className="w-2 h-2 mt-5 rounded-full bg-slate-200 shrink-0" />
      <div className="w-10 h-10 rounded-xl bg-slate-200 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-slate-200 rounded w-3/4" />
        <div className="h-3 bg-slate-200 rounded" />
        <div className="h-2 bg-slate-200 rounded w-1/4" />
      </div>
    </div>
  )
}

// ─── Notification Card ────────────────────────────────────────────────────────

interface NotificationCardProps {
  notification: Notification
  onMarkRead: (id: string) => void
}

function NotificationCard({ notification, onMarkRead }: NotificationCardProps) {
  const navigate = useNavigate()
  const { Icon, bg } = getIconConfig(notification.type)

  const handleClick = () => {
    if (!notification.read) onMarkRead(notification.id)
    if (notification.link) navigate(notification.link)
  }

  return (
    <div
      onClick={handleClick}
      className="flex gap-3 p-4 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors border-b border-slate-100"
    >
      <div className="self-center shrink-0">
        <div
          className={`w-2 h-2 rounded-full ${notification.read ? 'invisible' : 'bg-primary-500'}`}
        />
      </div>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900 truncate">{notification.title}</p>
        <p className="text-sm text-slate-500 line-clamp-2">{notification.body}</p>
        <p className="text-xs text-slate-500 mt-1">{formatRelativeTime(notification.createdAt)}</p>
      </div>
    </div>
  )
}

// ─── Section ──────────────────────────────────────────────────────────────────

interface SectionProps {
  title: string
  notifications: Notification[]
  onMarkRead: (id: string) => void
}

function Section({ title, notifications, onMarkRead }: SectionProps) {
  if (notifications.length === 0) return null
  return (
    <div className="mb-4">
      <div className="flex items-center gap-3 my-3">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          {title}
        </span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>
      {notifications.map((n) => (
        <NotificationCard key={n.id} notification={n} onMarkRead={onMarkRead} />
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [allNotifications, setAllNotifications] = useState<Notification[]>([])

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ['notifications', page],
    queryFn: () =>
      notificationsApi.getNotifications({ page, limit: 20 }).then((r) => r.data),
    placeholderData: keepPreviousData,
  })

  useEffect(() => {
    if (!data?.data) return
    if (page === 1) {
      setAllNotifications(data.data)
    } else {
      setAllNotifications((prev) => {
        const existingIds = new Set(prev.map((n) => n.id))
        const newItems = data.data.filter((n) => !existingIds.has(n.id))
        if (newItems.length === 0) return prev
        return [...prev, ...newItems]
      })
    }
  }, [data, page])

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onMutate: (id) => {
      setAllNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      )
    },
  })

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      setPage(1)
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const unreadCount = allNotifications.filter((n) => !n.read).length
  const { today, thisWeek, earlier } = groupNotifications(allNotifications)
  const hasMore = data != null && (data.totalPages ?? 0) > (data.page ?? 0)
  const isInitialLoading = isLoading && allNotifications.length === 0
  const isEmpty = !isLoading && !isError && allNotifications.length === 0

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium disabled:opacity-50 transition-colors"
          >
            {markAllReadMutation.isPending ? 'En cours…' : 'Tout marquer comme lu'}
          </button>
        )}
      </div>

      {/* Error state */}
      {isError && (
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <p className="text-slate-500">Une erreur est survenue lors du chargement.</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* Loading skeletons */}
      {isInitialLoading && !isError && (
        <div>
          {Array.from({ length: 5 }).map((_, i) => (
            <NotificationSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {isEmpty && (
        <EmptyState
          icon={<BellOff className="w-8 h-8" />}
          title="Vous êtes à jour 🎉"
          description="Aucune notification pour le moment."
        />
      )}

      {/* Notifications list */}
      {!isInitialLoading && !isEmpty && !isError && (
        <>
          <Section
            title="Aujourd'hui"
            notifications={today}
            onMarkRead={(id) => markReadMutation.mutate(id)}
          />
          <Section
            title="Cette semaine"
            notifications={thisWeek}
            onMarkRead={(id) => markReadMutation.mutate(id)}
          />
          <Section
            title="Plus tôt"
            notifications={earlier}
            onMarkRead={(id) => markReadMutation.mutate(id)}
          />

          {/* Load more */}
          {hasMore && (
            <div className="flex justify-center mt-6">
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={isFetching}
                className="px-6 py-2.5 border border-slate-300 text-sm font-medium text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                {isFetching ? 'Chargement…' : 'Charger plus'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
