import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import { formsApi } from "../api/forms";
import { campaignsApi } from "../api/campaigns";
import { formCategoriesApi } from "../api/formCategories";
import type { Form, FormQuestion, FormCategory } from "../types";
import { PageHead, Tile } from "../components/shell";
import FormBuilder from "../components/forms/FormBuilder";

export default function FormNewPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: campaignsData } = useQuery({
    queryKey: ["campaigns", "active"],
    queryFn: () =>
      campaignsApi.getCampaigns({ status: "active" }).then((r) => r.data),
  });
  const activeCampaigns = campaignsData?.data ?? [];

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
      // Auto-sélectionne la catégorie fraîchement créée (custom → type 'custom').
      const created = data.categories.find((c) => c.label === label);
      if (created) {
        setMeta((m) => ({
          ...m,
          category: created.id,
          formType: (created.types?.length ?? 0) > 0 ? m.formType : "custom",
        }));
      }
    },
  });

  const [meta, setMeta] = useState({
    title: "",
    description: "",
    formType: "",
    category: null as string | null,
    campaignId: "",
    isAnonymous: false,
    filledBy: "employee" as "employee" | "manager" | "hr",
    visibleToEvaluatee: true,
  });
  const [questions, setQuestions] = useState<FormQuestion[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!meta.title.trim()) e.title = "Le titre est requis";
    if (!meta.formType) e.formType = "Choisissez une catégorie et un type";
    if (questions.some((q) => !q.text.trim()))
      e.questions = "Chaque question doit avoir un intitulé";
    if (
      questions.some(
        (q) =>
          q.type === "choice" &&
          (q.options ?? []).filter((o) => o.trim()).length < 2,
      )
    )
      e.questions = "Une question à choix doit avoir au moins 2 options";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  const createMutation = useMutation({
    mutationFn: () => {
      // On n'envoie pas de campaignId vide ("" est rejeté par le backend).
      const { campaignId, ...rest } = meta;
      const payload = {
        ...rest,
        questions,
        ...(campaignId ? { campaignId } : {}),
      };
      return formsApi.createForm(payload).then((r) => r.data);
    },
    onSuccess: (form: Form) => navigate(`/forms/${form.id}`),
  });

  function handleSave() {
    if (!validate()) return;
    createMutation.mutate();
  }

  return (
    <div className="nx-app">
      <PageHead
        title="Nouveau formulaire"
        actions={
          <>
            <Link to="/forms" className="btn btn-ghost">
              Annuler
            </Link>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSave}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Enregistrement…" : "Enregistrer"}
            </button>
          </>
        }
      />

      {(errors.title || errors.formType || errors.questions) && (
        <Tile
          style={{
            marginBottom: 16,
            borderLeft: "3px solid var(--color-danger)",
          }}
        >
          {errors.title && <p className="field-error">{errors.title}</p>}
          {errors.formType && <p className="field-error">{errors.formType}</p>}
          {errors.questions && (
            <p className="field-error">{errors.questions}</p>
          )}
        </Tile>
      )}

      {/* ── Builder (architecture + config) ── */}
      <Tile style={{ marginBottom: 24 }}>
        <FormBuilder
          meta={meta}
          onMetaChange={(patch) => setMeta((m) => ({ ...m, ...patch }))}
          questions={questions}
          onQuestionsChange={setQuestions}
          categories={categories}
          onCreateCategory={(label) => addCategoryMutation.mutate(label)}
        />
      </Tile>

      {/* ── Options de diffusion ── */}
      <Tile style={{ marginBottom: 24 }}>
        <h2 className="h3" style={{ marginBottom: 16 }}>
          Options
        </h2>

        <div className="field" style={{ marginBottom: 16 }}>
          <label htmlFor="form-campaign">Campagne liée</label>
          <select
            id="form-campaign"
            className="input"
            value={meta.campaignId}
            onChange={(e) =>
              setMeta((m) => ({ ...m, campaignId: e.target.value }))
            }
          >
            <option value="">Aucune campagne</option>
            {activeCampaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label
            className="row"
            style={{ gap: 8, cursor: "pointer", alignItems: "center" }}
          >
            <input
              type="checkbox"
              checked={meta.isAnonymous}
              onChange={(e) =>
                setMeta((m) => ({ ...m, isAnonymous: e.target.checked }))
              }
            />
            <span style={{ fontWeight: 600, color: "var(--ink)" }}>
              Formulaire anonyme
            </span>
          </label>
          <p className="small" style={{ marginTop: 4, marginLeft: 24 }}>
            Les réponses ne seront pas attribuées nominativement
          </p>
        </div>

        <div className="field" style={{ marginBottom: 16 }}>
          <label htmlFor="form-filled-by">Rempli par</label>
          <select
            id="form-filled-by"
            className="input"
            value={meta.filledBy}
            onChange={(e) =>
              setMeta((m) => ({
                ...m,
                filledBy: e.target.value as "employee" | "manager" | "hr",
              }))
            }
          >
            <option value="employee">L'employé (auto-évaluation)</option>
            <option value="manager">Le manager</option>
            <option value="hr">Les RH</option>
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label
            className="row"
            style={{ gap: 8, cursor: "pointer", alignItems: "center" }}
          >
            <input
              type="checkbox"
              checked={meta.visibleToEvaluatee}
              onChange={(e) =>
                setMeta((m) => ({ ...m, visibleToEvaluatee: e.target.checked }))
              }
            />
            <span style={{ fontWeight: 600, color: "var(--ink)" }}>
              Visible par l'évalué
            </span>
          </label>
          <p className="small" style={{ marginTop: 4, marginLeft: 24 }}>
            Si décoché, l'évalué ne verra pas les réponses de ce formulaire
          </p>
        </div>

        <Link
          to="/admin/forms/import"
          className="link row"
          style={{ gap: 8, marginTop: 8, alignItems: "center" }}
        >
          <Upload size={16} strokeWidth={1.5} aria-hidden="true" /> Importer un
          JSON
        </Link>
      </Tile>
    </div>
  );
}
