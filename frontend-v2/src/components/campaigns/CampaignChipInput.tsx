import { useState } from "react";

interface CampaignChipInputProps {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}

export default function CampaignChipInput({
  values,
  onChange,
  placeholder,
}: CampaignChipInputProps) {
  const [input, setInput] = useState("");

  function addChip() {
    const v = input.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setInput("");
  }

  return (
    <div>
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addChip();
            }
          }}
          placeholder={placeholder}
          aria-label={placeholder ?? "Ajouter une valeur"}
          className="input flex-1"
        />
        <button
          type="button"
          onClick={addChip}
          className="btn btn-ghost btn-sm"
        >
          Ajouter
        </button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.map((v) => (
            <span key={v} className="badge blue">
              {v}
              <button
                type="button"
                onClick={() => onChange(values.filter((x) => x !== v))}
                aria-label={`Supprimer ${v}`}
                className="inline-flex items-center font-bold"
                style={{ color: "var(--blue-text)" }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
