import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  CampaignDetailHeader,
  CampaignDetailOverview,
  CampaignFormsTab,
  CampaignCloneModal,
  CampaignDeleteModal,
} from "../components/campaigns";
import { useCampaignDetail } from "../hooks/useCampaignDetail";
import { Tile } from "../components/shell";

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
      <div className="nx-app">
        <div className="row" style={{ justifyContent: "center", padding: 96 }}>
          <div className="w-8 h-8 border-4 border-[#1b1b78] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!detail.campaign) return null;

  return (
    <div className="nx-app">
      <p className="eyebrow" style={{ marginBottom: 12 }}>
        <Link to="/campaigns" className="link">
          Campagnes
        </Link>{" "}
        › {detail.campaign.name}
      </p>

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

      <div
        className="row"
        style={{
          gap: 0,
          borderBottom: "1px solid var(--line)",
          marginBottom: 24,
          overflowX: "auto",
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="small"
            style={{
              padding: "10px 16px",
              whiteSpace: "nowrap",
              background: "none",
              border: "none",
              borderBottom:
                tab === t.id
                  ? "2px solid var(--blue)"
                  : "2px solid transparent",
              color: tab === t.id ? "var(--blue)" : "var(--ink-3)",
              fontWeight: tab === t.id ? 700 : 500,
              cursor: "pointer",
            }}
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
        <Tile style={{ textAlign: "center", padding: 32 }}>
          {detail.campaign.status === "draft" ? (
            <p className="body">
              Aucune évaluation disponible — la campagne est en brouillon.
            </p>
          ) : (
            <>
              <p className="body" style={{ marginBottom: 16 }}>
                Consultez les évaluations associées à cette campagne.
              </p>
              <Link to={`/evaluations?campaign=${id}`} className="link">
                Voir les évaluations de cette campagne →
              </Link>
            </>
          )}
        </Tile>
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
