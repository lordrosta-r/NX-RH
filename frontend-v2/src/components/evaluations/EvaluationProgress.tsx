interface EvaluationProgressProps {
  answeredCount: number;
  totalQuestions: number;
  phases: string[];
  currentPhase: string | null;
  onPhaseChange: (phase: string | null) => void;
}

export function EvaluationProgress({
  answeredCount,
  totalQuestions,
  phases,
  currentPhase,
  onPhaseChange,
}: EvaluationProgressProps) {
  const pct = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

  return (
    <>
      <div className="mb-6">
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>
            {answeredCount}/{totalQuestions} questions répondues
          </span>
          <span>{Math.round(pct)}%</span>
        </div>
        <div className="bg-slate-100 rounded-full h-2">
          <div
            className="h-2 rounded-full bg-primary-500 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {phases.length > 1 && (
        <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
          <button
            onClick={() => onPhaseChange(null)}
            className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap ${
              !currentPhase
                ? "bg-primary-500 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Toutes
          </button>
          {phases.map((phase) => (
            <button
              key={phase}
              onClick={() => onPhaseChange(phase)}
              className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap ${
                currentPhase === phase
                  ? "bg-primary-500 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {phase}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
