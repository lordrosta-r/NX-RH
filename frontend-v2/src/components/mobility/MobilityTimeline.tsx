// Timeline verticale montrant l'évolution d'une demande de mobilité

interface TimelineEvent {
  label: string;
  date?: string;
  comment?: string;
  completed: boolean;
  active?: boolean;
}

interface MobilityTimelineProps {
  createdAt: string;
  status: "pending" | "under_review" | "approved" | "rejected" | "on_hold";
  reviewedAt?: string;
  hrComment?: string;
  implementationStatus?: "pending" | "in_progress" | "completed";
  implementationCompletedAt?: string;
}

function fmt(date?: string) {
  if (!date) return undefined;
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function MobilityTimeline({
  createdAt,
  status,
  reviewedAt,
  hrComment,
  implementationStatus,
  implementationCompletedAt,
}: MobilityTimelineProps) {
  const isApproved = status === "approved";
  const isRejected = status === "rejected";
  const isDecided = isApproved || isRejected;

  const events: TimelineEvent[] = [
    {
      label: "Demande créée",
      date: fmt(createdAt),
      completed: true,
    },
    {
      label: "En cours d'examen",
      date: status !== "pending" ? fmt(reviewedAt) : undefined,
      completed: ["under_review", "approved", "rejected", "on_hold"].includes(
        status,
      ),
      active: status === "under_review" || status === "on_hold",
    },
    {
      label: isRejected ? "Refusée" : "Approuvée",
      date: isDecided ? fmt(reviewedAt) : undefined,
      comment: isDecided ? hrComment : undefined,
      completed: isDecided,
      active: false,
    },
    {
      label: "Implémentation en cours",
      completed:
        implementationStatus === "in_progress" ||
        implementationStatus === "completed",
      active: implementationStatus === "in_progress",
    },
    {
      label: "Terminée",
      date: fmt(implementationCompletedAt),
      completed: implementationStatus === "completed",
    },
  ];

  // Only show reachable events
  const visible = isRejected ? events.slice(0, 3) : events;

  return (
    <ol className="relative border-l border-gray-200 ml-3 space-y-6 py-1">
      {visible.map((ev, i) => (
        <li key={i} className="ml-6">
          <span
            className={`absolute -left-3 flex items-center justify-center w-6 h-6 rounded-full ring-4 ring-white
              ${
                ev.completed
                  ? isRejected && i === visible.length - 1
                    ? "bg-red-100 text-red-600"
                    : "bg-green-100 text-green-600"
                  : ev.active
                    ? "bg-blue-100 text-blue-600"
                    : "bg-gray-100 text-gray-400"
              }`}
          >
            {ev.completed
              ? isRejected && i === visible.length - 1
                ? "✕"
                : "✓"
              : ev.active
                ? "●"
                : "○"}
          </span>
          <div className="min-h-[24px]">
            <p
              className={`text-sm font-medium leading-none ${ev.completed ? "text-gray-800" : "text-gray-400"}`}
            >
              {ev.label}
            </p>
            {ev.date && (
              <time className="block text-xs text-gray-500 mt-0.5">
                {ev.date}
              </time>
            )}
            {ev.comment && (
              <p className="mt-1 text-xs text-gray-600 italic">
                « {ev.comment} »
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
