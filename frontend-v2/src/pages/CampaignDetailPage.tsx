import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import Breadcrumbs from "../components/ui/Breadcrumbs";
import {
  CampaignDetailHeader,
  CampaignDetailOverview,
  CampaignFormsTab,
  CampaignCloneModal,
  CampaignDeleteModal,
} from "../components/campaigns";
import { useCampaignDetail } from "../hooks/useCampaignDetail";

type Tab = "overview" | "evaluations" | "forms";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Aperçu" },
  { id: "evaluations", label: "Évaluations" },
  { id: "forms", label: "Formulaires" },
];

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>("overview");
  const [cloneModal, setCloneModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);

  const detail = useCampaignDetail(id);

  if (detail.isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!detail.campaign) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <Breadcrumbs
        items={[
          { label: "Campagnes", href: "/campaigns" },
          { label: detail.campaign.name },
        ]}
      />

      <CampaignDetailHeader
        campaign={detail.campaign}
        id={id!}
        isAdminOrHr={detail.isAdminOrHr}
        isActivating={detail.isActivating}
        isClosing={detail.isClosing}
        isArchiving={detail.isArchiving}
        onActivate={detail.activate}
        onClose={detail.close}
        onArchive={detail.archive}
        onCloneClick={() => setCloneModal(true)}
        onDeleteClick={() => setDeleteModal(true)}
      />

      <div className="flex gap-1 border-b border-slate-200 mb-6 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
              tab === t.id
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <CampaignDetailOverview
          analytics={detail.analytics}
          analyticsLoading={detail.analyticsLoading}
          campaign={detail.campaign}
        />
      )}

      {tab === "evaluations" && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 text-center">
          {detail.campaign.status === "draft" ? (
            <p className="text-slate-400 text-sm">
              Aucune évaluation disponible — la campagne est en brouillon.
            </p>
          ) : (
            <>
              <p className="text-slate-500 mb-4">
                Consultez les évaluations associées à cette campagne.
              </p>
              <Link
                to={`/evaluations?campaign=${id}`}
                className="inline-flex items-center gap-1 text-primary-600 font-medium hover:text-primary-700"
              >
                Voir les évaluations de cette campagne →
              </Link>
            </>
          )}
        </div>
      )}

      {tab === "forms" && (
        <CampaignFormsTab
          campaign={detail.campaign}
          isAdminOrHr={detail.isAdminOrHr}
          addFormModal={detail.addFormModal}
          setAddFormModal={detail.setAddFormModal}
          allForms={detail.allForms}
          formIds={detail.campaign.formIds ?? []}
          linkFormMutation={detail.linkForm}
          unlinkFormMutation={detail.unlinkForm}
        />
      )}

      {cloneModal && (
        <CampaignCloneModal
          campaignName={detail.campaign.name}
          isPending={detail.isCloning}
          onClose={() => setCloneModal(false)}
          onConfirm={() => {
            detail.clone();
            setCloneModal(false);
          }}
        />
      )}

      {deleteModal && (
        <CampaignDeleteModal
          campaignName={detail.campaign.name}
          isPending={detail.isDeleting}
          onClose={() => setDeleteModal(false)}
          onDelete={detail.remove}
        />
      )}
    </div>
  );
}
