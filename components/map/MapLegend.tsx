"use client";

import { useMemo } from "react";
import { FILTER_LAYERS, DOT_STYLES, LAYER_LABEL } from "@/lib/types";
import type { FilterPreset, MigrationLayer } from "@/lib/types";

interface Props {
  activePreset: FilterPreset;
}

const GROUPED: Record<string, { label: string; layers: MigrationLayer[] }> = {
  legal: { label: "Legal", layers: ["legal-employment", "legal-family", "legal-diversity", "refugee", "asylum"] },
  border: { label: "Border", layers: ["border-entered", "border-inadmissible", "border-turnedaway"] },
  overstay: { label: "Overstay", layers: ["overstay"] },
  uncounted: { label: "Uncounted", layers: ["uncounted"] },
};

export default function MapLegend({ activePreset }: Props) {
  const activeLayers = useMemo(() => new Set(FILTER_LAYERS[activePreset]), [activePreset]);

  const showGrouped = activePreset === "all";

  if (showGrouped) {
    const groups = Object.values(GROUPED).filter((g) =>
      g.layers.some((l) => activeLayers.has(l))
    );
    return (
      <div className="flex items-center gap-5">
        {groups.map((g) => {
          const primaryLayer = g.layers[0];
          const style = DOT_STYLES[primaryLayer];
          return (
            <div key={g.label} className="flex items-center gap-1.5">
              <span
                className="w-[6px] h-[6px] rounded-full shrink-0"
                style={{ backgroundColor: style.fill }}
              />
              <span className="text-[10px] text-muted/70 whitespace-nowrap">
                {g.label}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  const layers = FILTER_LAYERS[activePreset];
  return (
    <div className="flex items-center gap-5">
      {layers.map((layer) => {
        const style = DOT_STYLES[layer];
        return (
          <div key={layer} className="flex items-center gap-1.5">
            <span
              className="w-[6px] h-[6px] rounded-full shrink-0"
              style={{ backgroundColor: style.fill }}
            />
            <span className="text-[10px] text-muted/70 whitespace-nowrap">
              {LAYER_LABEL[layer]}
            </span>
          </div>
        );
      })}
    </div>
  );
}
