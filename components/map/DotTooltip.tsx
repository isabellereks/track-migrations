"use client";

import { useEffect, useRef } from "react";
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
  // Hooks must run unconditionally — the `visible` early return below has to
  // come AFTER any hook calls. We compute the target transform up front, then
  // bail.
  const wrapRef = useRef<HTMLDivElement>(null);
  const armedRef = useRef(false);

  const flipX = typeof window !== "undefined" && x > window.innerWidth - 280;
  const isArrest = !!arrestAggregate;
  const heightOffset = isArrest ? 200 : 160;
  const flipY = typeof window !== "undefined" && y > window.innerHeight - heightOffset;
  const tx = flipX ? x - 240 : x + 16;
  const ty = flipY ? y - heightOffset : y + 16;

  // First paint: snap to target with no transition so the tooltip doesn't
  // visibly slide in from (0,0). After the first frame, arm the transition so
  // subsequent target updates lerp.
  useEffect(() => {
    if (!visible) {
      armedRef.current = false;
      return;
    }
    const el = wrapRef.current;
    if (!el) return;
    if (!armedRef.current) {
      // Force initial position to land before transitions kick in.
      el.style.transition = "none";
      el.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
      // Force a reflow so the browser commits the no-transition transform
      // before we re-enable the transition. Without this, some browsers
      // collapse the two style writes into a single transition from origin.
      void el.offsetHeight;
      el.style.transition = "transform 140ms cubic-bezier(0.32, 0.72, 0, 1)";
      armedRef.current = true;
    } else {
      el.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
    }
  }, [visible, tx, ty]);

  if (!visible) return null;

  // The outer wrapper handles the smooth position lerp via a compositor-only
  // transform transition. The inner block keeps the existing scale+opacity
  // entrance keyframe, isolated from the position transition so they don't
  // fight over the `transform` property.
  const innerStyle: React.CSSProperties = {
    ["--popup-origin" as string]: "top left",
  };

  if (isArrest) {
    return (
      <div
        ref={wrapRef}
        className="fixed top-0 left-0 z-50 pointer-events-none"
        style={{ willChange: "transform" }}
      >
        <div className="animate-popup-enter" style={innerStyle}>
          <div className="w-56 bg-white/95 backdrop-blur-2xl rounded-xl border border-black/[.06] shadow-[0_2px_8px_rgba(0,0,0,0.08)] p-3.5">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#3A6BD4] shrink-0" />
              <span className="text-xs font-semibold text-ink tracking-tight">
                {arrestAggregate!.aorName}
              </span>
            </div>
            <div className="h-px bg-black/[.06] mb-2" />
            <div className="flex justify-between mb-2">
              <span className="text-[11px] text-muted">Total ICE arrests</span>
              <span className="text-sm font-semibold text-ink tabular-nums">
                {formatNumber(arrestAggregate!.totalArrests)}
              </span>
            </div>
            <div className="text-[10px] text-muted mb-1.5">Top nationalities</div>
            <div className="space-y-1">
              {arrestAggregate!.topNationalities.map((n, i) => (
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
      </div>
    );
  }

  return (
    <div
      ref={wrapRef}
      className="fixed top-0 left-0 z-50 pointer-events-none"
      style={{ willChange: "transform" }}
    >
      <div className="animate-popup-enter" style={innerStyle}>
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
    </div>
  );
}
