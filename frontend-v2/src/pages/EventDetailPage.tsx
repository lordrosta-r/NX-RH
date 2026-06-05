import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  Star,
  BarChart2,
  ClipboardList,
  LogOut,
  MessageSquare,
  MapPin,
  Link2,
  Pencil,
  Trash2,
  X,
  AlertTriangle,
} from "lucide-react";
import { eventsApi } from "../api/events";
import { useAuth } from "../contexts/AuthContext";
import type { CalendarEvent, EventType, Role } from "../types";
import { queryKeys } from "../lib/queryKeys";
import { PageHead, Tile, Badge, Callout } from "../components/shell";

// ── Constants ──────────────────────────────────────────────────────────────────

const ALL_ROLES: Role[] = ["admin", "hr", "manager", "employee"];
const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  hr: "RH",
  manager: "Responsable",
  employee: "Collaborateur",
};

type BadgeTone = "blue" | "green" | "amber" | "red" | "grey";

interface EventConfigItem {
  tone: BadgeTone;
  Icon: LucideIcon;
  label: string;
}

const EVENT_CONFIG: Record<EventType, EventConfigItem> = {
  deadline: { tone: "red", Icon: Clock, label: "Deadline" },
  interview: { tone: "blue", Icon: MessageSquare, label: "Entretien" },
  meeting: { tone: "blue", Icon: Users, label: "Réunion" },
  feedback: { tone: "green", Icon: Star, label: "Feedback" },
  campaign: { tone: "amber", Icon: BarChart2, label: "Campagne" },
  evaluation: { tone: "blue", Icon: ClipboardList, label: "Évaluation" },
  offboarding: { tone: "grey", Icon: LogOut, label: "Offboarding" },
  other: { tone: "grey", Icon: Calendar, label: "Autre" },
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDateFR(s: string | undefined): string {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatTimeFR(s: string | undefined): string {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

/** Backend returns `date`, frontend uses `startDate` — normalise */
const evDate = (e: { startDate?: string; date?: string }): string =>
  e.startDate ?? e.date ?? "";

function toDatetimeLocal(s: string): string {
  try {
    const d = new Date(s);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return s;
  }
}

// ── EventTypeChip ──────────────────────────────────────────────────────────────

function EventTypeChip({ type }: { type: EventType }) {
  const c = EVENT_CONFIG[type];
  return (
    <Badge tone={c.tone}>
      <c.Icon size={14} />
      {c.label}
    </Badge>
  );
}

// ── Form types ─────────────────────────────────────────────────────────────────

interface EventFormState {
  title: string;
  type: EventType;
  startDate: string;
  endDate: string;
  description: string;
  location: string;
  campaignId: string;
  targetRoles: Role[];
}

// ── EditSlideOver ──────────────────────────────────────────────────────────────

function EditSlideOver({
  form,
  onChange,
  onToggleRole,
  onClose,
  onSubmit,
  isPending,
}: {
  form: EventFormState;
  onChange: (f: keyof EventFormState, v: string) => void;
  onToggleRole: (r: Role) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
}) {
  return (
    <>
      <div
        className="fixed inset-0 z-40"
        style={{ background: "rgba(15,23,42,0.4)" }}
        onClick={onClose}
      />
      <div
        className="fixed inset-y-0 right-0 z-50 w-full flex flex-col"
        style={{
          maxWidth: 520,
          background: "#fff",
          boxShadow: "-8px 0 32px rgba(0,0,0,.12)",
        }}
      >
        {/* Header */}
        <div
          className="row between"
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <h2 className="h3">Modifier l'événement</h2>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>
        {/* Form */}
        <form
          onSubmit={onSubmit}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <div
            className="flex-1 overflow-y-auto"
            style={{
              padding: "20px 24px",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div className="field">
              <label htmlFor="ev-title">
                Titre <span style={{ color: "var(--red)" }}>*</span>
              </label>
              <input
                id="ev-title"
                type="text"
                required
                value={form.title}
                onChange={(e) => onChange("title", e.target.value)}
                className="input"
                aria-label="Titre de l'événement"
              />
            </div>
            <div className="field">
              <label htmlFor="ev-type">
                Type <span style={{ color: "var(--red)" }}>*</span>
              </label>
              <select
                id="ev-type"
                required
                value={form.type}
                onChange={(e) => onChange("type", e.target.value)}
                className="input"
                aria-label="Type d'événement"
              >
                {(Object.keys(EVENT_CONFIG) as EventType[]).map((t) => (
                  <option key={t} value={t}>
                    {EVENT_CONFIG[t].label}
                  </option>
                ))}
              </select>
            </div>
            <div
              className="grid grid-cols-1 sm:grid-cols-2"
              style={{ gap: 12 }}
            >
              <div className="field">
                <label htmlFor="ev-start">
                  Date début <span style={{ color: "var(--red)" }}>*</span>
                </label>
                <input
                  id="ev-start"
                  type="datetime-local"
                  required
                  value={form.startDate}
                  onChange={(e) => onChange("startDate", e.target.value)}
                  className="input"
                  aria-label="Date de début"
                />
              </div>
              <div className="field">
                <label htmlFor="ev-end">Date fin</label>
                <input
                  id="ev-end"
                  type="datetime-local"
                  value={form.endDate}
                  onChange={(e) => onChange("endDate", e.target.value)}
                  className="input"
                  aria-label="Date de fin"
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="ev-desc">Description</label>
              <textarea
                id="ev-desc"
                rows={3}
                value={form.description}
                onChange={(e) => onChange("description", e.target.value)}
                placeholder="Description de l'événement..."
                className="input"
                aria-label="Description"
              />
            </div>
            <div className="field">
              <label htmlFor="ev-location">Lieu</label>
              <input
                id="ev-location"
                type="text"
                value={form.location}
                onChange={(e) => onChange("location", e.target.value)}
                placeholder="Salle, ville, lien visio..."
                className="input"
                aria-label="Lieu"
              />
            </div>
            <div className="field">
              <label htmlFor="ev-campaign">ID Campagne liée</label>
              <input
                id="ev-campaign"
                type="text"
                value={form.campaignId}
                onChange={(e) => onChange("campaignId", e.target.value)}
                placeholder="Optionnel"
                className="input"
                aria-label="ID de campagne liée"
              />
            </div>
            <div className="field">
              <label>Rôles ciblés</label>
              <div className="row wrap" style={{ gap: 12 }}>
                {ALL_ROLES.map((r) => (
                  <label
                    key={r}
                    className="row"
                    style={{ gap: 8, cursor: "pointer" }}
                  >
                    <input
                      type="checkbox"
                      checked={form.targetRoles.includes(r)}
                      onChange={() => onToggleRole(r)}
                      aria-label={`Rôle ${ROLE_LABELS[r]}`}
                    />
                    <span className="small">{ROLE_LABELS[r]}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          {/* Footer */}
          <div
            className="row"
            style={{
              justifyContent: "flex-end",
              gap: 12,
              padding: "16px 24px",
              borderTop: "1px solid var(--line)",
            }}
          >
            <button type="button" onClick={onClose} className="btn btn-ghost">
              Annuler
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="btn btn-primary"
            >
              {isPending && (
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              )}
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

// ── ConfirmDialog ──────────────────────────────────────────────────────────────

function ConfirmDialog({
  onConfirm,
  onCancel,
  isPending,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  return (
    <>
      <div
        className="fixed inset-0 z-50"
        style={{ background: "rgba(15,23,42,0.4)" }}
        onClick={onCancel}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <Tile
          className="pointer-events-auto animate-scaleIn"
          style={{ width: "100%", maxWidth: 420 }}
        >
          <div
            className="row"
            style={{ alignItems: "flex-start", gap: 12, marginBottom: 20 }}
          >
            <div
              className="flex-shrink-0 flex items-center justify-center"
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "var(--red-soft, #fee2e2)",
              }}
            >
              <AlertTriangle size={18} style={{ color: "var(--red)" }} />
            </div>
            <div>
              <h3 className="h3">Supprimer l'événement</h3>
              <p className="small" style={{ marginTop: 4 }}>
                Êtes-vous sûr de vouloir supprimer cet événement ? Cette action
                est irréversible.
              </p>
            </div>
          </div>
          <div className="row" style={{ justifyContent: "flex-end", gap: 12 }}>
            <button onClick={onCancel} className="btn btn-ghost">
              Annuler
            </button>
            <button
              onClick={onConfirm}
              disabled={isPending}
              className="btn btn-primary"
              style={{ background: "var(--red)" }}
            >
              {isPending && (
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              )}
              Supprimer
            </button>
          </div>
        </Tile>
      </div>
    </>
  );
}

// ── Page skeleton ──────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="nx-app">
      <div className="row" style={{ justifyContent: "center", padding: 96 }}>
        <div className="w-8 h-8 border-4 border-[#1b1b78] border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const canEdit = user?.role === "admin" || user?.role === "hr";

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editForm, setEditForm] = useState<EventFormState | null>(null);

  // ── Query ──
  const {
    data: event,
    isLoading,
    isError,
  } = useQuery({
    queryKey: queryKeys.events.detail(id ?? ""),
    queryFn: () => eventsApi.getEvent(id!).then((r) => r.data),
    enabled: !!id,
  });

  // Pre-fill edit form when event loads
  useEffect(() => {
    if (event) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- pré-remplit le formulaire d'édition à l'arrivée des données
      setEditForm({
        title: event.title,
        type: event.type,
        startDate: toDatetimeLocal(evDate(event)),
        endDate: event.endDate ? toDatetimeLocal(event.endDate) : "",
        description: event.description ?? "",
        location: event.location ?? "",
        campaignId: event.campaignId ?? "",
        targetRoles: (event.targetRoles ?? []) as Role[],
      });
    }
  }, [event]);

  // ── Mutations ──
  const updateMutation = useMutation({
    mutationFn: (data: Partial<CalendarEvent>) =>
      eventsApi.updateEvent(id!, data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events.lists() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.detail(id ?? ""),
      });
      setIsEditOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => eventsApi.deleteEvent(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events.lists() });
      navigate("/events");
    },
  });

  // ── Edit form handlers ──
  const handleChange = (f: keyof EventFormState, v: string) =>
    setEditForm((prev) => (prev ? { ...prev, [f]: v } : prev));

  const handleToggleRole = (r: Role) =>
    setEditForm((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        targetRoles: prev.targetRoles.includes(r)
          ? prev.targetRoles.filter((x) => x !== r)
          : [...prev.targetRoles, r],
      };
    });

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm) return;
    updateMutation.mutate({
      title: editForm.title,
      type: editForm.type,
      startDate: editForm.startDate,
      endDate: editForm.endDate || undefined,
      description: editForm.description || undefined,
      location: editForm.location || undefined,
      campaignId: editForm.campaignId || undefined,
      targetRoles:
        editForm.targetRoles.length > 0 ? editForm.targetRoles : undefined,
    });
  };

  // ── Render states ──
  if (isLoading) return <PageSkeleton />;

  if (isError || !event) {
    return (
      <div className="nx-app">
        <button
          onClick={() => navigate("/events")}
          className="btn btn-ghost btn-sm"
          style={{ marginBottom: 16 }}
        >
          <ArrowLeft size={16} /> Retour
        </button>
        <Callout tone="red">
          <div className="row" style={{ gap: 12, alignItems: "center" }}>
            <AlertTriangle size={20} />
            <p className="body" style={{ fontWeight: 600 }}>
              Événement introuvable ou erreur de chargement.
            </p>
          </div>
        </Callout>
      </div>
    );
  }

  const cfg = EVENT_CONFIG[event.type];
  const hasTime = (s: string) => {
    const d = new Date(s);
    return d.getHours() !== 0 || d.getMinutes() !== 0;
  };

  const dateDisplay = (() => {
    const start = formatDateFR(evDate(event));
    const startTime = hasTime(evDate(event))
      ? formatTimeFR(evDate(event))
      : null;
    if (!event.endDate) return startTime ? `${start} — ${startTime}` : start;
    const end = formatDateFR(event.endDate);
    const endTime = hasTime(event.endDate) ? formatTimeFR(event.endDate) : null;
    if (start === end) {
      return startTime && endTime
        ? `${start} — ${startTime} → ${endTime}`
        : start;
    }
    return `${start} → ${end}`;
  })();

  return (
    <div className="nx-app">
      {/* ── Back ── */}
      <button
        onClick={() => navigate("/events")}
        className="btn btn-ghost btn-sm"
        style={{ marginBottom: 12 }}
      >
        <ArrowLeft size={16} />
        Retour au calendrier
      </button>

      {/* ── Header ── */}
      <PageHead
        title={
          <span className="row wrap" style={{ gap: 12, alignItems: "center" }}>
            {event.title}
            <EventTypeChip type={event.type} />
          </span>
        }
        actions={
          canEdit ? (
            <>
              <button
                onClick={() => setIsEditOpen(true)}
                className="btn btn-ghost btn-sm"
              >
                <Pencil size={14} /> Modifier
              </button>
              <button
                onClick={() => setIsDeleteOpen(true)}
                className="btn btn-ghost btn-sm"
                style={{ color: "var(--red)" }}
              >
                <Trash2 size={14} /> Supprimer
              </button>
            </>
          ) : undefined
        }
      />

      {/* ── Detail card ── */}
      <Tile>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Date */}
          <div className="row" style={{ alignItems: "flex-start", gap: 12 }}>
            <div
              className="flex-shrink-0 flex items-center justify-center"
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "var(--bg-alt)",
              }}
            >
              <cfg.Icon size={16} style={{ color: "var(--ink-2)" }} />
            </div>
            <div>
              <p className="eyebrow">Date</p>
              <p className="body" style={{ fontWeight: 600 }}>
                {dateDisplay}
              </p>
            </div>
          </div>

          {/* Location */}
          {event.location && (
            <div className="row" style={{ alignItems: "flex-start", gap: 12 }}>
              <div
                className="flex-shrink-0 flex items-center justify-center"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "var(--bg-alt)",
                }}
              >
                <MapPin size={16} style={{ color: "var(--ink-3)" }} />
              </div>
              <div>
                <p className="eyebrow">Lieu</p>
                <p className="body" style={{ fontWeight: 600 }}>
                  {event.location}
                </p>
              </div>
            </div>
          )}

          {/* Target roles */}
          {event.targetRoles && event.targetRoles.length > 0 && (
            <div className="row" style={{ alignItems: "flex-start", gap: 12 }}>
              <div
                className="flex-shrink-0 flex items-center justify-center"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "var(--bg-alt)",
                }}
              >
                <Users size={16} style={{ color: "var(--ink-3)" }} />
              </div>
              <div>
                <p className="eyebrow" style={{ marginBottom: 6 }}>
                  Rôles ciblés
                </p>
                <div className="row wrap" style={{ gap: 6 }}>
                  {event.targetRoles.map((r) => (
                    <Badge key={r} tone="grey">
                      {ROLE_LABELS[r as Role] ?? r}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Campaign link */}
          {event.campaignId && (
            <div className="row" style={{ alignItems: "flex-start", gap: 12 }}>
              <div
                className="flex-shrink-0 flex items-center justify-center"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "var(--amber-soft, #fef3c7)",
                }}
              >
                <Link2 size={16} style={{ color: "var(--amber)" }} />
              </div>
              <div>
                <p className="eyebrow">Campagne liée</p>
                <Link to={`/campaigns/${event.campaignId}`} className="link">
                  EA {event.campaignId} →
                </Link>
              </div>
            </div>
          )}

          {/* Divider + description */}
          {event.description && (
            <>
              <hr
                style={{ border: "none", borderTop: "1px solid var(--line)" }}
              />
              <div>
                <p className="eyebrow" style={{ marginBottom: 8 }}>
                  Description
                </p>
                <p className="body" style={{ whiteSpace: "pre-wrap" }}>
                  {event.description}
                </p>
              </div>
            </>
          )}
        </div>
      </Tile>

      {/* ── Edit slide-over ── */}
      {isEditOpen && editForm && (
        <EditSlideOver
          form={editForm}
          onChange={handleChange}
          onToggleRole={handleToggleRole}
          onClose={() => setIsEditOpen(false)}
          onSubmit={handleEditSubmit}
          isPending={updateMutation.isPending}
        />
      )}

      {/* ── Delete confirm ── */}
      {isDeleteOpen && (
        <ConfirmDialog
          onConfirm={() => deleteMutation.mutate()}
          onCancel={() => setIsDeleteOpen(false)}
          isPending={deleteMutation.isPending}
        />
      )}
    </div>
  );
}
