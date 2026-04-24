"use client";

import { useState, useMemo } from "react";
import type { EncounterRecord } from "@/lib/types";
import { DOT_STYLES } from "@/lib/types";
import { REGION_HEX, type OriginRegion } from "@/lib/colors";

import type { FilterPreset } from "@/lib/types";

const PRESET_LABEL: Record<FilterPreset, string> = {
  all: "total encounters",
  legal: "legal admissions",
  border: "border encounters",
  overstays: "visa overstays",
  uncounted: "uncounted (est.)",
  arrests: "arrests",
};

const SHOW_VISA_TOGGLE: Set<FilterPreset> = new Set(["all", "legal", "overstays"]);

interface Props {
  activePreset: FilterPreset;
  data: EncounterRecord[];
  currentMonth: string;
  totalEncounters: number;
  topCountries: Array<{ name: string; region: string; count: number }>;
  topVisas: Array<{ visaClass: string; label: string; count: number }>;
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
  "H1B": "#5B7FB5",
  "H2A": "#7EBC8E",
  "H2B": "#56A86C",
  "L1": "#7090C8",
  "TN": "#4080C0",
  "O1": "#AF52DE",
  "E2": "#D9A766",
  "E1": "#CC9058",
  "P1": "#CC6B63",
  "E3": "#50A0AE",
  "R1": "#9462B4",
  "OS": "#C89554",
  "DV": "#7EBC8E",
  "IR": "#D9A766",
  "F2A": "#CC9058",
  "EB-1": "#7090C8",
  "EB-2": "#5B7FB5",
  "EB-3": "#4080C0",
  "REF": "#AF52DE",
};

function visaColor(visaClass: string): string {
  return VISA_COLORS[visaClass] ?? "#8E8E93";
}

export default function MapSidebar({
  activePreset,
  data,
  currentMonth,
  totalEncounters,
  topCountries,
  topVisas,
}: Props) {
  const [groupBy, setGroupBy] = useState<"country" | "visa">("country");

  const monthTotal = useMemo(() => {
    return data
      .filter((d) => d.month === currentMonth)
      .reduce((s, d) => s + d.count, 0);
  }, [data, currentMonth]);

  const showToggle = SHOW_VISA_TOGGLE.has(activePreset);

  return (
    <div className="w-56 space-y-3">
      {/* Counter pill */}
      <div className="bg-white rounded-2xl border border-black/[.06] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="text-2xl font-semibold text-ink tracking-tight leading-none tabular-nums">
          {formatNumber(totalEncounters)}
        </div>
        <div className="text-[11px] text-muted mt-1.5">
          {PRESET_LABEL[activePreset]} through {formatMonth(currentMonth)}
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-sm font-semibold text-ink tabular-nums">
            {formatNumber(monthTotal)}
          </span>
          <span className="text-[11px] text-muted">this month</span>
        </div>
      </div>

      {/* Top origins / visas */}
      <div className="bg-white rounded-2xl border border-black/[.06] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
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

        {!showToggle && (
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
    </div>
  );
}
