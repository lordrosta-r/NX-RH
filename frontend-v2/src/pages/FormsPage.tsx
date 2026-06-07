import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useDebounce } from "../hooks/useDebounce";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Copy, Trash2, FileText, Lock } from "lucide-react";
import EmptyState from "../components/ui/EmptyState";
import { useAuth } from "../contexts/AuthContext";
import { formsApi } from "../api/forms";
import { campaignsApi } from "../api/campaigns";
import { toast } from "../hooks/useToast";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import type { Form } from "../types";
import PageGuide from "../components/shared/PageGuide";
import Breadcrumbs from "../components/ui/Breadcrumbs";
import { queryKeys } from "../lib/queryKeys";
import { PageHead, Tile, Badge } from "../components/shell";

type BadgeTone = "blue" | "green" | "amber" | "red" | "grey";

const FORM_TYPE_CONFIG: Record<string, { label: string; tone: BadgeTone }> = {
  self_evaluation: { label: "Auto-évaluation", tone: "red" },
  manager_evaluation: { label: "Évaluation manager", tone: "amber" },
  upward_feedback: { label: "Feedback ascendant", tone: "blue" },
  peer_review: { label: "Peer review", tone: "blue" },
  objectives: { label: "Objectifs", tone: "green" },
  mobility_request: { label: "Demande mobilité", tone: "amber" },
  salary_raise_request: { label: "Demande augmentation", tone: "green" },
  promotion_request: { label: "Demande promotion", tone: "blue" },
  training_request: { label: "Demande formation", tone: "green" },
};

export default function FormsPage() {
  const { t } = useTranslation();
  const [typeFilter, setTypeFilter] = useState("");
  const [campaignFilter, setCampaignFilter] = useState("");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const { user } = useAuth();
  const [cloneTarget, setCloneTarget] = useState<Form | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const isAdminOrHr = user?.role === "admin" || user?.role === "hr";
  const isSearching = search !== debouncedSearch;

  const { data: campaignsData } = useQuery({
    queryKey: ["campaigns", "active"],
    queryFn: () =>
      campaignsApi
        .getCampaigns({ status: "active", limit: 100 })
        .then((r) => r.data),
  });
  const campaigns = campaignsData?.data ?? [];

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.forms.lists(),
    queryFn: () =>
      formsApi
        .getForms({
          formType: typeFilter || undefined,
          campaignId: campaignFilter || undefined,
          q: debouncedSearch || undefined,
          limit: 50,
        })
        .then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => formsApi.deleteForm(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.forms.lists() }),
    onError: () =>
      toast.error("Erreur lors de la suppression", "Veuillez réessayer."),
  });

  const cloneMutation = useMutation({
    mutationFn: (id: string) => formsApi.cloneForm(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.forms.lists() });
      setCloneTarget(null);
    },
    onError: () =>
      toast.error("Erreur lors de la duplication", "Veuillez réessayer."),
  });

  function handleDelete(id: string) {
    setDeleteConfirmId(id);
  }

  const forms = data?.data ?? [];

  return (
    <div className="nx-app">
      <Breadcrumbs
        items={[
          { label: "Accueil", href: "/" },
          { label: "Formulaires" },
        ]}
      />

      <PageGuide
        id="forms"
        title={t("guides.forms.title")}
        color="teal"
        steps={t("guides.forms.steps", { returnObjects: true }) as string[]}
      />

      <PageHead
        title="Formulaires"
        actions={
          isAdminOrHr && (
            <Link to="/forms/new" className="btn btn-primary">
              <Plus className="ico" style={{ width: 18, height: 18 }} /> Nouveau
              formulaire
            </Link>
          )
        }
      />

      {/* Filtres */}
      <div
        className="row wrap"
        style={{ gap: 12, alignItems: "center", marginBottom: 16 }}
      >
        <select
          aria-label="Filtrer par type"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="input"
          style={{ width: "auto" }}
        >
          <option value="">Tous les types</option>
          {Object.entries(FORM_TYPE_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>
        <select
          aria-label="Filtrer par campagne"
          value={campaignFilter}
          onChange={(e) => setCampaignFilter(e.target.value)}
          className="input"
          style={{ width: "auto" }}
        >
          <option value="">Toutes les campagnes</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          aria-label="Rechercher un formulaire"
          className="input"
          style={{ flex: 1, minWidth: 200 }}
          placeholder="Rechercher un formulaire..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {isSearching && (
          <span className="small" style={{ alignSelf: "center" }}>
            …
          </span>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="small" style={{ padding: 40, textAlign: "center" }}>
          Chargement…
        </div>
      )}

      {/* Empty state */}
      {!isLoading && forms.length === 0 && (
        <EmptyState
          icon={<FileText className="w-8 h-8" />}
          title="Aucun formulaire"
          description="Aucun formulaire ne correspond à vos critères."
          action={
            isAdminOrHr
              ? {
                  label: "Créer le premier formulaire",
                  onClick: () => window.location.assign("/forms/new"),
                }
              : undefined
          }
        />
      )}

      {/* Grille */}
      {!isLoading && forms.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          {forms.map((form) => {
            const typeConfig = FORM_TYPE_CONFIG[form.formType] ?? {
              label: form.formType,
              tone: "grey" as BadgeTone,
            };
            return (
              <Tile key={form.id}>
                <div
                  className="row between"
                  style={{ alignItems: "flex-start", marginBottom: 12 }}
                >
                  <Badge tone={typeConfig.tone}>{typeConfig.label}</Badge>
                  {form.isFrozen && (
                    <Badge tone="grey" dot={false}>
                      <Lock
                        className="ico"
                        style={{ width: 12, height: 12, marginRight: 4 }}
                      />
                      Gelé
                    </Badge>
                  )}
                </div>
                <h3 className="h3" style={{ marginBottom: 4 }}>
                  {form.title}
                </h3>
                <p className="small" style={{ marginBottom: 12 }}>
                  {form.questions?.length ?? 0} question
                  {(form.questions?.length ?? 0) !== 1 ? "s" : ""}
                </p>
                <div className="row between" style={{ alignItems: "center" }}>
                  <Link to={`/forms/${form.id}`} className="link small">
                    Voir →
                  </Link>
                  {isAdminOrHr && (
                    <div className="row" style={{ gap: 4 }}>
                      <button
                        onClick={() => setCloneTarget(form)}
                        className="btn btn-ghost btn-sm"
                        style={{ padding: 6 }}
                        aria-label="Dupliquer"
                        title="Dupliquer"
                      >
                        <Copy
                          className="ico"
                          style={{ width: 16, height: 16 }}
                        />
                      </button>
                      {!form.isFrozen && (
                        <button
                          onClick={() => handleDelete(form.id)}
                          className="btn btn-ghost btn-sm"
                          style={{ padding: 6, color: "var(--red)" }}
                          aria-label="Supprimer"
                          title="Supprimer"
                        >
                          <Trash2
                            className="ico"
                            style={{ width: 16, height: 16 }}
                          />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </Tile>
            );
          })}
        </div>
      )}

      {/* Modal clone */}
      {cloneTarget && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.5)",
          }}
        >
          <Tile style={{ width: "100%", maxWidth: 420 }}>
            <h3 className="h3" style={{ marginBottom: 8 }}>
              Dupliquer — {cloneTarget.title}
            </h3>
            <p className="body" style={{ marginBottom: 8 }}>
              Une copie sera créée avec le titre « Copie de {cloneTarget.title}{" "}
              », non gelée et sans campagne associée.
            </p>
            <p
              className="small"
              style={{ marginBottom: 16, color: "var(--ink-3)" }}
            >
              Dupliquer conserve la filiation des questions : c'est ce qui
              permet de rappeler les réponses de l'édition précédente. Crée un
              formulaire neuf seulement si tu ne veux aucun rappel.
            </p>
            <div
              className="row"
              style={{ gap: 12, justifyContent: "flex-end" }}
            >
              <button
                onClick={() => setCloneTarget(null)}
                className="btn btn-ghost"
              >
                Annuler
              </button>
              <button
                onClick={() => cloneMutation.mutate(cloneTarget.id)}
                disabled={cloneMutation.isPending}
                className="btn btn-primary"
              >
                {cloneMutation.isPending ? "Duplication…" : "Dupliquer"}
              </button>
            </div>
          </Tile>
        </div>
      )}

      {/* Confirm delete */}
      <ConfirmDialog
        isOpen={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => {
          if (deleteConfirmId) deleteMutation.mutate(deleteConfirmId);
          setDeleteConfirmId(null);
        }}
        title="Supprimer le formulaire"
        description="Cette action est irréversible. Le formulaire sera définitivement supprimé."
        confirmLabel="Supprimer"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
