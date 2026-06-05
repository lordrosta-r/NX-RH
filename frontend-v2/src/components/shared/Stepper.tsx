type Step = {
  label: string;
  description?: string;
};

type StepperProps = {
  steps: Step[];
  currentStep: number; // 0-indexed
};

export default function Stepper({ steps, currentStep }: StepperProps) {
  return (
    <nav aria-label="Étapes" className="flex items-center gap-0 mb-8 w-full">
      {steps.map((step, i) => {
        const done = i < currentStep;
        const active = i === currentStep;
        const circleStyle = done
          ? {
              background: "var(--green)",
              color: "#fff",
              border: "1px solid var(--green)",
            }
          : active
            ? {
                background: "var(--blue)",
                color: "#fff",
                border: "1px solid var(--blue)",
              }
            : {
                background: "transparent",
                color: "var(--ink-3)",
                border: "1px solid var(--line)",
              };
        const labelColor = active
          ? "var(--blue-text)"
          : done
            ? "var(--ink)"
            : "var(--ink-3)";
        return (
          <div key={step.label} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-colors"
                style={circleStyle}
                aria-current={active ? "step" : undefined}
                aria-label={`Étape ${i + 1} : ${step.label}${done ? " (terminée)" : active ? " (en cours)" : ""}`}
              >
                {done ? (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <div className="mt-1 text-center">
                <p
                  className="text-xs font-semibold"
                  style={{ color: labelColor }}
                >
                  {step.label}
                </p>
                {step.description && (
                  <p
                    className="text-xs hidden md:block"
                    style={{ color: "var(--ink-3)" }}
                  >
                    {step.description}
                  </p>
                )}
              </div>
            </div>
            {i < steps.length - 1 && (
              <div
                className="flex-1 h-0.5 mx-2 mt-[-18px]"
                style={{ background: done ? "var(--green)" : "var(--line)" }}
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}
