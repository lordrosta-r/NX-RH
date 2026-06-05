/* eslint-disable react-refresh/only-export-components -- fichier exporte aussi EMPTY_FORM (constante partagée), préexistant */
import { X, AlertTriangle } from "lucide-react";
import type { EventType, Role } from "../../types";
import { EVENT_CONFIG } from "./CalendarGrid";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface EventFormState {
  title: string;
  type: EventType;
  startDate: string;
  endDate: string;
  description: string;
  location: string;
  campaignId: string;
  targetRoles: Role[];
}

export const EMPTY_FORM: EventFormState = {
  title: "",
  type: "meeting",
  startDate: "",
  endDate: "",
  description: "",
  location: "",
  campaignId: "",
  targetRoles: [],
};

const ALL_ROLES: Role[] = ["admin", "hr", "manager", "employee"];
const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  hr: "RH",
  manager: "Responsable",
  employee: "Collaborateur",
};

// ── EventSlideOver ────────────────────────────────────────────────────────────

export interface EventSlideOverProps {
  heading?: string;
  submitLabel?: string;
  form: EventFormState;
  onChange: (f: keyof EventFormState, v: string) => void;
  onToggleRole: (r: Role) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
  error?: string | null;
}

export function EventSlideOver({
  heading = "Nouvel événement",
  submitLabel = "Créer l'événement",
  form,
  onChange,
  onToggleRole,
  onClose,
  onSubmit,
  isPending,
  error,
}: EventSlideOverProps) {
  return (
    <>
      <div
        className="fixed inset-0 z-40 animate-fadeIn"
        style={{ background: "rgba(22, 22, 29, 0.4)" }}
        onClick={onClose}
      />
      <div
        className="fixed inset-y-0 right-0 z-50 w-full max-w-lg flex flex-col"
        style={{ background: "#fff", boxShadow: "var(--shadow-lg)" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: "1px solid var(--line)" }}
        >
          <h2 className="h3">{heading}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="icon-btn"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        {/* Form */}
        <form
          onSubmit={onSubmit}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
            {/* Titre */}
            <div className="field">
              <label htmlFor="event-title">
                Titre <span style={{ color: "var(--red)" }}>*</span>
              </label>
              <input
                id="event-title"
                className="input"
                type="text"
                required
                value={form.title}
                onChange={(e) => onChange("title", e.target.value)}
                placeholder="Titre de l'événement"
              />
            </div>
            {/* Type */}
            <div className="field">
              <label htmlFor="event-type">
                Type <span style={{ color: "var(--red)" }}>*</span>
              </label>
              <select
                id="event-type"
                className="input"
                required
                value={form.type}
                onChange={(e) => onChange("type", e.target.value)}
              >
                {(Object.keys(EVENT_CONFIG) as EventType[]).map((t) => (
                  <option key={t} value={t}>
                    {EVENT_CONFIG[t].label}
                  </option>
                ))}
              </select>
            </div>
            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div className="field">
                <label htmlFor="event-start">
                  Date début <span style={{ color: "var(--red)" }}>*</span>
                </label>
                <input
                  id="event-start"
                  className="input"
                  type="datetime-local"
                  required
                  value={form.startDate}
                  onChange={(e) => onChange("startDate", e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="event-end">Date fin</label>
                <input
                  id="event-end"
                  className="input"
                  type="datetime-local"
                  value={form.endDate}
                  onChange={(e) => onChange("endDate", e.target.value)}
                />
              </div>
            </div>
            {/* Description */}
            <div className="field">
              <label htmlFor="event-description">Description</label>
              <textarea
                id="event-description"
                className="input"
                rows={3}
                value={form.description}
                onChange={(e) => onChange("description", e.target.value)}
                placeholder="Description de l'événement..."
              />
            </div>
            {/* Lieu */}
            <div className="field">
              <label htmlFor="event-location">Lieu</label>
              <input
                id="event-location"
                className="input"
                type="text"
                value={form.location}
                onChange={(e) => onChange("location", e.target.value)}
                placeholder="Salle, ville, lien visio..."
              />
            </div>
            {/* Campaign ID */}
            <div className="field">
              <label htmlFor="event-campaign">ID Campagne liée</label>
              <input
                id="event-campaign"
                className="input"
                type="text"
                value={form.campaignId}
                onChange={(e) => onChange("campaignId", e.target.value)}
                placeholder="Optionnel"
              />
            </div>
            {/* Rôles */}
            <div className="field">
              <label htmlFor="event-roles-group">Rôles ciblés</label>
              <div id="event-roles-group" className="flex flex-wrap gap-3">
                {ALL_ROLES.map((r) => (
                  <label
                    key={r}
                    className="flex items-center gap-2 cursor-pointer small"
                    style={{ color: "var(--ink-2)" }}
                  >
                    <input
                      type="checkbox"
                      checked={form.targetRoles.includes(r)}
                      onChange={() => onToggleRole(r)}
                      style={{
                        width: 16,
                        height: 16,
                        accentColor: "var(--blue)",
                      }}
                    />
                    <span>{ROLE_LABELS[r]}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          {/* Footer */}
          <div
            className="flex flex-col gap-2 px-6 py-4"
            style={{ borderTop: "1px solid var(--line)" }}
          >
            {error && (
              <div
                className="callout red flex items-center gap-2 field-error"
                role="alert"
              >
                <AlertTriangle
                  size={16}
                  aria-hidden="true"
                  style={{ flexShrink: 0 }}
                />
                <span>{error}</span>
              </div>
            )}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-ghost btn-sm"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="btn btn-primary btn-sm"
              >
                {isPending && (
                  <span
                    className="animate-spin"
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      border: "2px solid rgba(255,255,255,0.4)",
                      borderTopColor: "#fff",
                    }}
                  />
                )}
                {submitLabel}
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
