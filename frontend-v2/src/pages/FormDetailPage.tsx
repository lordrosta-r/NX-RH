import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Lock, Unlock, Download, Trash2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useConfirm } from "../contexts/ConfirmContext";
import Breadcrumbs from "../components/ui/Breadcrumbs";
import { formsApi } from "../api/forms";
import { formCategoriesApi } from "../api/formCategories";
import type { FormQuestion, FormCategory } from "../types";
import { PageHead, Tile, Badge, Callout } from "../components/shell";
import PageGuide from "../components/shared/PageGuide";
import FormBuilder from "../components/forms/FormBuilder";
import { queryKeys } from "../lib/queryKeys";

type FormTone = "blue" | "green" | "amber" | "red" | "grey";

// Palette de marque uniquement : bleu navy pour les évaluations, gris pour les
// demandes. Pas de rouge/vert/ambre sur un type de formulaire.
const FORM_TYPE_CONFIG: Record<string, { label: string; tone: FormTone }> = {
  self_evaluation: { label: "Auto-évaluation", tone: "blue" },
  manager_evaluation: { label: "Évaluation manager", tone: "blue" },
  upward_feedback: { label: "Feedback ascendant", tone: "blue" },
  peer_review: { label: "Peer review", tone: "blue" },
  objectives: { label: "Objectifs", tone: "grey" },
  mobility_request: { label: "Demande mobilité", tone: "grey" },
  salary_raise_request: { label: "Demande augmentation", tone: "grey" },
  promotion_request: { label: "Demande promotion", tone: "grey" },
  training_request: { label: "Demande formation", tone: "grey" },
  custom: { label: "Personnalisé", tone: "grey" },
};

export default function FormDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: form, isLoading } = useQuery({
    queryKey: queryKeys.forms.detail(id ?? ""),
    queryFn: () => formsApi.getForm(id!).then((r) => r.data),
    enabled: !!id,
  });

  const [meta, setMeta] = useState({
    title: "",
    description: "",
    formType: "",
    category: null as string | null,
    filledBy: "employee" as "employee" | "manager" | "hr",
    visibleToEvaluatee: true,
  });
  const [questions, setQuestions] = useState<FormQuestion[]>([]);
  const [isDirty, setIsDirty] = useState(false);

  const { data: categoriesData } = useQuery({
    queryKey: ["form-categories"],
    queryFn: () => formCategoriesApi.getCategories().then((r) => r.data),
  });
  const categories: FormCategory[] = categoriesData?.categories ?? [];

  const addCategoryMutation = useMutation({
    mutationFn: (label: string) =>
      formCategoriesApi.addCategory(label).then((r) => r.data),
    onSuccess: (data, label) => {
      queryClient.setQueryData(["form-categories"], data);
      const created = data.categories.find((c) => c.label === label);
      if (created) {
        setMeta((m) => ({ ...m, category: created.id }));
        setIsDirty(true);
      }
    },
  });

  useEffect(() => {
    if (form) {
      // Synchro one-shot de la donnée serveur vers l'état éditable du builder.
      /* eslint-disable react-hooks/set-state-in-effect */
      setMeta({
        title: form.title,
        description: form.description || "",
        formType: form.formType,
        category: form.category ?? null,
        filledBy: form.filledBy ?? "employee",
        visibleToEvaluatee: form.visibleToEvaluatee ?? true,
      });
      setQuestions(form.questions || []);
      setIsDirty(false);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [form]);

  const isAdminOrHr = user?.role === "admin" || user?.role === "hr";
  const isAdmin = user?.role === "admin";
  const isFrozen = form?.isFrozen ?? false;
  const canEdit = isAdminOrHr && !isFrozen;

  const saveMutation = useMutation({
    mutationFn: () =>
      formsApi
        .updateForm(id!, {
          title: meta.title,
          description: meta.description,
          category: meta.category,
          filledBy: meta.filledBy,
          visibleToEvaluatee: meta.visibleToEvaluatee,
          questions,
        })
        .then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.forms.detail(id ?? ""),
      });
      setIsDirty(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => formsApi.deleteForm(id!),
    onSuccess: () => navigate("/forms"),
  });

  const freezeMutation = useMutation({
    mutationFn: () => formsApi.freezeForm(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.forms.detail(id ?? ""),
      });
    },
  });

  const unfreezeMutation = useMutation({
    mutationFn: () => formsApi.unfreezeForm(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.forms.detail(id ?? ""),
      });
    },
  });

  async function handleDelete() {
    const ok = await confirm({
      title: "Supprimer le formulaire ?",
      description: "Cette action est irréversible.",
      variant: "danger",
      confirmLabel: "Supprimer",
    });
    if (ok) deleteMutation.mutate();
  }

  async function handleFreeze() {
    const ok = await confirm({
      title: "Geler le formulaire ?",
      description: "Le formulaire ne pourra plus être modifié.",
      variant: "warning",
      confirmLabel: "Geler",
    });
    if (ok) freezeMutation.mutate();
  }

  async function handleUnfreeze() {
    const ok = await confirm({
      title: "Dégeler le formulaire ?",
      description: "Le formulaire redeviendra modifiable.",
      variant: "warning",
      confirmLabel: "Dégeler",
    });
    if (ok) unfreezeMutation.mutate();
  }

  function handleExport() {
    formsApi.exportForm(id!).then((r) => {
      const blob =
        r.data instanceof Blob
          ? r.data
          : new Blob([JSON.stringify(r.data, null, 2)], {
              type: "application/json",
            });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `form-${id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  if (isLoading)
    return (
      <div className="nx-app">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              style={{
                height: 80,
                background: "var(--bg-alt)",
                borderRadius: "var(--radius)",
              }}
              className="animate-pulse"
            />
          ))}
        </div>
      </div>
    );

  if (!form)
    return (
      <div className="nx-app">
        <div style={{ textAlign: "center", padding: "64px 0" }}>
          <p className="body">Formulaire introuvable.</p>
          <Link
            to="/forms"
            className="link"
            style={{ marginTop: 8, display: "inline-block" }}
          >
            ← Retour aux formulaires
          </Link>
        </div>
      </div>
    );

  const typeConfig = FORM_TYPE_CONFIG[form.formType];

  return (
    <div className="nx-app">
      <Breadcrumbs
        items={[
          { label: "Accueil", href: "/" },
          { label: "Formulaires", href: "/forms" },
          { label: form.title },
        ]}
      />

      {/* Header */}
      <PageHead
        title={
          <span
            style={{ display: "inline-flex", alignItems: "center", gap: 12 }}
          >
            {form.title}
            {isFrozen && (
              <Badge tone="grey">
                <Lock size={14} strokeWidth={1.5} aria-hidden="true" /> Gelé
              </Badge>
            )}
          </span>
        }
        desc={`${typeConfig?.label ?? form.formType} · ${form.questions?.length ?? 0} questions`}
        actions={
          <>
            {isAdminOrHr && (
              <button onClick={handleExport} className="btn btn-ghost btn-sm">
                <Download size={16} strokeWidth={1.5} aria-hidden="true" />{" "}
                Exporter JSON
              </button>
            )}
            {isAdmin && !isFrozen && (
              <button
                onClick={handleFreeze}
                className="btn btn-sm"
                style={{ background: "var(--red)", color: "#fff" }}
              >
                <Lock size={16} strokeWidth={1.5} aria-hidden="true" /> Geler
              </button>
            )}
            {isAdmin && isFrozen && (
              <button
                onClick={handleUnfreeze}
                className="btn btn-sm"
                style={{ background: "var(--amber)", color: "#fff" }}
              >
                <Unlock size={16} strokeWidth={1.5} aria-hidden="true" />{" "}
                Dégeler
              </button>
            )}
            {canEdit && (
              <button
                onClick={() => saveMutation.mutate()}
                disabled={!isDirty || saveMutation.isPending}
                className="btn btn-primary btn-sm"
              >
                {saveMutation.isPending ? "Enregistrement…" : "Enregistrer"}
              </button>
            )}
          </>
        }
      />

      <PageGuide
        id="formDetail"
        title={t("guides.formDetail.title")}
        color="blue"
        steps={t("guides.formDetail.steps", { returnObjects: true }) as string[]}
      />

      {/* Bandeau gelé */}
      {isFrozen && (
        <Callout style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Lock
              size={20}
              strokeWidth={1.5}
              aria-hidden="true"
              style={{ flexShrink: 0 }}
            />
            <div>
              <p className="body" style={{ fontWeight: 600 }}>
                Formulaire gelé — les questions ne sont plus modifiables.
              </p>
              <p className="small" style={{ marginTop: 2 }}>
                Le titre et la description restent éditables.
                {form.frozenAt &&
                  ` Gelé le ${new Date(form.frozenAt).toLocaleDateString("fr-FR")}.`}
              </p>
            </div>
          </div>
        </Callout>
      )}

      {/* Builder — architecture + configuration */}
      <FormBuilder
        meta={meta}
        onMetaChange={(patch) => {
          setMeta((m) => ({ ...m, ...patch }));
          setIsDirty(true);
        }}
        questions={questions}
        onQuestionsChange={(qs) => {
          setQuestions(qs);
          setIsDirty(true);
        }}
        categories={categories}
        onCreateCategory={(label) => addCategoryMutation.mutate(label)}
        readOnly={isFrozen}
        lockType
      />

      {/* Options de diffusion */}
      <Tile style={{ marginTop: 24 }}>
        <h2 className="h3" style={{ marginBottom: 16 }}>
          Options
        </h2>

        <div className="field" style={{ marginBottom: 16 }}>
          <label htmlFor="form-filled-by">Rempli par</label>
          <select
            id="form-filled-by"
            value={meta.filledBy}
            onChange={(e) => {
              setMeta((m) => ({
                ...m,
                filledBy: e.target.value as "employee" | "manager" | "hr",
              }));
              setIsDirty(true);
            }}
            disabled={isFrozen}
            className="input"
          >
            <option value="employee">L'employé (auto-évaluation)</option>
            <option value="manager">Le manager</option>
            <option value="hr">Les RH</option>
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={meta.visibleToEvaluatee}
              onChange={(e) => {
                setMeta((m) => ({
                  ...m,
                  visibleToEvaluatee: e.target.checked,
                }));
                setIsDirty(true);
              }}
              disabled={isFrozen}
            />
            <span className="body" style={{ fontWeight: 600 }}>
              Visible par l'évalué
            </span>
          </label>
          <p className="small" style={{ marginTop: 4, marginLeft: 24 }}>
            Si décoché, l'évalué ne verra pas les réponses de ce formulaire
          </p>
        </div>

        <div style={{ marginBottom: 16 }}>
          <p className="body" style={{ fontWeight: 600, marginBottom: 8 }}>
            Type
          </p>
          <Badge tone={typeConfig?.tone ?? "grey"}>
            {typeConfig?.label ?? form.formType}
          </Badge>
        </div>

        {isAdminOrHr && !isFrozen && (
          <div
            style={{
              marginTop: 8,
              paddingTop: 16,
              borderTop: "1px solid var(--line)",
            }}
          >
            <button
              onClick={handleDelete}
              className="btn btn-ghost btn-sm"
              style={{ color: "var(--red)" }}
            >
              <Trash2 size={16} strokeWidth={1.5} aria-hidden="true" />{" "}
              Supprimer le formulaire
            </button>
          </div>
        )}
      </Tile>
    </div>
  );
}
