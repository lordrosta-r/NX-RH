import { useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Trash2,
  Plus,
  Settings2,
  FileText,
  Star,
  Hash,
  ToggleLeft,
  ListChecks,
  CloudSun,
  MapPin,
  Download,
  SlidersHorizontal,
  Target,
  Check,
  History,
} from "lucide-react";
import type {
  FormQuestion,
  QuestionType,
  QuestionPhase,
  FormCategory,
} from "../../types";

// ─── Catalogue des types de question ────────────────────────────────────────

const QUESTION_TYPES: {
  value: QuestionType;
  label: string;
  icon: React.ReactNode;
}[] = [
  { value: "rating", label: "Note (1-10)", icon: <Star size={16} /> },
  { value: "text", label: "Texte libre", icon: <FileText size={16} /> },
  { value: "yes_no", label: "Oui / Non", icon: <ToggleLeft size={16} /> },
  { value: "choice", label: "Choix multiple", icon: <ListChecks size={16} /> },
  { value: "weather", label: "Météo humeur", icon: <CloudSun size={16} /> },
  { value: "mobility", label: "Souhait mobilité", icon: <MapPin size={16} /> },
  {
    value: "scale",
    label: "Curseur 0-100%",
    icon: <SlidersHorizontal size={16} />,
  },
  {
    value: "objective_item",
    label: "Objectif structuré",
    icon: <Target size={16} />,
  },
];

const PHASES: { value: QuestionPhase; label: string }[] = [
  { value: "self", label: "Auto-évaluation" },
  { value: "objectives", label: "Objectifs" },
  { value: "aspirations", label: "Aspirations" },
  { value: "all", label: "Toutes phases" },
];

const typeMeta = (t: QuestionType) =>
  QUESTION_TYPES.find((x) => x.value === t) ?? QUESTION_TYPES[1];

// ─── Aperçu inline d'un champ selon son type ─────────────────────────────────

function QuestionPreview({ q }: { q: FormQuestion }) {
  const line: React.CSSProperties = {
    height: 8,
    borderRadius: 4,
    background: "var(--bg-alt)",
    border: "1px solid var(--line)",
  };
  switch (q.type) {
    case "rating":
      return (
        <div style={{ display: "flex", gap: 6 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <span
              key={n}
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                border: "1px solid var(--line)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                color: "var(--ink-3)",
              }}
            >
              {n}
            </span>
          ))}
        </div>
      );
    case "scale":
      return (
        <div
          style={{
            height: 6,
            borderRadius: 999,
            background:
              "linear-gradient(90deg, var(--blue) 45%, var(--bg-alt) 45%)",
          }}
        />
      );
    case "text":
      return <div style={{ ...line, height: 32 }} />;
    case "yes_no":
      return (
        <div style={{ display: "flex", gap: 8 }}>
          {["Oui", "Non"].map((v) => (
            <span
              key={v}
              style={{
                padding: "4px 16px",
                borderRadius: 999,
                border: "1px solid var(--line)",
                fontSize: 12,
                color: "var(--ink-3)",
              }}
            >
              {v}
            </span>
          ))}
        </div>
      );
    case "choice":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {(q.options?.length ? q.options : ["Option A", "Option B"])
            .slice(0, 3)
            .map((opt, i) => (
              <span
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                  color: "var(--ink-3)",
                }}
              >
                <span
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 999,
                    border: "2px solid var(--line)",
                  }}
                />
                {opt}
              </span>
            ))}
        </div>
      );
    case "weather":
      return (
        <div style={{ display: "flex", gap: 8, color: "var(--ink-3)" }}>
          <CloudSun size={22} />
          <CloudSun size={22} />
          <CloudSun size={22} />
        </div>
      );
    case "mobility":
      return <div style={{ ...line, height: 32, width: "60%" }} />;
    case "n1_import":
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            color: "var(--ink-3)",
            padding: "4px 10px",
            borderRadius: 999,
            background: "var(--bg-alt)",
          }}
        >
          <Download size={14} /> Édition précédente (hérité)
        </span>
      );
    case "objective_item":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ ...line, width: "80%" }} />
          <div style={{ ...line, width: "55%" }} />
        </div>
      );
    default:
      return <div style={line} />;
  }
}

// ─── Card de question (sortable) ─────────────────────────────────────────────

function SortableQuestionCard({
  q,
  index,
  active,
  readOnly,
  onSelect,
  onDelete,
}: {
  q: FormQuestion;
  index: number;
  active: boolean;
  readOnly: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: q.id, disabled: readOnly });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    background: "var(--color-surface, #fff)",
    border: "1px solid var(--line)",
    borderLeft: active ? "3px solid var(--blue)" : "1px solid var(--line)",
    borderRadius: "var(--radius)",
    padding: 16,
    marginBottom: 12,
    cursor: "pointer",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      aria-pressed={active}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 10,
        }}
      >
        {!readOnly && (
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label="Déplacer la question"
            onClick={(e) => e.stopPropagation()}
            style={{
              border: "none",
              background: "none",
              cursor: "grab",
              color: "var(--ink-3)",
              padding: 2,
            }}
          >
            <GripVertical size={16} />
          </button>
        )}
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 0.5,
            color: "var(--blue)",
          }}
        >
          QUESTION {String(index + 1).padStart(2, "0")}
        </span>
        {q.required && (
          <span style={{ color: "var(--color-danger)", fontWeight: 700 }}>
            *
          </span>
        )}
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontSize: 11,
            color: "var(--ink-3)",
            marginLeft: 4,
          }}
        >
          {typeMeta(q.type).icon}
          {typeMeta(q.type).label}
        </span>
        <span style={{ flex: 1 }} />
        {!readOnly && (
          <button
            type="button"
            aria-label="Supprimer la question"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            style={{
              border: "none",
              background: "none",
              cursor: "pointer",
              color: "var(--color-danger)",
              padding: 2,
            }}
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
      <p
        style={{
          fontWeight: 600,
          color: "var(--ink)",
          marginBottom: 10,
          fontSize: 14,
        }}
      >
        {q.text || <span style={{ color: "var(--ink-3)" }}>Sans titre</span>}
      </p>
      <QuestionPreview q={q} />
    </div>
  );
}

// ─── Sélecteur de catégorie + type ───────────────────────────────────────────

function CategoryTypeSelect({
  categories,
  category,
  formType,
  readOnly,
  lockType,
  onCategoryChange,
  onTypeChange,
  onCreateCategory,
}: {
  categories: FormCategory[];
  category: string | null;
  formType: string;
  readOnly: boolean;
  lockType: boolean;
  onCategoryChange: (id: string | null) => void;
  onTypeChange: (t: string) => void;
  onCreateCategory: (label: string) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [newLabel, setNewLabel] = useState("");

  const current = categories.find((c) => c.id === category);
  const builtinTypes = current?.types ?? [];
  const isCustomCategory = !!current && builtinTypes.length === 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="field">
        <label>Catégorie</label>
        {creating ? (
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="input"
              autoFocus
              placeholder="Nom de la catégorie"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newLabel.trim()) {
                  onCreateCategory(newLabel.trim());
                  setNewLabel("");
                  setCreating(false);
                }
              }}
            />
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={!newLabel.trim()}
              onClick={() => {
                onCreateCategory(newLabel.trim());
                setNewLabel("");
                setCreating(false);
              }}
            >
              <Check size={16} />
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setCreating(false);
                setNewLabel("");
              }}
            >
              Annuler
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8 }}>
            <select
              className="input"
              value={category ?? ""}
              disabled={readOnly}
              onChange={(e) => onCategoryChange(e.target.value || null)}
            >
              <option value="">Sélectionner une catégorie…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            {!readOnly && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setCreating(true)}
              >
                <Plus size={16} /> Nouvelle
              </button>
            )}
          </div>
        )}
      </div>

      {/* Type : pour une catégorie built-in, choisir parmi ses types.
          Catégorie personnalisée → type générique 'custom' (auto). */}
      {!isCustomCategory && builtinTypes.length > 0 && (
        <div className="field">
          <label>Type *</label>
          {lockType ? (
            <input className="input" value={formType} disabled />
          ) : (
            <select
              className="input"
              value={formType}
              disabled={readOnly}
              onChange={(e) => onTypeChange(e.target.value)}
            >
              <option value="">Sélectionner un type…</option>
              {builtinTypes.map((t) => (
                <option key={t} value={t}>
                  {QUESTION_TYPE_FALLBACK_LABEL(t)}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
    </div>
  );
}

// Libellés humains des formType built-in (présentation seulement).
function QUESTION_TYPE_FALLBACK_LABEL(t: string): string {
  const MAP: Record<string, string> = {
    self_evaluation: "Auto-évaluation",
    manager_evaluation: "Évaluation manager",
    upward_feedback: "Feedback ascendant",
    peer_review: "Peer review",
    objectives: "Objectifs",
    mobility_request: "Demande de mobilité",
    salary_raise_request: "Demande d'augmentation",
    promotion_request: "Demande de promotion",
    training_request: "Demande de formation",
    custom: "Personnalisé",
  };
  return MAP[t] ?? t;
}

// ─── Panneau de configuration (colonne droite) ───────────────────────────────

function ConfigPanel({
  q,
  readOnly,
  onChange,
}: {
  q: FormQuestion | null;
  readOnly: boolean;
  onChange: (q: FormQuestion) => void;
}) {
  if (!q) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: 32,
          color: "var(--ink-3)",
        }}
      >
        <Settings2 size={32} style={{ margin: "0 auto 12px" }} />
        <p className="small">Sélectionnez une question pour la configurer</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="field">
        <label>Intitulé de la question</label>
        <input
          className="input"
          value={q.text}
          disabled={readOnly}
          onChange={(e) => onChange({ ...q, text: e.target.value })}
          placeholder="Ex : Comment évaluez-vous…"
        />
      </div>

      {/* Interface options : grille des types */}
      <div className="field">
        <label>Type de réponse</label>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
          }}
        >
          {QUESTION_TYPES.map((t) => {
            const selected = q.type === t.value;
            return (
              <button
                key={t.value}
                type="button"
                disabled={readOnly}
                onClick={() => onChange({ ...q, type: t.value })}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 12px",
                  borderRadius: "var(--radius)",
                  border: selected
                    ? "2px solid var(--blue)"
                    : "1px solid var(--line)",
                  background: selected ? "var(--bg-alt)" : "transparent",
                  color: selected ? "var(--blue)" : "var(--ink)",
                  fontSize: 13,
                  cursor: readOnly ? "default" : "pointer",
                  textAlign: "left",
                }}
              >
                {t.icon}
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Options (choice) */}
      {q.type === "choice" && (
        <div className="field">
          <label>Options de choix</label>
          {(q.options ?? []).map((opt, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
              <input
                className="input"
                value={opt}
                disabled={readOnly}
                onChange={(e) => {
                  const options = [...(q.options ?? [])];
                  options[i] = e.target.value;
                  onChange({ ...q, options });
                }}
              />
              {!readOnly && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  aria-label="Retirer l'option"
                  onClick={() =>
                    onChange({
                      ...q,
                      options: (q.options ?? []).filter((_, j) => j !== i),
                    })
                  }
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
          {!readOnly && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() =>
                onChange({ ...q, options: [...(q.options ?? []), ""] })
              }
            >
              <Plus size={14} /> Ajouter une option
            </button>
          )}
        </div>
      )}

      {/* Échelle (rating) */}
      {q.type === "rating" && (
        <div className="field">
          <label>Échelle (max)</label>
          <select
            className="input"
            disabled={readOnly}
            value={String((q as { scale?: number }).scale ?? 5)}
            onChange={(e) =>
              onChange({ ...q, scale: Number(e.target.value) } as FormQuestion)
            }
          >
            {[3, 4, 5, 6, 7, 10].map((n) => (
              <option key={n} value={n}>
                1 à {n}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Phase */}
      <div className="field">
        <label>Phase</label>
        <select
          className="input"
          disabled={readOnly}
          value={q.phase ?? "all"}
          onChange={(e) =>
            onChange({ ...q, phase: e.target.value as QuestionPhase })
          }
        >
          {PHASES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {/* Validation */}
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          cursor: readOnly ? "default" : "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={q.required}
          disabled={readOnly}
          onChange={(e) => onChange({ ...q, required: e.target.checked })}
        />
        <span style={{ fontWeight: 600, color: "var(--ink)" }}>
          Réponse obligatoire
        </span>
      </label>

      {/* Édition précédente — curation RH par question (OFF par défaut) */}
      <div
        style={{
          borderTop: "1px solid var(--line)",
          paddingTop: 16,
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: readOnly ? "default" : "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={q.carryPrevious ?? false}
            disabled={readOnly}
            onChange={(e) =>
              onChange({ ...q, carryPrevious: e.target.checked })
            }
          />
          <History size={15} style={{ color: "var(--blue)" }} />
          <span style={{ fontWeight: 600, color: "var(--ink)" }}>
            Reprendre l'édition précédente
          </span>
        </label>
        <p className="small" style={{ color: "var(--ink-3)", marginLeft: 26 }}>
          Affiche la réponse de la campagne précédente en rappel, sous cette
          question. À activer uniquement sur les questions à comparer d'une
          édition à l'autre.
        </p>
      </div>
    </div>
  );
}

// ─── Composant principal ─────────────────────────────────────────────────────

export interface BuilderMeta {
  title: string;
  description: string;
  formType: string;
  category: string | null;
}

export default function FormBuilder({
  meta,
  onMetaChange,
  questions,
  onQuestionsChange,
  categories,
  onCreateCategory,
  readOnly = false,
  lockType = false,
}: {
  meta: BuilderMeta;
  onMetaChange: (patch: Partial<BuilderMeta>) => void;
  questions: FormQuestion[];
  onQuestionsChange: (qs: FormQuestion[]) => void;
  categories: FormCategory[];
  onCreateCategory: (label: string) => void;
  readOnly?: boolean;
  lockType?: boolean;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const activeQuestion = questions.find((q) => q.id === activeId) ?? null;

  function newQuestion(): FormQuestion {
    return {
      id: crypto.randomUUID(),
      type: "text",
      text: "",
      required: false,
      phase: "all",
      options: [],
      order: questions.length,
      carryPrevious: false,
    };
  }

  function addQuestion() {
    const q = newQuestion();
    onQuestionsChange([...questions, q]);
    setActiveId(q.id);
  }

  function updateQuestion(updated: FormQuestion) {
    onQuestionsChange(
      questions.map((x) => (x.id === updated.id ? updated : x)),
    );
  }

  function deleteQuestion(id: string) {
    onQuestionsChange(questions.filter((x) => x.id !== id));
    if (activeId === id) setActiveId(null);
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = questions.findIndex((q) => q.id === active.id);
    const newIdx = questions.findIndex((q) => q.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    onQuestionsChange(
      arrayMove(questions, oldIdx, newIdx).map((q, i) => ({ ...q, order: i })),
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) 360px",
        gap: 24,
        alignItems: "start",
      }}
      className="fb-grid"
    >
      {/* ── Colonne gauche : structure ── */}
      <div>
        <p
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 1,
            color: "var(--blue)",
            marginBottom: 12,
          }}
        >
          ARCHITECTURE DU FORMULAIRE
        </p>

        <div className="field" style={{ marginBottom: 12 }}>
          <input
            className="input"
            style={{
              fontSize: 20,
              fontWeight: 700,
              border: "none",
              padding: "8px 0",
            }}
            placeholder="Titre du formulaire"
            value={meta.title}
            disabled={readOnly}
            onChange={(e) => onMetaChange({ title: e.target.value })}
          />
        </div>

        <div className="field" style={{ marginBottom: 16 }}>
          <textarea
            className="input"
            rows={2}
            placeholder="Description (optionnelle)"
            value={meta.description}
            disabled={readOnly}
            onChange={(e) => onMetaChange({ description: e.target.value })}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <CategoryTypeSelect
            categories={categories}
            category={meta.category}
            formType={meta.formType}
            readOnly={readOnly}
            lockType={lockType}
            onCategoryChange={(id) => {
              const cat = categories.find((c) => c.id === id);
              const isCustom = !!cat && (cat.types ?? []).length === 0;
              onMetaChange({
                category: id,
                // Catégorie personnalisée → formType générique 'custom'.
                ...(isCustom ? { formType: "custom" } : {}),
              });
            }}
            onTypeChange={(t) => onMetaChange({ formType: t })}
            onCreateCategory={onCreateCategory}
          />
        </div>

        {/* Liste de questions */}
        <div
          className="row between"
          style={{ marginBottom: 12, alignItems: "center" }}
        >
          <h2 className="h3" style={{ margin: 0 }}>
            Questions ({questions.length})
          </h2>
        </div>

        {questions.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: 48,
              border: "2px dashed var(--line)",
              borderRadius: "var(--radius)",
            }}
          >
            <FileText
              size={36}
              style={{ color: "var(--ink-3)", margin: "0 auto 8px" }}
            />
            <p className="small" style={{ marginBottom: 12 }}>
              Aucune question pour l'instant
            </p>
            {!readOnly && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={addQuestion}
              >
                <Plus size={16} /> Ajouter la première question
              </button>
            )}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={questions.map((q) => q.id)}
              strategy={verticalListSortingStrategy}
            >
              {questions.map((q, idx) => (
                <SortableQuestionCard
                  key={q.id}
                  q={q}
                  index={idx}
                  active={activeId === q.id}
                  readOnly={readOnly}
                  onSelect={() => setActiveId(q.id)}
                  onDelete={() => deleteQuestion(q.id)}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}

        {questions.length > 0 && !readOnly && (
          <button
            type="button"
            onClick={addQuestion}
            className="btn btn-ghost btn-block"
            style={{ border: "2px dashed var(--line)", marginTop: 8 }}
          >
            <Plus size={16} /> Ajouter une question
          </button>
        )}
      </div>

      {/* ── Colonne droite : configuration (sticky) ── */}
      <aside
        className="card"
        style={{
          position: "sticky",
          top: 16,
          padding: 20,
          border: "1px solid var(--line)",
          borderRadius: "var(--radius)",
          background: "var(--color-surface, #fff)",
        }}
      >
        <p
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 1,
            color: "var(--blue)",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Hash size={14} /> CONFIGURATION
        </p>
        <ConfigPanel
          q={activeQuestion}
          readOnly={readOnly}
          onChange={updateQuestion}
        />
      </aside>
    </div>
  );
}
