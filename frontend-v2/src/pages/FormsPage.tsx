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

// Palette de marque uniquement : bleu navy pour les formulaires d'évaluation,
// gris neutre pour les demandes. Pas de rouge/vert/ambre (le rouge est réservé
// aux actions destructrices, pas à un type de formulaire).
const FORM_TYPE_CONFIG: Record<string, { tone: BadgeTone }> = {
  self_evaluation: { tone: "blue" },
  manager_evaluation: { tone: "blue" },
  upward_feedback: { tone: "blue" },
  peer_review: { tone: "blue" },
  objectives: { tone: "grey" },
  mobility_request: { tone: "grey" },
  salary_raise_request: { tone: "grey" },
  promotion_request: { tone: "grey" },
  training_request: { tone: "grey" },
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
      toast.error(t("forms.deleteError"), t("forms.tryAgain")),
  });

  const cloneMutation = useMutation({
    mutationFn: (id: string) => formsApi.cloneForm(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.forms.lists() });
      setCloneTarget(null);
    },
    onError: () =>
      toast.error(t("forms.cloneError"), t("forms.tryAgain")),
  });

  function handleDelete(id: string) {
    setDeleteConfirmId(id);
  }

  const forms = data?.data ?? [];

  return (
    <div className="nx-app">
      <Breadcrumbs
        items={[
          { label: t("common.home"), href: "/" },
          { label: t("forms.title") },
        ]}
      />

      <PageGuide
        id="forms"
        title={t("guides.forms.title")}
        color="blue"
        steps={t("guides.forms.steps", { returnObjects: true }) as string[]}
      />

      <PageHead
        title={t("forms.title")}
        actions={
          isAdminOrHr && (
            <Link to="/forms/new" className="btn btn-primary">
              <Plus className="ico" style={{ width: 18, height: 18 }} />{" "}
              {t("forms.newForm")}
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
          aria-label={t("forms.filterType")}
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="input"
          style={{ width: "auto" }}
        >
          <option value="">{t("forms.allTypes")}</option>
          {Object.keys(FORM_TYPE_CONFIG).map((k) => (
            <option key={k} value={k}>
              {t(`forms.types.${k}`)}
            </option>
          ))}
        </select>
        <select
          aria-label={t("forms.filterCampaign")}
          value={campaignFilter}
          onChange={(e) => setCampaignFilter(e.target.value)}
          className="input"
          style={{ width: "auto" }}
        >
          <option value="">{t("forms.allCampaigns")}</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          aria-label={t("forms.searchAria")}
          className="input"
          style={{ flex: 1, minWidth: 200 }}
          placeholder={t("forms.searchPlaceholder")}
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
          {t("forms.loading")}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && forms.length === 0 && (
        <EmptyState
          icon={<FileText className="w-8 h-8" />}
          title={t("forms.emptyTitle")}
          description={t("forms.emptyDescription")}
          action={
            isAdminOrHr
              ? {
                  label: t("forms.createFirst"),
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
            const typeConfig = FORM_TYPE_CONFIG[form.formType];
            const typeLabel = typeConfig
              ? t(`forms.types.${form.formType}`)
              : form.formType;
            return (
              <Tile key={form.id}>
                <div
                  className="row between"
                  style={{ alignItems: "flex-start", marginBottom: 12 }}
                >
                  <Badge tone={typeConfig?.tone ?? "grey"}>{typeLabel}</Badge>
                  {form.isFrozen && (
                    <Badge tone="grey" dot={false}>
                      <Lock
                        className="ico"
                        style={{ width: 12, height: 12, marginRight: 4 }}
                      />
                      {t("forms.frozen")}
                    </Badge>
                  )}
                </div>
                <h3 className="h3" style={{ marginBottom: 4 }}>
                  {form.title}
                </h3>
                <p className="small" style={{ marginBottom: 12 }}>
                  {t("forms.questionCount", {
                    count: form.questions?.length ?? 0,
                  })}
                </p>
                <div className="row between" style={{ alignItems: "center" }}>
                  <Link to={`/forms/${form.id}`} className="link small">
                    {t("forms.view")}
                  </Link>
                  {isAdminOrHr && (
                    <div className="row" style={{ gap: 4 }}>
                      <button
                        onClick={() => setCloneTarget(form)}
                        className="btn btn-ghost btn-sm"
                        style={{ padding: 6 }}
                        aria-label={t("forms.duplicate")}
                        title={t("forms.duplicate")}
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
                          aria-label={t("forms.delete")}
                          title={t("forms.delete")}
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
              {t("forms.cloneTitle", { title: cloneTarget.title })}
            </h3>
            <p className="body" style={{ marginBottom: 8 }}>
              {t("forms.cloneIntro", { title: cloneTarget.title })}
            </p>
            <p
              className="small"
              style={{ marginBottom: 16, color: "var(--ink-3)" }}
            >
              {t("forms.cloneHint")}
            </p>
            <div
              className="row"
              style={{ gap: 12, justifyContent: "flex-end" }}
            >
              <button
                onClick={() => setCloneTarget(null)}
                className="btn btn-ghost"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={() => cloneMutation.mutate(cloneTarget.id)}
                disabled={cloneMutation.isPending}
                className="btn btn-primary"
              >
                {cloneMutation.isPending
                  ? t("forms.cloning")
                  : t("forms.duplicate")}
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
        title={t("forms.deleteFormTitle")}
        description={t("forms.deleteFormDescription")}
        confirmLabel={t("forms.delete")}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
