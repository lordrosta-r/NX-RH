import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ClipboardList,
  Calendar,
  BookOpen,
  ArrowRight,
  User,
  Clipboard,
  Folder,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import client from "../api/client";
import { eventsApi } from "../api/events";
import { resourcesApi } from "../api/resources";
import type { Evaluation, EvaluationStatus } from "../types";
import { getCampaignName } from "../types";
import { PageHead, Tile, Badge } from "../components/shell";

// ─── Statut → libellé + tonalité institutionnelle ────────────────────────────
const evalStatusLabels: Record<EvaluationStatus, string> = {
  assigned: "Assignée",
  in_progress: "En cours",
  submitted: "Soumise",
  reviewed: "Revue",
  disputed: "En litige",
  signed_evaluatee: "Signée (évalué)",
  signed_manager: "Signée (manager)",
  signed_hr: "Signée (RH)",
  validated: "Validée",
  expired: "Expirée",
  archived: "Archivée",
};

type Tone = "blue" | "green" | "amber" | "red" | "grey";
const evalStatusTone: Record<EvaluationStatus, Tone> = {
  assigned: "amber",
  in_progress: "blue",
  submitted: "blue",
  reviewed: "blue",
  disputed: "red",
  signed_evaluatee: "blue",
  signed_manager: "blue",
  signed_hr: "blue",
  validated: "green",
  expired: "grey",
  archived: "grey",
};

function EvalStatusBadge({ status }: { status: EvaluationStatus }) {
  return (
    <Badge tone={evalStatusTone[status] ?? "grey"} dot>
      {evalStatusLabels[status] ?? status}
    </Badge>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DashboardEmployeePage() {
  const { user } = useAuth();

  const evaluations = useQuery({
    queryKey: ["dashboard-employee", "evaluations"],
    queryFn: () =>
      client
        .get<{
          data: Evaluation[];
          total: number;
        }>("/api/evaluations?evaluateeId=me&status=in_progress,assigned")
        .then((r) => r.data),
  });

  const history = useQuery({
    queryKey: ["dashboard-employee", "history"],
    queryFn: () =>
      client
        .get<{
          data: Evaluation[];
          total: number;
        }>("/api/evaluations?evaluateeId=me&status=validated&limit=5")
        .then((r) => r.data),
  });

  const { data: eventsData } = useQuery({
    queryKey: ["dashboard-employee-events"],
    queryFn: () => eventsApi.getEvents({ limit: 3 }),
  });
  const upcomingEvents = eventsData?.data?.data ?? [];

  const { data: resourcesData } = useQuery({
    queryKey: ["dashboard-employee-resources"],
    queryFn: () => resourcesApi.getResources({ limit: 3, publishedOnly: true }),
  });
  const recentResources = resourcesData?.data?.data ?? [];

  return (
    <div className="nx-app">
      <PageHead
        eyebrow="Espace collaborateur"
        title={`Bonjour ${user?.firstName ?? ""}`}
        desc={
          user?.position ?? "Voici l’état de vos entretiens professionnels."
        }
        actions={
          user?.department ? (
            <Badge tone="grey">{user.department}</Badge>
          ) : undefined
        }
      />

      {/* Mes évaluations en cours */}
      <Tile className="mb-6" style={{ padding: 0, overflow: "hidden" }}>
        <div
          className="row between"
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <h2 className="h2">Mes évaluations en cours</h2>
          <Link to="/evaluations" className="link small">
            Tout voir →
          </Link>
        </div>
        <div style={{ padding: "8px 24px 20px" }}>
          {evaluations.isLoading ? (
            <div className="section-gap" style={{ gap: 12, paddingTop: 12 }}>
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-20 bg-slate-100 rounded-lg animate-pulse"
                />
              ))}
            </div>
          ) : (evaluations.data?.data?.length ?? 0) === 0 ? (
            <div className="text-center" style={{ padding: "28px 0" }}>
              <ClipboardList
                className="w-10 h-10 mx-auto mb-3"
                style={{ color: "var(--line-strong)" }}
              />
              <p className="small">Aucune évaluation en cours</p>
            </div>
          ) : (
            <div className="section-gap" style={{ gap: 12, paddingTop: 12 }}>
              {evaluations.data?.data?.map((evaluation) => (
                <div
                  key={evaluation.id}
                  className="row between wrap"
                  style={{
                    gap: 12,
                    border: "1px solid var(--line)",
                    borderRadius: "var(--radius)",
                    padding: "14px 16px",
                  }}
                >
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 15 }}>
                      Campagne : {getCampaignName(evaluation.campaignId)}
                    </p>
                    <div style={{ marginTop: 6 }}>
                      <EvalStatusBadge status={evaluation.status} />
                    </div>
                  </div>
                  <Link
                    to={`/evaluations/${evaluation.id}`}
                    className="btn btn-primary btn-sm"
                  >
                    {evaluation.status === "assigned"
                      ? "Commencer"
                      : "Continuer"}
                    <ArrowRight
                      className="ico"
                      style={{ width: 15, height: 15 }}
                    />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </Tile>

      {/* Événements + ressources */}
      <div className="grid grid-cols-12 gap-6 mb-6">
        <div className="col-span-12 lg:col-span-6">
          <Tile style={{ height: "100%" }}>
            <div className="row between" style={{ marginBottom: 12 }}>
              <h3 className="h3">Prochains événements</h3>
              <Link to="/events" className="link small">
                Voir tout →
              </Link>
            </div>
            {upcomingEvents.length === 0 ? (
              <p className="small text-center" style={{ padding: "16px 0" }}>
                Aucun événement à venir.
              </p>
            ) : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {upcomingEvents.map((ev) => (
                  <li
                    key={ev.id}
                    className="row"
                    style={{ gap: 12, padding: "8px 0" }}
                  >
                    <Calendar
                      size={14}
                      style={{ color: "var(--blue)", flex: "none" }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{ fontSize: 14, fontWeight: 600 }}
                        className="truncate"
                      >
                        {ev.title}
                      </p>
                      {(ev.startDate ?? ev.date) && (
                        <p className="small">
                          {new Date(
                            ev.startDate ?? ev.date!,
                          ).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                          })}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Tile>
        </div>

        <div className="col-span-12 lg:col-span-6">
          <Tile style={{ height: "100%" }}>
            <div className="row between" style={{ marginBottom: 12 }}>
              <h3 className="h3">Ressources récentes</h3>
              <Link to="/resources" className="link small">
                Voir tout →
              </Link>
            </div>
            {recentResources.length === 0 ? (
              <p className="small text-center" style={{ padding: "16px 0" }}>
                Aucune ressource disponible.
              </p>
            ) : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {recentResources.map((r) => (
                  <li
                    key={r.id}
                    className="row"
                    style={{ gap: 12, padding: "8px 0" }}
                  >
                    <BookOpen
                      size={14}
                      style={{ color: "var(--ink-3)", flex: "none" }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{ fontSize: 14, fontWeight: 600 }}
                        className="truncate"
                      >
                        {r.title}
                      </p>
                      {r.category && <p className="small">{r.category}</p>}
                    </div>
                    <Link
                      to={`/resources/${r.id}`}
                      className="link small"
                      style={{ flex: "none" }}
                    >
                      Voir
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Tile>
        </div>
      </div>

      {/* Mon historique */}
      <Tile className="mb-6">
        <div className="row between" style={{ marginBottom: 16 }}>
          <h2 className="h2">Mon historique</h2>
          <Link to="/evaluations/history" className="link small">
            Tout l’historique →
          </Link>
        </div>
        {history.isLoading ? (
          <div className="section-gap" style={{ gap: 8 }}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-12 bg-slate-100 rounded animate-pulse"
              />
            ))}
          </div>
        ) : (history.data?.data?.length ?? 0) === 0 ? (
          <p className="small text-center" style={{ padding: "16px 0" }}>
            Aucune évaluation validée pour l’instant
          </p>
        ) : (
          <div>
            {history.data?.data?.map((evaluation, i) => (
              <div
                key={evaluation.id}
                className="row between wrap"
                style={{
                  gap: 12,
                  padding: "14px 0",
                  borderTop: i ? "1px solid var(--line)" : "none",
                }}
              >
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600 }}>
                    Campagne : {getCampaignName(evaluation.campaignId)}
                  </p>
                  <p className="small" style={{ marginTop: 2 }}>
                    Validée le{" "}
                    {evaluation.signedByHrAt
                      ? new Date(evaluation.signedByHrAt).toLocaleDateString(
                          "fr-FR",
                        )
                      : "—"}
                  </p>
                </div>
                <div className="row" style={{ gap: 12 }}>
                  {evaluation.reviewerScore !== undefined &&
                    evaluation.reviewerScore !== null && (
                      <Badge tone="grey">{evaluation.reviewerScore}/10</Badge>
                    )}
                  <Link
                    to={`/evaluations/${evaluation.id}`}
                    className="link small"
                  >
                    Voir PDF →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </Tile>

      {/* Mes demandes */}
      <Tile>
        <h2 className="h2" style={{ marginBottom: 16 }}>
          Mes demandes
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: "Demande de mobilité",
              icon: <ArrowRight className="w-4 h-4" />,
              href: "/mobility/new",
            },
            {
              label: "Mise à jour profil",
              icon: <User className="w-4 h-4" />,
              href: "/profile",
            },
            {
              label: "Mes évaluations",
              icon: <Clipboard className="w-4 h-4" />,
              href: "/evaluations",
            },
            {
              label: "Documents RH",
              icon: <Folder className="w-4 h-4" />,
              href: "/documents",
            },
          ].map((action) => (
            <Link
              key={action.href}
              to={action.href}
              className="row"
              style={{
                gap: 10,
                padding: "12px 14px",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius)",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              <span style={{ color: "var(--blue)", flex: "none" }}>
                {action.icon}
              </span>
              {action.label}
            </Link>
          ))}
        </div>
      </Tile>
    </div>
  );
}
