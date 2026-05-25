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
          className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
        <button
          type="button"
          onClick={addChip}
          className="px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
        >
          Ajouter
        </button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1 px-2 py-1 bg-primary-50 text-primary-700 text-xs rounded-full"
            >
              {v}
              <button
                type="button"
                onClick={() => onChange(values.filter((x) => x !== v))}
                aria-label={`Supprimer ${v}`}
                className="ml-0.5 hover:text-primary-900 font-bold"
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
