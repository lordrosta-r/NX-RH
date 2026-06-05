import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import { Sun, CloudSun, CloudRain, CloudLightning } from "lucide-react";
import type { Evaluation, FormQuestion } from "../../types";
import type { EvalMutationHandle } from "../../types/evaluation";
import { EvaluationProgress } from "./EvaluationProgress";
import { N1ImportView } from "./N1ImportView";

// États de la « météo humeur » (type de question `weather`).
const WEATHER_OPTIONS = [
  { key: "sunny", label: "Ensoleillé", Icon: Sun },
  { key: "cloudy", label: "Nuageux", Icon: CloudSun },
  { key: "rainy", label: "Pluvieux", Icon: CloudRain },
  { key: "stormy", label: "Orageux", Icon: CloudLightning },
] as const;

// Lecture sûre d'un sous-champ d'une réponse stockée comme objet
// (types `objective_item` et `mobility`).
function objField(value: unknown, key: string): string {
  if (value && typeof value === "object" && key in value) {
    const v = (value as Record<string, unknown>)[key];
    return v == null ? "" : String(v);
  }
  return "";
}

// Retourne la valeur courante comme objet « spreadable », {} sinon.
function objBase(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

interface EvaluationSkillsFormProps {
  evaluation: Evaluation;
  answers: Record<string, unknown>;
  currentQuestionIdx: number;
  currentPhase: string | null;
  submitModal: boolean;
  questions: FormQuestion[];
  phases: string[];
  filteredQuestions: FormQuestion[];
  currentQuestion: FormQuestion | undefined;
  answeredCount: number;
  lastSavedAt: Date | null;
  setAnswer: (questionId: string, value: unknown) => void;
  setCurrentQuestionIdx: Dispatch<SetStateAction<number>>;
  setCurrentPhase: Dispatch<SetStateAction<string | null>>;
  setSubmitModal: Dispatch<SetStateAction<boolean>>;
  submitMutation: EvalMutationHandle;
}

export function EvaluationSkillsForm({
  evaluation,
  answers,
  currentQuestionIdx,
  currentPhase,
  submitModal,
  questions,
  phases,
  filteredQuestions,
  currentQuestion,
  answeredCount,
  lastSavedAt,
  setAnswer,
  setCurrentQuestionIdx,
  setCurrentPhase,
  setSubmitModal,
  submitMutation,
}: EvaluationSkillsFormProps) {
  const handlePhaseChange = useCallback(
    (phase: string | null) => {
      setCurrentPhase(phase);
      setCurrentQuestionIdx(0);
    },
    [setCurrentPhase, setCurrentQuestionIdx],
  );

  return (
    <div>
      <div className="row between" style={{ marginBottom: 8 }}>
        <h1 className="h2">Remplir l'évaluation</h1>
        {lastSavedAt && (
          <span className="small">
            Sauvegardé à{" "}
            {lastSavedAt.toLocaleTimeString("fr-FR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
      </div>

      <EvaluationProgress
        answeredCount={answeredCount}
        totalQuestions={questions.length}
        phases={phases}
        currentPhase={currentPhase}
        onPhaseChange={handlePhaseChange}
      />

      {currentQuestion && (
        <div className="tile" style={{ marginBottom: 16 }}>
          <p className="small" style={{ marginBottom: 8 }}>
            Question {currentQuestionIdx + 1} / {filteredQuestions.length}
          </p>
          <p
            className="body"
            style={{
              fontWeight: 600,
              color: "var(--ink)",
              marginBottom: 16,
            }}
          >
            {currentQuestion.text}
          </p>

          {currentQuestion.type === "rating" && (
            <div className="row" style={{ gap: 8 }}>
              {[1, 2, 3, 4, 5].map((v) => {
                const selected = answers[currentQuestion.id] === v;
                return (
                  <button
                    key={v}
                    onClick={() => setAnswer(currentQuestion.id, v)}
                    aria-label={`Note ${v}`}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      fontWeight: 600,
                      fontSize: 14,
                      cursor: "pointer",
                      transition: "background 0.12s, border-color 0.12s",
                      border: selected
                        ? "2px solid var(--blue)"
                        : "1px solid var(--line)",
                      background: selected ? "var(--blue)" : "#fff",
                      color: selected ? "#fff" : "var(--ink-2)",
                    }}
                  >
                    {v}
                  </button>
                );
              })}
            </div>
          )}

          {(currentQuestion.type === "text" ||
            currentQuestion.type === "textarea") && (
            <textarea
              rows={4}
              value={String(answers[currentQuestion.id] ?? "")}
              onChange={(e) => setAnswer(currentQuestion.id, e.target.value)}
              placeholder="Votre réponse…"
              aria-label={currentQuestion.text}
              className="input"
            />
          )}

          {currentQuestion.type === "yes_no" && (
            <div className="row" style={{ gap: 12 }}>
              {["Oui", "Non"].map((opt) => {
                const selected = answers[currentQuestion.id] === opt;
                return (
                  <button
                    key={opt}
                    onClick={() => setAnswer(currentQuestion.id, opt)}
                    style={{
                      padding: "9px 24px",
                      borderRadius: "var(--radius)",
                      fontWeight: 600,
                      fontSize: 14,
                      cursor: "pointer",
                      transition: "background 0.12s, border-color 0.12s",
                      border: selected
                        ? "2px solid var(--blue)"
                        : "1px solid var(--line)",
                      background: selected ? "var(--blue)" : "#fff",
                      color: selected ? "#fff" : "var(--ink-2)",
                    }}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          )}

          {currentQuestion.type === "choice" && currentQuestion.options && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {currentQuestion.options.map((opt) => {
                const selected = answers[currentQuestion.id] === opt;
                return (
                  <button
                    key={opt}
                    onClick={() => setAnswer(currentQuestion.id, opt)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "12px 16px",
                      borderRadius: "var(--radius)",
                      fontSize: 14,
                      cursor: "pointer",
                      transition: "background 0.12s, border-color 0.12s",
                      border: selected
                        ? "2px solid var(--blue)"
                        : "1px solid var(--line)",
                      background: selected ? "var(--blue-soft)" : "#fff",
                      color: selected ? "var(--blue-text)" : "var(--ink-2)",
                      fontWeight: selected ? 600 : 400,
                    }}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          )}

          {currentQuestion.type === "scale" && (
            <div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={Number(answers[currentQuestion.id] ?? 0)}
                onChange={(e) =>
                  setAnswer(currentQuestion.id, Number(e.target.value))
                }
                style={{ width: "100%", accentColor: "var(--blue)" }}
                aria-label={currentQuestion.text}
              />
              <div
                className="small"
                style={{
                  fontWeight: 600,
                  color: "var(--blue-text)",
                  marginTop: 4,
                }}
              >
                {Number(answers[currentQuestion.id] ?? 0)}%
              </div>
            </div>
          )}

          {currentQuestion.type === "weather" && (
            <div className="row" style={{ gap: 12 }}>
              {WEATHER_OPTIONS.map(({ key, label, Icon }) => {
                const selected = answers[currentQuestion.id] === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setAnswer(currentQuestion.id, key)}
                    aria-pressed={selected}
                    title={label}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 4,
                      padding: "12px 16px",
                      borderRadius: "var(--radius)",
                      fontSize: 12,
                      cursor: "pointer",
                      transition: "background 0.12s, border-color 0.12s",
                      border: selected
                        ? "2px solid var(--blue)"
                        : "1px solid var(--line)",
                      background: selected ? "var(--blue-soft)" : "#fff",
                      color: selected ? "var(--blue-text)" : "var(--ink-2)",
                      fontWeight: selected ? 600 : 400,
                    }}
                  >
                    <Icon size={24} strokeWidth={1.5} aria-hidden="true" />
                    {label}
                  </button>
                );
              })}
            </div>
          )}

          {currentQuestion.type === "objective_item" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="field">
                <label htmlFor={`${currentQuestion.id}-desc`}>Objectif</label>
                <textarea
                  id={`${currentQuestion.id}-desc`}
                  rows={2}
                  value={objField(answers[currentQuestion.id], "description")}
                  onChange={(e) =>
                    setAnswer(currentQuestion.id, {
                      ...objBase(answers[currentQuestion.id]),
                      description: e.target.value,
                    })
                  }
                  placeholder="Décrivez l'objectif…"
                  className="input"
                />
              </div>
              <div className="field">
                <label htmlFor={`${currentQuestion.id}-progress`}>
                  Avancement :{" "}
                  {objField(answers[currentQuestion.id], "progress") || 0}%
                </label>
                <input
                  id={`${currentQuestion.id}-progress`}
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={Number(
                    objField(answers[currentQuestion.id], "progress") || 0,
                  )}
                  onChange={(e) =>
                    setAnswer(currentQuestion.id, {
                      ...objBase(answers[currentQuestion.id]),
                      progress: Number(e.target.value),
                    })
                  }
                  style={{ width: "100%", accentColor: "var(--blue)" }}
                />
              </div>
            </div>
          )}

          {currentQuestion.type === "mobility" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="field">
                <label htmlFor={`${currentQuestion.id}-wish`}>
                  Souhait de mobilité
                </label>
                <select
                  id={`${currentQuestion.id}-wish`}
                  value={objField(answers[currentQuestion.id], "wish")}
                  onChange={(e) =>
                    setAnswer(currentQuestion.id, {
                      ...objBase(answers[currentQuestion.id]),
                      wish: e.target.value,
                    })
                  }
                  className="input"
                >
                  <option value="">Sélectionner…</option>
                  <option value="none">Aucun souhait</option>
                  <option value="functional">
                    Mobilité fonctionnelle (poste)
                  </option>
                  <option value="geographic">
                    Mobilité géographique (lieu)
                  </option>
                  <option value="both">Les deux</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor={`${currentQuestion.id}-details`}>
                  Précisions (optionnel)
                </label>
                <textarea
                  id={`${currentQuestion.id}-details`}
                  rows={2}
                  value={objField(answers[currentQuestion.id], "details")}
                  onChange={(e) =>
                    setAnswer(currentQuestion.id, {
                      ...objBase(answers[currentQuestion.id]),
                      details: e.target.value,
                    })
                  }
                  placeholder="Poste, lieu, horizon souhaité…"
                  className="input"
                />
              </div>
            </div>
          )}

          {currentQuestion.type === "n1_import" && (
            <N1ImportView evaluationId={evaluation.id} />
          )}

          {currentQuestion.type === "rating" && (
            <div className="field" style={{ marginTop: 16 }}>
              <label htmlFor={`${currentQuestion.id}-note`}>
                Note (optionnelle)
              </label>
              <input
                id={`${currentQuestion.id}-note`}
                type="text"
                value={String(answers[`${currentQuestion.id}_note`] ?? "")}
                onChange={(e) =>
                  setAnswer(`${currentQuestion.id}_note`, e.target.value)
                }
                placeholder="Commentaire…"
                className="input"
              />
            </div>
          )}
        </div>
      )}

      <div className="row between">
        <button
          disabled={currentQuestionIdx === 0}
          onClick={() => setCurrentQuestionIdx((i) => i - 1)}
          className="btn btn-ghost btn-sm"
        >
          ← Précédent
        </button>
        {currentQuestionIdx < filteredQuestions.length - 1 ? (
          <button
            onClick={() => setCurrentQuestionIdx((i) => i + 1)}
            className="btn btn-primary btn-sm"
          >
            Suivant →
          </button>
        ) : (
          <button
            onClick={() => setSubmitModal(true)}
            className="btn btn-sm"
            style={{ background: "var(--green)", color: "#fff" }}
          >
            Soumettre l'évaluation
          </button>
        )}
      </div>

      {submitModal && (
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
          <div
            style={{
              background: "#fff",
              borderRadius: "var(--radius-lg)",
              padding: 24,
              width: "100%",
              maxWidth: 448,
              boxShadow: "var(--shadow-lg)",
            }}
          >
            <h3 className="h3" style={{ marginBottom: 8 }}>
              Confirmer la soumission ?
            </h3>
            <p className="body" style={{ marginBottom: 16 }}>
              Vous ne pourrez plus modifier vos réponses après soumission.{" "}
              {answeredCount < questions.length && (
                <span style={{ color: "var(--amber)", fontWeight: 600 }}>
                  {questions.length - answeredCount} question(s) non
                  répondue(s).
                </span>
              )}
            </p>
            <div
              className="row"
              style={{ gap: 12, justifyContent: "flex-end" }}
            >
              <button
                onClick={() => setSubmitModal(false)}
                className="btn btn-ghost btn-sm"
              >
                Annuler
              </button>
              <button
                onClick={() => submitMutation.mutate()}
                disabled={submitMutation.isPending}
                className="btn btn-sm"
                style={{ background: "var(--green)", color: "#fff" }}
              >
                {submitMutation.isPending
                  ? "Soumission…"
                  : "Confirmer la soumission"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
