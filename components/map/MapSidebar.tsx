"use client";

import { useState, useMemo } from "react";
import type { EncounterRecord, FilterMode, StatusPreset } from "@/lib/types";
import { DOT_STYLES } from "@/lib/types";
import { REGION_HEX, type OriginRegion } from "@/lib/colors";

import type { FilterPreset } from "@/lib/types";

const PRESET_LABEL: Record<FilterPreset, string> = {
  all: "total encounters",
  legal: "legal admissions",
  border: "border encounters",
  overstays: "visa overstays",
  uncounted: "uncounted (est.)",
  arrests: "ICE arrests",
};

const STATUS_PRESET_LABEL: Record<StatusPreset, string> = {
  all: "all migration",
  approved: "approved immigration",
  pending: "pending status",
  undocumented: "undocumented",
  arrests: "ICE arrests",
};

const STATUS_DESCRIPTION: Record<StatusPreset, string | null> = {
  all: null,
  approved: "have valid immigration status",
  pending: "in the system, waiting for a decision",
  undocumented: "no visa, no pending case",
  arrests: null,
};

const STATUS_DISCLAIMER: Record<StatusPreset, string | null> = {
  all: null,
  approved: null,
  pending: "These people entered through legal or monitored channels. They have court dates, paperwork, and in many cases work permits.",
  undocumented: "Over half entered the US legally — through airports with valid visas — and stayed after their visa expired.",
  arrests: null,
};

const SHOW_VISA_TOGGLE: Set<string> = new Set(["all", "legal", "overstays", "approved"]);

export type BorderView = "entered" | "stopped";

interface Props {
  filterMode: FilterMode;
  activePreset: string;
  data: EncounterRecord[];
  currentMonth: string;
  totalEncounters: number;
  topCountries: Array<{ name: string; region: string; count: number }>;
  topVisas: Array<{ visaClass: string; label: string; count: number }>;
  borderView: BorderView;
  onBorderViewChange: (v: BorderView) => void;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return n.toLocaleString();
}

function formatMonth(m: string): string {
  const [y, mo] = m.split("-");
  const names = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${names[parseInt(mo) - 1]} ${y}`;
}

const VISA_COLORS: Record<string, string> = {
  "H1B": "#4CA064",
  "H2A": "#3D9456",
  "H2B": "#3D9456",
  "L1": "#4CA064",
  "TN": "#4CA064",
  "O1": "#AF52DE",
  "E2": "#6BBF80",
  "E1": "#6BBF80",
  "P1": "#CC6B63",
  "E3": "#50A0AE",
  "R1": "#9462B4",
  "OS": "#C89554",
  "DV": "#7EBC8E",
  "IR": "#6BBF80",
  "F2A": "#6BBF80",
  "EB-1": "#4CA064",
  "EB-2": "#4CA064",
  "EB-3": "#4CA064",
  "REF": "#AF52DE",
};

function visaColor(visaClass: string): string {
  return VISA_COLORS[visaClass] ?? "#8E8E93";
}

export default function MapSidebar({
  filterMode,
  activePreset,
  data,
  currentMonth,
  totalEncounters,
  topCountries,
  topVisas,
  borderView,
  onBorderViewChange,
}: Props) {
  const [groupBy, setGroupBy] = useState<"country" | "visa">("country");

  const monthTotal = useMemo(() => {
    return data
      .filter((d) => d.month === currentMonth)
      .reduce((s, d) => s + d.count, 0);
  }, [data, currentMonth]);

  const showToggle = SHOW_VISA_TOGGLE.has(activePreset);
  const isBorder = activePreset === "border" && filterMode === "pathway";
  const isStatus = filterMode === "status";

  // Compute label
  let label: string;
  if (isBorder) {
    label = borderView === "entered"
      ? "entered through the border"
      : "stopped at the border";
  } else if (isStatus) {
    label = STATUS_PRESET_LABEL[activePreset as StatusPreset] ?? "encounters";
  } else {
    label = PRESET_LABEL[activePreset as FilterPreset] ?? "encounters";
  }

  // Description and disclaimer
  let description: string | null = null;
  let disclaimer: string | null = null;

  if (isBorder) {
    description = borderView === "entered"
      ? "entered and were processed into the US system"
      : "turned away or expelled";
    disclaimer = borderView === "entered"
      ? "“Entered” means processed into the immigration system — not necessarily still here. Many have pending cases or have since been removed."
      : "These people did not enter the United States.";
  } else if (isStatus && activePreset !== "all" && activePreset !== "arrests") {
    description = STATUS_DESCRIPTION[activePreset as StatusPreset] ?? null;
    disclaimer = STATUS_DISCLAIMER[activePreset as StatusPreset] ?? null;
  }

  return (
    <div className="w-56 space-y-3">
      {/* Counter pill */}
      <div className="bg-white rounded-2xl border border-black/[.06] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="text-2xl font-semibold text-ink tracking-tight leading-none tabular-nums">
          {formatNumber(totalEncounters)}
        </div>
        <div className="text-[11px] text-muted mt-1.5">
          {label} through {formatMonth(currentMonth)}
        </div>
        {description && (
          <div className="text-[10px] text-muted/70 mt-1">
            {description}
          </div>
        )}
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-sm font-semibold text-ink tabular-nums">
            {formatNumber(monthTotal)}
          </span>
          <span className="text-[11px] text-muted">this month</span>
        </div>
      </div>

      {/* Top origins / visas */}
      <div className="bg-white rounded-2xl border border-black/[.06] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        {isBorder && (
          <div className="flex bg-black/[.04] rounded-full p-0.5 mb-3">
            <button
              onClick={() => onBorderViewChange("entered")}
              className={`flex-1 text-[10px] font-medium px-3 py-1 rounded-full transition-colors ${
                borderView === "entered"
                  ? "bg-white text-ink shadow-sm"
                  : "text-muted"
              }`}
            >
              Entered
            </button>
            <button
              onClick={() => onBorderViewChange("stopped")}
              className={`flex-1 text-[10px] font-medium px-3 py-1 rounded-full transition-colors ${
                borderView === "stopped"
                  ? "bg-white text-ink shadow-sm"
                  : "text-muted"
              }`}
            >
              Stopped
            </button>
          </div>
        )}

        {showToggle && (
          <div className="flex bg-black/[.04] rounded-full p-0.5 mb-3">
            <button
              onClick={() => setGroupBy("country")}
              className={`flex-1 text-[10px] font-medium px-3 py-1 rounded-full transition-colors ${
                groupBy === "country"
                  ? "bg-white text-ink shadow-sm"
                  : "text-muted"
              }`}
            >
              By country
            </button>
            <button
              onClick={() => setGroupBy("visa")}
              className={`flex-1 text-[10px] font-medium px-3 py-1 rounded-full transition-colors ${
                groupBy === "visa"
                  ? "bg-white text-ink shadow-sm"
                  : "text-muted"
              }`}
            >
              By visa
            </button>
          </div>
        )}

        {!showToggle && !isBorder && (
          <div className="text-xs font-medium text-muted tracking-tight mb-3">
            Top origins
          </div>
        )}

        {(showToggle && groupBy === "visa") ? (
          <div className="space-y-2">
            {topVisas.map((v, i) => (
              <div key={v.visaClass} className="flex items-center gap-2">
                <span className="text-[11px] text-muted w-3 tabular-nums">{i + 1}</span>
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: visaColor(v.visaClass) }}
                />
                <span className="text-xs font-medium text-ink tracking-tight truncate flex-1">
                  {v.label}
                </span>
                <span className="text-[11px] text-muted tabular-nums">
                  {formatNumber(v.count)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {topCountries.map((c, i) => (
              <div key={c.name} className="flex items-center gap-2">
                <span className="text-[11px] text-muted w-3 tabular-nums">{i + 1}</span>
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{
                    backgroundColor:
                      REGION_HEX[c.region as OriginRegion] ?? REGION_HEX.other,
                  }}
                />
                <span className="text-xs font-medium text-ink tracking-tight truncate flex-1">
                  {c.name}
                </span>
                <span className="text-[11px] text-muted tabular-nums">
                  {formatNumber(c.count)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Disclaimer */}
      {disclaimer && (
        <div className="bg-white rounded-2xl border border-black/[.06] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="text-[10px] text-muted/70 leading-relaxed">
            {disclaimer}
          </div>
        </div>
      )}
    </div>
  );
}
