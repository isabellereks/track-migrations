"use client";

import { REGION_LABEL, type OriginRegion } from "@/lib/colors";
import { LAYER_LABEL, type MigrationLayer } from "@/lib/types";

interface ArrestAggregate {
  aorName: string;
  totalArrests: number;
  topNationalities: Array<{ name: string; count: number }>;
}

interface Props {
  x: number;
  y: number;
  nationality: string;
  region: OriginRegion;
  sector: string;
  month: string;
  demographic: string;
  encounterType: MigrationLayer;
  visible: boolean;
  visaClass?: string;
  visaClassLabel?: string;
  arrestAggregate?: ArrestAggregate;
}

function formatMonth(m: string): string {
  const [y, mo] = m.split("-");
  const names = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${names[parseInt(mo) - 1]} ${y}`;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
}

function sectorName(s: string): string {
  if (s === "port-of-entry") return "Port of entry";
  if (s === "airport") return "Airport";
  if (s === "unknown") return "Unknown";
  return s.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function demoLabel(d: string): string {
  if (d === "family-unit") return "Family unit";
  if (d === "unaccompanied-child") return "Unaccompanied child";
  return "Single adult";
}

export default function DotTooltip({
  x,
  y,
  nationality,
  region,
  sector,
  month,
  demographic,
  encounterType,
  visible,
  visaClass,
  visaClassLabel,
  arrestAggregate,
}: Props) {
  if (!visible) return null;

  const flipX = x > window.innerWidth - 280;
  const flipY = y > window.innerHeight - 200;

  if (arrestAggregate) {
    return (
      <div
        className="fixed z-50 pointer-events-none animate-popup-enter"
        style={{
          left: flipX ? x - 240 : x + 16,
          top: flipY ? y - 200 : y + 16,
          ["--popup-origin" as string]: "top left",
        }}
      >
        <div className="w-56 bg-white/95 backdrop-blur-2xl rounded-xl border border-black/[.06] shadow-[0_2px_8px_rgba(0,0,0,0.08)] p-3.5">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#3A6BD4] shrink-0" />
            <span className="text-xs font-semibold text-ink tracking-tight">
              {arrestAggregate.aorName}
            </span>
          </div>
          <div className="h-px bg-black/[.06] mb-2" />
          <div className="flex justify-between mb-2">
            <span className="text-[11px] text-muted">Total ICE arrests</span>
            <span className="text-sm font-semibold text-ink tabular-nums">
              {formatNumber(arrestAggregate.totalArrests)}
            </span>
          </div>
          <div className="text-[10px] text-muted mb-1.5">Top nationalities</div>
          <div className="space-y-1">
            {arrestAggregate.topNationalities.map((n, i) => (
              <div key={n.name} className="flex items-center gap-2">
                <span className="text-[10px] text-muted w-2.5 tabular-nums">{i + 1}</span>
                <span className="text-[11px] text-ink tracking-tight truncate flex-1">
                  {n.name}
                </span>
                <span className="text-[10px] text-muted tabular-nums">
                  {formatNumber(n.count)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed z-50 pointer-events-none animate-popup-enter"
      style={{
        left: flipX ? x - 240 : x + 16,
        top: flipY ? y - 160 : y + 16,
        ["--popup-origin" as string]: "top left",
      }}
    >
      <div className="w-56 bg-white/95 backdrop-blur-2xl rounded-xl border border-black/[.06] shadow-[0_2px_8px_rgba(0,0,0,0.08)] p-3.5">
        <div className="text-xs font-semibold text-ink tracking-tight mb-2">
          {nationality}
        </div>
        <div className="h-px bg-black/[.06] mb-2" />
        <div className="space-y-1.5">
          <div className="flex justify-between">
            <span className="text-[11px] text-muted">Type</span>
            <span className="text-[11px] font-medium text-ink">{LAYER_LABEL[encounterType]}</span>
          </div>
          {visaClass && (
            <div className="flex justify-between">
              <span className="text-[11px] text-muted">Visa</span>
              <span className="text-[11px] font-medium text-ink">{visaClassLabel ?? visaClass}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-[11px] text-muted">Location</span>
            <span className="text-[11px] font-medium text-ink">{sectorName(sector)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[11px] text-muted">Month</span>
            <span className="text-[11px] font-medium text-ink">{formatMonth(month)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[11px] text-muted">Demographic</span>
            <span className="text-[11px] font-medium text-ink">{demoLabel(demographic)}</span>
          </div>
        </div>
        <div className="h-px bg-black/[.06] mt-2 mb-2" />
        <div className="text-[10px] text-muted">
          Region: {REGION_LABEL[region]}
        </div>
        <div className="text-[10px] text-muted mt-0.5">
          Each dot ≈ 600 people.
        </div>
      </div>
    </div>
  );
}
