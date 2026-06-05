import { Link } from "react-router-dom";
import Stepper from "../components/shared/Stepper";
import {
  CampaignGeneralInfoForm,
  CampaignParticipantsForm,
  CampaignSummaryStep,
  CampaignFormStepper,
  CampaignFormCard,
} from "../components/campaigns";
import { useCampaignForm, WIZARD_STEPS } from "../hooks/useCampaignForm";
import { PageHead, Tile } from "../components/shell";

export default function CampaignNewPage() {
  const {
    register,
    errors,
    form,
    set,
    currentStep,
    totalSteps,
    handleNext,
    handlePrev,
    handleSubmit,
    prevCampaigns,
    sectorsData,
    groupsData,
    isCreating,
  } = useCampaignForm();

  return (
    <div className="nx-app">
      <PageHead
        eyebrow={
          <>
            <Link to="/" className="link">
              Accueil
            </Link>{" "}
            ›{" "}
            <Link to="/campaigns" className="link">
              Campagnes
            </Link>{" "}
            › Nouvelle campagne
          </>
        }
        title="Nouvelle campagne"
      />

      <Tile style={{ marginBottom: 24 }}>
        <Stepper steps={WIZARD_STEPS} currentStep={currentStep} />
      </Tile>

      {currentStep === 0 && (
        <CampaignGeneralInfoForm
          register={register}
          errors={errors}
          form={form}
          set={set}
          prevCampaigns={prevCampaigns}
        />
      )}

      {currentStep === 1 && (
        <CampaignFormCard title="Formulaires">
          <p className="body">
            Les formulaires se gèrent depuis la page de la campagne, une fois
            celle-ci créée. Rendez-vous dans l'onglet{" "}
            <span style={{ fontWeight: 600, color: "var(--ink)" }}>
              Formulaires
            </span>{" "}
            pour associer un ou plusieurs formulaires depuis la bibliothèque.
          </p>
        </CampaignFormCard>
      )}

      {currentStep === 2 && (
        <CampaignParticipantsForm
          form={form}
          set={set}
          sectorsData={sectorsData}
          groupsData={groupsData}
        />
      )}

      {currentStep === 3 && (
        <CampaignSummaryStep form={form} groupsData={groupsData} />
      )}

      <CampaignFormStepper
        currentStep={currentStep}
        totalSteps={totalSteps}
        onNext={handleNext}
        onPrev={handlePrev}
        onSubmit={handleSubmit}
        isSubmitting={isCreating}
      />
    </div>
  );
}
