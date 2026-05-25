import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell } from 'lucide-react'
import { notificationsApi } from '@/api/notifications'
import { queryKeys } from '@/lib/queryKeys'
import type { Notification } from '@/types'

function formatRelativeTime(date: string): string {
  const diff = Date.now() - new Date(date).getTime()
  if (diff < 60_000) return "à l'instant"
  if (diff < 3_600_000) return `il y a ${Math.floor(diff / 60_000)} min`
  if (diff < 86_400_000) return `il y a ${Math.floor(diff / 3_600_000)} h`
  return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const qc = useQueryClient()
  const navigate = useNavigate()

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const { data: countData } = useQuery({
    queryKey: queryKeys.notifications.count(),
    queryFn: () => notificationsApi.getNotificationCount().then(r => r.data),
    refetchInterval: 60_000,
  })

  const { data: listData } = useQuery({
    queryKey: queryKeys.notifications.preview(),
    queryFn: () => notificationsApi.getNotifications({ limit: 10, page: 1 }).then(r => r.data),
    enabled: open,
  })

  const markRead = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: queryKeys.notifications.preview() })
      const previous = qc.getQueryData<{ data: Notification[]; total: number; totalPages: number; page: number }>(queryKeys.notifications.preview())
      qc.setQueryData<{ data: Notification[]; total: number; totalPages: number; page: number }>(
        queryKeys.notifications.preview(),
        (old) => old ? { ...old, data: old.data.map(n => n.id === id ? { ...n, read: true } : n) } : old
      )
      const previousCount = qc.getQueryData<{ unreadCount: number }>(queryKeys.notifications.count())
      if (previousCount) {
        qc.setQueryData<{ unreadCount: number }>(queryKeys.notifications.count(), { unreadCount: Math.max(0, previousCount.unreadCount - 1) })
      }
      return { previous, previousCount }
    },
    onError: (_err, _id, context) => {
      if (context?.previous) qc.setQueryData(queryKeys.notifications.preview(), context.previous)
      if (context?.previousCount) qc.setQueryData(queryKeys.notifications.count(), context.previousCount)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notifications.count() })
      qc.invalidateQueries({ queryKey: queryKeys.notifications.preview() })
    },
  })

  const markAll = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notifications.count() })
      qc.invalidateQueries({ queryKey: queryKeys.notifications.preview() })
    },
  })

  const unread = countData?.unreadCount ?? 0
  const notifications: Notification[] = listData?.data ?? []

  function handleNotifClick(n: Notification) {
    if (!n.read) markRead.mutate(n.id ?? (n as any)._id)
    setOpen(false)
    const link = n.link ?? (n as any).link
    if (link) navigate(link)
  }

  return (
    <div ref={ref} className="relative">
      <button
        aria-label={`Notifications${unread > 0 ? ` (${unread} non lues)` : ''}`}
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
            {unread > 99 ? '99+' : unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800 text-sm">Notifications</h3>
            <div className="flex items-center gap-3">
              {unread > 0 && (
                <button
                  onClick={() => markAll.mutate()}
                  className="text-xs text-primary-600 hover:underline disabled:opacity-50"
                  disabled={markAll.isPending}
                >
                  Tout marquer lu
                </button>
              )}
              <button
                onClick={() => { setOpen(false); navigate('/notifications') }}
                className="text-xs text-slate-500 hover:text-slate-700"
              >
                Voir tout
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100" aria-live="polite">
            {notifications.length === 0 ? (
              <p className="p-5 text-sm text-slate-600 text-center">Aucune notification</p>
            ) : (
              notifications.map((n) => {
                const id = (n as any)._id ?? n.id
                return (
                  <div
                    key={id}
                    onClick={() => handleNotifClick(n)}
                    className={`px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors ${!n.read ? 'bg-primary-50/60' : ''}`}
                  >
                    <div className="flex items-start gap-2">
                      {!n.read && (
                        <span className="mt-1.5 w-2 h-2 rounded-full bg-primary-500 flex-shrink-0" />
                      )}
                      <div className={!n.read ? '' : 'ml-4'}>
                        <p className="text-sm font-medium text-slate-800 leading-snug">{n.title}</p>
                        {n.body && (
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.body}</p>
                        )}
                        <p className="text-[11px] text-slate-500 mt-1">{formatRelativeTime(n.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
