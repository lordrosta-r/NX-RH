import { Sun, CloudSun, CloudRain, CloudLightning } from "lucide-react";

// Rendu LECTURE SEULE d'une réponse, avec le même langage visuel que la saisie :
// une note s'affiche sur son échelle (valeur surlignée), une météo avec ses
// icônes, un oui/non en pastilles, etc. Réutilisé par l'entretien et le rappel
// « édition précédente ».

interface AnswerViewProps {
  value: unknown;
  type?: string;
  scale?: number;
  options?: string[];
}

const WEATHER = [
  { key: "sunny", label: "Ensoleillé", Icon: Sun },
  { key: "cloudy", label: "Nuageux", Icon: CloudSun },
  { key: "rainy", label: "Pluvieux", Icon: CloudRain },
  { key: "stormy", label: "Orageux", Icon: CloudLightning },
] as const;

const chip = (selected: boolean): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 4,
  padding: "6px 12px",
  borderRadius: "var(--radius)",
  fontSize: 13,
  fontWeight: selected ? 600 : 400,
  border: selected ? "2px solid var(--blue)" : "1px solid var(--line)",
  background: selected ? "var(--blue-soft)" : "#fff",
  color: selected ? "var(--blue-text)" : "var(--ink-3)",
});

export function AnswerView({ value, type, scale, options }: AnswerViewProps) {
  const empty = value === null || value === undefined || value === "";

  if (empty) {
    return (
      <span className="body" style={{ color: "var(--ink-3)" }}>
        Sans réponse
      </span>
    );
  }

  if (type === "rating") {
    const max = scale ?? 5;
    const n = Number(value);
    return (
      <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
        {Array.from({ length: max }, (_, i) => i + 1).map((v) => {
          const on = v === n;
          return (
            <span
              key={v}
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: 600,
                border: on ? "2px solid var(--blue)" : "1px solid var(--line)",
                background: on ? "var(--blue)" : "#fff",
                color: on ? "#fff" : "var(--ink-3)",
              }}
            >
              {v}
            </span>
          );
        })}
      </div>
    );
  }

  if (type === "yes_no") {
    return (
      <div className="row" style={{ gap: 8 }}>
        {["Oui", "Non"].map((opt) => (
          <span key={opt} style={chip(String(value) === opt)}>
            {opt}
          </span>
        ))}
      </div>
    );
  }

  if (type === "weather") {
    return (
      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        {WEATHER.map(({ key, label, Icon }) => {
          const on = String(value) === key;
          return (
            <span
              key={key}
              style={{
                ...chip(on),
                flexDirection: "column",
                padding: "8px 12px",
                fontSize: 11,
              }}
            >
              <Icon size={18} strokeWidth={1.5} aria-hidden="true" />
              {label}
            </span>
          );
        })}
      </div>
    );
  }

  if (type === "scale") {
    const pct = Math.max(0, Math.min(100, Number(value)));
    return (
      <div>
        <div
          style={{
            height: 8,
            borderRadius: 999,
            background: "var(--line)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${pct}%`,
              background: "var(--blue)",
            }}
          />
        </div>
        <span
          className="small"
          style={{ color: "var(--blue-text)", fontWeight: 600 }}
        >
          {pct}%
        </span>
      </div>
    );
  }

  if (type === "choice" && options?.length) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {options.map((opt) => (
          <span key={opt} style={chip(String(value) === opt)}>
            {opt}
          </span>
        ))}
      </div>
    );
  }

  // objective_item / mobility (objet structuré)
  if (typeof value === "object") {
    return (
      <span className="body" style={{ whiteSpace: "pre-wrap" }}>
        {Object.entries(value as Record<string, unknown>)
          .filter(([, v]) => v != null && v !== "")
          .map(([k, v]) => `${k} : ${String(v)}`)
          .join(" · ") || "—"}
      </span>
    );
  }

  return (
    <span className="body" style={{ whiteSpace: "pre-wrap" }}>
      {String(value)}
    </span>
  );
}
