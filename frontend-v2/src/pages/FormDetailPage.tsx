import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Lock,
  Unlock,
  Download,
  Trash2,
  Plus,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { formsApi } from "../api/forms";
import type { FormQuestion } from "../types";
import { PageHead, Tile, Badge, Callout } from "../components/shell";
import { queryKeys } from "../lib/queryKeys";

type FormTone = "blue" | "green" | "amber" | "red" | "grey";

const FORM_TYPE_CONFIG: Record<string, { label: string; tone: FormTone }> = {
  self_evaluation: { label: "Auto-évaluation", tone: "blue" },
  manager_evaluation: { label: "Évaluation manager", tone: "amber" },
  upward_feedback: { label: "Feedback ascendant", tone: "blue" },
  peer_review: { label: "Peer review", tone: "blue" },
  objectives: { label: "Objectifs", tone: "green" },
  mobility_request: { label: "Demande mobilité", tone: "amber" },
  salary_raise_request: { label: "Demande augmentation", tone: "green" },
  promotion_request: { label: "Demande promotion", tone: "blue" },
  training_request: { label: "Demande formation", tone: "green" },
};

export default function FormDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
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
    filledBy: "employee" as "employee" | "manager" | "hr",
    visibleToEvaluatee: true,
  });
  const [questions, setQuestions] = useState<FormQuestion[]>([]);
  const [isDirty, setIsDirty] = useState(false);

  const [deleteModal, setDeleteModal] = useState(false);
  const [freezeModal, setFreezeModal] = useState(false);
  const [unfreezeModal, setUnfreezeModal] = useState(false);

  useEffect(() => {
    if (form) {
      // Synchro one-shot de la donnée serveur vers l'état éditable du builder.
      /* eslint-disable react-hooks/set-state-in-effect */
      setMeta({
        title: form.title,
        description: form.description || "",
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
      setFreezeModal(false);
    },
  });

  const unfreezeMutation = useMutation({
    mutationFn: () => formsApi.unfreezeForm(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.forms.detail(id ?? ""),
      });
      setUnfreezeModal(false);
    },
  });

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

  function addQuestion() {
    const newQ: FormQuestion = {
      id: crypto.randomUUID(),
      type: "text",
      text: "",
      required: false,
    };
    setQuestions((qs) => [...qs, newQ]);
    setIsDirty(true);
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
      {/* Breadcrumb */}
      <p className="eyebrow" style={{ marginBottom: 12 }}>
        <Link to="/forms" className="link">
          Formulaires
        </Link>{" "}
        › {form.title}
      </p>

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
                onClick={() => setFreezeModal(true)}
                className="btn btn-sm"
                style={{ background: "var(--red)", color: "#fff" }}
              >
                <Lock size={16} strokeWidth={1.5} aria-hidden="true" /> Geler
              </button>
            )}
            {isAdmin && isFrozen && (
              <button
                onClick={() => setUnfreezeModal(true)}
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

      {/* Layout pleine largeur — 12 colonnes */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
          gap: 24,
          width: "100%",
        }}
      >
        {/* Colonne gauche — Métadonnées */}
        <div
          style={{
            gridColumn: "span 4 / span 4",
            display: "flex",
            flexDirection: "column",
            gap: 16,
            minWidth: 0,
          }}
        >
          <Tile>
            <h2 className="h3" style={{ marginBottom: 16 }}>
              Métadonnées
            </h2>

            <div className="field" style={{ marginBottom: 16 }}>
              <label htmlFor="form-title">
                Titre <span style={{ color: "var(--red)" }}>*</span>
              </label>
              <input
                id="form-title"
                type="text"
                value={meta.title}
                onChange={(e) => {
                  setMeta((m) => ({ ...m, title: e.target.value }));
                  setIsDirty(true);
                }}
                disabled={isFrozen}
                className="input"
              />
            </div>

            <div className="field" style={{ marginBottom: 16 }}>
              <label htmlFor="form-description">Description</label>
              <textarea
                id="form-description"
                rows={3}
                value={meta.description}
                onChange={(e) => {
                  setMeta((m) => ({ ...m, description: e.target.value }));
                  setIsDirty(true);
                }}
                disabled={isFrozen}
                className="input"
              />
            </div>

            {/* Rempli par */}
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

            {/* Visible par l'évalué */}
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                  userSelect: "none",
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
                  style={{ width: 16, height: 16 }}
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
                  marginTop: 24,
                  paddingTop: 16,
                  borderTop: "1px solid var(--line)",
                }}
              >
                <button
                  onClick={() => setDeleteModal(true)}
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

        {/* Colonne droite — Questions */}
        <div style={{ gridColumn: "span 8 / span 8", minWidth: 0 }}>
          <Tile>
            <div
              className="row between"
              style={{ marginBottom: 16, alignItems: "center" }}
            >
              <h2 className="h3">
                Questions ({questions.length})
                {isFrozen && (
                  <span
                    className="small"
                    style={{ marginLeft: 8, fontWeight: 400 }}
                  >
                    (lecture seule)
                  </span>
                )}
              </h2>
              {!isFrozen && isAdminOrHr && (
                <button onClick={addQuestion} className="btn btn-ghost btn-sm">
                  <Plus size={16} strokeWidth={1.5} aria-hidden="true" />{" "}
                  Ajouter
                </button>
              )}
            </div>

            {questions.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <p className="body">Aucune question dans ce formulaire.</p>
                {!isFrozen && isAdminOrHr && (
                  <button
                    onClick={addQuestion}
                    className="link"
                    style={{
                      marginTop: 8,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    + Ajouter une question
                  </button>
                )}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {questions.map((q, idx) =>
                isFrozen ? (
                  <div
                    key={q.id}
                    style={{
                      background: "var(--bg-alt)",
                      borderRadius: "var(--radius)",
                      border: "1px solid var(--line)",
                      padding: 16,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 999,
                          background: "var(--line)",
                          color: "var(--ink-2)",
                          fontSize: 12,
                          fontWeight: 500,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {idx + 1}
                      </span>
                      <Badge tone="grey">{q.type}</Badge>
                      {q.phase && <span className="small">{q.phase}</span>}
                      {q.required && (
                        <span
                          className="small"
                          style={{ color: "var(--blue)", fontWeight: 600 }}
                        >
                          Requis
                        </span>
                      )}
                    </div>
                    <p className="body">
                      {q.text || (
                        <em style={{ color: "var(--ink-3)" }}>Sans texte</em>
                      )}
                    </p>
                    {q.options && q.options.length > 0 && (
                      <ul
                        style={{
                          marginTop: 8,
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                        }}
                      >
                        {q.options.map((opt, i) => (
                          <li
                            key={`${opt}-${i}`}
                            className="small"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <span
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: 999,
                                background: "var(--line)",
                                flexShrink: 0,
                              }}
                            />
                            {opt}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <div
                    key={q.id}
                    style={{
                      border: "1px solid var(--line)",
                      borderRadius: "var(--radius)",
                      padding: 16,
                      background: "#fff",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 12,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                          paddingTop: 4,
                        }}
                      >
                        <button
                          disabled={idx === 0}
                          onClick={() => {
                            if (idx === 0) return;
                            setQuestions((qs) => {
                              const a = [...qs];
                              [a[idx - 1], a[idx]] = [a[idx], a[idx - 1]];
                              return a;
                            });
                            setIsDirty(true);
                          }}
                          aria-label="Déplacer vers le haut"
                          className="btn btn-ghost btn-sm"
                          style={{ padding: 4 }}
                        >
                          <ChevronUp
                            size={16}
                            strokeWidth={1.5}
                            aria-hidden="true"
                          />
                        </button>
                        <button
                          disabled={idx === questions.length - 1}
                          onClick={() => {
                            if (idx === questions.length - 1) return;
                            setQuestions((qs) => {
                              const a = [...qs];
                              [a[idx], a[idx + 1]] = [a[idx + 1], a[idx]];
                              return a;
                            });
                            setIsDirty(true);
                          }}
                          aria-label="Déplacer vers le bas"
                          className="btn btn-ghost btn-sm"
                          style={{ padding: 4 }}
                        >
                          <ChevronDown
                            size={16}
                            strokeWidth={1.5}
                            aria-hidden="true"
                          />
                        </button>
                      </div>
                      <div
                        style={{
                          flex: 1,
                          minWidth: 0,
                          display: "flex",
                          flexDirection: "column",
                          gap: 12,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            flexWrap: "wrap",
                          }}
                        >
                          <span
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: 999,
                              background: "var(--bg-alt)",
                              color: "var(--blue)",
                              fontSize: 12,
                              fontWeight: 600,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            {idx + 1}
                          </span>
                          <select
                            value={q.type}
                            onChange={(e) => {
                              setQuestions((qs) =>
                                qs.map((x) =>
                                  x.id === q.id
                                    ? {
                                        ...x,
                                        type: e.target
                                          .value as FormQuestion["type"],
                                      }
                                    : x,
                                ),
                              );
                              setIsDirty(true);
                            }}
                            aria-label="Type de question"
                            className="input"
                            style={{
                              width: "auto",
                              fontSize: 13,
                              padding: "6px 10px",
                            }}
                          >
                            {(
                              [
                                "text",
                                "textarea",
                                "rating",
                                "choice",
                                "yes_no",
                              ] as const
                            ).map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                          <label
                            className="small"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              cursor: "pointer",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={q.required}
                              onChange={(e) => {
                                setQuestions((qs) =>
                                  qs.map((x) =>
                                    x.id === q.id
                                      ? { ...x, required: e.target.checked }
                                      : x,
                                  ),
                                );
                                setIsDirty(true);
                              }}
                            />
                            Requis
                          </label>
                        </div>
                        <input
                          type="text"
                          value={q.text}
                          onChange={(e) => {
                            setQuestions((qs) =>
                              qs.map((x) =>
                                x.id === q.id
                                  ? { ...x, text: e.target.value }
                                  : x,
                              ),
                            );
                            setIsDirty(true);
                          }}
                          placeholder="Texte de la question…"
                          aria-label="Texte de la question"
                          className="input"
                        />
                        {q.type === "choice" && (
                          <div className="field">
                            <label htmlFor={`opts-${q.id}`}>
                              Options (une par ligne)
                            </label>
                            <textarea
                              id={`opts-${q.id}`}
                              rows={3}
                              value={(q.options ?? []).join("\n")}
                              onChange={(e) => {
                                setQuestions((qs) =>
                                  qs.map((x) =>
                                    x.id === q.id
                                      ? {
                                          ...x,
                                          options: e.target.value.split("\n"),
                                        }
                                      : x,
                                  ),
                                );
                                setIsDirty(true);
                              }}
                              className="input"
                            />
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          setQuestions((qs) => qs.filter((x) => x.id !== q.id));
                          setIsDirty(true);
                        }}
                        className="btn btn-ghost btn-sm"
                        style={{ padding: 4, color: "var(--ink-3)" }}
                        title="Supprimer la question"
                        aria-label="Supprimer la question"
                      >
                        <Trash2
                          size={16}
                          strokeWidth={1.5}
                          aria-hidden="true"
                        />
                      </button>
                    </div>
                  </div>
                ),
              )}
            </div>
          </Tile>
        </div>
      </div>

      {/* Modal suppression */}
      {deleteModal && (
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
          <Tile style={{ width: "100%", maxWidth: 448, margin: 16 }}>
            <h3 className="h3" style={{ marginBottom: 8 }}>
              Supprimer ce formulaire ?
            </h3>
            <p className="body" style={{ marginBottom: 16 }}>
              Cette action est irréversible. Les campagnes liées ne seront pas
              affectées.
            </p>
            <div
              className="row"
              style={{ gap: 12, justifyContent: "flex-end" }}
            >
              <button
                onClick={() => setDeleteModal(false)}
                className="btn btn-ghost btn-sm"
              >
                Annuler
              </button>
              <button
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="btn btn-sm"
                style={{ background: "var(--red)", color: "#fff" }}
              >
                {deleteMutation.isPending ? "Suppression…" : "Supprimer"}
              </button>
            </div>
          </Tile>
        </div>
      )}

      {/* Modal gel */}
      {freezeModal && (
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
          <Tile style={{ width: "100%", maxWidth: 448, margin: 16 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 999,
                  background: "var(--bg-alt)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Lock
                  size={20}
                  strokeWidth={1.5}
                  aria-hidden="true"
                  color="var(--red)"
                />
              </div>
              <h3 className="h3">Geler ce formulaire ?</h3>
            </div>
            <p className="body" style={{ marginBottom: 16 }}>
              Une fois gelé, les questions ne seront plus modifiables. Cette
              version sera utilisée pour toutes les évaluations associées.
            </p>
            <div
              className="row"
              style={{ gap: 12, justifyContent: "flex-end" }}
            >
              <button
                onClick={() => setFreezeModal(false)}
                className="btn btn-ghost btn-sm"
              >
                Annuler
              </button>
              <button
                onClick={() => freezeMutation.mutate()}
                disabled={freezeMutation.isPending}
                className="btn btn-sm"
                style={{ background: "var(--red)", color: "#fff" }}
              >
                {freezeMutation.isPending
                  ? "Gel en cours…"
                  : "Geler le formulaire"}
              </button>
            </div>
          </Tile>
        </div>
      )}

      {/* Modal dégel */}
      {unfreezeModal && (
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
          <Tile style={{ width: "100%", maxWidth: 448, margin: 16 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 999,
                  background: "var(--bg-alt)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Unlock
                  size={20}
                  strokeWidth={1.5}
                  aria-hidden="true"
                  color="var(--amber)"
                />
              </div>
              <h3 className="h3">Dégeler ce formulaire ?</h3>
            </div>
            <p className="body" style={{ marginBottom: 16 }}>
              Les questions redeviendront modifiables. Les évaluations en cours
              conserveront leurs réponses.
            </p>
            <div
              className="row"
              style={{ gap: 12, justifyContent: "flex-end" }}
            >
              <button
                onClick={() => setUnfreezeModal(false)}
                className="btn btn-ghost btn-sm"
              >
                Annuler
              </button>
              <button
                onClick={() => unfreezeMutation.mutate()}
                disabled={unfreezeMutation.isPending}
                className="btn btn-sm"
                style={{ background: "var(--amber)", color: "#fff" }}
              >
                {unfreezeMutation.isPending ? "Dégel en cours…" : "Dégeler"}
              </button>
            </div>
          </Tile>
        </div>
      )}
    </div>
  );
}
