"use client";

import { useRef, useEffect, useState } from "react";
import type { FilterPreset } from "@/lib/types";

const PRESETS: { key: FilterPreset; label: string }[] = [
  { key: "all", label: "All" },
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [pillStyle, setPillStyle] = useState<{ left: number; width: number }>({
    left: 0,
    width: 0,
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const activeBtn = container.querySelector<HTMLButtonElement>(
      `[data-preset="${active}"]`
    );
    if (!activeBtn) return;
    setPillStyle({
      left: activeBtn.offsetLeft,
      width: activeBtn.offsetWidth,
    });
  }, [active]);

  return (
    <div
      ref={containerRef}
      className="relative bg-white/90 backdrop-blur-2xl rounded-full border border-black/[.06] p-1 flex shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
    >
      <div
        className="absolute top-1 h-[calc(100%-8px)] rounded-full bg-ink"
        style={{
          left: pillStyle.left,
          width: pillStyle.width,
          transition: "left 320ms cubic-bezier(0.32, 0.72, 0, 1), width 320ms cubic-bezier(0.32, 0.72, 0, 1)",
        }}
      />
      {PRESETS.map(({ key, label }) => (
        <button
          key={key}
          data-preset={key}
          onClick={() => onChange(key)}
          className="relative z-10 px-3.5 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap"
          style={{
            color: active === key ? "white" : undefined,
            transition: "color 200ms ease",
          }}
        >
          <span className={active !== key ? "text-muted hover:text-ink transition-colors" : ""}>
            {label}
          </span>
        </button>
      ))}
    </div>
  );
}
