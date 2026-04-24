"use client";

import { useMemo } from "react";
import type { EncounterRecord } from "@/lib/types";
import { REGION_HEX, type OriginRegion } from "@/lib/colors";

import type { FilterPreset } from "@/lib/types";

type Phase = "encounters" | "transition" | "arrests";

const PRESET_LABEL: Record<FilterPreset, string> = {
  all: "total encounters",
  legal: "legal admissions",
  border: "border encounters",
  overstays: "visa overstays",
  uncounted: "uncounted (est.)",
  arrests: "arrests",
};

interface Props {
  phase: Phase;
  activePreset: FilterPreset;
  data: EncounterRecord[];
  currentMonth: string;
  totalEncounters: number;
  topCountries: Array<{ name: string; region: string; count: number }>;
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

export default function MapSidebar({
  phase,
  activePreset,
  data,
  currentMonth,
  totalEncounters,
  topCountries,
}: Props) {
  const monthTotal = useMemo(() => {
    return data
      .filter((d) => d.month === currentMonth)
      .reduce((s, d) => s + d.count, 0);
  }, [data, currentMonth]);

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

      {/* Top origins */}
      <div className="bg-white rounded-2xl border border-black/[.06] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="text-xs font-medium text-muted tracking-tight mb-3">
          Top origins
        </div>
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
      </div>
    </div>
  );
}
