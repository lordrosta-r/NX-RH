import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Plus,
  Trash2,
  FileText,
  Upload,
  ChevronUp,
  ChevronDown,
  X,
} from "lucide-react";
import { formsApi } from "../api/forms";
import { campaignsApi } from "../api/campaigns";
import type { Form, FormQuestion, QuestionType, QuestionPhase } from "../types";
import { PageHead, Tile } from "../components/shell";

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: "rating", label: "Note (1-10)" },
  { value: "text", label: "Texte libre" },
  { value: "yes_no", label: "Oui / Non" },
  { value: "choice", label: "Choix multiple" },
  { value: "weather", label: "Météo humeur" },
  { value: "mobility", label: "Souhait mobilité" },
  { value: "n1_import", label: "Import N-1 (auto)" },
  { value: "scale", label: "Curseur 0-100%" },
  { value: "objective_item", label: "Objectif structuré" },
];

const PHASES: { value: QuestionPhase; label: string }[] = [
  { value: "self", label: "Auto-évaluation" },
  { value: "n-1", label: "Évaluation N-1" },
  { value: "objectives", label: "Objectifs" },
  { value: "aspirations", label: "Aspirations" },
  { value: "all", label: "Toutes phases" },
];

// ─── QuestionCard ─────────────────────────────────────────────────────────────

function QuestionCard({
  question,
  index,
  total,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  question: FormQuestion;
  index: number;
  total: number;
  onChange: (q: FormQuestion) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return (
    <Tile
      className="row"
      style={{ alignItems: "flex-start", gap: 12, marginBottom: 12 }}
    >
      {/* Index + move controls */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 4,
          paddingTop: 4,
        }}
      >
        <span
          className="small"
          style={{
            width: 24,
            height: 24,
            borderRadius: 999,
            background: "var(--bg-alt)",
            color: "var(--ink-3)",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {index + 1}
        </span>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <button
            type="button"
            onClick={onMoveUp}
            disabled={index === 0}
            aria-label="Déplacer la question vers le haut"
            className="btn-ghost btn-sm"
            style={{ padding: 2, border: "none", background: "none" }}
          >
            <ChevronUp size={14} strokeWidth={1.5} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={index === total - 1}
            aria-label="Déplacer la question vers le bas"
            className="btn-ghost btn-sm"
            style={{ padding: 2, border: "none", background: "none" }}
          >
            <ChevronDown size={14} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Row 1 : Type + Phase */}
        <div className="row" style={{ gap: 12, marginBottom: 12 }}>
          <select
            aria-label="Type de question"
            value={question.type}
            onChange={(e) =>
              onChange({ ...question, type: e.target.value as QuestionType })
            }
            className="input"
            style={{ flex: 1 }}
          >
            {QUESTION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <select
            aria-label="Phase de la question"
            value={question.phase ?? "all"}
            onChange={(e) =>
              onChange({
                ...question,
                phase: e.target.value as QuestionPhase,
              })
            }
            className="input"
          >
            {PHASES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {/* Row 2 : Question text */}
        <textarea
          aria-label="Texte de la question"
          value={question.text}
          onChange={(e) => onChange({ ...question, text: e.target.value })}
          placeholder="Texte de la question..."
          rows={2}
          className="input"
          style={{ marginBottom: 12 }}
        />

        {/* Options (choice only) */}
        {question.type === "choice" && (
          <div style={{ marginBottom: 12 }}>
            <p className="small" style={{ fontWeight: 600, marginBottom: 8 }}>
              Options :
            </p>
            {(question.options ?? []).map((opt, i) => (
              <div
                key={`${opt}-${i}`}
                className="row"
                style={{ gap: 8, marginBottom: 8 }}
              >
                <input
                  aria-label={`Option ${i + 1}`}
                  value={opt}
                  onChange={(e) => {
                    const opts = [...(question.options ?? [])];
                    opts[i] = e.target.value;
                    onChange({ ...question, options: opts });
                  }}
                  className="input"
                  style={{ flex: 1 }}
                  placeholder={`Option ${i + 1}`}
                />
                <button
                  type="button"
                  aria-label={`Supprimer l'option ${i + 1}`}
                  onClick={() =>
                    onChange({
                      ...question,
                      options: (question.options ?? []).filter(
                        (_, j) => j !== i,
                      ),
                    })
                  }
                  className="btn btn-ghost btn-sm"
                >
                  <X size={16} strokeWidth={1.5} aria-hidden="true" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...question,
                  options: [...(question.options ?? []), ""],
                })
              }
              className="link small"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
            >
              + Ajouter une option
            </button>
          </div>
        )}

        {/* Row 3 : Required + Delete */}
        <div className="row between">
          <label
            className="row"
            style={{ gap: 8, cursor: "pointer", alignItems: "center" }}
          >
            <input
              type="checkbox"
              checked={question.required}
              onChange={(e) =>
                onChange({ ...question, required: e.target.checked })
              }
            />
            <span className="small">Requis</span>
          </label>
          <button
            type="button"
            onClick={onDelete}
            className="btn btn-ghost btn-sm"
          >
            <Trash2 size={14} strokeWidth={1.5} aria-hidden="true" /> Supprimer
          </button>
        </div>
      </div>
    </Tile>
  );
}

// ─── FormNewPage ──────────────────────────────────────────────────────────────

export default function FormNewPage() {
  const navigate = useNavigate();

  const { data: campaignsData } = useQuery({
    queryKey: ["campaigns", "active"],
    queryFn: () =>
      campaignsApi.getCampaigns({ status: "active" }).then((r) => r.data),
  });
  const activeCampaigns = campaignsData?.data ?? [];

  const [meta, setMeta] = useState({
    title: "",
    description: "",
    formType: "",
    isFrozen: false,
    campaignId: "",
    isAnonymous: false,
    filledBy: "employee" as "employee" | "manager" | "hr",
    visibleToEvaluatee: true,
  });
  const [questions, setQuestions] = useState<FormQuestion[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function newQuestion(): FormQuestion {
    return {
      id: crypto.randomUUID(),
      type: "text",
      text: "",
      required: false,
      phase: "all",
      options: [],
      order: questions.length,
    };
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!meta.title.trim()) e.title = "Le titre est requis";
    if (!meta.formType) e.formType = "Le type est requis";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  const createMutation = useMutation({
    mutationFn: () =>
      formsApi.createForm({ ...meta, questions }).then((r) => r.data),
    onSuccess: (form: Form) => navigate(`/forms/${form.id}`),
  });

  function handleSave() {
    if (!validate()) return;
    createMutation.mutate();
  }

  function moveQuestion(idx: number, dir: -1 | 1) {
    setQuestions((qs) => {
      const a = [...qs];
      const target = idx + dir;
      if (target < 0 || target >= a.length) return a;
      [a[idx], a[target]] = [a[target], a[idx]];
      return a;
    });
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

      {/* ── Métadonnées ── */}
      <Tile style={{ marginBottom: 24 }}>
        <h2 className="h3" style={{ marginBottom: 16 }}>
          Métadonnées
        </h2>

        {/* Titre */}
        <div className="field" style={{ marginBottom: 16 }}>
          <label htmlFor="form-title">Titre *</label>
          <input
            id="form-title"
            className={`input${errors.title ? " is-invalid" : ""}`}
            value={meta.title}
            onChange={(e) => setMeta((m) => ({ ...m, title: e.target.value }))}
            placeholder="Titre du formulaire"
          />
          {errors.title && <p className="field-error">{errors.title}</p>}
        </div>

        {/* Description */}
        <div className="field" style={{ marginBottom: 16 }}>
          <label htmlFor="form-description">Description</label>
          <textarea
            id="form-description"
            rows={3}
            className="input"
            value={meta.description}
            onChange={(e) =>
              setMeta((m) => ({ ...m, description: e.target.value }))
            }
            placeholder="Description optionnelle"
          />
        </div>

        {/* Type */}
        <div className="field" style={{ marginBottom: 16 }}>
          <label htmlFor="form-type">Type *</label>
          <select
            id="form-type"
            className={`input${errors.formType ? " is-invalid" : ""}`}
            value={meta.formType}
            onChange={(e) =>
              setMeta((m) => ({ ...m, formType: e.target.value }))
            }
          >
            <option value="">Sélectionner un type...</option>
            <optgroup label="Évaluations">
              <option value="self_evaluation">Auto-évaluation</option>
              <option value="manager_evaluation">Évaluation manager</option>
              <option value="upward_feedback">Feedback ascendant</option>
              <option value="peer_review">Peer review</option>
            </optgroup>
            <optgroup label="Objectifs">
              <option value="objectives">Objectifs</option>
            </optgroup>
            <optgroup label="Formulaires de demande">
              <option value="mobility_request">Demande de mobilité</option>
              <option value="salary_raise_request">
                Demande d'augmentation
              </option>
              <option value="promotion_request">Demande de promotion</option>
              <option value="training_request">Demande de formation</option>
            </optgroup>
          </select>
          {errors.formType && <p className="field-error">{errors.formType}</p>}
        </div>

        {/* Campagne liée */}
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

        {/* Anonyme */}
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

        {/* Rempli par */}
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

        {/* Visible par l'évalué */}
        <div style={{ marginBottom: 16 }}>
          <label
            className="row"
            style={{ gap: 8, cursor: "pointer", alignItems: "center" }}
          >
            <input
              type="checkbox"
              checked={meta.visibleToEvaluatee}
              onChange={(e) =>
                setMeta((m) => ({
                  ...m,
                  visibleToEvaluatee: e.target.checked,
                }))
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

        {/* Objectifs N-1 (si type = objectives) */}
        {meta.formType === "objectives" && (
          <div
            style={{
              marginBottom: 16,
              padding: 12,
              background: "var(--bg-alt)",
              borderRadius: "var(--radius)",
              border: "1px solid var(--line)",
            }}
          >
            <label
              className="row"
              style={{ gap: 8, cursor: "pointer", alignItems: "flex-start" }}
            >
              <input
                type="checkbox"
                aria-label="Importer automatiquement les objectifs N-1"
                style={{ marginTop: 2 }}
              />
              <span className="body">
                Importer automatiquement les objectifs N-1
              </span>
            </label>
          </div>
        )}

        {/* Import JSON */}
        <Link
          to="/admin/forms/import"
          className="link row"
          style={{ gap: 8, marginTop: 16, alignItems: "center" }}
        >
          <Upload size={16} strokeWidth={1.5} aria-hidden="true" /> Importer un
          JSON
        </Link>
      </Tile>

      {/* ── FormBuilder ── */}
      <div className="row between" style={{ marginBottom: 16 }}>
        <h2 className="h3">Questions ({questions.length})</h2>
        <button
          type="button"
          onClick={() => setQuestions((qs) => [...qs, newQuestion()])}
          className="btn btn-ghost btn-sm"
        >
          <Plus size={16} strokeWidth={1.5} aria-hidden="true" /> Ajouter une
          question
        </button>
      </div>

      {/* Empty state */}
      {questions.length === 0 && (
        <Tile
          style={{
            textAlign: "center",
            padding: 64,
            border: "2px dashed var(--line)",
          }}
        >
          <FileText
            size={40}
            strokeWidth={1.5}
            aria-hidden="true"
            style={{ color: "var(--ink-3)", margin: "0 auto 12px" }}
          />
          <p className="body">Aucune question pour l'instant</p>
          <button
            type="button"
            onClick={() => setQuestions([newQuestion()])}
            className="link small"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              marginTop: 12,
            }}
          >
            + Ajouter la première question
          </button>
        </Tile>
      )}

      {/* Question list */}
      {questions.map((q, idx) => (
        <QuestionCard
          key={q.id}
          question={q}
          index={idx}
          total={questions.length}
          onChange={(updated) =>
            setQuestions((qs) =>
              qs.map((x) => (x.id === updated.id ? updated : x)),
            )
          }
          onDelete={() => setQuestions((qs) => qs.filter((x) => x.id !== q.id))}
          onMoveUp={() => moveQuestion(idx, -1)}
          onMoveDown={() => moveQuestion(idx, 1)}
        />
      ))}

      {/* Add question footer button */}
      {questions.length > 0 && (
        <button
          type="button"
          onClick={() => setQuestions((qs) => [...qs, newQuestion()])}
          className="btn btn-ghost btn-block"
          style={{
            border: "2px dashed var(--line)",
            marginTop: 8,
          }}
        >
          + Ajouter une question
        </button>
      )}
    </div>
  );
}
