"use client";

import { REGION_LABEL, type OriginRegion } from "@/lib/colors";
import { LAYER_LABEL, type MigrationLayer } from "@/lib/types";

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
}

function formatMonth(m: string): string {
  const [y, mo] = m.split("-");
  const names = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${names[parseInt(mo) - 1]} ${y}`;
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
}: Props) {
  if (!visible) return null;

  const flipX = x > window.innerWidth - 280;
  const flipY = y > window.innerHeight - 200;

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
          Each dot ≈ 100 people.
        </div>
      </div>
    </div>
  );
}
