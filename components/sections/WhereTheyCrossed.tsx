"use client";

import { useMemo } from "react";
import FadeInOnView from "@/components/ui/FadeInOnView";
import { getSampleData } from "@/lib/sample-data";
import { sectorDisplayName, SECTOR_CENTROIDS } from "@/lib/geo";

export default function WhereTheyCrossed() {
  const data = useMemo(() => getSampleData(), []);

  const sectorTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of data) {
      map.set(r.sector, (map.get(r.sector) ?? 0) + r.count);
    }
    return Array.from(map.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([sector, total]) => ({ sector, total }));
  }, [data]);

  const maxTotal = sectorTotals[0]?.total ?? 1;

  return (
    <section className="relative z-10 bg-white border-t border-black/[.06]">
      <div className="max-w-5xl mx-auto px-8 pt-20 pb-24">
        <div className="text-[13px] font-medium text-muted tracking-tight mb-2">
          01 · Where they crossed
        </div>
        <h2 className="text-3xl md:text-4xl font-semibold text-ink tracking-tight leading-[1.1] mb-4">
          Border sectors by volume
        </h2>
        <p className="text-sm text-muted leading-relaxed max-w-2xl mb-10">
          Encounters are recorded by the Border Patrol sector or Field Office
          where they occurred. The southwest border accounts for the vast
          majority of all encounters.
        </p>
        <FadeInOnView>
          <div className="space-y-3">
            {sectorTotals
              .filter(({ sector }) => sector in SECTOR_CENTROIDS)
              .slice(0, 12)
              .map(({ sector, total }, i) => (
                <FadeInOnView key={sector} delay={i * 40} as="div">
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-medium text-ink tracking-tight w-36 shrink-0 truncate">
                      {sectorDisplayName(sector)}
                    </span>
                    <div className="flex-1 h-7 bg-black/[.03] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${(total / maxTotal) * 100}%`,
                          backgroundColor: "#C8534A",
                          opacity: 0.7 + (total / maxTotal) * 0.3,
                        }}
                      />
                    </div>
                    <span className="text-xs text-muted tabular-nums w-16 text-right">
                      {(total / 1000).toFixed(0)}k
                    </span>
                  </div>
                </FadeInOnView>
              ))}
          </div>
        </FadeInOnView>
      </div>
    </section>
  );
}
