import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { notificationsApi } from "@/api/notifications";
import { queryKeys } from "@/lib/queryKeys";
import type { Notification } from "@/types";

function formatRelativeTime(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  if (diff < 60_000) return "à l'instant";
  if (diff < 3_600_000) return `il y a ${Math.floor(diff / 60_000)} min`;
  if (diff < 86_400_000) return `il y a ${Math.floor(diff / 3_600_000)} h`;
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
  });
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();
  const navigate = useNavigate();

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const { data: countData } = useQuery({
    queryKey: queryKeys.notifications.count(),
    queryFn: () => notificationsApi.getNotificationCount().then((r) => r.data.data),
    refetchInterval: 60_000,
  });

  const { data: listData } = useQuery({
    queryKey: queryKeys.notifications.preview(),
    queryFn: () =>
      notificationsApi
        .getNotifications({ limit: 10, page: 1 })
        .then((r) => r.data),
    enabled: open,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: queryKeys.notifications.preview() });
      const previous = qc.getQueryData<{
        data: Notification[];
        total: number;
        totalPages: number;
        page: number;
      }>(queryKeys.notifications.preview());
      qc.setQueryData<{
        data: Notification[];
        total: number;
        totalPages: number;
        page: number;
      }>(queryKeys.notifications.preview(), (old) =>
        old
          ? {
              ...old,
              data: old.data.map((n) =>
                n.id === id ? { ...n, read: true } : n,
              ),
            }
          : old,
      );
      const previousCount = qc.getQueryData<{ unreadCount: number }>(
        queryKeys.notifications.count(),
      );
      if (previousCount) {
        qc.setQueryData<{ unreadCount: number }>(
          queryKeys.notifications.count(),
          { unreadCount: Math.max(0, previousCount.unreadCount - 1) },
        );
      }
      return { previous, previousCount };
    },
    onError: (_err, _id, context) => {
      if (context?.previous)
        qc.setQueryData(queryKeys.notifications.preview(), context.previous);
      if (context?.previousCount)
        qc.setQueryData(queryKeys.notifications.count(), context.previousCount);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notifications.count() });
      qc.invalidateQueries({ queryKey: queryKeys.notifications.preview() });
    },
  });

  const markAll = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notifications.count() });
      qc.invalidateQueries({ queryKey: queryKeys.notifications.preview() });
    },
  });

  const unread = countData?.unreadCount ?? 0;
  const notifications: Notification[] = listData?.data ?? [];

  function handleNotifClick(n: Notification) {
    if (!n.read)
      markRead.mutate(n.id ?? (n as { _id?: string; link?: string })._id);
    setOpen(false);
    const link = n.link ?? (n as { _id?: string; link?: string }).link;
    if (link) navigate(link);
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        aria-label={`Notifications${unread > 0 ? ` (${unread} non lues)` : ""}`}
        onClick={() => setOpen((o) => !o)}
        className="icon-btn"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="icon-badge" aria-hidden="true">
            {unread > 99 ? "99+" : unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="menu-pop" style={{ right: 0, width: 320 }} role="menu">
          {/* Header */}
          <div className="menu-head row between">
            <span>Notifications</span>
            <span className="row nxgap-12">
              {unread > 0 && (
                <button
                  onClick={() => markAll.mutate()}
                  className="link small"
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                  }}
                  disabled={markAll.isPending}
                >
                  Tout marquer lu
                </button>
              )}
              <button
                onClick={() => {
                  setOpen(false);
                  navigate("/notifications");
                }}
                className="small"
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Voir tout
              </button>
            </span>
          </div>

          {/* List */}
          <div className="notif-list" aria-live="polite">
            {notifications.length === 0 ? (
              <p
                className="small"
                style={{ padding: "20px", textAlign: "center" }}
              >
                Aucune notification
              </p>
            ) : (
              notifications.map((n) => {
                const id = (n as { _id?: string; link?: string })._id ?? n.id;
                return (
                  <div
                    key={id}
                    onClick={() => handleNotifClick(n)}
                    className={`notif-row${!n.read ? " unread" : ""}`}
                  >
                    {!n.read && (
                      <span className="notif-dot" aria-hidden="true" />
                    )}
                    <div className="notif-body">
                      <p className="notif-title">{n.title}</p>
                      {n.body && <p className="small notif-text">{n.body}</p>}
                      <p className="small">{formatRelativeTime(n.createdAt)}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
