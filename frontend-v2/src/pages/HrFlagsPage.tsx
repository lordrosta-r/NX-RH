import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Inbox, MoreVertical, X } from "lucide-react";
import { adminApi } from "../api/admin";
import type {
  HrFlag,
  HrFlagStatus,
  HrFlagType,
  PaginatedResponse,
} from "../types";
import { queryKeys } from "../lib/queryKeys";
import { PageHead, Tile, Badge } from "../components/shell";
import PageGuide from "../components/shared/PageGuide";

type Tone = "blue" | "green" | "amber" | "red" | "grey";

const TYPE_LABELS: Record<HrFlagType, string> = {
  mobility_request: "Mobilité",
  salary_raise_request: "Augmentation",
  promotion_request: "Promotion",
  training_request: "Formation",
  other: "Autre",
};
const TYPE_TONES: Record<HrFlagType, Tone> = {
  mobility_request: "blue",
  salary_raise_request: "green",
  promotion_request: "blue",
  training_request: "amber",
  other: "grey",
};
const STATUS_LABELS: Record<HrFlagStatus, string> = {
  pending: "En attente",
  in_progress: "En cours",
  treated: "Traité",
  rejected: "Rejeté",
};
const STATUS_TONES: Record<HrFlagStatus, Tone> = {
  pending: "amber",
  in_progress: "blue",
  treated: "green",
  rejected: "red",
};

const COLS = "1.6fr 1.2fr 1fr 1.2fr 48px";

function SkeletonRow() {
  return (
    <div className="tbl-row" style={{ gridTemplateColumns: COLS }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i}>
          <div
            style={{
              height: 16,
              background: "var(--bg-alt)",
              borderRadius: "var(--radius)",
            }}
          />
        </div>
      ))}
    </div>
  );
}

export default function HrFlagsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [selectedFlag, setSelectedFlag] = useState<HrFlag | null>(null);
  const [note, setNote] = useState("");
  const [newStatus, setNewStatus] = useState<HrFlagStatus | "">("");

  const { data, isLoading } = useQuery<PaginatedResponse<HrFlag>>({
    queryKey: queryKeys.hrFlags.lists(),
    queryFn: () =>
      adminApi
        .getFlags({
          status: statusFilter || undefined,
          type: typeFilter || undefined,
        })
        .then((r) => r.data as PaginatedResponse<HrFlag>),
  });

  const updateStatusMut = useMutation({
    mutationFn: ({
      id,
      status,
      note,
    }: {
      id: string;
      status: string;
      note?: string;
    }) => adminApi.updateFlagStatus(id, status, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hrFlags.lists() });
      setSelectedFlag(null);
    },
  });

  const flags = data?.data ?? [];
  const isEmpty = !isLoading && flags.length === 0;

  return (
    <div className="nx-app">
      <PageHead title="Demandes RH" />

      <PageGuide
        id="hrFlags"
        title={t("guides.hrFlags.title")}
        color="amber"
        steps={t("guides.hrFlags.steps", { returnObjects: true }) as string[]}
      />

      {/* Filtres */}
      <Tile className="row wrap" style={{ gap: 12, marginBottom: 20 }}>
        <select
          className="input"
          aria-label="Filtrer par statut"
          style={{ maxWidth: 220 }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select
          className="input"
          aria-label="Filtrer par type"
          style={{ maxWidth: 220 }}
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">Tous les types</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </Tile>

      <Tile style={{ padding: 0, overflow: "hidden" }}>
        {isLoading ? (
          <>
            <div className="tbl-head" style={{ gridTemplateColumns: COLS }}>
              <div>Collaborateur</div>
              <div>Type</div>
              <div>Date</div>
              <div>Statut</div>
              <div />
            </div>
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </>
        ) : isEmpty ? (
          <div style={{ padding: 80, textAlign: "center" }}>
            <Inbox
              className="ico"
              style={{
                width: 40,
                height: 40,
                margin: "0 auto 8px",
                color: "var(--line-strong)",
              }}
            />
            <p className="body">Aucun signal RH</p>
          </div>
        ) : (
          <>
            <div className="tbl-head" style={{ gridTemplateColumns: COLS }}>
              <div>Collaborateur</div>
              <div>Type</div>
              <div>Date</div>
              <div>Statut</div>
              <div />
            </div>
            {flags.map((flag) => (
              <div
                key={flag.id}
                className="tbl-row"
                style={{ gridTemplateColumns: COLS }}
              >
                <div style={{ minWidth: 0, fontWeight: 600 }}>
                  {flag.userName ?? flag.userId}
                </div>
                <div>
                  <Badge tone={TYPE_TONES[flag.type]}>
                    {TYPE_LABELS[flag.type]}
                  </Badge>
                </div>
                <div className="small">
                  {new Date(flag.createdAt).toLocaleDateString("fr-FR")}
                </div>
                <div>
                  <Badge tone={STATUS_TONES[flag.status]} dot>
                    {STATUS_LABELS[flag.status]}
                  </Badge>
                </div>
                <div style={{ textAlign: "right" }}>
                  <button
                    onClick={() => {
                      setSelectedFlag(flag);
                      setNote(flag.note ?? "");
                      setNewStatus(flag.status);
                    }}
                    aria-label="Détail du signal"
                    className="btn btn-ghost btn-sm"
                    style={{ padding: 6 }}
                  >
                    <MoreVertical
                      className="ico"
                      style={{ width: 16, height: 16 }}
                    />
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </Tile>

      {/* Slide-over détail */}
      {selectedFlag && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.3)",
            }}
            onClick={() => setSelectedFlag(null)}
          />
          <div
            style={{
              position: "relative",
              width: "100%",
              maxWidth: 420,
              background: "#fff",
              boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              className="row between"
              style={{ padding: 24, borderBottom: "1px solid var(--line)" }}
            >
              <h2 className="h3">Détail du signal</h2>
              <button
                onClick={() => setSelectedFlag(null)}
                aria-label="Fermer le détail"
                className="btn btn-ghost btn-sm"
                style={{ padding: 6 }}
              >
                <X className="ico" style={{ width: 18, height: 18 }} />
              </button>
            </div>
            <div
              style={{
                padding: 24,
                flex: 1,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              <div>
                <p className="eyebrow" style={{ marginBottom: 4 }}>
                  Collaborateur
                </p>
                <p className="body" style={{ fontWeight: 600 }}>
                  {selectedFlag.userName ?? selectedFlag.userId}
                </p>
              </div>
              <div>
                <p className="eyebrow" style={{ marginBottom: 4 }}>
                  Type
                </p>
                <Badge tone={TYPE_TONES[selectedFlag.type]}>
                  {TYPE_LABELS[selectedFlag.type]}
                </Badge>
              </div>
              {selectedFlag.description && (
                <div>
                  <p className="eyebrow" style={{ marginBottom: 4 }}>
                    Description
                  </p>
                  <p className="body">{selectedFlag.description}</p>
                </div>
              )}
              <div className="field">
                <label className="eyebrow" htmlFor="hr-flag-note">
                  Note RH
                </label>
                <textarea
                  id="hr-flag-note"
                  className="input"
                  aria-label="Note RH"
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ajouter une note..."
                  style={{ resize: "none", marginTop: 4 }}
                />
              </div>
              <div className="field">
                <label className="eyebrow" htmlFor="hr-flag-status">
                  Changer le statut
                </label>
                <select
                  id="hr-flag-status"
                  className="input"
                  aria-label="Changer le statut"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as HrFlagStatus)}
                  style={{ marginTop: 4 }}
                >
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div
              className="row"
              style={{
                padding: 24,
                borderTop: "1px solid var(--line)",
                gap: 12,
              }}
            >
              <button
                onClick={() => setSelectedFlag(null)}
                className="btn btn-ghost"
                style={{ flex: 1 }}
              >
                Fermer
              </button>
              <button
                onClick={() =>
                  updateStatusMut.mutate({
                    id: selectedFlag.id,
                    status: newStatus || selectedFlag.status,
                    note,
                  })
                }
                disabled={updateStatusMut.isPending}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                {updateStatusMut.isPending ? "Sauvegarde…" : "Sauvegarder"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
