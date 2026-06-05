import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  User,
  Clock,
  FileText,
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { hrApi } from "../api/hr";
import type { HrFlag, HrFlagStatus, HrFlagType } from "../types";
import { queryKeys } from "../lib/queryKeys";
import { PageHead, Tile, Badge } from "../components/shell";

const TYPE_LABELS: Record<HrFlagType, string> = {
  mobility_request: "Mobilité",
  salary_raise_request: "Augmentation salariale",
  promotion_request: "Promotion",
  training_request: "Formation",
  other: "Autre",
};
type Tone = "blue" | "green" | "amber" | "red" | "grey";
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
const STATUS_ICONS: Record<HrFlagStatus, React.ReactNode> = {
  pending: <AlertCircle className="w-4 h-4" />,
  in_progress: <RefreshCw className="w-4 h-4" />,
  treated: <CheckCircle className="w-4 h-4" />,
  rejected: <XCircle className="w-4 h-4" />,
};

const NEXT_STATUSES: Record<HrFlagStatus, HrFlagStatus[]> = {
  pending: ["in_progress", "rejected"],
  in_progress: ["treated", "rejected"],
  treated: [],
  rejected: [],
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function HrFlagDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [note, setNote] = useState("");
  const [targetStatus, setTargetStatus] = useState<HrFlagStatus | "">("");

  const {
    data: flag,
    isLoading,
    isError,
  } = useQuery<HrFlag>({
    queryKey: queryKeys.hrFlags.detail(id ?? ""),
    queryFn: () => hrApi.getFlag(id!).then((r) => r.data),
    enabled: !!id,
  });

  const updateMut = useMutation({
    mutationFn: ({ status, note }: { status: string; note?: string }) =>
      hrApi.updateFlagStatus(id!, status, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hrFlags.detail(id ?? "") });
      qc.invalidateQueries({ queryKey: queryKeys.hrFlags.lists() });
      setNote("");
      setTargetStatus("");
    },
  });

  if (isLoading) {
    return (
      <div className="nx-app">
        <div className="row" style={{ justifyContent: "center", padding: 96 }}>
          <div className="w-8 h-8 border-4 border-[#1b1b78] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (isError || !flag) {
    return (
      <div className="nx-app">
        <Tile style={{ textAlign: "center", padding: 48 }}>
          <AlertCircle
            className="w-12 h-12 mx-auto mb-3"
            style={{ color: "var(--ink-3)" }}
          />
          <p className="body">Signal introuvable.</p>
          <Link
            to="/hr/flags"
            className="link"
            style={{ marginTop: 8, display: "inline-block" }}
          >
            Retour à la liste
          </Link>
        </Tile>
      </div>
    );
  }

  const nextStatuses = NEXT_STATUSES[flag.status];
  const canUpdate = nextStatuses.length > 0;

  return (
    <div className="nx-app">
      <PageHead
        eyebrow={
          <span className="row" style={{ gap: 8, alignItems: "center" }}>
            <button
              onClick={() => navigate(-1)}
              className="btn btn-ghost btn-sm"
              aria-label="Retour"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            Signal RH
          </span>
        }
        title={`#${id?.slice(-6).toUpperCase()}`}
        actions={
          <div className="row wrap" style={{ gap: 8 }}>
            <Badge tone={TYPE_TONES[flag.type]}>{TYPE_LABELS[flag.type]}</Badge>
            <Badge tone={STATUS_TONES[flag.status]} dot>
              <span className="row" style={{ gap: 6, alignItems: "center" }}>
                {STATUS_ICONS[flag.status]}
                {STATUS_LABELS[flag.status]}
              </span>
            </Badge>
          </div>
        }
      />

      {/* Détail de l'alerte */}
      <Tile style={{ marginBottom: 24 }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="row" style={{ gap: 8, alignItems: "flex-start" }}>
            <User
              className="w-4 h-4 mt-0.5 shrink-0"
              style={{ color: "var(--ink-3)" }}
            />
            <div>
              <p className="eyebrow" style={{ marginBottom: 2 }}>
                Collaborateur
              </p>
              <p className="body">{flag.userName ?? flag.userId}</p>
            </div>
          </div>
          <div className="row" style={{ gap: 8, alignItems: "flex-start" }}>
            <Clock
              className="w-4 h-4 mt-0.5 shrink-0"
              style={{ color: "var(--ink-3)" }}
            />
            <div>
              <p className="eyebrow" style={{ marginBottom: 2 }}>
                Créé le
              </p>
              <p className="body">{formatDate(flag.createdAt)}</p>
            </div>
          </div>
          {flag.updatedAt && (
            <div className="row" style={{ gap: 8, alignItems: "flex-start" }}>
              <RefreshCw
                className="w-4 h-4 mt-0.5 shrink-0"
                style={{ color: "var(--ink-3)" }}
              />
              <div>
                <p className="eyebrow" style={{ marginBottom: 2 }}>
                  Mis à jour
                </p>
                <p className="body">{formatDate(flag.updatedAt)}</p>
              </div>
            </div>
          )}
        </div>

        {flag.description && (
          <div
            style={{
              borderTop: "1px solid var(--line)",
              paddingTop: 16,
              marginTop: 16,
            }}
          >
            <div className="row" style={{ gap: 8, alignItems: "flex-start" }}>
              <FileText
                className="w-4 h-4 mt-0.5 shrink-0"
                style={{ color: "var(--ink-3)" }}
              />
              <div>
                <p className="eyebrow" style={{ marginBottom: 2 }}>
                  Description
                </p>
                <p className="body whitespace-pre-wrap">{flag.description}</p>
              </div>
            </div>
          </div>
        )}

        {flag.note && (
          <div
            style={{
              borderTop: "1px solid var(--line)",
              paddingTop: 16,
              marginTop: 16,
            }}
          >
            <div className="row" style={{ gap: 8, alignItems: "flex-start" }}>
              <FileText
                className="w-4 h-4 mt-0.5 shrink-0"
                style={{ color: "var(--ink-3)" }}
              />
              <div>
                <p className="eyebrow" style={{ marginBottom: 2 }}>
                  Note RH
                </p>
                <p className="body whitespace-pre-wrap">{flag.note}</p>
              </div>
            </div>
          </div>
        )}
      </Tile>

      {/* Résolution */}
      {canUpdate && (
        <Tile>
          <h2 className="h3" style={{ marginBottom: 16 }}>
            Mettre à jour le statut
          </h2>
          <div className="row wrap" style={{ gap: 8, marginBottom: 16 }}>
            {nextStatuses.map((s) => (
              <button
                key={s}
                onClick={() => setTargetStatus(s)}
                className={
                  targetStatus === s
                    ? "btn btn-primary btn-sm"
                    : "btn btn-ghost btn-sm"
                }
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
          {targetStatus && (
            <>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Note (optionnel)…"
                rows={3}
                aria-label="Note RH"
                className="input"
                style={{ width: "100%", resize: "none", marginBottom: 16 }}
              />
              <div className="row" style={{ gap: 8 }}>
                <button
                  onClick={() => {
                    setTargetStatus("");
                    setNote("");
                  }}
                  className="btn btn-ghost"
                >
                  Annuler
                </button>
                <button
                  onClick={() =>
                    updateMut.mutate({
                      status: targetStatus,
                      note: note || undefined,
                    })
                  }
                  disabled={updateMut.isPending}
                  className="btn btn-primary"
                >
                  {updateMut.isPending
                    ? "Enregistrement…"
                    : `Passer à "${STATUS_LABELS[targetStatus]}"`}
                </button>
              </div>
            </>
          )}
        </Tile>
      )}

      {!canUpdate && (
        <Tile style={{ textAlign: "center" }}>
          <p className="body">
            Ce signal est{" "}
            <strong>{STATUS_LABELS[flag.status].toLowerCase()}</strong> — aucune
            action supplémentaire possible.
          </p>
        </Tile>
      )}
    </div>
  );
}
