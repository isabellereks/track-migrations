"use client";

import { useMemo } from "react";
import { FILTER_LAYERS, STATUS_LAYERS, DOT_STYLES, LAYER_LABEL } from "@/lib/types";
import type { FilterPreset, StatusPreset, MigrationLayer } from "@/lib/types";

interface Props {
  activePreset: string;
}

const GROUPED: Record<string, { label: string; layers: MigrationLayer[] }> = {
  legal: { label: "Legal", layers: ["legal-employment", "legal-family", "legal-diversity", "temp-worker", "refugee", "asylum"] },
  border: { label: "Border", layers: ["border-entered", "border-inadmissible", "border-turnedaway"] },
  overstay: { label: "Overstay", layers: ["overstay"] },
  uncounted: { label: "Uncounted", layers: ["uncounted"] },
  arrests: { label: "ICE Arrests", layers: ["ice-arrest"] },
};

function getLayersForPreset(preset: string): MigrationLayer[] {
  if (preset in FILTER_LAYERS) return FILTER_LAYERS[preset as FilterPreset];
  if (preset in STATUS_LAYERS) return STATUS_LAYERS[preset as StatusPreset];
  return [];
}

export default function MapLegend({ activePreset }: Props) {
  const layers = useMemo(() => getLayersForPreset(activePreset), [activePreset]);
  const activeLayers = useMemo(() => new Set(layers), [layers]);

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
