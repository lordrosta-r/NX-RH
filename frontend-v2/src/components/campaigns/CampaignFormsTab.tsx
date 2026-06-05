import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Plus, X, FileText } from "lucide-react";
import { formsApi } from "../../api/forms";
import type { Campaign, Form } from "../../types";

const FORM_TYPE_LABELS: Record<string, string> = {
  self_evaluation: "Auto-évaluation",
  manager_evaluation: "Évaluation manager",
  upward_feedback: "Feedback montant",
  objectives: "Objectifs",
  peer_review: "Peer review",
};

interface FormMutation {
  mutate: (formId: string) => void;
  isPending: boolean;
}

interface CampaignFormsTabProps {
  campaign: Campaign | undefined;
  isAdminOrHr: boolean;
  addFormModal: boolean;
  setAddFormModal: (v: boolean) => void;
  allForms: Form[];
  formIds: string[];
  linkFormMutation: FormMutation;
  unlinkFormMutation: FormMutation;
}

export default function CampaignFormsTab({
  campaign,
  isAdminOrHr,
  addFormModal,
  setAddFormModal,
  allForms,
  formIds,
  linkFormMutation,
  unlinkFormMutation,
}: CampaignFormsTabProps) {
  const linkedIds = new Set(formIds);
  const availableForms = allForms.filter((f) => !linkedIds.has(f.id));

  const { data: linkedFormsData } = useQuery({
    queryKey: ["forms-linked", formIds],
    queryFn: async () => {
      if (formIds.length === 0) return [];
      return Promise.all(
        formIds.map((fid) => formsApi.getForm(fid).then((r) => r.data)),
      );
    },
    enabled: formIds.length > 0,
  });

  const linkedForms: Form[] = linkedFormsData ?? [];

  return (
    <div className="section-gap">
      <div className="row between wrap nxgap-12">
        <p className="small">
          {formIds.length === 0
            ? "Aucun formulaire associé."
            : `${formIds.length} formulaire${formIds.length > 1 ? "s" : ""} associé${formIds.length > 1 ? "s" : ""}`}
        </p>
        {isAdminOrHr && campaign?.status !== "archived" && (
          <button
            onClick={() => setAddFormModal(true)}
            className="btn btn-secondary btn-sm"
          >
            <Plus className="ico" style={{ width: 14, height: 14 }} />
            Ajouter un formulaire
          </button>
        )}
      </div>

      {formIds.length === 0 ? (
        <div className="tile" style={{ textAlign: "center" }}>
          <FileText
            size={40}
            strokeWidth={1.5}
            aria-hidden="true"
            style={{
              display: "block",
              margin: "0 auto 12px",
              color: "var(--line-strong)",
            }}
          />
          <p className="small">Aucun formulaire associé à cette campagne.</p>
          {isAdminOrHr && campaign?.status !== "archived" && (
            <p style={{ marginTop: 8 }}>
              <button
                onClick={() => setAddFormModal(true)}
                className="link"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Ajouter un formulaire depuis la bibliothèque
              </button>
            </p>
          )}
        </div>
      ) : (
        <div className="tile" style={{ padding: 0, overflow: "hidden" }}>
          {formIds.map((fid) => {
            const form = linkedForms.find((f) => f.id === fid);
            return (
              <div
                key={fid}
                className="tbl-row row between"
                style={{ gridTemplateColumns: undefined, display: "flex" }}
              >
                <Link
                  to={`/forms/${fid}`}
                  className="row nxgap-12"
                  style={{ minWidth: 0, color: "inherit" }}
                >
                  <FileText
                    size={16}
                    strokeWidth={1.5}
                    aria-hidden="true"
                    style={{ color: "var(--ink-3)", flex: "none" }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <p
                      className="body truncate"
                      style={{ fontWeight: 600, color: "var(--ink)" }}
                    >
                      {form?.title ?? `Formulaire #${fid.slice(-6)}`}
                    </p>
                    {form?.formType && (
                      <p className="small">
                        {FORM_TYPE_LABELS[form.formType] ?? form.formType}
                      </p>
                    )}
                  </div>
                </Link>
                <div className="row nxgap-12" style={{ flex: "none", gap: 12 }}>
                  <Link to={`/forms/${fid}`} className="link small">
                    Consulter
                  </Link>
                  {isAdminOrHr && campaign?.status !== "archived" && (
                    <button
                      onClick={() => unlinkFormMutation.mutate(fid)}
                      disabled={unlinkFormMutation.isPending}
                      className="btn btn-ghost btn-sm"
                      style={{ padding: 6, color: "var(--red)" }}
                      aria-label="Retirer ce formulaire"
                    >
                      <X className="ico" style={{ width: 14, height: 14 }} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {addFormModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.5)",
            padding: 16,
          }}
        >
          <div
            className="tile"
            style={{
              padding: 0,
              width: "100%",
              maxWidth: 512,
              display: "flex",
              flexDirection: "column",
              maxHeight: "80vh",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            <div
              className="row between"
              style={{
                padding: 20,
                borderBottom: "1px solid var(--line)",
              }}
            >
              <h3 className="h3">Ajouter un formulaire</h3>
              <button
                onClick={() => setAddFormModal(false)}
                className="btn btn-ghost btn-sm"
                style={{ padding: 6 }}
                aria-label="Fermer"
              >
                <X className="ico" style={{ width: 16, height: 16 }} />
              </button>
            </div>
            <div style={{ overflowY: "auto", flex: 1 }}>
              {availableForms.length === 0 ? (
                <p
                  className="small"
                  style={{ padding: 24, textAlign: "center" }}
                >
                  Tous les formulaires disponibles sont déjà liés à cette
                  campagne.
                </p>
              ) : (
                availableForms.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => linkFormMutation.mutate(f.id)}
                    disabled={linkFormMutation.isPending}
                    className="tbl-row row between"
                    style={{
                      gridTemplateColumns: undefined,
                      display: "flex",
                      width: "100%",
                      textAlign: "left",
                      background: "none",
                      cursor: "pointer",
                      borderTop: "1px solid var(--line)",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <p
                        className="body truncate"
                        style={{ fontWeight: 600, color: "var(--ink)" }}
                      >
                        {f.title}
                      </p>
                      <p className="small">
                        {FORM_TYPE_LABELS[f.formType] ?? f.formType}
                      </p>
                    </div>
                    <Plus
                      size={16}
                      strokeWidth={1.5}
                      aria-hidden="true"
                      style={{
                        color: "var(--blue)",
                        flex: "none",
                        marginLeft: 12,
                      }}
                    />
                  </button>
                ))
              )}
            </div>
            <div style={{ padding: 16, borderTop: "1px solid var(--line)" }}>
              <button
                onClick={() => setAddFormModal(false)}
                className="btn btn-ghost btn-block"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
