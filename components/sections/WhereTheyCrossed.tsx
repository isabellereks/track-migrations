"use client";

import { useMemo } from "react";
import FadeInOnView from "@/components/ui/FadeInOnView";
import AnimatedBar from "@/components/ui/AnimatedBar";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import { getSampleData } from "@/lib/sample-data";
import { sectorDisplayName, SECTOR_CENTROIDS } from "@/lib/geo";

const BAR_COLOR = "#CC6B63";

const fmtK = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : `${Math.round(n / 1000)}k`;

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
  const filtered = sectorTotals
    .filter(({ sector }) => sector in SECTOR_CENTROIDS)
    .slice(0, 12);

  return (
    <section className="relative z-10 bg-white border-t border-black/[.06]">
      <div className="max-w-5xl mx-auto px-8 pt-20 pb-24">
        <h2 className="text-3xl md:text-4xl font-semibold text-ink tracking-tight leading-[1.1] mb-4">
          Where they crossed
        </h2>
        <p className="text-sm text-muted leading-relaxed max-w-2xl mb-10">
          Encounters are recorded by the Border Patrol sector or Field Office
          where they occurred. The southwest border accounts for the vast
          majority of all encounters.
        </p>
        <div className="space-y-3">
          {filtered.map(({ sector, total }, i) => (
            <FadeInOnView key={sector} delay={i * 30}>
              <div className="flex items-center gap-4 group">
                <span className="text-xs font-medium text-ink tracking-tight w-36 shrink-0 truncate">
                  {sectorDisplayName(sector)}
                </span>
                <div className="flex-1 h-7 bg-black/[.03] rounded-full overflow-hidden">
                  <AnimatedBar
                    width={`${(total / maxTotal) * 100}%`}
                    color={BAR_COLOR}
                    delay={i * 60}
                  />
                </div>
                <span className="text-xs text-muted tabular-nums w-16 text-right">
                  <AnimatedNumber value={total} format={fmtK} duration={800 + i * 60} />
                </span>
              </div>
            </FadeInOnView>
          ))}
        </div>
      </div>
    </section>
  );
}
