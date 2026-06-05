import { useState, useEffect } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  MoreVertical,
  Trash2,
  Eye,
  Pencil,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { eventsApi } from "../api/events";
import { useAuth } from "../contexts/AuthContext";
import type { CalendarEvent, EventType, Role } from "../types";
import {
  CalendarGrid,
  EventTypeChip,
  EVENT_CONFIG,
  evDate,
  sameDay,
} from "./events/CalendarGrid";
import { EventSlideOver, EMPTY_FORM } from "./events/EventSlideOver";
import type { EventFormState } from "./events/EventSlideOver";
import { queryKeys } from "../lib/queryKeys";
import { PageHead, Tile } from "../components/shell";

// ── Constants ──────────────────────────────────────────────────────────────────

const MONTHS_FR = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];
const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  hr: "RH",
  manager: "Responsable",
  employee: "Collaborateur",
};

const menuStyle: React.CSSProperties = {
  position: "absolute",
  right: 0,
  top: 36,
  zIndex: 20,
  background: "#fff",
  borderRadius: "var(--radius)",
  border: "1px solid var(--line)",
  boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
  width: 144,
  padding: "6px 0",
};

const menuItemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "100%",
  padding: "9px 14px",
  fontSize: 14,
  color: "var(--ink)",
  textAlign: "left",
  background: "none",
  border: "none",
  cursor: "pointer",
};

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

// ── ConfirmDialog ──────────────────────────────────────────────────────────────

function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
  isPending,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  return (
    <div className="nx-app">
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15,23,42,0.4)",
          zIndex: 50,
        }}
        onClick={onCancel}
      />
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
          pointerEvents: "none",
        }}
      >
        <Tile
          style={{
            width: "100%",
            maxWidth: 420,
            pointerEvents: "auto",
            boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
          }}
        >
          <div
            className="row"
            style={{ gap: 12, alignItems: "flex-start", marginBottom: 20 }}
          >
            <div
              style={{
                flexShrink: 0,
                width: 40,
                height: 40,
                borderRadius: 999,
                background: "rgba(220,38,38,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Trash2 size={18} style={{ color: "var(--red)" }} />
            </div>
            <div>
              <h3 className="h3">Confirmation</h3>
              <p className="small" style={{ marginTop: 4 }}>
                {message}
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
              style={{
                background: "var(--red)",
                borderColor: "var(--red)",
                gap: 8,
              }}
            >
              {isPending && (
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              )}
              Supprimer
            </button>
          </div>
        </Tile>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function EventsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const canEdit = user?.role === "admin" || user?.role === "hr";

  // View & calendar navigation
  const [view, setView] = useState<"month" | "list">(() =>
    typeof window !== "undefined" && window.innerWidth < 768 ? "list" : "month",
  );
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Filters & UI
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);

  // Form
  const [form, setForm] = useState<EventFormState>(EMPTY_FORM);

  // ── Query ──
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.events.lists(),
    queryFn: () =>
      eventsApi
        .getEvents({ type: typeFilter || undefined, limit: 200 })
        .then((r) => r.data),
    placeholderData: keepPreviousData,
  });

  const allEvents = data?.data ?? [];
  const monthEvents = allEvents.filter((e) => {
    const d = new Date(evDate(e));
    return d.getFullYear() === year && d.getMonth() === month;
  });
  const selectedDayEvents = selectedDay
    ? monthEvents.filter((e) => sameDay(evDate(e), year, month, selectedDay))
    : [];

  // ── Mutations ──
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: (payload: Partial<CalendarEvent>) =>
      eventsApi.createEvent(payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events.lists() });
      setIsSlideOverOpen(false);
      setForm(EMPTY_FORM);
      setFormError(null);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ??
        "Une erreur est survenue lors de la création de l'événement.";
      setFormError(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => eventsApi.deleteEvent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events.lists() });
      setDeleteId(null);
    },
  });

  // ── Month navigation ──
  const prevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
    setSelectedDay(null);
  };
  const nextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
    setSelectedDay(null);
  };

  // ── Form handlers ──
  const handleChange = (f: keyof EventFormState, v: string) =>
    setForm((prev) => ({ ...prev, [f]: v }));

  const handleToggleRole = (r: Role) =>
    setForm((prev) => ({
      ...prev,
      targetRoles: prev.targetRoles.includes(r)
        ? prev.targetRoles.filter((x) => x !== r)
        : [...prev.targetRoles, r],
    }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (
      form.endDate &&
      form.startDate &&
      new Date(form.endDate) <= new Date(form.startDate)
    ) {
      setFormError("La date de fin doit être postérieure à la date de début.");
      return;
    }
    createMutation.mutate({
      title: form.title,
      type: form.type,
      date: form.startDate,
      startDate: form.startDate,
      endDate: form.endDate || undefined,
      description: form.description || undefined,
      location: form.location || undefined,
      campaignId: form.campaignId || undefined,
      targetRoles: form.targetRoles.length > 0 ? form.targetRoles : undefined,
    });
  };

  // Close dropdown on outside click
  useEffect(() => {
    const h = () => setOpenMenuId(null);
    document.addEventListener("click", h);
    return () => document.removeEventListener("click", h);
  }, []);

  const viewTabStyle = (active: boolean): React.CSSProperties => ({
    padding: "8px 14px",
    borderRadius: "var(--radius)",
    border: "none",
    fontSize: 14,
    fontWeight: active ? 700 : 500,
    background: active ? "#fff" : "transparent",
    color: active ? "var(--ink)" : "var(--ink-3)",
    boxShadow: active ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
    cursor: "pointer",
  });

  return (
    <div
      className="nx-app"
      style={{ display: "flex", flexDirection: "column", gap: 24 }}
    >
      {/* ── Header ── */}
      <PageHead
        title="Calendrier"
        actions={
          <>
            <div
              className="row"
              style={{
                gap: 4,
                background: "var(--bg-alt)",
                borderRadius: "var(--radius)",
                padding: 4,
              }}
            >
              {(["month", "list"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  style={viewTabStyle(view === v)}
                >
                  {v === "month" ? "Mois" : "Liste"}
                </button>
              ))}
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              aria-label="Filtrer par type d'événement"
              className="input"
              style={{ width: "auto" }}
            >
              <option value="">Tous les types</option>
              {(Object.keys(EVENT_CONFIG) as EventType[]).map((t) => (
                <option key={t} value={t}>
                  {EVENT_CONFIG[t].label}
                </option>
              ))}
            </select>
            {canEdit && (
              <button
                onClick={() => setIsSlideOverOpen(true)}
                className="btn btn-primary"
              >
                <Plus className="ico" style={{ width: 18, height: 18 }} />
                Nouvel événement
              </button>
            )}
          </>
        }
      />

      {/* ── Calendar (Mois) ── */}
      {view === "month" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Month navigation */}
          <div className="row between" style={{ alignItems: "center" }}>
            <button
              onClick={prevMonth}
              aria-label="Mois précédent"
              className="btn btn-ghost btn-sm"
              style={{ padding: 8 }}
            >
              <ChevronLeft className="ico" style={{ width: 20, height: 20 }} />
            </button>
            <h2 className="h3">
              {MONTHS_FR[month]} {year}
            </h2>
            <button
              onClick={nextMonth}
              aria-label="Mois suivant"
              className="btn btn-ghost btn-sm"
              style={{ padding: 8 }}
            >
              <ChevronRight className="ico" style={{ width: 20, height: 20 }} />
            </button>
          </div>

          {isLoading ? (
            <Tile>
              <div className="grid grid-cols-7 gap-px">
                {Array.from({ length: 35 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-20 rounded-lg animate-pulse"
                    style={{ background: "var(--bg-alt)" }}
                  />
                ))}
              </div>
            </Tile>
          ) : (
            <CalendarGrid
              year={year}
              month={month}
              events={monthEvents}
              selectedDay={selectedDay}
              onDayClick={(d) =>
                setSelectedDay((prev) => (prev === d ? null : d))
              }
            />
          )}

          {/* Selected day panel */}
          {selectedDay !== null && (
            <Tile>
              <h3 className="h3" style={{ marginBottom: 12 }}>
                {selectedDayEvents.length > 0
                  ? `Événements du ${selectedDay} ${MONTHS_FR[month].toLowerCase()}`
                  : `Aucun événement le ${selectedDay} ${MONTHS_FR[month].toLowerCase()}`}
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {selectedDayEvents.map((ev) => (
                  <div
                    key={ev.id}
                    onClick={() => navigate(`/events/${ev.id}`)}
                    className="row"
                    style={{
                      gap: 12,
                      alignItems: "center",
                      padding: 12,
                      borderRadius: "var(--radius)",
                      cursor: "pointer",
                    }}
                  >
                    <EventTypeChip type={ev.type} />
                    <span
                      className="body truncate"
                      style={{ flex: 1, fontWeight: 600 }}
                    >
                      {ev.title}
                    </span>
                    {ev.location && (
                      <span className="small">{ev.location}</span>
                    )}
                  </div>
                ))}
              </div>
            </Tile>
          )}
        </div>
      )}

      {/* ── List view ── */}
      {view === "list" && (
        <Tile style={{ padding: 0, overflow: "hidden" }}>
          {isLoading ? (
            <div className="small" style={{ padding: 40, textAlign: "center" }}>
              Chargement…
            </div>
          ) : allEvents.length === 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "64px 16px",
                gap: 12,
                color: "var(--ink-3)",
              }}
            >
              <Calendar size={48} strokeWidth={1.5} />
              <p className="body">Aucun événement à venir.</p>
            </div>
          ) : (
            <>
              <div
                className="tbl-head"
                style={{
                  gridTemplateColumns: "1.2fr 1fr 2fr 1.4fr 1.4fr 48px",
                }}
              >
                <div>Date</div>
                <div>Type</div>
                <div>Titre</div>
                <div>Lieu</div>
                <div>Rôles ciblés</div>
                <div />
              </div>
              {allEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="tbl-row"
                  style={{
                    gridTemplateColumns: "1.2fr 1fr 2fr 1.4fr 1.4fr 48px",
                  }}
                >
                  <div className="small" style={{ whiteSpace: "nowrap" }}>
                    {formatDateFR(evDate(ev))}
                  </div>
                  <div>
                    <EventTypeChip type={ev.type} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <button
                      onClick={() => navigate(`/events/${ev.id}`)}
                      className="link"
                      style={{
                        fontWeight: 600,
                        background: "none",
                        border: "none",
                        padding: 0,
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      {ev.title}
                    </button>
                  </div>
                  <div className="small truncate">{ev.location ?? "—"}</div>
                  <div>
                    {ev.targetRoles && ev.targetRoles.length > 0 ? (
                      <div className="row wrap" style={{ gap: 4 }}>
                        {ev.targetRoles.map((r) => (
                          <span key={r} className="badge grey">
                            {ROLE_LABELS[r as Role] ?? r}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="small">Tous</span>
                    )}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    {canEdit && (
                      <div
                        style={{ position: "relative" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() =>
                            setOpenMenuId(openMenuId === ev.id ? null : ev.id)
                          }
                          aria-label="Actions événement"
                          className="btn btn-ghost btn-sm"
                          style={{ padding: 6 }}
                        >
                          <MoreVertical
                            className="ico"
                            style={{ width: 16, height: 16 }}
                          />
                        </button>
                        {openMenuId === ev.id && (
                          <div style={menuStyle}>
                            <button
                              onClick={() => {
                                navigate(`/events/${ev.id}`);
                                setOpenMenuId(null);
                              }}
                              style={menuItemStyle}
                            >
                              <Eye size={14} /> Voir
                            </button>
                            <button
                              onClick={() => {
                                navigate(`/events/${ev.id}`);
                                setOpenMenuId(null);
                              }}
                              style={menuItemStyle}
                            >
                              <Pencil size={14} /> Modifier
                            </button>
                            <button
                              onClick={() => {
                                setDeleteId(ev.id);
                                setOpenMenuId(null);
                              }}
                              style={{ ...menuItemStyle, color: "var(--red)" }}
                            >
                              <Trash2 size={14} /> Supprimer
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}
        </Tile>
      )}

      {/* ── Slide-over: Create ── */}
      {isSlideOverOpen && (
        <EventSlideOver
          form={form}
          onChange={handleChange}
          onToggleRole={handleToggleRole}
          onClose={() => {
            setIsSlideOverOpen(false);
            setForm(EMPTY_FORM);
            setFormError(null);
          }}
          onSubmit={handleSubmit}
          isPending={createMutation.isPending}
          error={formError}
        />
      )}

      {/* ── Confirm: Delete ── */}
      {deleteId !== null && (
        <ConfirmDialog
          message="Êtes-vous sûr de vouloir supprimer cet événement ?"
          onConfirm={() => deleteMutation.mutate(deleteId)}
          onCancel={() => setDeleteId(null)}
          isPending={deleteMutation.isPending}
        />
      )}
    </div>
  );
}
