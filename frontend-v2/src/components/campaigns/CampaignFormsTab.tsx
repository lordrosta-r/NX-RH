import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Plus, X, FileText } from "lucide-react";
import { formsApi } from "../../api/forms";
import type { Campaign, Form } from "../../types";

const FORM_TYPE_LABELS: Record<string, string> = {
  self_evaluation: "Auto-évaluation",
  manager_evaluation: "Évaluation manager",
  upward_feedback: "Feedback montant",
  director_evaluation: "Évaluation directeur",
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {formIds.length === 0
            ? "Aucun formulaire associé."
            : `${formIds.length} formulaire${formIds.length > 1 ? "s" : ""} associé${formIds.length > 1 ? "s" : ""}`}
        </p>
        {isAdminOrHr && campaign?.status !== "archived" && (
          <button
            onClick={() => setAddFormModal(true)}
            className="flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 border border-primary-200 rounded-lg px-3 py-1.5 hover:bg-primary-50 transition-colors"
          >
            <Plus size={14} />
            Ajouter un formulaire
          </button>
        )}
      </div>

      {formIds.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 text-center text-slate-600 text-sm">
          <FileText className="w-10 h-10 mx-auto mb-3 text-slate-200" />
          Aucun formulaire associé à cette campagne.
          {isAdminOrHr && campaign?.status !== "archived" && (
            <p className="mt-2">
              <button
                onClick={() => setAddFormModal(true)}
                className="text-primary-600 hover:underline"
              >
                Ajouter un formulaire depuis la bibliothèque
              </button>
            </p>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 divide-y divide-slate-100">
          {formIds.map((fid) => {
            const form = linkedForms.find((f) => f.id === fid);
            return (
              <div
                key={fid}
                className="flex items-center justify-between p-4 hover:bg-slate-50 group"
              >
                <Link
                  to={`/forms/${fid}`}
                  className="flex items-center gap-3 min-w-0"
                >
                  <FileText size={16} className="text-slate-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-slate-700 group-hover:text-slate-900 truncate">
                      {form?.title ?? `Formulaire #${fid.slice(-6)}`}
                    </p>
                    {form?.formType && (
                      <p className="text-xs text-slate-500">
                        {FORM_TYPE_LABELS[form.formType] ?? form.formType}
                      </p>
                    )}
                  </div>
                </Link>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    to={`/forms/${fid}`}
                    className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Consulter
                  </Link>
                  {isAdminOrHr && campaign?.status !== "archived" && (
                    <button
                      onClick={() => unlinkFormMutation.mutate(fid)}
                      disabled={unlinkFormMutation.isPending}
                      className="p-1.5 rounded text-slate-300 hover:text-error-500 hover:bg-error-50 transition-colors"
                      aria-label="Retirer ce formulaire"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {addFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-900">
                Ajouter un formulaire
              </h3>
              <button
                onClick={() => setAddFormModal(false)}
                className="p-1.5 rounded hover:bg-slate-100 text-slate-400"
              >
                <X size={16} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
              {availableForms.length === 0 ? (
                <p className="p-6 text-center text-slate-600 text-sm">
                  Tous les formulaires disponibles sont déjà liés à cette
                  campagne.
                </p>
              ) : (
                availableForms.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => linkFormMutation.mutate(f.id)}
                    disabled={linkFormMutation.isPending}
                    className="w-full flex items-center justify-between p-4 hover:bg-slate-50 text-left transition-colors disabled:opacity-50"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-slate-700 truncate">
                        {f.title}
                      </p>
                      <p className="text-xs text-slate-500">
                        {FORM_TYPE_LABELS[f.formType] ?? f.formType}
                      </p>
                    </div>
                    <Plus
                      size={16}
                      className="text-primary-500 shrink-0 ml-3"
                    />
                  </button>
                ))
              )}
            </div>
            <div className="p-4 border-t border-slate-100">
              <button
                onClick={() => setAddFormModal(false)}
                className="w-full border border-slate-200 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-medium"
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
