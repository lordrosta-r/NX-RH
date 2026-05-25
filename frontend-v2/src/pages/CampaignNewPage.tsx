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
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <nav className="text-sm text-slate-500 mb-1">
          <Link to="/" className="hover:text-slate-700">
            Accueil
          </Link>
          <span className="mx-1.5">›</span>
          <Link to="/campaigns" className="hover:text-slate-700">
            Campagnes
          </Link>
          <span className="mx-1.5">›</span>
          <span>Nouvelle campagne</span>
        </nav>
        <h1 className="text-2xl font-bold text-slate-900">Nouvelle campagne</h1>
      </div>

      <Stepper steps={WIZARD_STEPS} currentStep={currentStep} />

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
          <p className="text-sm text-slate-500">
            Les formulaires se gèrent depuis la page de la campagne, une fois
            celle-ci créée. Rendez-vous dans l'onglet{" "}
            <span className="font-medium text-slate-700">Formulaires</span> pour
            associer un ou plusieurs formulaires depuis la bibliothèque.
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
