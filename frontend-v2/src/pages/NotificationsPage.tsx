import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
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
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Notification } from "../types";
import { notificationsApi } from "../api/notifications";
import EmptyState from "../components/ui/EmptyState";
import { queryKeys } from "../lib/queryKeys";
import { PageHead, Tile } from "../components/shell";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeTime(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  if (diff < 60_000) return "à l'instant";
  if (diff < 3_600_000) return `il y a ${Math.floor(diff / 60_000)} min`;
  if (diff < 86_400_000) return `il y a ${Math.floor(diff / 3_600_000)} h`;
  if (diff < 172_800_000) return "hier";
  if (diff < 604_800_000)
    return `il y a ${Math.floor(diff / 86_400_000)} jours`;
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

type GroupedNotifications = {
  today: Notification[];
  thisWeek: Notification[];
  earlier: Notification[];
};

function groupNotifications(
  notifications: Notification[],
): GroupedNotifications {
  const now = Date.now();
  const today: Notification[] = [];
  const thisWeek: Notification[] = [];
  const earlier: Notification[] = [];

  for (const n of notifications) {
    const diff = now - new Date(n.createdAt).getTime();
    if (diff < 86_400_000) today.push(n);
    else if (diff < 604_800_000) thisWeek.push(n);
    else earlier.push(n);
  }
  return { today, thisWeek, earlier };
}

// ─── Icon map ─────────────────────────────────────────────────────────────────

type IconConfig = { Icon: LucideIcon; bg: string; color: string };

function getIconConfig(type: string): IconConfig {
  switch (type) {
    case "eval_assigned":
      return {
        Icon: ClipboardList,
        bg: "rgba(184,0,11,0.08)",
        color: "var(--red)",
      };
    case "eval_submitted":
      return { Icon: Send, bg: "rgba(37,99,235,0.10)", color: "var(--blue)" };
    case "eval_reviewed":
      return {
        Icon: CheckCircle,
        bg: "rgba(22,163,74,0.10)",
        color: "var(--green)",
      };
    case "eval_signed_evaluatee":
    case "eval_signed_manager":
    case "eval_signed_hr":
      return { Icon: PenLine, bg: "rgba(124,58,237,0.10)", color: "#7c3aed" };
    case "eval_reminder_deadline":
      return { Icon: Clock, bg: "rgba(217,119,6,0.10)", color: "var(--amber)" };
    case "eval_validated":
      return {
        Icon: BadgeCheck,
        bg: "rgba(22,163,74,0.10)",
        color: "var(--green)",
      };
    case "campaign_closed":
      return { Icon: FolderClosed, bg: "var(--bg-alt)", color: "var(--ink-3)" };
    case "request_submitted":
      return {
        Icon: FileText,
        bg: "rgba(37,99,235,0.10)",
        color: "var(--blue)",
      };
    case "request_treated":
      return {
        Icon: CheckCircle,
        bg: "rgba(22,163,74,0.10)",
        color: "var(--green)",
      };
    case "request_rejected":
      return { Icon: XCircle, bg: "rgba(184,0,11,0.08)", color: "var(--red)" };
    case "system":
      return { Icon: Settings, bg: "var(--bg-alt)", color: "var(--ink-3)" };
    default:
      return { Icon: Bell, bg: "var(--bg-alt)", color: "var(--ink-3)" };
  }
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function NotificationSkeleton() {
  return (
    <div
      className="row animate-pulse"
      style={{
        gap: 12,
        padding: 16,
        borderTop: "1px solid var(--line)",
        alignItems: "flex-start",
      }}
    >
      <div
        style={{
          width: 8,
          height: 8,
          marginTop: 8,
          borderRadius: 999,
          background: "var(--line)",
        }}
      />
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: "var(--line)",
        }}
      />
      <div style={{ flex: 1 }}>
        <div
          style={{
            height: 12,
            borderRadius: 4,
            background: "var(--line)",
            width: "60%",
          }}
        />
        <div
          style={{
            height: 12,
            borderRadius: 4,
            background: "var(--line)",
            marginTop: 8,
          }}
        />
        <div
          style={{
            height: 10,
            borderRadius: 4,
            background: "var(--line)",
            width: "25%",
            marginTop: 8,
          }}
        />
      </div>
    </div>
  );
}

// ─── Notification Row ─────────────────────────────────────────────────────────

interface NotificationRowProps {
  notification: Notification;
  onMarkRead: (id: string) => void;
  first: boolean;
}

function NotificationRow({
  notification,
  onMarkRead,
  first,
}: NotificationRowProps) {
  const navigate = useNavigate();
  const { Icon, bg, color } = getIconConfig(notification.type);

  const handleClick = () => {
    if (!notification.read) onMarkRead(notification.id);
    if (notification.link) navigate(notification.link);
  };

  return (
    <div
      onClick={handleClick}
      className="row"
      style={{
        gap: 12,
        padding: 16,
        alignItems: "flex-start",
        cursor: "pointer",
        borderTop: first ? "none" : "1px solid var(--line)",
        background: notification.read ? undefined : "var(--bg-alt)",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 8,
          height: 8,
          marginTop: 8,
          borderRadius: 999,
          flexShrink: 0,
          background: notification.read ? "transparent" : "var(--red)",
        }}
      />
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: bg,
          color,
        }}
      >
        <Icon style={{ width: 20, height: 20 }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p className="body truncate" style={{ fontWeight: 600 }}>
          {notification.title}
        </p>
        <p className="small" style={{ color: "var(--ink-3)" }}>
          {notification.body}
        </p>
        <p className="small" style={{ marginTop: 4 }}>
          {formatRelativeTime(notification.createdAt)}
        </p>
      </div>
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

interface SectionProps {
  title: string;
  notifications: Notification[];
  onMarkRead: (id: string) => void;
}

function Section({ title, notifications, onMarkRead }: SectionProps) {
  if (notifications.length === 0) return null;
  return (
    <>
      <div
        className="eyebrow"
        style={{
          padding: "12px 16px",
          borderTop: "1px solid var(--line)",
          background: "var(--bg-alt)",
        }}
      >
        {title}
      </div>
      {notifications.map((n, i) => (
        <NotificationRow
          key={n.id}
          notification={n}
          onMarkRead={onMarkRead}
          first={i === 0}
        />
      ))}
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [allNotifications, setAllNotifications] = useState<Notification[]>([]);

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: queryKeys.notifications.list({ page }),
    queryFn: () =>
      notificationsApi
        .getNotifications({ page, limit: 20 })
        .then((r) => r.data),
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    if (!data?.data) return;
    if (page === 1) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- accumulation paginée des notifications dans un état local dérivé de la query
      setAllNotifications(data.data);
    } else {
      setAllNotifications((prev) => {
        const existingIds = new Set(prev.map((n) => n.id));
        const newItems = data.data.filter((n) => !existingIds.has(n.id));
        if (newItems.length === 0) return prev;
        return [...prev, ...newItems];
      });
    }
  }, [data, page]);

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onMutate: (id) => {
      setAllNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      setPage(1);
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.lists(),
      });
      // Rafraîchir aussi le compteur (badge de la cloche), sinon il reste périmé.
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.count(),
      });
    },
  });

  const unreadCount = allNotifications.filter((n) => !n.read).length;
  const { today, thisWeek, earlier } = groupNotifications(allNotifications);
  const hasMore = data != null && (data.totalPages ?? 0) > (data.page ?? 0);
  const isInitialLoading = isLoading && allNotifications.length === 0;
  const isEmpty = !isLoading && !isError && allNotifications.length === 0;

  return (
    <div className="nx-app">
      <PageHead
        title="Notifications"
        actions={
          unreadCount > 0 ? (
            <button
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              className="btn btn-ghost btn-sm"
            >
              {markAllReadMutation.isPending
                ? "En cours…"
                : "Tout marquer comme lu"}
            </button>
          ) : undefined
        }
      />

      {/* Error state */}
      {isError && (
        <Tile style={{ textAlign: "center", padding: 48 }}>
          <p className="body" style={{ color: "var(--ink-3)" }}>
            Une erreur est survenue lors du chargement.
          </p>
          <button
            onClick={() => refetch()}
            className="btn btn-primary"
            style={{ marginTop: 16 }}
          >
            Réessayer
          </button>
        </Tile>
      )}

      {/* Loading skeletons */}
      {isInitialLoading && !isError && (
        <Tile style={{ padding: 0, overflow: "hidden" }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <NotificationSkeleton key={i} />
          ))}
        </Tile>
      )}

      {/* Empty state */}
      {isEmpty && (
        <Tile>
          <EmptyState
            icon={<BellOff className="w-8 h-8" />}
            title="Vous êtes à jour 🎉"
            description="Aucune notification pour le moment."
          />
        </Tile>
      )}

      {/* Notifications list */}
      {!isInitialLoading && !isEmpty && !isError && (
        <>
          <Tile style={{ padding: 0, overflow: "hidden" }}>
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
          </Tile>

          {/* Load more */}
          {hasMore && (
            <div
              className="row"
              style={{ justifyContent: "center", marginTop: 24 }}
            >
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={isFetching}
                className="btn btn-ghost"
              >
                {isFetching ? "Chargement…" : "Charger plus"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
