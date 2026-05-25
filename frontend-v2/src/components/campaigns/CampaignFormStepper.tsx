import { Link } from "react-router-dom";
import Button from "../ui/Button";

interface CampaignFormStepperProps {
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export default function CampaignFormStepper({
  currentStep,
  totalSteps,
  onNext,
  onPrev,
  onSubmit,
  isSubmitting,
}: CampaignFormStepperProps) {
  const isLastStep = currentStep >= totalSteps - 1;

  return (
    <div className="flex items-center justify-between pt-2">
      <div>
        {currentStep > 0 ? (
          <Button variant="secondary" onClick={onPrev}>
            ← Précédent
          </Button>
        ) : (
          <Link
            to="/campaigns"
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Annuler
          </Link>
        )}
      </div>

      <div>
        {!isLastStep ? (
          <Button variant="primary" onClick={onNext}>
            Suivant →
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={onSubmit}
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            Créer la campagne
          </Button>
        )}
      </div>
    </div>
  );
}
