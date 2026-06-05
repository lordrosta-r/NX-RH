import { Bar } from "../shell";

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
      <div style={{ marginBottom: 24 }}>
        <div
          className="small"
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 6,
          }}
        >
          <span>
            {answeredCount}/{totalQuestions} questions répondues
          </span>
          <span>{Math.round(pct)}%</span>
        </div>
        <Bar pct={pct} tone="var(--blue)" />
      </div>

      {phases.length > 1 && (
        <div
          style={{
            display: "flex",
            gap: 6,
            marginBottom: 24,
            overflowX: "auto",
            paddingBottom: 4,
          }}
        >
          <button
            onClick={() => onPhaseChange(null)}
            className={`btn btn-sm ${!currentPhase ? "btn-primary" : "btn-ghost"}`}
          >
            Toutes
          </button>
          {phases.map((phase) => (
            <button
              key={phase}
              onClick={() => onPhaseChange(phase)}
              className={`btn btn-sm ${currentPhase === phase ? "btn-primary" : "btn-ghost"}`}
            >
              {phase}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
