"use client";

import type { FilterPreset } from "@/lib/types";

const PRESETS: { key: FilterPreset; label: string }[] = [
  { key: "all", label: "All Migration" },
  { key: "legal", label: "Legal" },
  { key: "border", label: "Border" },
  { key: "overstays", label: "Overstays" },
  { key: "uncounted", label: "Uncounted" },
  { key: "arrests", label: "Arrests" },
];

interface Props {
  active: FilterPreset;
  onChange: (preset: FilterPreset) => void;
}

export default function FilterBar({ active, onChange }: Props) {
  return (
    <div className="bg-white/90 backdrop-blur-2xl rounded-full border border-black/[.06] p-1 flex shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      {PRESETS.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors whitespace-nowrap ${
            active === key
              ? "bg-ink text-white"
              : "text-muted hover:text-ink"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
